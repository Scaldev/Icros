import { ActionRowBuilder, Guild, StringSelectMenuBuilder, StringSelectMenuOptionBuilder } from "discord.js";
import { Product } from "./product";
import { Aisle, AISLE_CAPACITY, BaseAisle } from "./aisle";
import { query } from "../database/mysql";
import { RoleProduct } from "./product_role";

export class RoleAisle extends BaseAisle implements Aisle {

    id = 1;

    /**
     * Remove from the Roles table every role that does not exist on the specified guild.
     * @param guild a Discord guild.
     */
    async #clear_roles_table(guild: Guild) {

        const roles = await query(`SELECT * FROM Roles WHERE server_id = '${guild.id}';`);

        for (let i = 0; i < roles.length; i++) {

            const guild_role = await guild.roles.fetch(roles[i].role_id);

            if (guild_role == null) {
                await query(`DELETE FROM Roles WHERE server_id = '${guild.id}' AND role_id = '${roles[i].role_id};`);
            }
        }

    }

    async set_products() {

        await this.#clear_roles_table(this.guild);

        const roles = await query(`SELECT * FROM Products INNER JOIN Roles ON Roles.id = Products.item_id WHERE Products.server_id = '${this.guild.id}' ORDER BY Products.price, Products.item_id;`);

        for (let i = 0; i < roles.length; i++) {

            const product = new RoleProduct(roles[i].id, this.guild.id, roles[i].item_id, roles[i].price, roles[i].role_id, roles[i].emoji);
            this.products.push(product);

        }

        this.max_page = Math.ceil(this.products.length / AISLE_CAPACITY);

    }

    get_product(id: number): Product | undefined {

        for (let i = 0; i < this.products.length; i++) {
            if (this.products[i].id === id) {
                return this.products[i];
            }
        }
    }

    get_embed_description() {

        let text = `## Boutique : Rayon Rôles 🎨\n\n`
        + `-# Dans ce rayon, vous pouvez acheter des rôles colorés temporairement. Les prix affichés correspondent à **2 semaines** avec ce rôle dans votre inventaire.\n`;

        let i = this.page * AISLE_CAPACITY;
        let n = 0;

        while (n < AISLE_CAPACITY && i < this.products.length) {
            text += `- ${this.products[i].display(false)}.\n`;
            i++;
            n++;
        }

        while (n < AISLE_CAPACITY) {
            text += `- \u200b \n`;
            n++;
        }

        return text;
    }

    get_select_menu(): ActionRowBuilder<StringSelectMenuBuilder> {

        let select_menu_aisle = [];
        let i = this.page * AISLE_CAPACITY;
        let n = 0;

        while (n < AISLE_CAPACITY && i < this.products.length) {

            const product = this.products[i];
            i++;
            n++;

            const option = product.get_label(this.guild);
            if (option == undefined) continue;
            select_menu_aisle.push(option);

        }

        const select_menu = new StringSelectMenuBuilder()
            .setCustomId('selectmenu/shop/aisle')
            .setPlaceholder('Sélectionne un rôle.');

        if (select_menu_aisle.length == 0) {

            select_menu_aisle.push(
                new StringSelectMenuOptionBuilder()
                    .setLabel(`Caddie vide.`)
                    .setValue(`option/shop/${this.guild.id}/${this.id}/0`)
            );
            select_menu.setDisabled(true);

        }

        select_menu.addOptions(select_menu_aisle);

        const row = new ActionRowBuilder<StringSelectMenuBuilder>()
            .addComponents(select_menu);

        return row;

    }

}