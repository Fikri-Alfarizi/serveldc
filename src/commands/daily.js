import { SlashCommandBuilder } from 'discord.js';
import userService from '../services/user.service.js';

export const data = new SlashCommandBuilder()
    .setName('daily')
    .setDescription('[👤 Public] Klaim gaji harian');

export async function execute(interaction) {
    const userId = interaction.user.id;
    const username = interaction.user.username;
    const REWARD = 2000 + Math.floor(Math.random() * 500);

    const status = await userService.checkDaily(userId);

    if (status.available) {
        await interaction.reply({
            content: '⏳ **Mengecek absensi...**',
            fetchReply: true
        });

        await new Promise(r => setTimeout(r, 1000));
        await interaction.editReply('💳 **Memproses gaji harian...**');
        await new Promise(r => setTimeout(r, 1000));

        await userService.claimDaily(userId, username, REWARD);

        const funFacts = [
            'Tahukah kamu? Koin ini tidak bisa dipakai beli cilok.',
            'Rajin pangkal kaya, malas pangkal miskin (di bot ini doang).',
            'Jangan lupa traktir teman kalau udah kaya!',
            'Semangat kerjanya kawan!'
        ];
        const randomFact = funFacts[Math.floor(Math.random() * funFacts.length)];

        const embed = {
            title: '✅ **GAJIAN SUKSES CAIR!**',
            description: `Selamat <@${userId}>, uang tunai sudah masuk rekening!`,
            color: 0x00FF00,
            thumbnail: { url: 'https://media.giphy.com/media/l0Ex6kAKAoFRsFh6M/giphy.gif' },
            fields: [
                { name: '💰 Nominal Diterima', value: `\`RP ${REWARD.toLocaleString()}\``, inline: true },
                { name: '📅 Streak Absen', value: `\`🔥 Aman\``, inline: true },
                { name: '💡 Daily Wisdom', value: `*${randomFact}*`, inline: false }
            ],
            footer: { text: 'Balik lagi besok ya!', icon_url: interaction.user.displayAvatarURL() },
            timestamp: new Date()
        };

        await interaction.editReply({ content: '', embeds: [embed] });

    } else {
        const readyAt = Math.floor((Date.now() + status.remaining) / 1000);

        const embed = {
            title: '🛑 **ABSEN DITOLAK!**',
            description: `Woi, gajian itu sehari sekali! Jangan maruk.`,
            color: 0xFF0000,
            fields: [
                { name: '⏳ Tunggu Selama', value: `<t:${readyAt}:R>`, inline: true },
                { name: '⏰ Bisa Absen Lagi', value: `<t:${readyAt}:f>`, inline: true }
            ]
        };

        await interaction.reply({ embeds: [embed], ephemeral: true });
    }
}
