import { SlashCommandBuilder, EmbedBuilder, MessageFlags, type ChatInputCommandInteraction } from 'discord.js';
import { searchMultiple } from '../services/youtube.service';
import { logger } from '../utils/logger';

export const data = new SlashCommandBuilder()
  .setName('search')
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

    const description = results
      .map(
        (video, index) =>
          `**${index + 1}.** [${video.title}](${video.url})\n└ ${video.channel} • ${video.duration}`,
      )
      .join('\n\n');

    const embed = new EmbedBuilder()
      .setColor(0xFF0000)
      .setTitle(`Search results for "${query}"`)
      .setDescription(description)
      .setFooter({ text: 'SixEyes Bot • YouTube' });

    await interaction.editReply({ embeds: [embed] });
  } catch (error) {
    logger.error('Search command error:', error);
    await interaction.editReply({ content: 'An error occurred while searching YouTube.' });
  }
}
