import { SlashCommandBuilder } from 'discord.js';
import trustService from '../services/trust.service.js';

export const data = new SlashCommandBuilder()
    .setName('trust')
    .setDescription('Cek Trust Score (Anti-Exploit System)')
    .addUserOption(opt => opt.setName('user').setDescription('User yang mau dicek'));

export async function execute(interaction) {
    const targetUser = interaction.options.getUser('user') || interaction.user;
    const score = await trustService.getTrustScore(targetUser.id);

    let status = '🟢 SAFE';
    let color = 0x2ECC71;

    if (score < 50) {
        status = '🔴 DANGEROUS';
        color = 0xE74C3C;
    } else if (score < 80) {
        status = '🟡 SUSPICIOUS';
        color = 0xF1C40F;
    }

    const maxBars = 10;
    const filledBars = Math.round((score / 100) * maxBars);
    const emptyBars = maxBars - filledBars;
    const bar = '🛡️'.repeat(filledBars) + '💀'.repeat(emptyBars);

    return interaction.reply({
        embeds: [{
            title: `🕵️ **TRUST OBSERVER SYSTEM**`,
            description: `Target: **${targetUser.username}**\n\n**STATUS: ${status}**\n${bar}\n\n📊 **Trust Score:** \`${score}/100\``,
            color: color,
            footer: { text: score < 50 ? '⚠️ Warning: User ini sering melanggar aturan.' : '✅ User ini aman dan terpercaya.' },
            timestamp: new Date()
        }]
    });
}
