import { ChatInputCommandInteraction } from 'discord.js';
import { SlashCommandBuilder } from '@discordjs/builders';

import { query } from '../../../structures/database/mysql.js';
import { get_member_data, set_member_if_needed } from '../../../structures/database/tables.js';

export
    /**
     * @param interaction a slash command.
     */
    async function execute(interaction: ChatInputCommandInteraction) {

    if (!interaction.inCachedGuild() || !interaction.user) {
        return interaction.reply({ content: `Cette commande ne peut être utilisée que dans un serveur.` });
    }

    const server_id = interaction.guild.id;
    const user1 = interaction.user;
    const user2 = interaction.options.getUser('member') || user1;
    const amount = interaction.options.getInteger('amount') || 0;

    const member1DB = await get_member_data(user1.id, server_id, 'money');
    await set_member_if_needed(user2.id, server_id);

    if (member1DB.money < amount) {
        let s = member1DB.money >= 2 ? 's' : '';
        return interaction.reply({ content: `${interaction.user}, tu as **${member1DB.money} oeuf${s}** 🥚, donc tu ne peux pas en donner **${amount}**.` });
    }

    await query(`UPDATE Members SET money = money - ${amount} WHERE user_id = '${user1.id}' AND server_id = '${server_id}';`);
    await query(`UPDATE Members SET money = money + ${amount} WHERE user_id = '${user2.id}' AND server_id = '${server_id}';`);

    let s = amount >= 2 ? 's' : '';
    return interaction.reply({ content: `${interaction.user}, tu as bien donné **${amount} oeuf${s}** 🥚 à ${user2}.` });

}
export const data = new SlashCommandBuilder()
    .setName('give')
    .setDescription("Gives money to a user.")
    .addUserOption(option => option.setName("member").setDescription("The user to give money to.").setRequired(true))
    .addIntegerOption(option => option.setName("amount").setDescription("The amount of money to give to the user.").setRequired(true).setMinValue(0));