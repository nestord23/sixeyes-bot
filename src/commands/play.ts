import { SlashCommandBuilder, EmbedBuilder, type ChatInputCommandInteraction, type GuildMember } from 'discord.js';
import {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
  AudioPlayerStatus,
  VoiceConnectionStatus,
  StreamType,
  entersState,
  type VoiceConnection,
} from '@discordjs/voice';
import https from 'node:https';
import { Readable } from 'node:stream';
import { searchVideo } from '../services/youtube.service';
import { getAudioUrl } from '../services/youtube-stream.service';
import { logger } from '../utils/logger';

export const data = new SlashCommandBuilder()
  .setName('play')
  .setDescription('Play a song from YouTube in your voice channel')
  .addStringOption((option) =>
    option.setName('query').setDescription('Song name or YouTube URL').setRequired(true),
  );

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
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

    await entersState(connection, VoiceConnectionStatus.Ready, 20_000);
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
    const audioUrl = await getAudioUrl(video.url);

    const stream = await new Promise<Readable>((resolve, reject) => {
      https.get(audioUrl, (res) => {
        if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          https.get(res.headers.location, (res2) => resolve(res2));
          return;
        }
        if (res.statusCode !== 200) {
          reject(new Error(`Audio stream returned status ${res.statusCode}`));
          return;
        }
        resolve(res);
      }).on('error', reject);
    });

    const resource = createAudioResource(stream, {
      inputType: StreamType.Arbitrary,
    });

    const player = createAudioPlayer();

    player.on(AudioPlayerStatus.Playing, () => {
      logger.info(`Now playing: ${video.title}`);
    });

    player.on(AudioPlayerStatus.Idle, () => {
      logger.info(`Finished playing: ${video.title}`);
      stream.destroy();
      connection.destroy();
    });

    player.on('error', (error) => {
      logger.error('Audio player error:', error);
      stream.destroy();
      connection.destroy();
    });

    player.play(resource);
    connection.subscribe(player);
  } catch (error) {
    logger.error('Failed to play audio:', error);
    connection.destroy();
    await interaction.editReply({ content: 'Failed to play that song.' });
  }
}
