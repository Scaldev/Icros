import { BaseInteraction } from 'discord.js';
import { client } from '../structures/client/client';

export async function execute(interaction: BaseInteraction) {

    if (!interaction.channel || interaction.channel.isDMBased()) return;

    if (interaction.isChatInputCommand()) {

        const command = client.interactions.get(`slash_commands/${interaction.commandName}`);
        if (command == undefined) return;

        console.log(`>>> The "${interaction.commandName}" command (id: ${interaction.commandId}) was used by ${interaction.user.tag} in #${interaction.channel.name}.`);

        command.execute(interaction);

    } else if (interaction.isButton()) {

        const button_name = interaction.customId.split('/')[0];

        const command = client.interactions.get(`components/${button_name}`);
        if (command == undefined) return;

        console.log(`>>> The "${button_name}" button was used by ${interaction.user.tag} in #${interaction.channel.name}.`);

        command.execute(interaction);

    }

}