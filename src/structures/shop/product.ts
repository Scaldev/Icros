import { Guild, GuildMember, StringSelectMenuOptionBuilder } from "discord.js";

export interface Product {

    id: number;

    server_id: string;
    item_id: number;
    type: number;
    emoji: string;

    price: number,
    quantity: number;

    display: (is_in_cart: boolean) => string,

    buy: (member: GuildMember) => Promise<void>,

    get_label: (guild: Guild) => StringSelectMenuOptionBuilder | undefined

}
