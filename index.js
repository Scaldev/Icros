const { Client, Events, GatewayIntentBits, Collection, Routes } = require('discord.js');
const { REST } = require('@discordjs/rest');
const fs = require("fs");

const { token } = require('./src/database/config.json');

// Logging in #############################################################################################################

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers] });

client.once(Events.ClientReady, c => {
  console.log(`Ready! Logged in as ${c.user.tag}`);
});

client.login(token); // hello

// Utility #################################################################################################################

const u_FolderName = fs.readdirSync('./src/utility');
for (let u_fileName of u_FolderName) require(`./src/utility/${u_fileName}`);

// Command handling #######################################################################################################

client.interactions = new Collection();
let commands = [];
const interactionFolderName = fs.readdirSync('./src/interactions');

for (const interactionName of interactionFolderName) {
  let interaction = require(`./src/interactions/${interactionName}`);
  client.interactions.set(interactionName.substring(0, interactionName.length - 3), interaction);
  commands.push(interaction.data.toJSON());
};

// Deploying commands #####################################################################################################

const rest = new REST({ version: '10' }).setToken(token);

(async () => {
	try {
		console.log(`Started refreshing ${commands.length} application (/) commands.`);
		await rest.put( Routes.applicationGuildCommands("603997312250937354", "463292621922762782"), { body: commands } );  // clientId, testServerId [Académie]
		console.log(`Successfully reloaded the application (/) commands.`);
	} catch (error) {
		console.error(error);
	}
})();

// Event handling ########################################################################################################

const eventsFiles = fs.readdirSync('./src/events');

for (const file of eventsFiles) {

  // console.log(file);
  const event = require(`./src/events/${file}`);

  client.on(file.substring(0, file.length - 3), (...args) => {
    // console.log(`>>> Le fichier ${file} a été exécuté.`);
    event.execute(...args);
  });

};