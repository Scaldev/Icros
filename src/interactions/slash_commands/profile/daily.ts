import { ActionRowBuilder, EmbedBuilder, ComponentType, ButtonBuilder, ButtonStyle, ChatInputCommandInteraction, User, ButtonInteraction } from 'discord.js';
import { SlashCommandBuilder } from '@discordjs/builders';

import { query } from '../../../structures/database/mysql.js';
import { get_member_data, set_member_data, Field } from '../../../structures/database/tables.js';

// ###################################################################################################### \\
// #                                            CONSTANTS                                               # \\
// ###################################################################################################### \\

// ############################################## REWARDS ############################################### \\

enum RewardState {
    Displaying,
    Collecting,
    Collected,
    Over
}

class RewardValue {

    threshold: number;
    amount: number;
    label: string;

    constructor(threshold: number, amount: number, label: string) {
        this.threshold = threshold;
        this.amount = amount;
        this.label = label;
    }

};

class Reward {

    table: string;
    field: string;
    description: string;
    emoji: string;
    distribution: RewardValue[];
    index: number

    constructor(table: string, field: string, description: string, emoji: string, distribution: RewardValue[]) {
        this.table = table;
        this.field = field;
        this.description = description;
        this.emoji = emoji;
        this.distribution = distribution;
        this.index = 0;
    }

    set_content(streak: number): Reward {

        const x = Math.random();
        const scarcity = Math.pow(x, (7 - streak % 7) / 4);

        while (this.index + 1 < this.distribution.length && scarcity >= this.distribution[this.index + 1].threshold) {
            this.index++;
        }

        return this;

    }

    get_text(): string {

        const reward_value = this.distribution[this.index];
        const s = reward_value.amount >= 2 && this.field == 'money' ? 's' : '';
        const text = `\n- ${this.emoji} : **${reward_value.amount} ${this.description}${s}** (*${reward_value.label}*) !`;

        return text;
    }

}

const rewards_value_exp = [
    new RewardValue(0, 20, "fréquent"),
    new RewardValue(0.7, 100, "rare"),
    new RewardValue(0.98, 200, "légendaire"),
];

const rewards_value_money = [
    new RewardValue(0, 1, "fréquent"),
    new RewardValue(0.75, 2, "rare"),
    new RewardValue(0.99, 3, "légendaire"),
]

const embed = new EmbedBuilder()
    .setColor('#532a81')
    .setTitle(`Récompense quotidienne`);

const button = new ButtonBuilder()
    .setCustomId(`button/daily/1`)
    .setEmoji('🎁');

// ###################################################################################################### \\
// #                                        PRIVATE FUNCTIONS                                           # \\
// ###################################################################################################### \\

// ########################################### DATE UTILITY ############################################# \\

/**
 * @param date a date.
 * @returns a string "YYYY-MM-DD" corresponding to the date.
 */
function formate_date(date: Date): string {
    return date.toLocaleDateString('fr').split('/').reverse().join('-');
}

/**
 * @param d1 a date.
 * @param d2 another date.
 * @returns true iff d11 and d2 are on the same day.
 */
function are_same_day(d1: Date, d2: Date) {
    return d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth() && d1.getDate() === d2.getDate();
}

/**
 * @param daily_last the last date the member collected their reward.
 * @returns true iff the member collected their reward today.
 */
function has_collected_today(daily_last: Date | null): boolean {

    const today = new Date();
    return daily_last != null && are_same_day(daily_last, today);

}

/**
 * @param daily_last the last date the member collected their reward.
 * @returns true iff the member collected their reward yesterday.
 */
function has_collected_yesterday(daily_last: Date | null): boolean {

    const today = new Date();
    const yesterday = new Date();

    yesterday.setDate(today.getDate() - 1);
    return daily_last != null && are_same_day(daily_last, yesterday);

}

// ########################################### GET REWARDS ############################################# \\

/**
 * @param streak the member's streak.
 * @returns the member's daily reward.
 */
function get_rewards(streak: number): Reward[] {

    const reward_empty_exp = new Reward('Members', 'exp', 'exp', '🫧', rewards_value_exp);
    const reward_empty_money = new Reward('Members', 'money', 'œuf', '🥚', rewards_value_money);

    const reward_exp = reward_empty_exp.set_content(streak);
    const reward_money = reward_empty_money.set_content(streak);

    const rewards = [reward_exp, reward_money];

    // const n = Math.floor(Math.random() * (10 - 1)) + 1;
    // if (n == 1) gift_content.push(gift_pins);

    return rewards;
}

/**
 * @param streak the member's streak.
 * @param daily_last the last date the member collected their reward.
 * @returns their new streak given their streak and daily_last.
 */
function get_streak(streak: number, daily_last: Date | null): number {

    const is_on_streak = has_collected_today(daily_last) || has_collected_yesterday(daily_last);
    const new_streak = is_on_streak ? streak : 0;

    return new_streak;
}

/**
 * Side effect: giving the member the rewards in the database.
 * @param rewards the array of uncollected rewards.
 * @param text the embed description.
 * @param user_id a discord user's id.
 * @param server_id a discord server's id.
 * @returns the text after getting the uncollected rewards.
 */
async function finish_giving_rewards(rewards: Reward[], text: string, user_id: string, server_id: string) {

    while (rewards.length > 0) {

        const reward = rewards.shift();
        if (!reward) break;

        text += reward.get_text();
        await give_reward(user_id, server_id, reward);
    }

    return text;

}

// ############################################# TEXTS ############################################## \\

/**
 * @param streak the member's streak.
 * @returns a string of 7 moon emojis, with as many yellow moons as [streak] % 7.
 */
function get_streak_display(streak: number) {

    const week_streak = (streak != 0 && streak % 7 == 0) ? 7 : streak % 7;
    const days_left = 7 - week_streak;
    const display = '🌕 '.repeat(week_streak) + '🌑 '.repeat(days_left);

    return display;
}

/**
 * @param streak the member's streak.
 * @returns a string describing the member's daily reward data.
 */
function get_embed_text(streak: number, daily_last: Date | null): string {

    const streak_display = get_streak_display(streak);
    const streak_emoji = has_collected_today(daily_last) ? '🔥' : has_collected_yesterday(daily_last) ? '⚠️' : '💨';
    const daily_last_locale = daily_last?.toLocaleDateString('fr') || 'jamais'; // format DD/MM/YYYY

    const x = streak >= 2 ? 'x' : '';
    const s = streak >= 2 ? 's' : '';

    const text =
        `- **Streak :** ${streak} cadeau${x} collecté${s} à la suite.\n` +
        `- **Dernière fois :** ${daily_last_locale} ${streak_emoji}.\n` +
        `\`\`\`    ${streak_display}   \`\`\``;
    return text;
}

/**
 * @param user the discord user whom used the command.
 * @param text the default embed text.
 * @param is_already_collected true iff the user already collected their reward today.
 * @returns 
 */
function get_start_message(user: User, text: string, is_already_collected: boolean) {

    const embed_at_start = embed.setDescription(text);

    const button_update = button
        .setLabel('Ouvrir')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(is_already_collected);

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(button_update);

    const text_collected = is_already_collected ? `tu as déjà collecté ta récompense aujourd'hui.` : `collecte ta récompense quotidienne !`;
    const content = `${user}, ${text_collected}`;

    return { content: content, embeds: [embed_at_start], components: is_already_collected ? [] : [row] };
}

/**
 * @param state the collection state.
 * @param text the new text to put as the embed description.
 * @returns the new message embed and buttons.
 */
function get_updated_message(state: RewardState, text: string) {

    // Embed
    if (state == RewardState.Collected) {
        text += `\nEt c'est tout ! Reviens demain pour ton prochain cadeau.`;
    }
    const embed_collected = embed.setDescription(text);

    // Buttons
    let button_label: string;
    let button_style: ButtonStyle;
    let button_disabled = state == RewardState.Collected;

    switch (state) {

        case RewardState.Displaying:
            button_label = "Ouvrir";
            button_style = ButtonStyle.Secondary;
            break;

        case RewardState.Collecting:
            button_label = "Collecter";
            button_style = ButtonStyle.Primary;
            break;

        case RewardState.Collected:
            button_label = "Déjà collecté";
            button_style = ButtonStyle.Secondary;
            break;

        case RewardState.Over:
            button_label = "Fin de la collecte";
            button_style = ButtonStyle.Secondary;
            break;
    }

    const button_collected = new ButtonBuilder()
        .setCustomId('button/daily/2')
        .setEmoji('🎁')
        .setLabel(button_label)
        .setStyle(button_style)
        .setDisabled(button_disabled);

    const row_collecting = new ActionRowBuilder<ButtonBuilder>()
        .addComponents(button_collected);

    const components = state == RewardState.Over ? [] : [row_collecting];


    return { embeds: [embed_collected], components: components };

}

// ####################################### DATABASE QUERIES ######################################### \\

/**
 * @param member_id the id of a database member. 
 * @param reward a reward.
 */
async function give_reward(user_id: string, server_id: string, reward: Reward) {

    await query(`UPDATE Members SET ${reward.field} = ${reward.field} + ${reward.distribution[reward.index].amount} WHERE user_id = ${user_id} AND server_id = ${server_id};`);

}

/**
 * Update the data related to the daily reward of a member given the member's id.
 * @param member_id the id of a database member.
 */
async function update_member(user_id: string, server_id: string) {

    const today = formate_date(new Date());

    const input = `UPDATE Members SET daily_streak = daily_streak + 1, daily_last = '${today}' WHERE user_id = '${user_id}' AND server_id = '${server_id}';`
    await query(input);

}

// ###################################################################################################### \\
// #                                          MAIN FUNCTION                                             # \\
// ###################################################################################################### \\

/**
 * @param interaction a slash command.
 */
export async function execute(interaction: ChatInputCommandInteraction) {

    if (!interaction.guild) return;

    const user_id = interaction.user.id;
    const server_id = interaction.guild.id;

    let member = await get_member_data(user_id, server_id, 'daily_streak, daily_last');

    // 1. Update daily_streak

    const new_streak = get_streak(member.daily_streak, member.daily_last);

    if (member.daily_streak != new_streak) {
        member.daily_streak = new_streak;
        await query(`UPDATE Members SET daily_streak = 0 WHERE user_id = '${user_id}' AND server_id = '${server_id}';`);
    }

    // 2. Reply
    let text = get_embed_text(member.daily_streak, member.daily_last);
    let is_already_collected = has_collected_today(member.daily_last);

    const start_message = get_start_message(interaction.user, text, is_already_collected);

    const response = await interaction.reply(start_message);

    if (is_already_collected) return;
    
    const message = await interaction.fetchReply();

    // 3. Get button interactions

    const time = 1 * 60 * 1_000; // 1 minute
    const collector = response.createMessageComponentCollector({ componentType: ComponentType.Button, time: time });

    let state = RewardState.Displaying;
    let rewards: Reward[] = [];

    collector.on('collect', async (i: ButtonInteraction) => {

        if (i.user.id !== user_id) {
            return i.update({});
        }

        // 3.a Create the gift content

        if (state == RewardState.Displaying) {

            // Update data

            member = await get_member_data(user_id, server_id, 'daily_streak, daily_last');
            is_already_collected = has_collected_today(member.daily_last);

            state = RewardState.Collecting;
            rewards = get_rewards(member.daily_streak);

            if (is_already_collected) {
                return collector.stop();
            }

            await update_member(user_id, server_id);
            member = await get_member_data(user_id, server_id, 'daily_streak, daily_last');

            const text_reveal_start = `\n\n**Tu as ouvert ton cadeau !** Dedans il y a :`;
            text = get_embed_text(member.daily_streak, member.daily_last) + text_reveal_start;

            const updated_message = get_updated_message(state, text);

            return i.update(updated_message);
        }

        // 3.b Get a reward

        const reward = rewards.shift();

        if (!reward) {
            return collector.stop();
        }

        if (rewards.length == 0) {
            state = RewardState.Collected;
        }

        const reward_text = reward.get_text();
        text += reward_text;
        const update_content = get_updated_message(state, text);

        await give_reward(user_id, server_id, reward);
        await i.update(update_content);

    });

    // 4. End the interaction

    collector.on('end', async () => {

        const text_final = await finish_giving_rewards(rewards, text, user_id, server_id);
        state = RewardState.Over;

        const update_content = get_updated_message(state, text_final);

        try {
            await message.edit(update_content);
        } catch (err) {
            console.log(err);
        }


    });
};

export const data = new SlashCommandBuilder()
    .setName('daily')
    .setDescription("Get a reward each day.")
