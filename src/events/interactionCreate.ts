import { Events, MessageFlags, type Interaction } from 'discord.js';
import { logger } from '../utils/logger';

export const name = Events.InteractionCreate;

export async function execute(interaction: Interaction): Promise<void> {
  if (!interaction.isChatInputCommand()) return;

  const command = interaction.client.commands.get(interaction.commandName);

  if (!command) {
    logger.warn(`Command not found: ${interaction.commandName}`);
    await interaction.reply({ content: 'Command not found.', flags: MessageFlags.Ephemeral });
    return;
  }

  await interaction.deferReply();

  try {
    await command.execute(interaction);
  } catch (error) {
    logger.error(`Error executing command ${interaction.commandName}:`, error);
    try {
      await interaction.followUp({ content: 'There was an error executing this command.', flags: MessageFlags.Ephemeral });
    } catch (innerError) {
      logger.error('Failed to send error response:', innerError);
    }
  }
}
