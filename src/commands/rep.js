import { SlashCommandBuilder } from 'discord.js';
import reputationService from '../services/reputation.service.js';

export const data = new SlashCommandBuilder()
    .setName('rep')
    .setDescription('Sistem Reputasi & Social Credit')
    .addSubcommand(sub =>
        sub.setName('give')
            .setDescription('Kasih +1 Respect ke orang lain')
            .addUserOption(opt => opt.setName('user').setDescription('Target user').setRequired(true)))
    .addSubcommand(sub =>
        sub.setName('stats')
            .setDescription('Cek reputasi user')
            .addUserOption(opt => opt.setName('user').setDescription('Target user')));

export async function execute(interaction) {
    const subcommand = interaction.options.getSubcommand();
    const targetUser = interaction.options.getUser('user') || interaction.user;

    if (subcommand === 'give') {
        if (targetUser.id === interaction.user.id) {
            return interaction.reply({ content: '🚫 **Self-Rep Error!** Narsis banget lu.', ephemeral: true });
        }

        const result = await reputationService.giveReputation(interaction.user.id, targetUser.id);

        if (result.success) {
            const msg = await interaction.reply({ content: `🤝 **Memberikan respect ke ${targetUser.username}...**`, fetchReply: true });
            setTimeout(() => {
                msg.edit({
                    content: '',
                    embeds: [{
                        description: `✅ **RESPECT +1**\n\n${interaction.user} 🤜🤛 ${targetUser}\n*Reputasi mereka bertambah!*`,
                        color: 0x00FF00
                    }]
                });
            }, 1000);
        } else {
            return interaction.reply({
                embeds: [{
                    description: `⏳ **COOLDOWN!**\n${result.message}`,
                    color: 0xFF0000
                }],
                ephemeral: true
            });
        }
    }

    if (subcommand === 'stats') {
        const stats = await reputationService.getReputation(targetUser.id);

        return interaction.reply({
            embeds: [{
                title: `🛡️ **SOCIAL CREDIT SCORE**`,
                description: `**USER:** ${targetUser}\n\n🌟 **Total Reputation:** \`${stats.rep_points}\``,
                thumbnail: { url: targetUser.displayAvatarURL() },
                footer: { text: 'Terima kasih telah menjadi orang baik!' },
                color: 0xF1C40F,
                timestamp: new Date()
            }]
        });
    }
}
