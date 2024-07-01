const { SlashCommandBuilder } = require('@discordjs/builders'); // Pour créer la commande slash de cette commande.

module.exports = {

	async execute(client, interaction) {
		const sent = await interaction.reply({ content: '🏓 - Ping, ping, ping...', fetchReply: true });
		interaction.editReply(`🏓 - **Pong !** Roundtrip latency is **${sent.createdTimestamp - interaction.createdTimestamp} ms**, whereas the API latency is **${Math.round(client.ws.ping)} ms**.`);
	},

	data: new SlashCommandBuilder() // La commande slash de cette commande.
		.setName('embed') // Nom.
		.setDescription("Create and store a new embed template.") // Description.
};