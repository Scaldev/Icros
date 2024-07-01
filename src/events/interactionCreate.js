const { InteractionType } = require('discord.js');
const { query } = require('../utility/mysql.js')

module.exports = {

    async execute(interaction) {

        let dbg = `guild_${interaction.guild.id}`;

        // Setup some data in the guild database if it's still not there:
        let databaseContent = await query(`SHOW DATABASES LIKE '${dbg}';`);

        if (databaseContent.length === 0) {

            let createDatabaseCommands = "";

            // create database and focus on it:
            createDatabaseCommands += `CREATE DATABASE ${dbg};`;

            // create c(onfig) tables (which are private):
            createDatabaseCommands += `CREATE TABLE ${dbg}._ctable (id INT(255), tableName VARCHAR(255), defaultValues JSON, addMemberIfNotExists TINYINT(1), isPrivate TINYINT(1) DEFAULT 0);`;
            createDatabaseCommands += `CREATE TABLE ${dbg}._ccode (atEvent VARCHAR(255), authorId VARCHAR(255), createdAt DATETIME, content JSON, comments JSON);`;
            createDatabaseCommands += `CREATE TABLE ${dbg}._cguild (botAdminRoles JSON);`;

            // for testing: create a table with addMemberIfNotExists: USER.
            createDatabaseCommands += `CREATE TABLE ${dbg}.members (id int(255), user_id varchar(255), money int(255), exp int(255));`;
            createDatabaseCommands += `INSERT INTO ${dbg}._ctable (id, tableName, defaultValues, addMemberIfNotExists, isPrivate) VALUES(1, "members", '{"money": 0, "exp": 0}', 1, 1) ON DUPLICATE KEY UPDATE id=id+1;`;

            await query(createDatabaseCommands);

            await interaction.reply({ content: `Sorry, no database was created for this server. Please retry this command, now that everything is set up!`, ephemeral: true });

        } else { // database already exists

            // check for auto user insert in a table
            console.log(Date.now());
            let configTable = await query(`SELECT * FROM ${dbg}._ctable;`);

            // with default parameters, it takes about 30 ms to do the following.
            // in the future, we will probobably have to add any user detected, and once every minute or so, check for every cached user.
            // we could test that in a separated function to not slow down this (very important) file.
            // for now, let's not bother with speed issues.

            for (let line in configTable) {
                if (configTable[line].addMemberIfNotExists === 1) {
                    let columnNames = Object.keys(configTable[line].defaultValues).join(', ');
                    let columnValues = Object.values(configTable[line].defaultValues).join(', ');
                    await query(`INSERT INTO ${dbg}.${configTable[line].tableName} (id, user_id, ${columnNames}) VALUES(1, ${interaction.user.id}, ${columnValues}) ON DUPLICATE KEY UPDATE id=id+1;`);
                }
            }

            // Go to the file corresponding to the command name.
            if (interaction.type !== InteractionType.ApplicationCommand) return;
            console.log(`>>> The "${interaction.commandName}" command (id: ${interaction.commandId}) was used by ${interaction.user.tag} in #${interaction.channel.name}.`);

            let command = interaction.client.interactions.get(interaction.commandName);
            command.execute(interaction);

        }

    },

};