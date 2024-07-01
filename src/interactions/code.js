const Discord = require('discord.js');
const { SlashCommandBuilder } = require('@discordjs/builders'); // Pour créer la commande slash de cette commande.

module.exports = {

	async execute(interaction) {

		// DECLARATION DES VARIABLES -----------------------------------------------------------------------------------------------

		let fileName = "fileName";
		let userPlacement = [0, 0];
		let buttonMode = "move";
		let selectMenuPath = "";
		let codeObject = [
			{ indentation: 0, nextIndentation: 1, path: "controls/events.js", args: ["interactionCreate", ["interaction"]] },
		] // le 1er argument (ici, "interactionCreate") est tjrs le nom de l'événement afin de pouvoir le classer facilement ; le 2nd argument est les paramètres de l'événement (ici, interaction).

		let codeMessage = [];

		const button_Edit = new Discord.MessageButton().setCustomId('button_Edit').setStyle('SECONDARY').setEmoji('✏️');
		const button_ArrowLeft = new Discord.MessageButton().setCustomId('button_ArrowLeft').setStyle('SECONDARY').setEmoji('⬅️');
		const button_ArrowUp = new Discord.MessageButton().setCustomId('button_ArrowUp').setStyle('SECONDARY').setEmoji('⬆️');
		const button_ArrowDown = new Discord.MessageButton().setCustomId('button_ArrowDown').setStyle('SECONDARY').setEmoji('⬇️');
		const button_ArrowRight = new Discord.MessageButton().setCustomId('button_ArrowRight').setStyle('SECONDARY').setEmoji('➡️');

		const selectMenu_Object = new Discord.MessageSelectMenu()
			.setCustomId('selectMenu_Object')
			.setPlaceholder(`Unavailable: use edit mode to use it.`)
			.addOptions([{ emoji: '⚫', label: "Controls", description: "Initiates a new line of code.", value: "controls" }])
			.setDisabled(true);

		const row_CreationButtons = new Discord.MessageActionRow().addComponents(button_Edit, button_ArrowLeft, button_ArrowUp, button_ArrowDown, button_ArrowRight);
		const row_CreationSelectMenu = new Discord.MessageActionRow().addComponents(selectMenu_Object);
		let components = [row_CreationButtons, row_CreationSelectMenu];

		// DECLARATION DES FONCTIONS ------------------------------------------------------------------------------------------

		function updateCodeMessage(codeObject, codeMessage, userPlacement, previousLine) {

			let [newLine, newIndex] = [userPlacement[0], userPlacement[1]];
			let linesToEdit = [newLine];
			if (previousLine !== false && newLine !== previousLine) linesToEdit.push(previousLine);

			for (let l in linesToEdit) {

				let line = linesToEdit[l];
				let field0 = line == 0 ? (newIndex == 0 && l == 0 ? '✅' : '💾') : (newIndex == 0 && l == 0 ? '⬛' : '⚫️');
				codeMessage[line] = `${field0} ${' '.repeat(codeObject[line].indentation)}`;

				if (codeObject[line].path !== null) {
					let element = require(`../code/${codeObject[line].path}`);
					newData = element.argsToYBS(codeObject[line].args, newIndex);
					codeObject[line].args = newData.newArgs;
					codeMessage[line] += newData.line;
				};

			};

			if (codeObject[codeObject.length - 1].path !== null) {
				codeObject.push({ indentation: codeObject[codeObject.length - 1].nextIndentation, nextIndentation: null, path: null, args: [] });
				codeMessage.push(`⚫️ ${' '.repeat(codeObject[codeObject.length - 1].nextIndentation)}`);
			};

			return codeMessage;

		};

		function componentsConstruction(codeObject, userPlacement, selectMenuPath, components, previousButtonMode, buttonMode) {

			let [line, index] = [userPlacement[0], userPlacement[1]];

			let element = buttonMode === 'edit' && codeObject[line].path !== null ? require(`../code/${codeObject[line].path}`) : null;
			let elementType = buttonMode === 'edit' && codeObject[line].path !== null ? (index === 0 ? '⚫' : element.argsType[index - 1]) : null;

			const objectComponents = {

				'move': [
					[
						{ emojiName: '✏️', customId: 'button_Edit', disabled: false },
						{ emojiName: '⬅️', customId: 'button_ArrowLeft', disabled: index === 0 },
						{ emojiName: '⬆️', customId: 'button_ArrowUp', disabled: line == 0 },
						{ emojiName: '⬇️', customId: 'button_ArrowDown', disabled: line == codeObject.length - 1 },
						{ emojiName: '➡️', customId: 'button_ArrowRight', disabled: index === codeObject[line].args.length },
					],
					[
						{ placeholder: 'Unavailable: use edit mode to use it.', disabled: true },
					]
				],

				'edit': [
					[
						{ emojiName: '✏️', customId: 'button_Edit', disabled: false },
						{ emojiName: '↩️', customId: 'button_GoBack', disabled: selectMenuPath === "" },
						{ emojiName: '✍️', customId: 'button_Write', disabled: elementType !== '🟢' && elementType !== '🟡' && elementType !== '⚪️' },
						{ emojiName: '🔍', customId: 'button_More', disabled: elementType !== '🟠' && elementType !== '🔴' },
						{ emojiName: '❌', customId: 'button_CancelOrConfirm', disabled: false },
					],
					[
						{ placeholder: `src > ${selectMenuPath.split('/').join(' > ')}`, disabled: false },
					]
				],

			};

			for (let i in components[0].components) {
				if (previousButtonMode !== buttonMode) {
					components[0].components[i].emoji.name = objectComponents[buttonMode][0][i].emojiName;
					components[0].components[i].customId = objectComponents[buttonMode][0][i].customId;
				};
				components[0].components[i].disabled = objectComponents[buttonMode][0][i].disabled;
			};

			if (previousButtonMode !== buttonMode) {
				components[1].components[0].disabled = objectComponents[buttonMode][1][0].disabled;
			};

			if (buttonMode === 'edit') {
				if (selectMenuPath !== '' && components[0].components[4].emoji.name === '❌') {
					components[0].components[4].emoji.name = '✅';
				} else if (selectMenuPath === '' && components[0].components[4].emoji.name === '✅') {
					components[0].components[4].emoji.name = '❌';
				};
			};

			components[1].components[0].placeholder = objectComponents[buttonMode][1][0].placeholder;

			return components;
		};

		function messageConstruction(codeObject, codeMessage, userPlacement, previousLine, selectMenuPath, previousButtonMode, buttonMode) {

			codeMessage = updateCodeMessage(codeObject, codeMessage, userPlacement, previousLine);
			messageContent = `${interaction.member}, you have **2 hours** to create and save this file.\`\`\`js\n${codeMessage.join('\n')}\`\`\`\`∟ File name: "fileName".\``;

			const newComponents = componentsConstruction(codeObject, userPlacement, selectMenuPath, components, previousButtonMode, buttonMode);

			return { content: messageContent, components: newComponents }

		};

		var messageObject = messageConstruction(codeObject, codeMessage, userPlacement, false, selectMenuPath, "move", "move");
		await interaction.reply(messageObject);
		const message_Creation = await interaction.fetchReply();

		const filter_CreationButtons = i => i.user.id === interaction.user.id;
		const collector_Buttons = message_Creation.createMessageComponentCollector({ filter_CreationButtons, time: 7200000 }); // 7200000 = 2 heures.

		collector_Buttons.on('collect', async interCompo => {

			let previousLine = userPlacement[0];
			let previousButtonMode = buttonMode;

			switch (interCompo.customId) {

				case 'button_Edit':
					buttonMode = previousButtonMode === 'move' ? 'edit' : 'move';
					break;

				// MODE : MOVE -----------------------------------------------------------------
				case 'button_ArrowLeft':
					userPlacement[1] -= 1;
					break;

				case 'button_ArrowUp':
					userPlacement[0] -= 1;
					userPlacement[1] = 0;
					break;

				case 'button_ArrowDown':
					userPlacement[0] += 1;
					userPlacement[1] = 0;
					break;

				case 'button_ArrowRight':
					userPlacement[1] += 1;
					break;

				// MODE : EDIT -----------------------------------------------------------------

				case 'button_GoBack':
					selectMenuPath = selectMenuPath.substring(0, selectMenuPath.lastIndexOf('/'));
					break;

				case 'button_Write':
					break;

				case 'button_More':
					break;

				case 'button_CancelOrConfirm':
					buttonMode = 'move';
					break;

				case 'selectMenu_Object':
					selectMenuPath = interCompo.values[0]; // = path.
					break;

			};

			var messageObject = messageConstruction(codeObject, codeMessage, userPlacement, previousLine, selectMenuPath, previousButtonMode, buttonMode);
			await interCompo.update(messageObject);



		});

		collector_Buttons.on('end', () => {
			message_Creation.editReply({ content: `${interaction.member}, it's been too long since you started creating this. Click on this button bellow to save the code, so that you can \`edit\` it afterwards, or leave the code unsaved.`, embeds: [], components: [] });
		});

	},

	data: new SlashCommandBuilder() // La commande slash de cette commande.
		.setName('code') // Nom.
		.setDescription("Create a slash command or a block of code.") // Description.
		.addStringOption((option) => option.setName('type').setDescription("Select which type of code will be created.").setRequired(true).addChoices({ name: 'Slash command', value: 'command' }, { name: 'Block of code', value: 'code' }))
};