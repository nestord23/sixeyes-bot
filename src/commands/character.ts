import { SlashCommandBuilder, EmbedBuilder, type ChatInputCommandInteraction } from 'discord.js';
import { searchCharacter } from '../services/jikan.service';
import { logger } from '../utils/logger';

export const data = new SlashCommandBuilder()
  .setName('perso')
  .setDescription('Search for an anime character')
  .addStringOption((option) =>
    option.setName('name').setDescription('Character name').setRequired(true),
  );

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  const name = interaction.options.getString('name', true);

  try {
    const character = await searchCharacter(name);

    if (!character) {
      await interaction.editReply({ content: 'Character not found. Try a different name.' });
      return;
    }

    const about = character.about.length > 200
      ? `${character.about.slice(0, 200)}...`
      : character.about;

    const embed = new EmbedBuilder()
      .setColor(0x2E51A2)
      .setTitle(character.name)
      .setImage(character.image)
      .setDescription(about)
      .addFields(
        { name: 'From', value: character.animeTitle, inline: false },
      )
      .setFooter({ text: 'Jikan • MyAnimeList' });

    await interaction.editReply({ embeds: [embed] });
  } catch (error) {
    logger.error('Perso command error:', error);
    await interaction.editReply({ content: 'An error occurred while searching for the character.' });
  }
}
