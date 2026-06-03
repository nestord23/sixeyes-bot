import 'dotenv/config';
import { Client, Collection, GatewayIntentBits, type RESTPostAPIApplicationCommandsJSONBody } from 'discord.js';
import { REST, Routes } from 'discord.js';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { logger } from './utils/logger';

declare module 'discord.js' {
  interface Client {
    commands: Collection<string, { data: { name: string }; execute: (...args: unknown[]) => unknown }>;
  }
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildVoiceStates,
  ],
});

client.commands = new Collection();

async function loadCommands(): Promise<RESTPostAPIApplicationCommandsJSONBody[]> {
  const commandsPath = path.join(__dirname, 'commands');
  const commandFiles = fs.readdirSync(commandsPath).filter((f) => f.endsWith('.ts') && !f.endsWith('.d.ts'));

  const commands: RESTPostAPIApplicationCommandsJSONBody[] = [];

  for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    try {
      const command = await import(pathToFileURL(filePath).href);
      if (command.data && command.execute) {
        client.commands.set(command.data.name, command);
        commands.push(command.data.toJSON());
        logger.info(`Loaded command: ${command.data.name}`);
      } else {
        logger.warn(`Invalid command file: ${file}`);
      }
    } catch (error) {
      logger.error(`Failed to load command ${file}:`, error);
    }
  }

  return commands;
}

async function loadEvents(): Promise<void> {
  const eventsPath = path.join(__dirname, 'events');
  const eventFiles = fs.readdirSync(eventsPath).filter((f) => f.endsWith('.ts') && !f.endsWith('.d.ts'));

  for (const file of eventFiles) {
    const filePath = path.join(eventsPath, file);
    try {
      const event = await import(pathToFileURL(filePath).href);
      if (event.name && event.execute) {
        if (event.once) {
          client.once(event.name, (...args: unknown[]) => event.execute(...args));
        } else {
          client.on(event.name, (...args: unknown[]) => event.execute(...args));
        }
        logger.info(`Loaded event: ${event.name}`);
      } else {
        logger.warn(`Invalid event file: ${file}`);
      }
    } catch (error) {
      logger.error(`Failed to load event ${file}:`, error);
    }
  }
}

async function registerCommands(commands: RESTPostAPIApplicationCommandsJSONBody[]): Promise<void> {
  const { DISCORD_TOKEN, CLIENT_ID, GUILD_ID } = process.env;

  if (!DISCORD_TOKEN || !CLIENT_ID) {
    logger.error('Missing DISCORD_TOKEN or CLIENT_ID in environment variables');
    process.exit(1);
  }

  const rest = new REST({ version: '10' }).setToken(DISCORD_TOKEN);

  try {
    if (GUILD_ID) {
      await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), { body: commands });
      logger.info(`Registered ${commands.length} guild commands (GUILD_ID: ${GUILD_ID})`);
    } else {
      await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands });
      logger.info(`Registered ${commands.length} global commands`);
    }
  } catch (error) {
    logger.error('Failed to register commands:', error);
  }
}

async function main(): Promise<void> {
  const { DISCORD_TOKEN } = process.env;

  if (!DISCORD_TOKEN) {
    logger.error('Missing DISCORD_TOKEN environment variable');
    process.exit(1);
  }

  const commands = await loadCommands();
  await loadEvents();
  await registerCommands(commands);

  client.login(DISCORD_TOKEN);
}

main().catch((error) => {
  logger.error('Fatal error:', error);
  process.exit(1);
});
