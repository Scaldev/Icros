import { get_member_data, set_member_data, set_member_if_needed, Field } from '../database/tables.js';
import { query } from '../database/mysql';

// CONSTANTS

let cooldown: { [key:string]: string[]; } = {};
let COOLDOWN_DURATION_MS = 30_000;

let a = 9;
let n = 1.75;

// PRIVATE FUNCTIONS

async function reward_level_up(user_id: string, server_id: string) {
    
    await query(`UPDATE Members SET money = money + 1 WHERE user_id = '${user_id}' AND server_id = '${server_id}';`);

}

// PUBLIC FUNCTIONS

/**
 * @param exp the number of exp of an user.
 * @returns the user's level.
 */
function exp_to_level(exp: number) {
    return Math.floor((1 / a) * Math.pow(exp, 1 / n));
}

/**
 * @param level the level of an member.
 * @returns the member's amount of exp.
 */
function level_to_exp(level: number) {
    return Math.floor(Math.pow(a * level, n));
}

/**
 * Add EXP to a member if they're not on cooldown.
 * @param user_id a discord user's id.
 * @param server_id the id of a guild.
 * @return the (has_leveled_up, level) couple, with:
 *      - has_leveled_up true iff the user leveled up.
 *      - level the level of the user if he leveled up.
 */
async function add_exp_to_member(user_id: string, server_id: string): Promise<[boolean, number] | null> {

    if (cooldown[server_id] && cooldown[server_id].includes(user_id)) return null;

    await set_member_if_needed(user_id, server_id);

    // EXP Bonus
    const exp_gain_min = 1;
    const exp_gain_max = 3;
    const exp_gain = Math.floor(Math.random() * (exp_gain_max - exp_gain_min)) + exp_gain_min;

    // Current EXP
    const member = await get_member_data(user_id, server_id, 'exp');
    const exp_current = member.exp;

    // New EXP
    const exp_new = exp_current + exp_gain;
    await set_member_data(user_id, server_id, [{ name: 'exp', value: exp_new }]);

    // Add user to cooldown
    if (!cooldown[server_id]) cooldown[server_id] = [];
    cooldown[server_id].push(user_id);
    setTimeout(() => {
        cooldown[server_id].splice(cooldown[server_id].indexOf(user_id), 1);
    }, COOLDOWN_DURATION_MS);

    // Level up
    const level_before = exp_to_level(exp_current);
    const level_now = exp_to_level(exp_new);
    const has_leveled_up = level_before != level_now;

    if (has_leveled_up && level_now % 5 == 0) {
        reward_level_up(user_id, server_id);
    }

    return [has_leveled_up, level_now];

}

export {

    exp_to_level,
    level_to_exp,
    add_exp_to_member

}