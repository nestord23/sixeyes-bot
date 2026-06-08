import {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  ComponentType,
  type ChatInputCommandInteraction,
} from 'discord.js';
import {
  searchPlayers,
  getTeams,
  getGamesByTeam,
  type NBAPlayer,
  type NBATeam,
  type NBAGame,
} from '../services/nba.service';
import { searchImage } from '../services/unsplash.service';
import { logger } from '../utils/logger';

export const data = new SlashCommandBuilder()
  .setName('nba')
  .setDescription('NBA player, team, and game search')
  .addSubcommand((sub) =>
    sub
      .setName('jugador')
      .setDescription('Search for an NBA player')
      .addStringOption((opt) =>
        opt.setName('nombre').setDescription('Player name').setRequired(true),
      ),
  )
  .addSubcommand((sub) =>
    sub
      .setName('equipo')
      .setDescription('Search for an NBA team')
      .addStringOption((opt) =>
        opt.setName('nombre').setDescription('Team name').setRequired(true),
      ),
  )
  .addSubcommand((sub) =>
    sub
      .setName('partidos')
      .setDescription('View recent games for an NBA team')
      .addStringOption((opt) =>
        opt.setName('equipo').setDescription('Team name (e.g. Lakers)').setRequired(true),
      ),
  );

function formatHeight(player: NBAPlayer): string {
  return player.height ?? 'N/A';
}

function formatDraft(player: NBAPlayer): string {
  if (!player.draft_year) return 'Undrafted';
  return `Round ${player.draft_round}, Pick ${player.draft_number} (${player.draft_year})`;
}

async function sendPlayerEmbed(
  interaction: ChatInputCommandInteraction,
  player: NBAPlayer,
): Promise<void> {
  const query = `${player.first_name} ${player.last_name} NBA basketball`;
  const image = await searchImage(query);

  const embed = new EmbedBuilder()
    .setColor(0xC9082A)
    .setTitle(`${player.first_name} ${player.last_name}`)
    .setDescription(`${player.team.full_name} — ${player.position || 'N/A'}`)
    .addFields(
      { name: 'Team', value: player.team.full_name, inline: true },
      { name: 'Position', value: player.position || 'N/A', inline: true },
      { name: 'Height', value: formatHeight(player), inline: true },
      { name: 'Weight', value: player.weight ? `${player.weight} lbs` : 'N/A', inline: true },
      { name: 'College', value: player.college || 'N/A', inline: true },
      { name: 'Country', value: player.country || 'N/A', inline: true },
      { name: 'Draft', value: formatDraft(player), inline: false },
    )
    .setFooter({ text: 'BallDontLie • NBA' });

  if (image) embed.setImage(image);

  await interaction.editReply({ embeds: [embed], components: [] });
}

async function sendTeamEmbed(
  interaction: ChatInputCommandInteraction,
  team: NBATeam,
): Promise<void> {
  const image = await searchImage(`${team.full_name} NBA basketball team logo`);

  const embed = new EmbedBuilder()
    .setColor(0xC9082A)
    .setTitle(team.full_name)
    .setDescription(`\`${team.abbreviation}\``)
    .addFields(
      { name: 'City', value: team.city, inline: true },
      { name: 'Conference', value: team.conference, inline: true },
      { name: 'Division', value: team.division, inline: true },
    )
    .setFooter({ text: 'BallDontLie • NBA' });

  if (image) embed.setImage(image);

  await interaction.editReply({ embeds: [embed], components: [] });
}

async function handlePlayerSearch(
  interaction: ChatInputCommandInteraction,
  name: string,
): Promise<void> {
  const players = await searchPlayers(name);

  if (players.length === 0) {
    await interaction.editReply({ content: 'No players found with that name.' });
    return;
  }

  if (players.length === 1) {
    await sendPlayerEmbed(interaction, players[0]);
    return;
  }

  const displayPlayers = players
    .filter((p) =>
      `${p.first_name} ${p.last_name}`.toLowerCase().includes(name.toLowerCase()),
    )
    .slice(0, 25);

  if (displayPlayers.length === 0) {
    await interaction.editReply({ content: 'No players found with that name.' });
    return;
  }

  if (displayPlayers.length === 1) {
    await sendPlayerEmbed(interaction, displayPlayers[0]);
    return;
  }

  const options = displayPlayers.map((p) =>
    new StringSelectMenuOptionBuilder()
      .setLabel(`${p.first_name} ${p.last_name} — ${p.team.abbreviation}`)
      .setValue(String(p.id)),
  );

  const select = new StringSelectMenuBuilder()
    .setCustomId('nba_player_select')
    .setPlaceholder('Select a player')
    .addOptions(options);

  const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select);

  const reply = await interaction.editReply({
    content: 'Multiple players found. Select one:',
    components: [row],
  });

  try {
    const confirmation = await reply.awaitMessageComponent({
      filter: (i) => i.user.id === interaction.user.id,
      time: 30_000,
      componentType: ComponentType.StringSelect,
    });

    const selectedId = Number(confirmation.values[0]);
    const player = players.find((p) => p.id === selectedId);
    if (!player) throw new Error('Player not found');

    await confirmation.deferUpdate();
    await sendPlayerEmbed(interaction, player);
  } catch (error) {
    if (error instanceof Error && error.message.includes('time')) {
      await interaction.editReply({ content: 'Selection time expired.', components: [] });
    } else {
      logger.error('Player select error:', error);
    }
  }
}

async function handleTeamSearch(
  interaction: ChatInputCommandInteraction,
  name: string,
): Promise<void> {
  const allTeams = await getTeams();

  const displayTeams = allTeams
    .filter((t) =>
      t.full_name.toLowerCase().includes(name.toLowerCase()) ||
      t.name.toLowerCase().includes(name.toLowerCase()) ||
      t.abbreviation.toLowerCase().includes(name.toLowerCase()),
    )
    .slice(0, 25);

  if (displayTeams.length === 0) {
    await interaction.editReply({ content: 'No teams found with that name.' });
    return;
  }

  if (displayTeams.length === 1) {
    await sendTeamEmbed(interaction, displayTeams[0]);
    return;
  }

  const options = displayTeams.map((t) =>
    new StringSelectMenuOptionBuilder()
      .setLabel(`${t.full_name} (${t.abbreviation})`)
      .setValue(String(t.id)),
  );

  const select = new StringSelectMenuBuilder()
    .setCustomId('nba_team_select')
    .setPlaceholder('Select a team')
    .addOptions(options);

  const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select);

  const reply = await interaction.editReply({
    content: 'Multiple teams found. Select one:',
    components: [row],
  });

  try {
    const confirmation = await reply.awaitMessageComponent({
      filter: (i) => i.user.id === interaction.user.id,
      time: 30_000,
      componentType: ComponentType.StringSelect,
    });

    const selectedId = Number(confirmation.values[0]);
    const team = allTeams.find((t) => t.id === selectedId);
    if (!team) throw new Error('Team not found');

    await confirmation.deferUpdate();
    await sendTeamEmbed(interaction, team);
  } catch (error) {
    if (error instanceof Error && error.message.includes('time')) {
      await interaction.editReply({ content: 'Selection time expired.', components: [] });
    } else {
      logger.error('Team select error:', error);
    }
  }
}

async function handleGamesSearch(
  interaction: ChatInputCommandInteraction,
  teamName: string,
): Promise<void> {
  const allTeams = await getTeams();

  const matched = allTeams.filter((t) =>
    t.full_name.toLowerCase().includes(teamName.toLowerCase()) ||
    t.name.toLowerCase().includes(teamName.toLowerCase()) ||
    t.abbreviation.toLowerCase().includes(teamName.toLowerCase()),
  );

  if (matched.length === 0) {
    await interaction.editReply({ content: 'Team not found. Check the name.' });
    return;
  }

  let team = matched[0];
  if (matched.length > 1) {
    const exact = matched.find(
      (t) =>
        t.name.toLowerCase() === teamName.toLowerCase() ||
        t.full_name.toLowerCase() === teamName.toLowerCase(),
    );
    if (exact) team = exact;
  }

  const today = new Date().toISOString().split('T')[0];

  const upcomingResult = await getGamesByTeam(team.id, undefined, 10, today, undefined);
  const upcomingGames = upcomingResult.games.filter(
    (g) => g.status !== 'Final' && g.date >= today,
  );

  if (upcomingGames.length > 0) {
    upcomingGames.sort((a, b) => a.date.localeCompare(b.date));
    const game = upcomingGames[0];

    const embed = new EmbedBuilder()
      .setColor(0x2E51A2)
      .setTitle(`Next Game — ${team.full_name}`)
      .setDescription(`${game.visitor_team.full_name} @ ${game.home_team.full_name}`)
      .addFields(
        { name: 'Date', value: game.date, inline: true },
        { name: 'Status', value: game.status, inline: true },
        { name: game.visitor_team.abbreviation, value: '—', inline: true },
        { name: game.home_team.abbreviation, value: '—', inline: true },
      )
      .setFooter({ text: 'BallDontLie • NBA' });

    await interaction.editReply({ embeds: [embed], components: [] });
    return;
  }

  const pastResult = await getGamesByTeam(team.id, undefined, 5, undefined, today);
  const pastGames = pastResult.games.filter((g) => g.status === 'Final');

  if (pastGames.length === 0) {
    await interaction.editReply({ content: `No games found for ${team.full_name}.` });
    return;
  }

  const game = pastGames[0];

  const embed = new EmbedBuilder()
    .setColor(0x808080)
    .setTitle(`Last Game — ${team.full_name}`)
    .setDescription(`${game.visitor_team.full_name} @ ${game.home_team.full_name}`)
    .addFields(
      { name: 'Date', value: game.date, inline: true },
      { name: 'Status', value: game.status, inline: true },
      { name: game.visitor_team.full_name, value: `${game.visitor_team_score ?? '—'}`, inline: true },
      { name: game.home_team.full_name, value: `${game.home_team_score ?? '—'}`, inline: true },
    )
    .setFooter({ text: 'BallDontLie • NBA' });

  await interaction.editReply({ embeds: [embed], components: [] });
}

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  const subcommand = interaction.options.getSubcommand();

  try {
    switch (subcommand) {
      case 'jugador': {
        const name = interaction.options.getString('nombre', true);
        await handlePlayerSearch(interaction, name);
        break;
      }
      case 'equipo': {
        const name = interaction.options.getString('nombre', true);
        await handleTeamSearch(interaction, name);
        break;
      }
      case 'partidos': {
        const teamName = interaction.options.getString('equipo', true);
        await handleGamesSearch(interaction, teamName);
        break;
      }
      default:
        await interaction.editReply({ content: 'Invalid subcommand.' });
    }
  } catch (error) {
    logger.error('NBA command error:', error);
    await interaction.editReply({ content: 'An error occurred while executing the command.' });
  }
}
