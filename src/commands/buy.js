import { SlashCommandBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ActionRowBuilder, ComponentType } from 'discord.js';
import userService from '../services/user.service.js';
import inventoryService from '../economy/inventory.service.js';
import { SHOP_ITEMS, getItemById } from '../economy/shop.items.js';
import { logEconomy } from '../utils/auditLogger.js';

export const data = new SlashCommandBuilder()
    .setName('buy')
    .setDescription('Beli item tanpa ribet ngetik ID');

export async function execute(interaction) {
    const user = await userService.getUser(interaction.user.id, interaction.user.username);

    const items = [...SHOP_ITEMS].sort((a, b) => a.price - b.price);

    const options = items.slice(0, 25).map(item => {
        let emoji = '📦';
        if (item.type === 'role') emoji = '👑';
        if (item.type === 'consumable') emoji = '🍬';
        if (item.category === 'boost') emoji = '⚡';

        return new StringSelectMenuOptionBuilder()
            .setLabel(`${emoji} ${item.name}`)
            .setDescription(`Harga: RP ${item.price.toLocaleString()}`)
            .setValue(item.id);
    });

    const selectMenu = new StringSelectMenuBuilder()
        .setCustomId('buy_select_item')
        .setPlaceholder('Pilih barang yang mau dibayar...')
        .addOptions(options);

    const row = new ActionRowBuilder().addComponents(selectMenu);

    const embed = {
        title: '🛒 **QUICK BUY MENU**',
        description: `Saldo Kamu: **RP ${user.coins.toLocaleString()}**\n\nPilih barang dari list di bawah untuk langsung diproses.`,
        color: 0x00A8FF,
        footer: { text: 'Klik dropdown untuk beli 👇' }
    };

    const response = await interaction.reply({
        embeds: [embed],
        components: [row],
        ephemeral: true,
        fetchReply: true
    });

    const collector = response.createMessageComponentCollector({ componentType: ComponentType.StringSelect, time: 60000 });

    collector.on('collect', async i => {
        const itemId = i.values[0];
        const item = getItemById(itemId);

        const currentUser = await userService.getUser(i.user.id);

        if (currentUser.coins < item.price) {
            await i.update({
                content: `❌ **Duit Kurang!**\nPerlu: RP ${item.price.toLocaleString()}\nPunya: RP ${currentUser.coins.toLocaleString()}`,
                embeds: [],
                components: []
            });
            return;
        }

        try {
            await userService.addCoins(i.user.id, i.user.username, -item.price);

            const expiresAt = item.duration ? Math.floor((Date.now() + item.duration) / 1000) : null;
            await inventoryService.addItem(i.user.id, item.id, expiresAt, {
                originalPrice: item.price,
                boughtAt: new Date().toISOString()
            });

            logEconomy('BUY_ITEM', i.user, item.price, `Quick Buy: ${item.name}`);

            await i.update({
                content: '',
                embeds: [{
                    title: '✅ **PEMBELIAN BERHASIL!**',
                    description: `Kamu membeli **${item.name}** seharga **RP ${item.price.toLocaleString()}**.\nCek inventory: \`/inventory\``,
                    color: 0x00FF00,
                    thumbnail: { url: 'https://media.giphy.com/media/l0HlOaQcLn2h7uO2I/giphy.gif' }
                }],
                components: []
            });
        } catch (e) {
            console.error(e);
            await i.reply({ content: '❌ Terjadi kesalahan sistem.', ephemeral: true });
        }
    });
}
