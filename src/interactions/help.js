const { SlashCommandBuilder } = require('@discordjs/builders'); // Pour créer la commande slash de cette commande.

module.exports = {

	async execute(client, interaction) {
		const sent = await interaction.reply({ content: '🏓 - Ping, ping, ping...', fetchReply: true });
		interaction.editReply(`🏓 - **Pong !** La latence est de **${sent.createdTimestamp - interaction.createdTimestamp} ms**,  et celle de l'API est de **${Math.round(client.ws.ping)}** ms.`);
	},

	data: new SlashCommandBuilder() // La commande slash de cette commande.
		.setName('help') // Nom.
		.setDescription("Stop it. Get some help.") // Description.
};