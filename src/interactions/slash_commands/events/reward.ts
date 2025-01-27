import { ChatInputCommandInteraction } from 'discord.js';
import { SlashCommandBuilder } from '@discordjs/builders';

import { Field, get_member_data, set_member_data } from '../../../structures/database/tables.js';

/**
 * @param interaction a slash command.
 * Changes the 'about me' section of the user's profile.
 */
export async function execute(interaction: ChatInputCommandInteraction) {

    // 1. Restrictions

    if (!interaction.inCachedGuild()) {
        return interaction.reply({ content: `Cette commande ne peut être utilisée que dans un serveur.` });
    }

    const role_event_id = '1258177165669695619';
    if (!interaction.member.roles.cache.has(role_event_id)) {
        return interaction.reply({ content: `Tu n'as pas la permission d'utiliser cette commande.` });
    }

    // 2. Get the data

    const user = interaction.options.getUser("member") || interaction.user;
    const amount = interaction.options.getInteger("amount") || 0;

    const s = Math.abs(amount) >= 2 ? 's' : '';
    const terme = amount >= 0 ? 'gagné' : 'perdu';
    let text = `${user} a bien ${terme} **${Math.abs(amount)} oeuf${s}** 🥚.`;

    const user_id = user.id;
    const guild_id = interaction.guild.id;

    // 3. Update the database

    const memberDB = await get_member_data(user_id, guild_id, 'money, team');

    const money_field: Field = { name: 'money', value: memberDB.money + amount };

    await set_member_data(user_id, guild_id, [money_field])

    // 4. Final message

    await interaction.reply({ content: text });

}

export const data = new SlashCommandBuilder()
    .setName('reward')
    .setDescription("Give the member X amount of money.")
    .addUserOption(option => option.setName("member").setDescription("The member whom will get the reward.").setRequired(true))
    .addIntegerOption(option => option.setName("amount").setDescription("The number of money the member will get (can be negative).").setRequired(true));