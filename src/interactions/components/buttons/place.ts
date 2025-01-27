import { ButtonInteraction } from "discord.js";
import { query } from "../../../structures/database/mysql";
import { give_pixels } from "../../../structures/place/place";

export async function execute(interaction: ButtonInteraction) {

    if (!interaction.inCachedGuild()) return;
    if (!interaction.channel) return;

    await interaction.update({});

    const path = interaction.customId.split("/"); // place/${server_id}/${board_id}/${square_id}

    const server_id = path[1];
    const board_id = Number.parseInt(path[2]);
    const square_id = Number.parseInt(path[3]);

    // Récupérer le plateau

    const { boards } = await import(`../../../structures/place/place`);

    const board = await boards.get(interaction.guild, board_id);

    if (board == null) {
        return interaction.update({ content: `Ce plateau n'existe plus.`, components: [] });
    }

    // Récupérer le joueur

    const arr = board.players.filter(p => p.id == interaction.user.id);

    const player = arr.length == 0
        ? board.add_player(interaction.member)
        : arr[0];

    player.update_emoji(interaction.member);

    const previous_player = board.squares[square_id].player;

    const NO_TEAM_EMOJI = "<:blank:1275406305271742527>";
    let action = `**[${previous_player?.emoji || NO_TEAM_EMOJI} ↦ ${player.emoji}]** - <@!${player.id}> a pris la case n°${square_id}`;

    if (player.cooldown != null) {
        return interaction.followUp({ content: `${interaction.user}, tu as déjà pris une case adverse récemment. Fin du cooldown : <t:${Math.round(player.cooldown.getTime() / 1000)}:R>.`, ephemeral: true });
    }

    player.number_of_squares += 1;

    if (previous_player) {
        previous_player.number_of_squares -= 1;
        action += ` de <@!${previous_player.id}>`;
    }

    action += " !";

    const channel = await interaction.guild.channels.fetch('1258167827572199436');

    if (previous_player != player) {

        player.put_in_cooldown(board.cooldown);
        give_pixels(interaction.guild.id, interaction.user.id, 10);
        board.add_action(action);

        if (channel?.isTextBased()) {

            const text_board_link = `\n-# Plateau n°**${board_id}** : https://discord.com/channels/${server_id}/${interaction.channel.id}/${interaction.message.id}`;
            const message = await channel.send({ content: action + text_board_link });

            /*
            setTimeout(async () => {
                await message.delete();
            }, 1000 * 60);
            */

        }

    }

    // Modifier le plateau

    const rows = await query(`SELECT channel_id, message_id FROM PlaceBoards WHERE server_id = '${server_id}' AND board_id = ${board_id};`);

    if (rows.length == 0 || board == null) {
        return interaction.update({ content: `Ce plateau n'existe plus.`, components: [] });
    }

    if (rows[0].channel_id != interaction.channel.id || rows[0].message_id != interaction.message.id) {
        const message_link = `https://discord.com/channels/${server_id}/${rows[0].channel_id}/${rows[0].message_id}`;
        return interaction.editReply({ content: `Ce plateau n'est plus à jour. Le plateau principal est désormais ici : ${message_link}.\n#- Ce message ne sera plus mis à jour. Il se peut que le plateau principal rechange d'ici-là.`, components: [] });
    }

    await board.squares[square_id].update(player);

    const new_components = board.get_components();
    const new_embed = await board.get_embed();
    await interaction.editReply({ embeds: [new_embed], components: new_components });

}