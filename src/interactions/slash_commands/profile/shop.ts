import { SlashCommandBuilder } from '@discordjs/builders';
import { ActionRowBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, ChatInputCommandInteraction, ButtonInteraction, StringSelectMenuInteraction, Guild, SelectMenuInteraction, GuildMember, StringSelectMenuBuilder } from "discord.js";

import { Customer, ShoppingMode } from '../../../structures/shop/customer';
import { Shop } from '../../../structures/shop/shop';
import { ROLE_PRODUCT_TYPE } from '../../../structures/shop/product_role';

// ###################################################################################################### \\
// #                                        PRIVATES FUNCTIONS                                          # \\
// ###################################################################################################### \\

/**
 * @param emoji 
 * @param id 
 * @param disabled 
 * @returns 
 */
function make_button(emoji: string, id: string, disabled: boolean, style?: ButtonStyle, label?: string) {

    const button = new ButtonBuilder()
        .setStyle(style || ButtonStyle.Secondary)
        .setCustomId(`button/shop/${id}`)
        .setEmoji(emoji)
        .setDisabled(disabled);

    if (label != undefined) {
        button.setLabel(label);
    }

    return button;
}

/**
 * @param customer 
 * @param shop 
 * @returns 
 */
function get_shop_buttons(customer: Customer, shop: Shop) {

    const is_paying = customer.mode == ShoppingMode.Paying;

    const row_buttons = new ActionRowBuilder<ButtonBuilder>().addComponents(
        make_button('🏠', 'home', customer.mode == ShoppingMode.Home || is_paying, ButtonStyle.Secondary),
        make_button('🎨', 'aisle_roles', (customer.mode == ShoppingMode.Aisle && shop.index == ROLE_PRODUCT_TYPE) || is_paying, ButtonStyle.Secondary),
        make_button('🛒', 'cart', customer.mode == ShoppingMode.Cart || is_paying, ButtonStyle.Secondary, 'Voir sélection'),
    );

    return row_buttons;

}

/**
 * @param shopping_cart 
 * @param page 
 * @param max_page 
 * @returns 
 */
function get_customer_buttons(customer: Customer, shop: Shop) {

    const aisle = shop.get_aisle();

    const is_paying = customer.mode == ShoppingMode.Paying;

    const row_buttons = new ActionRowBuilder<ButtonBuilder>().addComponents(
        make_button('⬅️', 'previous', aisle.page == 0 || is_paying),
        make_button('➡️', 'next', aisle.page >= aisle.max_page - 1 || is_paying),
        make_button('✅', 'confirm', customer.cart.length == 0, is_paying ? ButtonStyle.Success : ButtonStyle.Secondary),
        make_button('❌', 'cancel', false, is_paying ? ButtonStyle.Danger : ButtonStyle.Secondary)
    );

    return row_buttons;
}

/**
 * @param interaction 
 * @param customer 
 * @returns 
 */
async function checkout(interaction: ButtonInteraction, customer: Customer) {

    if (customer.mode == ShoppingMode.Paying) {

        const member = interaction.member as GuildMember;
        const [is_done, message] = await customer.checkout(member);

        customer.mode = is_done ? ShoppingMode.Paid : ShoppingMode.Cart;
        return message;

    }

    customer.mode = ShoppingMode.Paying;
    return `${interaction.user}, tu es sur le point de confirmer l'achat des produits sélectionnées. **Reclique sur ce bouton pour confirmer les achats.**`;

}

/**
 * 
 * @param user_id 
 * @param customer 
 * @param shop 
 * @returns 
 */
function get_message(user_id: string, customer: Customer, shop: Shop, msg_content?: string) {

    const embed = new EmbedBuilder()
        .setColor('#f36464');

    const is_over = customer.mode == ShoppingMode.Out || customer.mode == ShoppingMode.Paid;

    let content = ""; msg_content || `**<@!${user_id}>**, voici le contenu de ton caddie.`;
    let description = "";

    const row_select_menu = customer.mode == ShoppingMode.Cart || customer.mode == ShoppingMode.Paying
        ? customer.get_select_menu()
        : shop.get_aisle().get_select_menu();


    switch (customer.mode) {

        case ShoppingMode.Cart:
            description = customer.get_cart();
            break;

        case ShoppingMode.Paid:
            description = customer.get_paid();
            break;

        default:
            description = shop.get_aisle().get_embed_description();
            break;

    }

    switch (customer.mode) {

        case ShoppingMode.Paying:
            content = `**<@!${user_id}>**, tu t'apprêtes à confirmer tes achats. **Reclique sur ce bouton pour valider.**`;
            break;

        case ShoppingMode.Out:
            content = `**<@!${user_id}>**, tu as quitté la boutique sans rien acheter. Au revoir !`;
            break;

        case ShoppingMode.Paid:
            content = `**<@!${user_id}>**, tu as bien acheté les produits que tu as sélectionné. Merci beaucoup et à bientôt !`;
            break;

        default:
            content = `**<@!${user_id}>**, bienvenue dans la boutique.`;

    }

    if (msg_content) content = msg_content;

    embed.setDescription(description);

    const row_buttons_shop = get_shop_buttons(customer, shop);
    const row_buttons_customer = get_customer_buttons(customer, shop);

    const embeds = customer.mode == ShoppingMode.Out ? [] : [embed];
    const components = is_over ? [] : [row_select_menu, row_buttons_shop, row_buttons_customer];

    return { content: content, embeds: embeds, components: components };
}

/**
 * @param i 
 * @param customer 
 * @param shop 
 */
function handle_select_menu_interaction(i: SelectMenuInteraction, customer: Customer, shop: Shop) {

    const action = i.customId.split('/')[2];  // button/shop/<id>
    const path = i.values[0].split('/'); // option/shop/<server_id>/<aisle_id>/<product_id>

    if (action == 'aisle') {
        customer.add_to_cart(shop, path);
    }

    if (action == 'cart') {
        customer.remove_from_cart(path);
    }

}

/**
 * @param i 
 * @param customer 
 * @param shop 
 * @returns 
 */
async function handle_button_interaction(i: ButtonInteraction, customer: Customer, shop: Shop) {

    const action = i.customId.split('/')[2];  // button/shop/<id>

    if (action === 'confirm' && customer.mode == ShoppingMode.Paying) {
        return checkout(i, customer);
    }

    switch (action) {

        case 'cart':
            customer.mode = ShoppingMode.Cart;
            break;

        case 'home':
            customer.mode = ShoppingMode.Home;
            shop.index = 0;
            break;

        case 'aisle_roles':
            customer.mode = ShoppingMode.Aisle;
            shop.index = 1;
            break;

        case 'previous':
            shop.get_aisle().page -= 1;
            break;

        case 'next':
            shop.get_aisle().page += 1;
            break;

        case 'confirm':
            customer.mode = ShoppingMode.Paying;
            break;

        case 'cancel':

            if (customer.mode == ShoppingMode.Paying) {
                customer.mode = ShoppingMode.Cart;

            } else {
                customer.cart = [];
                customer.price = 0;
                customer.mode = ShoppingMode.Out;
            }
            break;
    }

}

// ###################################################################################################### \\
// #                                            MAIN FUNCTION                                           # \\
// ###################################################################################################### \\


/**
 * @param interaction a slash command.
 */
export async function execute(interaction: ChatInputCommandInteraction) {

    if (!interaction.inCachedGuild()) {
        return interaction.reply({ content: `Cette commande ne peut être utilisée que dans un serveur.` });
    }

    await interaction.deferReply();

    // 1.a. Get data

    const user_id = interaction.user.id;
    const customer = new Customer(user_id, interaction.guild);
    const shop = new Shop(interaction.guild);

    await shop.configure();

    // 1.b. Set initial message

    const shop_message_reply = get_message(user_id, customer, shop);
    const response = await interaction.editReply(shop_message_reply);
    const message = await interaction.fetchReply();

    // 2. Collect interactions

    const time_ms = 15 * 60 * 1000;
    const collector = response.createMessageComponentCollector({ time: time_ms });

    let msg_content: string | undefined;

    collector.on('collect', async (i: ButtonInteraction | StringSelectMenuInteraction) => {

        if (i.user.id != user_id || !i.inCachedGuild()) return;

        if (i.isStringSelectMenu()) {
            handle_select_menu_interaction(i, customer, shop);
        }

        if (i.isButton()) {
            msg_content = await handle_button_interaction(i, customer, shop);
        }

        await i.update(get_message(user_id, customer, shop, msg_content));

    });

    // 3. End interactions

    collector.on('end', async () => {
        customer.mode = ShoppingMode.Out;
        await message.edit(get_message(user_id, customer, shop, msg_content));
    });

}

export const data = new SlashCommandBuilder()
    .setName('shop')
    .setDescription("Displays the shop.");