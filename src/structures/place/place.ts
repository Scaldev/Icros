import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, Guild, GuildMember } from "discord.js";
import { query } from "../database/mysql";
import { RowDataPacket } from "mysql2";

// ###################################################################################################### \\
// #                                            GLOBAL VARIABLES                                        # \\
// ###################################################################################################### \\

const NO_TEAM_EMOJI = "<:blank:1275406305271742527>";
const DEFAULT_TEAM_EMOJI = "<:couleur_gris:1269753801590571079>";

let role_id_to_emoji: { [k: string]: string } = {};
const rows = await query(`SELECT emoji, role_id FROM Products INNER JOIN Roles ON Products.item_id = Roles.id;`);

for (let i = 0; i < rows.length; i++) {
    role_id_to_emoji[rows[i].role_id] = rows[i].emoji;
}

// ###################################################################################################### \\
// #                                                CLASSES                                             # \\
// ###################################################################################################### \\

class Item {

    id: number;
    name: string;
    emoji: string;
    scarcity_level: number;

    constructor(id: number, name: string, emoji: string, scarcity_level: number) {
        this.id = id;
        this.name = name;
        this.emoji = emoji;
        this.scarcity_level = scarcity_level;
    }

}

class Player {

    id: string;
    emoji: string;
    items: Item[];
    cooldown: Date | null;
    number_of_squares: number;

    constructor(id: string) {
        this.id = id;
        this.emoji = DEFAULT_TEAM_EMOJI;
        this.items = [];
        this.cooldown = null;
        this.number_of_squares = 0;
    }

    put_in_cooldown(time_seconds: number) {

        const end_of_cooldown = new Date();
        const time_cd = time_seconds * Math.max(this.number_of_squares, 1);

        end_of_cooldown.setSeconds(end_of_cooldown.getSeconds() + time_cd);
        this.cooldown = end_of_cooldown;

        setTimeout(() => {
            this.cooldown = null;
        }, time_cd * 1000);
    }

    update_emoji(member: GuildMember) {

        for (let role in role_id_to_emoji) {
            if (member.roles.cache.has(role)) {
                this.emoji = role_id_to_emoji[role];
            }
        }
    }

}

class Square {

    server_id: string;
    board_id: number;
    square_id: number;

    item: Item | null;
    player: Player | null;
    emoji: string | null;

    button: ButtonBuilder;

    constructor(server_id: string, board_id: number, square_id: number, item: Item | null, player: Player | null, emoji: string) {

        this.server_id = server_id;
        this.board_id = board_id;
        this.square_id = square_id;

        this.item = item;
        this.player = player;
        this.emoji = emoji;

        this.button = new ButtonBuilder()
            .setCustomId(`place/${server_id}/${board_id}/${square_id}`)
            .setStyle(ButtonStyle.Secondary)
            .setEmoji(emoji || NO_TEAM_EMOJI);

    }

    async update(player: Player | null) {

        this.emoji = player != null ? player.emoji : null;
        this.player = player;

        if (this.item != null && player != null) {
            player.items.push(this.item);
            this.item = null;
        }

        this.button.setEmoji(this.player?.emoji || NO_TEAM_EMOJI);

        await query(`UPDATE PlaceSquares SET user_id = ${this.player ? `'${this.player.id}'` : "NULL"}, emoji = ${this.emoji ? `'${this.emoji}'` : "NULL"} WHERE server_id = '${this.server_id}' AND board_id = ${this.board_id} AND square_id = ${this.square_id};`);
    }

}

class Board {

    server_id: string;
    channel_id: string | null;
    message_id: string | null;
    board_id: number;

    cooldown: number;
    end: Date | null;

    players: Player[];
    squares: Square[];
    last_actions: string[];

    constructor(server_id: string, board_id: number, channel_id: string | null, message_id: string | null, cooldown: number, end: Date | null) {

        this.server_id = server_id;
        this.channel_id = channel_id;
        this.message_id = message_id;

        this.board_id = board_id;

        this.cooldown = cooldown;
        this.end = end;

        this.players = [];
        this.squares = [];
        this.last_actions = [];

    }

    add_player(member: GuildMember | string) {

        const user_id = typeof member == 'string' ? member : member.id;
        const player = new Player(user_id);

        if (typeof member != 'string') {
            player.update_emoji(member);
        }
        this.players.push(player);

        return player;

    }

    add_square(square: Square) {
        this.squares.push(square);
    }

    add_action(content: string) {

        this.last_actions.push(content);
        if (this.last_actions.length > 5) {
            this.last_actions.shift();
        }
    }

    get_components() {

        const components = [];
        const length = Math.sqrt(this.squares.length);

        for (let i = 0; i < length; i++) {

            const row = new ActionRowBuilder<ButtonBuilder>();

            for (let j = 0; j < length; j++) {
                const index = i * length + j;
                row.addComponents(this.squares[index].button);
            }

            components.push(row);
        }

        return components;
    }

    #get_text_players(rows_members: RowDataPacket[]) {

        const members_to_pixels = Object.fromEntries(rows_members.map(row => [row.user_id, row.pixels || 0])) as { [k: string]: number };
        const leaderboard = this.players.filter(p => p.number_of_squares > 0).sort((a, b) => members_to_pixels[b.id] - members_to_pixels[a.id]);
        
        let text_players = "### Classement des joueurs";

        for (let i = 0; i < leaderboard.length; i++) {
            
            const user = leaderboard[i];
            const pixels = members_to_pixels[user.id] / 100;
            const s1 = user.number_of_squares >= 2 ? 's' : '';
            const s2 = pixels >= 2 ? 's' : '';

            const player = this.players.filter(p => p.id == user.id)[0];
            const emoji = player.emoji;

            const space = i + 1 < 10 ? ' ' : '';
            text_players += `\n\`${space}${i + 1}\` - ${emoji} <@!${user.id}> : **${pixels}** point${s2} (**${user.number_of_squares}** case${s1}).`;
        }

        if (leaderboard.length == 0) text_players += "\nAucun joueur n'est sur le plateau.";

        return text_players;
    }

    async get_embed() {

        const rows_members = await query(`SELECT user_id, pixels, team FROM Members WHERE server_id = '${this.server_id}'`);

        const text_players = this.#get_text_players(rows_members);

        let text_actions = "### Dernières actions";

        for (let i = 0; i < this.last_actions.length; i++) {
            text_actions += `\n- ${this.last_actions[i]}`;
        }

        if (this.last_actions.length == 0) {
            text_actions += "\nAucune action effectuée pour l'instant.";
        }

        // Team distribution, pixels

        const embed = new EmbedBuilder()
            .setColor('#f1884b')
            .setDescription(`${text_players}\n${text_actions}`);

        return embed;

    }

}

class Boards {

    cache: { [server_id: string]: { [board_id: number]: Board }; };

    constructor() {
        this.cache = {};
    }

    async get(guild: Guild, board_id: number) {

        if (this.cache[guild.id] && this.cache[guild.id][board_id]) {
            return this.cache[guild.id][board_id];
        }

        // 1. Create default board

        const rows_boards = await query(`SELECT * FROM PlaceBoards WHERE server_id = '${guild.id}' AND board_id = ${board_id};`);
        if (rows_boards.length == 0) return null;

        const board_data = rows_boards[0];

        const board = new Board(guild.id, board_id, board_data.channel_id, board_data.message_id, board_data.cooldown, board_data.end);

        // 2. Add squares to the board

        const rows_squares = await query(`SELECT * FROM PlaceSquares WHERE server_id = '${guild.id}' AND board_id = ${board_id} ORDER BY square_id;`);

        for (let square_id = 0; square_id < rows_squares.length; square_id++) {

            const square_data = rows_squares[square_id];

            // 2.a Get the player on it

            const user_on_square_id: string | null = square_data.user_id;
            let player_on_square = null;

            if (user_on_square_id != null) {

                const players_filtered = board.players.filter(player => player.id == user_on_square_id);
                const member = await guild.members.fetch(user_on_square_id);

                player_on_square = players_filtered.length == 0
                    ? board.add_player(member || user_on_square_id)
                    : players_filtered[0];

                player_on_square.number_of_squares += 1;

            }

            // 2.b Get the item on it

            const items_filtered = items.filter(item => item.id == square_data.item_id);
            const item_on_square = items_filtered.length != 0 ? items_filtered[0] : null;

            const square = new Square(guild.id, board_id, square_id, item_on_square, player_on_square, square_data.emoji);

            board.add_square(square);
        }

        // 3. Return the board

        if (!this.cache[guild.id]) {
            this.cache[guild.id] = {};
        }

        if (!this.cache[guild.id][board_id]) {
            this.cache[guild.id][board_id] = board;
        }

        return board;


    }

}

// ###################################################################################################### \\
// #                                               INSTANCES                                            # \\
// ###################################################################################################### \\

const items: Item[] = [];

let boards = new Boards();

// ###################################################################################################### \\
// #                                               FUNCTIONS                                            # \\
// ###################################################################################################### \\

export async function give_pixels(server_id: string, user_id: string, amount: number) {

    await query(`UPDATE Members SET pixels = pixels + ${amount} WHERE server_id = '${server_id}' AND user_id = '${user_id}';`)

}


export {
    Square,
    Player,
    boards,
}