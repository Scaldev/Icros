import { ActionRowBuilder, EmbedBuilder, ComponentType, ButtonBuilder, ButtonStyle, ChatInputCommandInteraction } from 'discord.js';
import { SlashCommandBuilder } from '@discordjs/builders';

import { query } from '../../../structures/database/mysql.js';
import { RowDataPacket } from 'mysql2';

// ################################## CONSTANTS ################################## \\

class Leaderboard {

    singular: string;
    plural: string;
    emoji: string;
    field: string;

    constructor(field: string, singular: string, plural: string, emoji: string) {
        this.field = field;
        this.singular = singular;
        this.plural = plural;
        this.emoji = emoji;

    }

}

const money_lb = new Leaderboard('money', 'Œuf', 'Œufs', '🥚');
const exp_lb = new Leaderboard('exp', 'EXP', 'EXP', '🫧');
const streak_lb = new Leaderboard('daily_streak', 'Streak', 'Streak', '📆');
const rep_lb = new Leaderboard('rep_points', 'Point de réputation', 'Points de réputation', '🎖');
const point_lb = new Leaderboard('points', 'Point', 'Points', '🌈');
const pixels_lb = new Leaderboard('pixels', 'Pixel', 'Pixels', '🌈');

const leaderboards = [money_lb, exp_lb, streak_lb, rep_lb, point_lb, pixels_lb];

const field_choices = leaderboards.map(l => {
    return { name: `${l.emoji} ${l.plural}`, value: l.field }
});

// ############################## PRIVATE FUNCTIONS ############################## \\

/**
 * @param leaderboard the selected field in the slash command.
 * @param rows the entries found in the database for this specific field.
 * @param page the page of 10 entries to display.
 * @returns the text of 10 entries depending on the field and the page specified.
 */
function get_leaderboard_text(leaderboard: Leaderboard, rows: RowDataPacket[], page: number) {

    let results = ``;
    let i = (page - 1) * 10;

    while (i < page * 10 && i < rows.length) {

        let value = rows[i][leaderboard.field];
        if (leaderboard.field == 'pixels') value /= 100;

        if (value > 0) {
            let rank = i + 1;
            let user = ` <@!${rows[i].user_id}>`;
            let description = (value >= 2 ? leaderboard.plural : leaderboard.singular).toLowerCase();
            results += `**${rank}.** ${user} : ${value} ${description}.\n`;
        }

        i++;

    }

    if (results === "") {
        results = "Le classement est vide.";
    }

    return results;
}

/**
 * @param the current leaderboard page. 
 * @param max_page the last page of the leaderboard containing entries. 
 * @returns the action row of the buttons to send in the leaderboard message.
 */
function get_leaderboard_buttons(page: number, max_page: number) {

    const leaderboard_emojis = ['⏪', '◀️', '▶️', '⏩'];
    const row = new ActionRowBuilder<ButtonBuilder>();

    for (let i = 0; i < leaderboard_emojis.length; i++) {

        let is_leftmost_page = (page <= 1 && i == 0) || (page <= 1 && i == 1);
        let is_rightmost_page = (page >= max_page && i == 2) || (page >= max_page && i == 3);

        const button = new ButtonBuilder()
            .setStyle(ButtonStyle.Secondary)
            .setCustomId(`button/leaderboard/${i}`)
            .setEmoji(leaderboard_emojis[i])
            .setDisabled(is_leftmost_page || is_rightmost_page);

        row.addComponents(button);
    }

    return row;
}

// ############################## PUBLIC FUNCTIONS ############################## \\

/**
 * @param interaction a slash command.
 */
export async function execute(interaction: ChatInputCommandInteraction) {

    await interaction.deferReply();

    // 1. Get the data

    const field = interaction.options.getString("field") || "money";

    const leaderboard = leaderboards.filter(l => l.field === field)[0];

    const input = `SELECT user_id, ${field} FROM Members WHERE ${field} != 0 ORDER BY ${field} DESC;`;
    const rows = await query(input);

    let page = 1;
    const max_page = Math.max(Math.ceil(rows.length / 10), 1);

    // 2. Build the response

    const embed = new EmbedBuilder()
        .setColor('#805141')
        .setTitle(`Classement des ${leaderboard.plural.toLowerCase()} ${leaderboard.emoji}`);

    let text = get_leaderboard_text(leaderboard, rows, page);

    const start_embed = embed.setDescription(`${text}`);
    const start_row = get_leaderboard_buttons(page, max_page);

    const response = await interaction.editReply({ content: `${interaction.user}, voici le classement.`, embeds: [start_embed], components: [start_row] });
    const message = await interaction.fetchReply();

    // 3. Collect interactions

    const time = 1 * 60 * 1000; // 1 minute
    const collector = response.createMessageComponentCollector({ componentType: ComponentType.Button, time: time });

    collector.on('collect', async (i) => {

        const button_id = i.customId.split('/');
        const selection = button_id[button_id.length - 1];

        switch (selection) {
            case '0': page = 1; break;
            case '1': page = page - 1; break;
            case '2': page = page + 1; break;
            case '3': page = max_page; break;
        }

        text = get_leaderboard_text(leaderboard, rows, page);

        const updated_embed = start_embed.setDescription(text);
        const updated_row = get_leaderboard_buttons(page, max_page);

        await i.update({ embeds: [updated_embed], components: [updated_row] });
    });

    collector.on('end', () => {
        message.edit({ components: [] });
    });

}

export const data = new SlashCommandBuilder()
    .setName('leaderboard')
    .setDescription("Displays the leaderboard of a specific field.")
    .addStringOption(option => option
        .setName("field")
        .setDescription("The leaderboard's field.")
        .addChoices(field_choices)
        .setRequired(true)
    );