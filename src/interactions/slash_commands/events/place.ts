import { ChatInputCommandInteraction, Guild } from 'discord.js';
import { SlashCommandBuilder } from '@discordjs/builders';
import { query, queries } from '../../../structures/database/mysql';
import { boards } from '../../../structures/place/place';

async function create_board(server_id: string, board_id: number, cooldown: number, end: number | null) {

    let end_date = null;
    if (end != undefined) {
        const now = new Date();
        end_date = `'${new Date(now.getTime() + end * 60000)}'`;
    }

    console.log(end_date);

    await query(`INSERT INTO PlaceBoards(server_id, board_id, cooldown, end) VALUES('${server_id}', ${board_id}, ${cooldown}, ${end_date});`);

    let input = "";
    const length = 4;

    for (let i = 0; i < length; i++) {
        for (let j = 0; j < length; j++) {

            const square_id = i * length + j;
            input += `INSERT INTO PlaceSquares(server_id, board_id, square_id) VALUES('${server_id}', ${board_id}, ${square_id});`;
        }
    }
    await queries(input);

    return { content: `Le plateau n°${board_id} vient d'être créé.` };


}

async function delete_board(server_id: string, board_id: number) {

    await query(`DELETE FROM PlaceSquares WHERE server_id = '${server_id}' AND board_id = ${board_id};`);
    await query(`DELETE FROM PlaceBoards WHERE server_id = '${server_id}' AND board_id = ${board_id};`);

    delete boards.cache[server_id]?.[board_id];

    return { content: `Le plateau n°${board_id}, s'il existait, a été supprimé.` };
}

async function display_board(guild: Guild, board_id: number) {

    const { boards } = await import(`../../../structures/place/place`);
    const board = await boards.get(guild, board_id);

    if (board == null) {
        return { content: `Ce plateau n'existe pas. Merci d'entrer un identifiant valide (cf \`/place manage\`).`, ephemeral: true }
    }

    const components = board.get_components();

    return { content: `**Plateau de jeu n°${board_id}.** (cooldown: ${board.cooldown} secondes).`, components: components };

}

async function display_board_list(guild: Guild) {

    const rows = await query(`SELECT * FROM PlaceBoards WHERE server_id = '${guild.id}' ORDER BY board_id DESC;`)

    let text = "**Liste des plateaux en cours :**\n";
    for (let i in rows) {
        text += `\`${rows[i].board_id}\` - date de fin : **${rows[i].end}** - cooldown : **${rows[i].cooldown}**.`;
    }

    return { content: text };

}

async function remove_previous_main(guild: Guild, board_id: number) {

    const rows = await query(`SELECT channel_id, message_id FROM PlaceBoards WHERE server_id = '${guild.id}' AND board_id = ${board_id} AND channel_id IS NOT NULL AND message_id IS NOT NULL;`);

    if (rows.length == 0) return;

    const channel = await guild.channels.fetch(rows[0].channel_id);
    if (channel == null || !channel.isTextBased()) return;

    const message = await channel.messages.fetch(rows[0].message_id);
    await message.edit({ content: `Ce plateau n'est plus à jour ou a été supprimé.`, components: [] });

}

/**
 * @param interaction a slash command.
 */
export async function execute(interaction: ChatInputCommandInteraction) {

    // 1. Restrictions

    if (!interaction.inCachedGuild()) {
        return interaction.reply({ content: `Cette commande ne peut être utilisée que dans un serveur.`, ephemeral: true });
    }

    if (!interaction.channel) return;

    const role_event_id = '477850703285714944'; // TODO: actuellement Equipe Admin, remettre Equipe Anim (pour l'event final pour l'instant).
    if (!interaction.member.roles.cache.has(role_event_id)) {
        return interaction.reply({ content: `Tu n'as pas la permission d'utiliser cette commande.`, ephemeral: true });
    }

    const subcommand = interaction.options.getSubcommand();

    let reply = {};

    switch (subcommand) {

        case 'create':

            const cooldown = interaction.options.getInteger('cooldown') || 1 * 60;
            const end = interaction.options.getInteger('end') || null;
            const rows = await query(`SELECT * FROM PlaceBoards WHERE server_id = '${interaction.guild.id}';`);

            reply = await create_board(interaction.guild.id, rows.length + 1, cooldown, end);
            await interaction.reply(reply);

            break;

        case 'delete':

            const board_id_delete = interaction.options.getInteger('id');

            if (board_id_delete == null) return;

            await remove_previous_main(interaction.guild, board_id_delete);
            reply = await delete_board(interaction.guild.id, board_id_delete);
            await interaction.reply(reply);

            break;

        case 'display':

            const board_id_display = interaction.options.getInteger('id') || 0;
            const is_main = interaction.options.getBoolean('main') || false;

            if (!is_main) {
                reply = { content: `Statistiques sur ce plateau. **TODO**` };
                return interaction.reply({ content: `Statistiques sur ce plateau. **TODO**` });
            }

            await remove_previous_main(interaction.guild, board_id_display);
            reply = await display_board(interaction.guild, board_id_display);
            await interaction.reply({ content: `Le message est sur le point d'être posté.`, ephemeral: true });
            const message = await interaction.channel.send(reply);

            await query(`UPDATE PlaceBoards SET channel_id = '${message.channel.id}', message_id = '${message.id}' WHERE server_id = '${message.guild.id}' AND board_id = '${board_id_display}';`);

            break;

        case 'manage':

            reply = await display_board_list(interaction.guild);
            await interaction.reply(reply);

            break;

    }

}

export const data = new SlashCommandBuilder()
    .setName('place')
    .setDescription("Start, end or display a place board.")
    .addSubcommand(subcommand => subcommand
        .setName('create')
        .setDescription('Start a new board, returning its id.')
        .addIntegerOption(option => option.setName('cooldown').setDescription('The number of secondes between each button click.').setRequired(true))
        .addIntegerOption(option => option.setName('end').setDescription("The number of minutes before the end of the game. If none, the game won't stop."))
    )
    .addSubcommand(subcommand => subcommand
        .setName('edit')
        .setDescription('Edit an existing board.')
        .addIntegerOption(option => option.setName('id').setDescription('The id a board.').setRequired(true))
        .addIntegerOption(option => option.setName('cooldown').setDescription('The number of seconds before a player can click again after clicking.').setRequired(true))
        .addIntegerOption(option => option.setName('end').setDescription("The number of minutes before the end of the game. If none, the game won't stop."))
    )
    .addSubcommand(subcommand => subcommand
        .setName('delete')
        .setDescription('Close a board.')
        .addIntegerOption(option => option.setName('id').setDescription('The id a board.').setRequired(true))
    )
    .addSubcommand(subcommand => subcommand
        .setName('display')
        .setDescription('Display a specific board.')
        .addIntegerOption(option => option.setName('id').setDescription('The id a board.').setRequired(true))
        .addBooleanOption(option => option.setName('main').setDescription("If set to true, will be the only message that can be interacted with."))
    )
    .addSubcommand(subcommand => subcommand
        .setName('manage')
        .setDescription('Display all active boards.')
    );