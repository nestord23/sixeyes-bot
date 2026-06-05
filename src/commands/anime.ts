import { SlashCommandBuilder, EmbedBuilder, type ChatInputCommandInteraction } from 'discord.js';
import { searchAnime, getAnimeCharacters } from '../services/jikan.service';
import { logger } from '../utils/logger';

function formatRole(role: string): string {
  const map: Record<string, string> = {
    main: 'Main Character',
    supporting: 'Supporting',
    background: 'Background',
  };
  return map[role.toLowerCase()] || role;
}

export const data = new SlashCommandBuilder()
  .setName('anime')
  .setDescription('Search for an anime series')
  .addStringOption((option) =>
    option.setName('query').setDescription('Anime title').setRequired(true),
  );

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  const query = interaction.options.getString('query', true);

  try {
    const anime = await searchAnime(query);

    if (!anime) {
      await interaction.editReply({ content: 'Anime not found. Try a different title.' });
      return;
    }

    const synopsis = anime.synopsis
      ? `${anime.synopsis.replace(/<[^>]*>/g, '').slice(0, 300)}...`
      : 'No synopsis available.';

    const embeds: EmbedBuilder[] = [
      new EmbedBuilder()
        .setColor(0x2E51A2)
        .setTitle(`${anime.title}${anime.titleEnglish ? ` (${anime.titleEnglish})` : ''}`)
        .setURL(anime.malUrl)
        .setImage(anime.imageLarge)
        .setDescription(synopsis)
        .addFields(
          { name: 'Type', value: anime.type || 'Unknown', inline: true },
          { name: 'Episodes', value: anime.episodes ? `${anime.episodes}` : 'Unknown', inline: true },
          { name: 'Score', value: anime.score ? `⭐ ${anime.score}` : 'N/A', inline: true },
          { name: 'Status', value: anime.status || 'Unknown', inline: true },
          { name: 'Season', value: anime.season ? `${anime.season.charAt(0).toUpperCase() + anime.season.slice(1)} ${anime.seasonYear}` : 'Unknown', inline: true },
        )
        .setFooter({ text: 'Jikan • MyAnimeList' }),
    ];

    if (anime.relations.length > 0) {
      const seasonList = anime.relations
        .map((rel) => `**${rel.type}**: [${rel.title}](${rel.url})`)
        .join('\n');
      embeds[0].addFields({ name: 'Related Seasons', value: seasonList.slice(0, 1024), inline: false });
    }

    const characters = await getAnimeCharacters(anime.mal_id);
    for (const char of characters) {
      embeds.push(
        new EmbedBuilder()
          .setColor(0x36393E)
          .setTitle(char.name)
          .setThumbnail(char.image)
          .setDescription(`*${formatRole(char.role)}*`),
      );
    }

    await interaction.editReply({ embeds });
  } catch (error) {
    logger.error('Anime command error:', error);
    await interaction.editReply({ content: 'An error occurred while searching.' });
  }
}
