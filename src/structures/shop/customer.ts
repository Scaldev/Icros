import { ActionRowBuilder, ButtonInteraction, Guild, GuildMember, StringSelectMenuBuilder, StringSelectMenuOptionBuilder } from "discord.js";
import { get_member_data, set_member_data } from "../database/tables";

import { Product } from "./product";
import { Shop } from "./shop";
import { AISLE_CAPACITY } from "./aisle";

const CART_CAPACITY = Math.max(AISLE_CAPACITY - 1, 1);

export enum ShoppingMode {
    Home,
    Aisle,
    Cart,
    Paying,
    Paid,
    Out,
}

export class Customer {

    user_id: string;
    guild: Guild;

    mode: ShoppingMode;

    cart: Product[];
    page: number;
    price: number;

    constructor(user_id: string, guild: Guild) {

        this.user_id = user_id;
        this.guild = guild;

        this.cart = [];
        this.page = 0;
        this.price = 0;
        this.mode = ShoppingMode.Home;
    }

    add_to_cart(shop: Shop, path: string[]) {

        const type = parseInt(path[3]);
        const id = parseInt(path[4]);

        const product = shop.get_product(type, id);

        if (product == undefined) return this;
        this.price += product.price;

        for (let i = 0; i < this.cart.length; i++) {
            if (this.cart[i].id == product.id) {
                this.cart[i].quantity += 1;
                return this;
            }
        }

        product.quantity += 1;
        this.cart.push(product);

        return this;

    }

    remove_from_cart(path: string[]) {

        const id = parseInt(path[4]);

        for (let i = 0; i < this.cart.length; i++) {

            if (this.cart[i].id == id) {

                this.cart[i].quantity -= 1;
                this.price -= this.cart[i].price;

                if (this.cart[i].quantity == 0) {
                    this.cart.splice(i, 1);
                }
            }
        }

        return this;

    }

    get_content(should_list: boolean, capacity: number) {

        console.log(this.cart, capacity);

        const real_capacity = Math.min(capacity, 25);
        let text = "";
        let i = this.page * real_capacity;
        let n = 0;

        while (n < real_capacity && i < this.cart.length) {
            text += `- ${this.cart[i].display(false)}.\n`;
            i++;
            n++;
        }

        while (n < real_capacity && should_list) {
            text += `- \u200b \n`;
            n++;
        }

        const s = this.price >= 2 ? 's' : '';
        text += `**Prix total à payer :** ${this.price} œuf${s} 🥚.`;

        return text;
    }

    get_paid() {

        const text = `-# Ci-dessous, la liste des produits achetés.\n`
            + this.get_content(false, this.cart.length);

        return text;
    }

    get_cart() {

        const text = "## Boutique : Caddie 🛒\n\n"
            + `-# Ici, vous pouvez voir les produits que vous avez sélectionné et à quelle quantité.`
            + `Cliquez sur un produit dans le menu déroulant en retire une quantité de votre caddie.\n`
            + this.get_content(true, CART_CAPACITY);

        return text;
    }

    get_select_menu() {

        let select_menu_cart = [];
        let i = this.page * CART_CAPACITY;
        let n = 0;

        while (n < CART_CAPACITY && i < this.cart.length) {

            const product = this.cart[i];
            i++;
            n++;

            const option = product.get_label(this.guild);

            if (option == undefined) continue;

            select_menu_cart.push(option);
        }

        const select_menu = new StringSelectMenuBuilder()
            .setCustomId('selectmenu/shop/cart')
            .setPlaceholder('Sélectionne un produit pour le retirer.')

        if (select_menu_cart.length == 0) {
            select_menu_cart.push(
                new StringSelectMenuOptionBuilder()
                    .setLabel(`Caddie vide.`)
                    .setValue(`option/shop/${this.guild.id}/0`)
            );
            select_menu.setDisabled(true);
        }

        select_menu.addOptions(select_menu_cart);

        const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select_menu);

        return row;

    }

    async checkout(member: GuildMember): Promise<[boolean, string]> {

        const memberDB = await get_member_data(this.user_id, this.guild.id, 'money');

        if (memberDB.money < this.price) {
            return [false, `${member}, tu n'as que **${memberDB.money}** oeufs, alors que tu souhaites en dépenser **${this.price}**.`];
        }

        const new_money_field = { name: 'money', value: `${memberDB.money - this.price}` };
        await set_member_data(this.user_id, this.guild.id, [new_money_field]);

        this.cart.forEach(async product => {
            await product.buy(member);
        });

        return [true, `${member}, tu as bien tout acheté contre **${this.price}** oeufs. Merci de ta visite, et à bientôt !`];

    }
}