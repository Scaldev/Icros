const { InteractionType } = require('discord.js');

module.exports = {

    async execute(interaction) {

        if (interaction.type !== InteractionType.ApplicationCommand) return;

        let command = interaction.client.interactions.get(interaction.commandName);

        console.log(`>>> The "${interaction.commandName}" command (id: ${interaction.commandId}) was used by ${interaction.user.tag} in #${interaction.channel.name}.`);

        command.execute(interaction);

    },

};