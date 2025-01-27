import { readdirSync } from "fs";
import { client } from "./src/structures/client/client";

// Database #############################################################################################################

// import { query } from './src/utility/mysql.ts';
// import { set_member_if_needed } from './src/utility/tables.ts';

(async () => {
})();

// Event handling ########################################################################################################

const events_folder = readdirSync('./src/events');

for (let event_file of events_folder) {

  const event_name = event_file.substring(0, event_file.length - 3);
  const event = await import(`./src/events/${event_file}`);

  client.on(event_name, (...args) => {
    // console.log(`>>> L'événement ${event_name} a été exécuté.`);
    event.execute(...args);

  });

};

// Intervals #############################################################################################################

const intervals_folder = readdirSync('./src/intervals');

for (let file of intervals_folder) {

  const { execute } = await import(`./src/intervals/${file}`);
  execute();

}