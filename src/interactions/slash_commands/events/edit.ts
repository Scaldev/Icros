import { ChatInputCommandInteraction, PermissionFlagsBits } from "discord.js";
import { SlashCommandBuilder } from '@discordjs/builders';

import { Field, set_member_data, get_member_data } from '../../../structures/database/tables';

export async function execute(interaction: ChatInputCommandInteraction) {

    if (!interaction.inCachedGuild()) {
        return interaction.reply({ content: `Cette commande ne peut être utilisée que dans un serveur.` });
    }

    const member = interaction.options.getUser("member") || interaction.user;
    const user_id = member.id;
    const server_id = interaction.guild.id;

    const member_before = await get_member_data(user_id, server_id, '*');
    const fields_names = ["about_me", "money", "exp", "rep_points", "daily_streak", "daily_last", "points", "pixels"];

    let fields: Field[] = [];
    let text_edits: string[] = [];

    for (let i = 0; i < fields_names.length; i++) {

        const field = fields_names[i];
        const option = interaction.options.get(field);
        if (option == null || option.value == null) continue;

        const value = typeof option.value == 'string'
            ? `'${option.value.replace(/\'/g, "\\'").replace(/\n/g, "")}'`
            : option.value.toString();

        fields.push({ name: field, value: value });
        text_edits.push(`- **${field}** : **\`${member_before[field]}\`** → **\`${value}\`**`);
    }

    await set_member_data(user_id, server_id, fields);

    await interaction.reply({ content: `Liste des modifications apportées au profil de **${member.username}** : \n${text_edits.join('\n')}` });

}
export const data = new SlashCommandBuilder()

    .setName('edit')
    .setDescription("Edit the member's data.")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addUserOption(option => option.setName("member").setDescription("The member whom data is being edited.").setRequired(true))
    .addStringOption(option => option.setName("about_me").setDescription("The member's new about me.").setMaxLength(100))
    .addIntegerOption(option => option.setName("money").setDescription("The member's new amount of money."))
    .addIntegerOption(option => option.setName("exp").setDescription("The member's new amount of exp."))
    .addIntegerOption(option => option.setName("rep_points").setDescription("The member's new amount of reputation points."))
    .addIntegerOption(option => option.setName("daily_streak").setDescription("The member's daily streak."))
    .addStringOption(option => option.setName("daily_last").setDescription("The member's last collected reward date (format YYYY-MM-DD)."))
    .addIntegerOption(option => option.setName("points").setDescription("The member's number of points."))
    .addIntegerOption(option => option.setName("pixels").setDescription("The member's number of pixels."));