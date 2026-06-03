import { SlashCommandBuilder, EmbedBuilder, type ChatInputCommandInteraction, type GuildMember } from 'discord.js';
import {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
  AudioPlayerStatus,
  type VoiceConnection,
} from '@discordjs/voice';
import ytdl from 'ytdl-core';
import { searchVideo } from '../services/youtube.service';
import { logger } from '../utils/logger';

export const data = new SlashCommandBuilder()
  .setName('play')
  .setDescription('Play a song from YouTube in your voice channel')
  .addStringOption((option) =>
    option.setName('query').setDescription('Song name or YouTube URL').setRequired(true),
  );

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply();

  const member = interaction.member as GuildMember | null;
  const channel = member?.voice.channel;

  if (!channel) {
    await interaction.editReply({ content: 'You must be in a voice channel to use this command.' });
    return;
  }

  const query = interaction.options.getString('query', true);

  const video = await searchVideo(query);

  if (!video) {
    await interaction.editReply({ content: 'No results found for that query.' });
    return;
  }

  let connection: VoiceConnection;

  try {
    connection = joinVoiceChannel({
      channelId: channel.id,
      guildId: interaction.guildId!,
      adapterCreator: interaction.guild!.voiceAdapterCreator,
    });
  } catch (error) {
    logger.error('Failed to join voice channel:', error);
    await interaction.editReply({ content: 'Failed to join your voice channel.' });
    return;
  }

  const embed = new EmbedBuilder()
    .setColor(0xFF0000)
    .setTitle(video.title)
    .setURL(video.url)
    .setAuthor({ name: 'Now Playing' })
    .addFields(
      { name: 'Channel', value: video.channel, inline: true },
      { name: 'Duration', value: video.duration, inline: true },
    )
    .setThumbnail(video.thumbnail)
    .setFooter({ text: 'SixEyes Bot • YouTube' });

  await interaction.editReply({ embeds: [embed] });

  try {
    const stream = ytdl(video.url, {
      filter: 'audioonly',
      quality: 'lowestaudio',
      highWaterMark: 1 << 25,
    });

    const resource = createAudioResource(stream);
    const player = createAudioPlayer();

    player.play(resource);
    connection.subscribe(player);

    player.on(AudioPlayerStatus.Idle, () => {
      connection.destroy();
    });

    player.on('error', (error) => {
      logger.error('Audio player error:', error);
      connection.destroy();
    });
  } catch (error) {
    logger.error('Failed to play audio:', error);
    connection.destroy();
    await interaction.editReply({ content: 'Failed to play that song.' });
  }
}
