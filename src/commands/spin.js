import { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } from 'discord.js';
import db from '../db/index.js';
import guildService from '../services/guild.service.js';
import inventoryService from '../economy/inventory.service.js';

export const data = new SlashCommandBuilder()
    .setName('spin')
    .setDescription('Putar slot keberuntungan! Bisa Gratis (Daily) atau Premium.');

export async function execute(interaction) {
    const freeButton = new ButtonBuilder()
        .setCustomId('spin_free')
        .setLabel('🎰 Spin Gratis (Daily)')
        .setStyle(ButtonStyle.Primary);

    const premiumButton = new ButtonBuilder()
        .setCustomId('spin_premium')
        .setLabel('💎 Spin Premium (Ticket)')
        .setStyle(ButtonStyle.Success)
        .setEmoji('🎟️');

    const row = new ActionRowBuilder().addComponents(freeButton, premiumButton);

    const embed = {
        title: '🎰 **SANTUY SLOT MACHINE**',
        description: 'Pilih mode keberuntunganmu!\n\n**🎰 GRATIS (Daily)**\n- Max 2x sehari\n- Hadiah random game\n\n**💎 PREMIUM (Ticket)**\n- Butuh `Premium Spin Ticket`\n- 100% Animasi Keren\n- Hadiah LEBIH TERJAMIN (Sesuai stok premium)',
        color: 0xFFD700,
        thumbnail: { url: 'https://media.giphy.com/media/26ufmyMTrfltQNb2M/giphy.gif' }
    };

    const response = await interaction.reply({
        embeds: [embed],
        components: [row],
        ephemeral: true
    });

    const collector = response.createMessageComponentCollector({ componentType: ComponentType.Button, time: 60000 });

    collector.on('collect', async i => {
        if (i.customId === 'spin_free') {
            await handleSpin(i, 'free');
        } else if (i.customId === 'spin_premium') {
            await handleSpin(i, 'premium');
        }
    });
}

async function handleSpin(interaction, mode) {
    const userId = interaction.user.id;
    const guildId = interaction.guild.id;

    // 1. Cek Game Source
    const settings = await guildService.getSettings(guildId);
    if (!settings.game_source_channel_id) {
        return interaction.update({
            content: '❌ **Admin belum setup sumber game!**\nMinta admin ketik `/settings gamesource <channel>` dulu.',
            embeds: [], components: []
        });
    }

    // 2. Validate Requirement based on mode
    if (mode === 'free') {
        const user = await db.get('SELECT daily_spins, last_spin_time FROM users WHERE id = ?', userId);
        const today = new Date().setHours(0, 0, 0, 0);
        const lastSpinDate = new Date(user?.last_spin_time || 0).setHours(0, 0, 0, 0);
        let spinsToday = (user?.daily_spins || 0);

        if (lastSpinDate < today) spinsToday = 0;

        if (spinsToday >= 2) {
            return interaction.update({
                content: '🛑 **Limit Harian Habis!**\nBalik lagi besok ya (Max 2x sehari).',
                embeds: [], components: []
            });
        }

        // Update Usage
        await db.run('UPDATE users SET daily_spins = ?, last_spin_time = ? WHERE id = ?', spinsToday + 1, Date.now(), userId);

    } else if (mode === 'premium') {
        const hasTicket = await inventoryService.hasItem(userId, 'premium_spin_ticket');
        if (!hasTicket) {
            return interaction.update({
                content: '❌ **Gak punya tiket bos!**\nBeli dulu `Premium Spin Ticket` di `/shop` bagian Gacha.',
                embeds: [], components: []
            });
        }

        await inventoryService.useItem(userId, 'premium_spin_ticket');
    }

    let validGames = [];
    try {
        const sourceChannel = await interaction.guild.channels.fetch(settings.game_source_channel_id);
        const messages = await sourceChannel.messages.fetch({ limit: 50 });
        validGames = messages.filter(m => !m.author.bot && m.content.length > 5);

        if (validGames.size === 0) {
            return interaction.update({ content: '❌ **Stok Game Kosong!**', embeds: [], components: [] });
        }
    } catch (e) {
        return interaction.update({ content: '❌ **Error Fetching Games!** Cek permission bot.', embeds: [], components: [] });
    }

    const slots = mode === 'premium' ? ['💎', '👑', '🚀', '🌟', '🔥'] : ['🍒', '🍋', '🔔', '💩', '7️⃣'];

    await interaction.update({
        content: mode === 'premium' ? '🔥 **PREMIUM SPIN STARTING...** 🔥' : '🎰 **SPINNING...**',
        embeds: [],
        components: []
    });

    const loops = mode === 'premium' ? 5 : 3;
    for (let i = 0; i < loops; i++) {
        const a = slots[Math.floor(Math.random() * slots.length)];
        const b = slots[Math.floor(Math.random() * slots.length)];
        const c = slots[Math.floor(Math.random() * slots.length)];

        await interaction.editReply(`🎰 **| ${a} | ${b} | ${c} |**`);
        await new Promise(r => setTimeout(r, 800));
    }

    const prizeMsg = validGames.random();

    let prizeImage = null;
    if (prizeMsg.attachments.size > 0) prizeImage = prizeMsg.attachments.first().url;
    else if (prizeMsg.embeds.length > 0 && prizeMsg.embeds[0].image) prizeImage = prizeMsg.embeds[0].image.url;

    const prizeEmbed = {
        title: mode === 'premium' ? '💎 PREMIUM JACKPOT REWARD' : '🎁 HADIAH SPIN KAMU',
        description: `Selamat! Ini hadiah game kamu:\n\n${prizeMsg.content}\n\n*Simpan pesan ini baik-baik!*`,
        color: mode === 'premium' ? 0xFF00FF : 0x00FF00,
        image: prizeImage ? { url: prizeImage } : undefined,
        footer: { text: `From: ${interaction.guild.name}` }
    };

    let dmStatus = '✅ Cek DM kamu buat ambil hadiahnya!';
    try {
        await interaction.user.send({ embeds: [prizeEmbed] });
    } catch (e) {
        dmStatus = '❌ **Gagal kirim DM!** Buka DM kamu woy!';
    }

    const finalEmbed = {
        title: mode === 'premium' ? '💎 **JACKPOT SULTAN!** 💎' : '🎰 **SPIN SELESAI!**',
        description: `Selamat! Kamu dapat hadiah dari kotak misteri.\n\n${dmStatus}`,
        color: mode === 'premium' ? 0xFFAA00 : 0x00AAFF
    };

    await interaction.editReply({ content: '', embeds: [finalEmbed] });
}
