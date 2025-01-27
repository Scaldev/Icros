import { ChatInputCommandInteraction, TextBasedChannel } from 'discord.js';
import { SlashCommandBuilder } from '@discordjs/builders';
import { setTimeout as wait } from 'node:timers/promises';

/**
 * @param channel the channel the interaction was made in.
 * @param is_countdown true iff the user wants the bot to say every second.
 * @param seconds the number of seconds left to count.
 * @returns the final message after [seconds] seconds.
 */
async function pass_second(channel: TextBasedChannel, is_countdown: boolean, seconds: number) {

    if (seconds <= 0) {
        return channel.send({ content: `## ⏳ Temps écoulé !` });
    }

    if (is_countdown) {
        channel.send({ content: `### ⏳ Plus que ${seconds} seconde${seconds >= 2 ? 's' : ''}...` });
    }

    await wait(1000);
    return pass_second(channel, is_countdown, seconds - 1);
}

/**
 * Execute the "timer" slash command.
 * @param interaction a slash command interaction with the name timer.
 */
export async function execute(interaction: ChatInputCommandInteraction) {

    const channel = interaction.channel;
    const is_countdown = interaction.options.getBoolean('countdown') || false;
    const seconds = interaction.options.getInteger('seconds') || 0;

    if (!channel) return;

    await interaction.reply({ content: `Bien compris ! Début d'un décompte de **${seconds} seconde${seconds >= 2 ? 's' : ''}**.`, ephemeral: true });

    return pass_second(channel, is_countdown, seconds);
}

export const data = new SlashCommandBuilder()
    .setName('timer')
    .setDescription("Starts a timer.")
    .addIntegerOption(option => option.setName("seconds").setDescription("The number of seconds to count for.").setRequired(true))
    .addBooleanOption(option => option.setName("countdown").setDescription("Displays every second passed (no by default)."));