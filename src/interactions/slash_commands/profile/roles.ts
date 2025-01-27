import { SlashCommandBuilder } from '@discordjs/builders';
import { ChatInputCommandInteraction, EmbedBuilder, Guild, PermissionFlagsBits, Role } from "discord.js";

import { query } from '../../../structures/database/mysql';

// ###################################################################################################### \\
// #                                        PRIVATES FUNCTIONS                                          # \\
// ###################################################################################################### \\

/**
 * @param server_id 
 * @param role_id 
 * @param price 
 * @param emoji
 * @returns 
 */
async function set_role(server_id: string, role_id: string, price: number | null, emoji: string | null) {

    const rows1 = await query(`SELECT * FROM Products INNER JOIN Roles ON Products.item_id = Roles.id WHERE Roles.server_id = '${server_id}' AND Roles.role_id = '${role_id}';`);

    if (rows1.length != 0) {

        if (emoji == null) emoji = rows1[0].emoji;
        if (price == null) price = rows1[0].price;

        await query(`UPDATE Products INNER JOIN Roles ON Products.item_id = Roles.id SET price = ${price}, emoji = '${emoji}' WHERE Roles.server_id = '${server_id}' AND Roles.role_id = '${role_id}';`);
        return `${emoji} Le rôle **<@&${role_id}>** (id: \`${role_id}\`) a été modifié : il coûte **${price} oeufs** l'unité.`;
        
    }

    const discord_emojis_regex = /<?(a)?:?(\w{2,32}):(\d{17,19})>?/;

    if (emoji == null || !(discord_emojis_regex.test(emoji))) emoji = "";
    if (price == null) price = 0;

    await query(`INSERT INTO Roles(server_id, role_id) VALUES('${server_id}', '${role_id}');`);

    const rows2 = await query(`SELECT id FROM Roles WHERE role_id = '${role_id}';`);
    const item_id = rows2[0].id;

    await query(`INSERT INTO Products(server_id, item_id, price, type, emoji) VALUES('${server_id}', ${item_id}, ${price}, 1, '${emoji}');`)

    return `${emoji} Le rôle **<@&${role_id}>** (id: \`${role_id}\`) a été ajouté. il coûte **${price} oeufs** l'unité.`;

}

/**
 * @param server_id 
 * @param role_id 
 * @returns 
 */
async function remove_role(server_id: string, role_id: string) {

    await query(`DELETE FROM Roles WHERE server_id = '${server_id}' AND role_id = '${role_id}';`);

    const description = `Le rôle **<@!${role_id}>** (id: \`${role_id}\`) a été retiré.`;

    return description;
}

/**
 * @param guild 
 * @returns 
 */
async function clean_roles(guild: Guild) {

    const rows = await query(`SELECT * FROM Roles WHERE server_id = '${guild.id}';`);

    let description = "";
    for (let i = 0; i < rows.length; i++) {
        if (!guild.roles.cache.get(rows[i].role_id)) {
            description += await remove_role(guild.id, rows[i].role_id);
        }
    }

    if (description == "") description = "Tous les rôles de l'entrepôt sont bien présents sur le serveur.";

    return description;
}

/**
 * @param server_id 
 * @returns 
 */
async function display_roles(server_id: string) {

    const rows = await query(`SELECT * FROM Roles WHERE server_id = '${server_id}' ORDER BY price;`);

    let description = "";
    for (let i = 0; i < rows.length; i++) {
        description += `- (\`${rows[i].role_id}\`) <@&${rows[i].role_id}> : **${rows[i].price} oeufs**.\n`;
    }

    if (description == "") description = "L'entrepôt est vide.";

    return description;

}

/**
 * @param interaction a slash command.
 */
export async function execute(interaction: ChatInputCommandInteraction) {

    if (!interaction.inCachedGuild()) {
        return interaction.reply({ content: `Cette commande ne peut être utilisée que dans un serveur.` });
    }

    const subcommand = interaction.options.getSubcommand();
    const role = interaction.options.getRole('role');
    const price = interaction.options.getInteger('price');
    const emoji = interaction.options.getString('emoji');

    const server_id = interaction.guild.id;

    let description = "";

    // Set a role
    if (subcommand == 'set') {

        if (role == null) return;
        description = await set_role(server_id, role.id, price, emoji);

    // Remove a role
    } else if (subcommand == 'remove') {

        if (role == null) return;
        description = await remove_role(interaction.guild.id, role.id);

    // Clean
    } else if (subcommand == 'clean') {
        description = await clean_roles(interaction.guild);

    // Display
    } else {
        description = await display_roles(interaction.guild.id);
    }

    if (description == "") {
        return interaction.reply({ content: `${interaction.user}, ta requête a rencontré un problème.` });
    }

    const embed = new EmbedBuilder()
        .setColor('#714141')
        .setDescription(description);

    return interaction.reply({ content: `${interaction.user}, ta requête a bien été effectuée.`, embeds: [embed] });

}

export const data = new SlashCommandBuilder()
    .setName('roles')
    .setDescription("Manages the role storage.")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(subcommand => subcommand
        .setName('set')
        .setDescription('Set a role in the storage with a specific price.')
        .addRoleOption(option => option.setName('role').setDescription('The role receiving the action.').setRequired(true))
        .addIntegerOption(option => option.setName('price').setDescription('The price of a having this role for a month (0 or same by default).'))
        .addStringOption(option => option.setName('emoji').setDescription('The displayed emoji (none by default).'))
    )
    .addSubcommand(subcommand => subcommand
        .setName('remove')
        .setDescription('Remove a role from the storage.')
        .addRoleOption(option => option.setName('role').setDescription('The role being removed from the storage.').setRequired(true))
    )
    .addSubcommand(subcommand => subcommand
        .setName('clean')
        .setDescription('Remove from the storage every role which does not exist anymore.')
    )
    .addSubcommand(subcommand => subcommand
        .setName('display')
        .setDescription('Displays the role storage content.')
    );