import { query } from "../structures/database/mysql";
import { client } from "../structures/client/client";
import { boards, give_pixels } from "../structures/place/place";

async function find_and_update_board(server_id: string, channel_id: string, message_id: string, board_id: number) {

    const guild = await client.guilds.fetch(server_id);

    const { boards } = await import(`../structures/place/place`);
    const board = await boards.get(guild, board_id);
    if (board == null) return;

    for (let i = 0; i < board.players.length; i++) {
        board.players[i].number_of_squares = board.squares.filter(s => s.player && s.player.id == board.players[i].id).length;
    }

    const channel = await guild.channels.fetch(channel_id);
    if (channel == null || !channel.isTextBased()) return;

    const message = await channel.messages.fetch(message_id);

    const embed = await board.get_embed();
    const components = board.get_components();

    message.edit({ embeds: [embed], components: components });

}

export async function execute() {

    // Give pixels to players

    setInterval(async () => {

        // 1. Give points to players.

        const rows_users = await query(`SELECT DISTINCT CONCAT(server_id, "/", user_id) FROM PlaceSquares WHERE user_id IS NOT NULL;`);

        for (let i = 0; i < rows_users.length; i++) {

            const [server_id, user_id] = rows_users[i]['CONCAT(server_id, "/", user_id)'].split("/");

            const rows = await query(`SELECT user_id FROM PlaceSquares WHERE server_id = '${server_id}' AND user_id = '${user_id}';`);
            const gained_pixels = Math.ceil(Math.log2(rows.length + 1));

            await give_pixels(server_id, user_id, gained_pixels);
        }

        // 2. Then remove squares (maybe)

        const rows_squares = await query(`SELECT square_id, server_id, board_id, user_id FROM PlaceSquares;`);

        for (let i = 0; i < rows_squares.length; i++) {

            const square_data = rows_squares[i];
            if (square_data.user_id == null) continue;

            const guild = await client.guilds.fetch(square_data.server_id);
            if (guild == null) return;

            const board = await boards.get(guild, square_data.board_id);
            if (board == null) continue;

            const n = Math.random();

            /*
             * Soit n = 16 * 10 * 10 = 160, p = 0.005.
             * Alors d'après la loi binomiale, P(X  = k) = C(n, k) * p^k * (1 - p)^{n - k}
             * En particulier :                P(X >= 1) = 1 - P(X = 0) = (1 - p)^n = 0.995^160 ~ 0.45
             * C'est-à-dire qu'après 10 minutes, il y a 45% de chance qu'au moins 1 case ait été neutralisée.
             */
            if (n > 0.0025) continue;

            const square = board.squares[square_data.square_id];
            if (!square.player) continue;

            square.player.number_of_squares -= 1;

            const NO_TEAM_EMOJI = "<:blank:1275406305271742527>";
            let action = `**[${square.player.emoji} ↦ ${NO_TEAM_EMOJI}]** La case n°**${square.square_id}** a été neutralisée (elle était à <@!${square_data.user_id}>) !`;

            const channel = await guild.channels.fetch('1258167827572199436');
            
            if (channel?.isTextBased()) {
                
            const text_board_link = `\n-# Plateau n°**${square_data.board_id}** : https://discord.com/channels/${board.server_id}/${board.channel_id}/${board.message_id}`;
                await channel.send({ content:action + text_board_link, allowedMentions: { parse: [] }});
            }

            board.add_action(action);
            square.update(null);

        }


        // 3. Then update every board.

        const rows_boards = await query(`SELECT * FROM PlaceBoards WHERE channel_id IS NOT NULL AND message_id IS NOT NULL;`);

        for (let i = 0; i < rows_boards.length; i++) {

            const board = rows_boards[i];
            await find_and_update_board(board.server_id, board.channel_id, board.message_id, board.board_id);

        }

    }, 10000);

    // Update embed

}