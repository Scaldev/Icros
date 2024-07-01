const { SlashCommandBuilder } = require('@discordjs/builders');

module.exports = {

	async execute(interaction) {

		const sent = await interaction.reply({ content: '🏓 - Ping, ping, ping...', fetchReply: true });
		
		interaction.editReply(`🏓 - **Pong !** Roundtrip latency is **${sent.createdTimestamp - interaction.createdTimestamp} ms**, whereas the API latency is **${Math.round(interaction.client.ws.ping)} ms**.`);
	
	},

	data: new SlashCommandBuilder()
		.setName('ping')
		.setDescription("Return roundtrip and API latency.")
};