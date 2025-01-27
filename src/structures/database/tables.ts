import { query } from './mysql.js';

// ################################ PUBLIC FUNCTIONS ################################ \\


/**
 * @param user_id the discord user's id.
 * @param server_id a server's id.
 * Add the member to the Members table, if they are not in the database already.
 */
async function set_member_if_needed(user_id: string, server_id: string) {

    let input = `SELECT * FROM Members WHERE user_id = '${user_id}' AND server_id = '${server_id}';`;

    let rows = await query(input);

    if (rows.length == 0) {
        let input = `INSERT INTO Members(user_id, server_id) VALUES(${user_id}, ${server_id});`;
        await query(input);
    }

}

// ---------------------------------------------------------------------------------------- \\

async function get_member_data(user_id: string, server_id: string, fields: string) {

    const input = `SELECT ${fields || '*'} FROM Members WHERE user_id = '${user_id}' AND server_id = '${server_id}';`;

    let rows = await query(input);

    if (rows.length == 0) {
        await set_member_if_needed(user_id, server_id);
        rows = await query(input);
    }

    return rows[0];


};

// -------------------------------------------------------------------------- \\

type Field = {
    name: string,
    value: string
}

/**
 * Update the database member according to the [fields] entry.
 * @param user_id a discord user's id.
 * @param server_id a discord server's id.
 * @param fields an array of (name, value) pairs.
 */
async function set_member_data(user_id: string, server_id: string, fields: Field[]) {

    if (fields.length == 0) return;

    let sets: string[] = [];

    for (let i = 0; i < fields.length; i++) {
        sets.push(`${fields[i].name} = ${fields[i].value}`);
    }

    await query(`UPDATE Members SET ${sets.join(', ')} WHERE user_id = '${user_id}' AND server_id = '${server_id}';`);

}

// ################################ INTERFACE ################################ \\

export {

    set_member_if_needed,
    set_member_data,
    get_member_data,
    Field,

};