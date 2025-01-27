import { ChatInputCommandInteraction, EmbedBuilder } from 'discord.js';
import { SlashCommandBuilder } from '@discordjs/builders';

import { get_member_data } from '../../../structures/database/tables.js';
import { exp_to_level, level_to_exp } from '../../../structures/exp/exp.js';

/**
 * @param interaction a slash command.
 * Reply to the slash command with the user's data.
 */
export async function execute(interaction: ChatInputCommandInteraction) {

    if (interaction.guild == null) return;

    const user = interaction.options.getUser("user") || interaction.user;

    await interaction.deferReply();

    const member = await get_member_data(user.id, interaction.guild.id, '*');

    // 1. About me, team
    let description = `"${member.about_me || "Utilise `/aboutme` pour modifier ta signature !`"}"`;

    // 2. EXP, level
    const level = exp_to_level(member.exp);
    const exp_for_next_level = level_to_exp(level + 1);

    // 3. Fields
    const fields = [
        {
            name: 'Œufs :',
            value: `${member.money} oeuf${member.money >= 2 ? 's' : ''}.`,
            inline: true
        },
        {
            name: 'Niveau :',
            value: `Niveau ${level}.`,
            inline: true
        },
        {
            name: 'EXP :',
            value: `${member.exp}/${exp_for_next_level} EXP.`,
            inline: true
        }
    ];

    // 4. Embed
    const profile_embed = new EmbedBuilder()
        .setColor('#3453a5')
        .setAuthor({ name: `Profil de ${user.username}` })
        .setThumbnail(user.displayAvatarURL())
        .setDescription(description)
        .addFields(fields);

    await interaction.editReply({ content: `${interaction.user}, voici le profil de **${user.username}**.`, embeds: [profile_embed] });

}
export const data = new SlashCommandBuilder()
    .setName('profile')
    .setDescription("Displays an user's profile.")
    .addUserOption(option => option.setName("user").setDescription("Displays the profile of this specific user."));