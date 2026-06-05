import { SlashCommandBuilder, EmbedBuilder, type ChatInputCommandInteraction } from 'discord.js';
import { searchMultiple } from '../services/youtube.service';
import { logger } from '../utils/logger';

export const data = new SlashCommandBuilder()
  .setName('tube')
  .setDescription('Search for videos on YouTube')
  .addStringOption((option) =>
    option.setName('query').setDescription('Search query').setRequired(true),
  );

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  const query = interaction.options.getString('query', true);

  try {
    const results = await searchMultiple(query, 5);

    if (results.length === 0) {
      await interaction.editReply({ content: 'No results found for that query.' });
      return;
    }

    const embeds = results.map((video, index) =>
      new EmbedBuilder()
        .setColor(0xFF0000)
        .setTitle(`${index + 1}. ${video.title}`)
        .setURL(video.url)
        .setThumbnail(video.thumbnail)
        .addFields(
          { name: 'Channel', value: `🔴 ${video.channel}`, inline: true },
          { name: 'Duration', value: `⏱ ${video.duration}`, inline: true },
        )
        .setFooter({ text: `SixEyes Bot • YouTube` }),
    );

    await interaction.editReply({ embeds });
  } catch (error) {
    logger.error('Search command error:', error);
    await interaction.editReply({ content: 'An error occurred while searching YouTube.' });
  }
}
