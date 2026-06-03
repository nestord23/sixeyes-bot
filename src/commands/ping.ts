import { SlashCommandBuilder, type ChatInputCommandInteraction } from 'discord.js';

export const data = new SlashCommandBuilder()
  .setName('ping')
  .setDescription('Replies with Pong and latency info');

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  const sent = await interaction.reply({ content: 'Pinging...', fetchReply: true });
  const roundtrip = sent.createdTimestamp - interaction.createdTimestamp;

  await interaction.editReply(
    `🏓 Pong!\nLatency: ${roundtrip}ms\nWebSocket heartbeat: ${interaction.client.ws.ping}ms`,
  );
}
