import { ChatInputCommandInteraction } from 'discord.js';
import { SlashCommandBuilder } from '@discordjs/builders';

import { Field, set_member_data } from '../../../structures/database/tables.js';

/**
 * @param about_me a string.
 * @returns the same string with SQL-injection prevention, without \n and between ' quotes.
 */
function formate_about_me(about_me: string) {
    return `'${about_me.replace(/\'/g, "\\'").replace(/\n/g, "")}'`;
}

/**
 * @param interaction a slash command.
 * Changes the 'about me' section of the user's profile.
 */
export async function execute(interaction: ChatInputCommandInteraction) {

    if (interaction.guild == null) return;

    const about_me = formate_about_me(interaction.options.getString("content") || "");

    if (about_me.length > 100) {
        return interaction.reply({ content: `\`❌\` ${interaction.user}, ton *about me* ne peut pas faire plus de 100 caractères.` });
    }

    const aboutme_field: Field = { name: 'about_me', value: about_me };
    await set_member_data(interaction.user.id, interaction.guild.id, [aboutme_field]);

    await interaction.reply({ content: `${interaction.user}, ton *about me* est désormais le suivant :\n> "${about_me}"` });

}

export const data = new SlashCommandBuilder()
    .setName('aboutme')
    .setDescription("Modifies the 'about me' section of your profile.")
    .addStringOption(option => option.setName("content").setDescription("The new content of your 'about me'.").setRequired(true));