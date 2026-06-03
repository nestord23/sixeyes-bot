# SixEyes Bot

A modular Discord bot built with **discord.js v14**, **TypeScript**, and **Node.js**.

## Features

- Slash commands with dynamic loading
- Event-driven architecture
- Structured logging
- Ready for deployment on Render

## Prerequisites

- Node.js 20+
- npm
- A [Discord Application](https://discord.com/developers/applications) with a bot token

## Setup

```bash
# 1. Clone and install dependencies
npm install

# 2. Create environment file
cp .env.example .env

# 3. Fill in your credentials in .env
#    DISCORD_TOKEN, CLIENT_ID, and optionally GUILD_ID
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Run bot locally with hot-reload (tsx watch) |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm start` | Run compiled bot from `dist/` |
| `npm run lint` | Lint source files |
| `npm run format` | Format source files with Prettier |

## Project Structure

```
src/
├── commands/      # Slash commands (one file per command)
├── events/        # Discord event handlers
├── services/      # External API integrations
├── utils/         # Reusable utilities (logger, helpers)
└── index.ts       # Entry point
```

## Adding a Command

Create a file in `src/commands/` that exports `data` (a `SlashCommandBuilder`) and `execute` (an async function). It will be loaded automatically.

## Adding an Event

Create a file in `src/events/` that exports `name`, `once?`, and `execute`. It will be registered automatically.

## Deploy on Render

1. Push the repo to GitHub.
2. In Render, create a **New + > Background Worker**.
3. Connect your GitHub repository.
4. Set the following:
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
5. Add the environment variables (`DISCORD_TOKEN`, `CLIENT_ID`, `GUILD_ID`) in the Render dashboard.
6. Deploy.

The bot will stay alive as a long-running background process.
