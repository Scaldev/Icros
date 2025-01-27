import { ChatInputCommandInteraction } from 'discord.js';
import { SlashCommandBuilder } from '@discordjs/builders';

export async function execute(interaction: ChatInputCommandInteraction) {

	const sent = await interaction.reply({ content: '🏓 - Ping, ping, ping...', fetchReply: true });

	interaction.editReply(`🏓 - **Pong !** Roundtrip latency is **${sent.createdTimestamp - interaction.createdTimestamp} ms**, whereas the API latency is **${Math.round(interaction.client.ws.ping)} ms**.`);

}
export const data = new SlashCommandBuilder()
	.setName('ping')
	.setDescription("Return roundtrip and API latency.");