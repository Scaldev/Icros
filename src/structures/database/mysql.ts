import mysql, { RowDataPacket } from 'mysql2/promise';
import { mysql_settings } from '../../database/config.json';

const conn = await mysql.createConnection(mysql_settings);

async function query(input: any): Promise<mysql.RowDataPacket[]> {

    // console.log(`\u001b[1;34m ${input} \u001b[0m`);

    const [rows] = await conn.query<RowDataPacket[]>(input);
    return rows;
}

async function queries(input: any): Promise<mysql.RowDataPacket[][]> {

    console.log(`\u001b[1;34m ${input} \u001b[0m`);

    const [rows] = await conn.query<RowDataPacket[][]>(input);
    return rows;
}

export { query, queries };