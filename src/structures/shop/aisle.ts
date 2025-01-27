import { Guild, ActionRowBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder } from "discord.js";
import { Product } from "./product";

export const AISLE_CAPACITY = 10;

export interface Aisle {

    id: number;
    guild: Guild;
    
    page: number;
    max_page: number;
    
    products: Product[];

    set_products(guild: Guild): void

    get_product(id: number): Product | undefined

    get_embed_description() : string

    get_select_menu(): ActionRowBuilder<StringSelectMenuBuilder>

}


export class BaseAisle {

    products: Product[];
    guild: Guild;
    page: number;
    max_page: number;

    constructor(guild: Guild) {

        this.guild = guild;
        this.products = [];
        this.page = 0;
        this.max_page = 0;

    }
    
}