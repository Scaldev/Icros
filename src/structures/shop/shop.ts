import { Guild } from "discord.js";

import { Aisle } from "./aisle";
import { RoleAisle } from "./aisle_role";
import { HomeAisle } from "./aisle_home";

export class Shop {

    aisles: Aisle[];
    guild: Guild;
    index: number;

    constructor(guild: Guild) {
        this.aisles = [];
        this.guild = guild;
        this.index = 0;
    }

    async configure() {

        const role_home = new HomeAisle(this.guild);

        const role_aisle = new RoleAisle(this.guild);
        await role_aisle.set_products();

        this.aisles = [role_home, role_aisle];

    }

    get_aisle() {
        return this.aisles[this.index];
    }

    get_product(type: number, id: number) {
        return this.aisles[type].get_product(id);
    }

}