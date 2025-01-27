import { Guild, GuildMember, StringSelectMenuOptionBuilder } from "discord.js";
import { query } from "../database/mysql";

import { Product } from "./product";

export const ROLE_PRODUCT_TYPE = 1;

export class RoleProduct implements Product {

    id: number;
    server_id: string;
    item_id: number;
    type: number;
    emoji: string;

    price: number;
    quantity: number;
    role_id: string;

    constructor(id: number, server_id: string, item_id: number, price: number, role_id: string, emoji: string) {

        this.id = id;
        this.server_id = server_id;
        this.item_id = item_id;
        this.type = ROLE_PRODUCT_TYPE;
        this.price = price;
        this.role_id = role_id;
        this.quantity = 0;
        this.emoji = emoji;
    }

    display(is_in_cart: boolean) {

        const displayed_price = is_in_cart ? this.price * this.quantity : this.price;
        const indent = displayed_price <= 9 ? '  ' : displayed_price <= 99 ? ' ' : '';
        const s = displayed_price >= 2 ? 's' : '';

        let text = `**\`${indent}${displayed_price} œuf${s} 🥚\`** : **<@&${this.role_id}>** ${this.emoji}`;

        if (this.quantity > 0) {
            text += `× **${this.quantity}**`;
        }
        return text;
    }

    async buy(member: GuildMember) {

        const equipment_type = 1;

        const rows = await query(`SELECT expire FROM TemporaryEquipment WHERE (user_id = ${member.id} AND server_id = ${this.server_id} AND item_id = ${this.item_id} AND type = ${equipment_type});`);
        const start = rows.length == 0 ? new Date() : new Date(rows[0].expire);

        const new_expired_date = new Date(start.setMonth(start.getDay() + this.quantity * 14));
        const formatted_expired_date = formate_date(new_expired_date);

        await member.roles.add(this.role_id);
        await query(`REPLACE INTO TemporaryEquipment(user_id, item_id, type, expire, server_id) VALUES(${member.id}, ${this.item_id}, ${equipment_type}, '${formatted_expired_date}', ${member.guild.id});`);

    }

    get_label(guild: Guild) {

        const role = guild.roles.cache.get(`${this.role_id}`);
        const price = Math.ceil(this.price);

        if (role == undefined) return;

        const option = new StringSelectMenuOptionBuilder()
            .setLabel(`${role.name.substring(0, 25)}`)
            .setDescription(`Prix: ${price} oeufs | Couleur: ${role.hexColor}`)
            .setValue(`option/shop/${this.server_id}/${ROLE_PRODUCT_TYPE}/${this.item_id}`);

        if (this.emoji != "") {
            option.setEmoji(`${this.emoji}`);
        }

        return option;
    }

}

/**
 * @param date 
 * @returns 
 */
function formate_date(date: Date) {

    let formatted_date = date.toLocaleDateString('fr').split('/').reverse().join('-');
    return formatted_date;
}