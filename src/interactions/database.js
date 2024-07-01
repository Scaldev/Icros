const { EmbedBuilder, ButtonBuilder, SelectMenuBuilder, TextInputBuilder, ActionRowBuilder, SlashCommandBuilder } = require('discord.js');
const { query } = require('../utility/mysql.js');

module.exports = {

	async execute(interaction) {

		let guild_id = `guild_${interaction.guild.id}`;

		await query(`USE ${guild_id}`);
		let tables = await query(`SHOW TABLES;`);
		console.log(tables);

		let embed = new EmbedBuilder()
			.setColor('#174485');
		let embedContent = `**Tables :**`;

		let selectMenu = new SelectMenuBuilder()
			.setCustomId('database_selectMenu')
			.setPlaceholder('Select a table');

		console.log(tables);

		for (let t in tables) {
			console.log(tables[t])
			let tableName = tables[t][`Tables_in_${guild_id}`];
			console.log(tableName);
			let table = await query(`SELECT * FROM ${tableName};`);
			console.log(table);
			embedContent += `\n- \`${tableName}\`.`;
			selectMenu.addOptions({ label: `${tableName}`, description: `Length: ${table.length}`, value: `database_table_${tableName}` });
		}
		if (!tables[0]) {
			selectMenu.addOptions({ label: 'Table', value: 'table' });
			embedContent += "\nYour database doesn't have any table, you should create one."
		}

		embed.setDescription(embedContent);

		let rows = new ActionRowBuilder().addComponents(selectMenu);


		let message = await interaction.reply({ content: `hello world!`, embeds: [embed], components: [rows], ephemeral: true, fetchReply: true });

		const filter = i => i.user.id === interaction.user.id;

		const collector = message.createMessageComponentCollector({ filter, time: 60000 * 15 }); // = 15 minutes.

		collector.on('collect', async i => {

			let menuType = i.values[0].split('_')[1];
			let valueName = i.values[0].split('_')[2];
			let embed = EmbedBuilder.from(i.message.embeds[0]);

			switch (menuType) {

				case 'database':

					break;

				case 'table':

				
					let columns = await query(`USER ${guild_id}; SELECT COLUMNS FROM ${valueName}`);
					console.log(columns);

					embed.setDescription(`**Table ${valueName} :**`);

					break;

				case 'line':
					break;

			}

			await i.update({ embeds: [embed] });
		});

		collector.on('end', collected => console.log(`Collected ${collected.size} items`));


	},

	data: new SlashCommandBuilder() // La commande slash de cette commande.
		.setName('database') // Nom.
		.setDescription("Return roundtrip and API latency.") // Description.
};