import { Message } from 'discord.js';
import { add_exp_to_member } from '../structures/exp/exp.js';

export async function execute(message: Message) {

    if (message.guild === null || message.author.bot || message.webhookId) return;

    const account_id = message.author.id;
    const guild_id = message.guild.id;

    const data = await add_exp_to_member(account_id, guild_id);

    if (data == null) return;

    const has_leveled_up = data[0];
    const level = data[1];

    if (has_leveled_up) {

        let text = `${message.author}, tu passes au niveau suivant ! [**\`Niv. ${level - 1}\`** → **\`Niv. ${level}\`**]`;
        if (level % 5 == 0) {
            text += `\nPour te récompenser, tu gagnes **1 oeuf** 🥚.`;
        }
        message.reply({ content: text });
    }

}