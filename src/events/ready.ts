import { Events, type Client } from 'discord.js';
import { logger } from '../utils/logger';

export const name = Events.ClientReady;
export const once = true;

export function execute(client: Client<true>): void {
  logger.info(`Logged in as ${client.user.tag}`);
}
