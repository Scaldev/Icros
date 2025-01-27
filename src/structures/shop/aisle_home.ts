import { ActionRowBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder } from "discord.js";

import { Product } from "./product";
import { Aisle, BaseAisle } from "./aisle";

export class HomeAisle extends BaseAisle implements Aisle {

    id = 0;

    get_product(id: number): Product | undefined {

        for (let i = 0; i < this.products.length; i++) {
            if (this.products[i].id === id) {
                return this.products[i];
            }
        }
    }

    async set_products() {
    }

    get_embed_description() {

        let text = "## Boutique : Accueil 🏠\n\n"
            + `Ici, vous pouvez échanger vos **oeufs** 🥚 contre des produits.\n`
            + `### Sélectionner, retirer des produits.\n`
            + `Dans un rayon, cliquer sur un produit dans le menu déroulant, l'ajoute dans votre *caddie*. Réciproquement, dans votre caddie, cliquer un produit le remet en rayon.\n`
            + `### Navigation, confirmation.\n`
            + `Utilisez les flèches pour naviguer à travers un rayon. Appuyez *deux fois* sur ✅ pour confirmer vos achats, ou sur ❌ pour quitter la boutique.`;

        return text;
    }

    get_select_menu(): ActionRowBuilder<StringSelectMenuBuilder> {

        const select_menu = new StringSelectMenuBuilder()
            .setCustomId('selectmenu/shop/aisle')
            .setPlaceholder('Utilise les boutons pour aller dans un rayon.')
            .setDisabled(true)
            .addOptions(
                new StringSelectMenuOptionBuilder()
                    .setLabel(`Rayon Menu`)
                    .setValue(`option/shop/${this.guild.id}/.`)
            );

        const row = new ActionRowBuilder<StringSelectMenuBuilder>()
            .addComponents(select_menu);

        return row;

    }

}