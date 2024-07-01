const mysql = require("mysql2");
const util = require('util');

const { mysql_settings } = require('../database/config.json');

const db = mysql.createPool(mysql_settings);
const asyncQuery = util.promisify(db.query).bind(db);

module.exports = {

    async query(input) {
        try {
            const rows = await asyncQuery(input);
            return rows;
        } catch (err) {
            return err;
        }
    },

};