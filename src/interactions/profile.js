const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { query } = require('../utility/mysql.js');
const { checkName } = require('../utility/checkName.js');

module.exports = {

	async execute(interaction) {

		let memberData = await query(`SELECT * FROM guild_${interaction.guild.id}.members WHERE "${interaction.member.id}" = user_id;`);

		let output = [];
		for (let i in memberData[0]) {
			output.push(`- **${i}** : ${memberData[0][i]}`);
		}

		interaction.reply({ content: `**Your profile:**\n${output.join("\n")}` });
	
	},

	data: new SlashCommandBuilder()
		.setName('profile')
		.setDescription("Show your profile.")
};