import { Client, Events, GatewayIntentBits, Collection, Routes, SlashCommandBuilder, BaseInteraction, Message, Partials } from 'discord.js';
import { REST } from '@discordjs/rest';
import { readdirSync } from "fs";

import { token } from '../../database/config.json';

type ICommand = {
  execute: (i: BaseInteraction) => Promise<void>
  data: SlashCommandBuilder,
}

class ClientI extends Client {
  public interactions: Collection<string, ICommand> = new Collection();
}

// Logging in #############################################################################################################

const client = new ClientI({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers, GatewayIntentBits.GuildMessages],
  partials: [Partials.Message]
});

client.once(Events.ClientReady, c => {
  console.log(`Ready! Logged in as ${c.user.tag}`);
});

client.login(token);

// Command handling #######################################################################################################

let commands: ICommand[] = [];
client.interactions = new Collection();

/**
 * @param interaction_type either "slash_commands", "components" or "context_menus".
 * @param category_name the name of the category in which the interaction is.
 * @param interaction_file the name of the file implementing the interaction.
 * @example add_interaction("slash_commands", "general", "ping")
 */
async function add_interaction(interaction_type: string, category_name: string, interaction_file: string) {

  let interaction_name = interaction_file.substring(0, interaction_file.length - 3);
  let interaction = await import(`../../interactions/${interaction_type}/${category_name}/${interaction_file}`);

  if (interaction_type === 'slash_commands') {
    commands.push(interaction.data.toJSON());
  }
  
  client.interactions.set(`${interaction_type}/${interaction_name}`, interaction);

}

const interaction_folder = readdirSync('./src/interactions/');
for (let interaction_type of interaction_folder) {

  const interaction_type_folder = readdirSync(`./src/interactions/${interaction_type}`);
  for (let category_name of interaction_type_folder) {

    const category_folder = readdirSync(`./src/interactions/${interaction_type}/${category_name}`);
    for (let interaction_file of category_folder) {

      await add_interaction(interaction_type, category_name, interaction_file);

    }

  }

}

// Slash commands #########################################################################################################

const rest = new REST({ version: '10' }).setToken(token);

const client_id = "920762905937444896";
const server_id = "463292621922762782";

// Deleting commands

/*
rest.put(Routes.applicationGuildCommands(client_id, server_id), { body: [] })
	.then(() => console.log('Successfully deleted all guild commands.'))
	.catch(console.error);
*/

// Deploying commands

rest.put(Routes.applicationGuildCommands(client_id, server_id), { body: commands })
	.then(() => console.log(`Successfully reloaded ${commands.length} application (/) commands.`))
	.catch(console.error);

// ###########################################################################################################################

export { client };