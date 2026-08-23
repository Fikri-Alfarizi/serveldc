import { SlashCommandBuilder } from 'discord.js';
import inventoryService from '../economy/inventory.service.js';
import userService from '../services/user.service.js';
import { getItemById } from '../economy/shop.items.js';

export const data = new SlashCommandBuilder()
    .setName('inventory')
    .setDescription('Cek tas inventaris kamu');

export async function execute(interaction) {
    try {
        await interaction.deferReply();

        const items = await inventoryService.getUserInventory(interaction.user.id);
        const user = await userService.getUser(interaction.user.id, interaction.user.username);

        if (items.length === 0) {
            return await interaction.editReply({
                content: '🎒 **Tas kamu kosong melompong!**',
                embeds: [{
                    description: 'Belum ada barang di sini. Yuk belanja dulu di `/shop`!',
                    color: 0x95A5A6
                }]
            });
        }

        const grouped = {};
        items.forEach(invItem => {
            const itemDef = getItemById(invItem.item_id);
            const type = itemDef ? itemDef.type : 'unknown';
            if (!grouped[type]) grouped[type] = [];
            grouped[type].push({ ...invItem, def: itemDef });
        });

        const fields = [];
        const typeEmojis = {
            role: '👑',
            consumable: '🍬',
            xp_boost: '⚡',
            coin_boost: '💰',
            utility: '🛠️',
            unknown: '❓'
        };

        const typeNames = {
            role: 'Exclusive Roles',
            consumable: 'Consumables',
            xp_boost: 'XP Boosters',
            coin_boost: 'Coin Boosters',
            utility: 'Tools & Utility',
            unknown: 'Mystery Items'
        };

        for (const [type, invItems] of Object.entries(grouped)) {
            const PREVIEW_LIMIT = 10;
            const remaining = invItems.length - PREVIEW_LIMIT;

            const itemList = invItems.slice(0, PREVIEW_LIMIT).map((item, i) => {
                const name = item.def ? item.def.name : `Unknown Item (${item.item_id})`;
                const properties = [];
                if (item.expires_at) properties.push(`⏳ <t:${item.expires_at}:R>`);

                return `> **${i + 1}. ${name}** ${properties.join('')}`;
            }).join('\n');

            const footerText = remaining > 0 ? `\n*...dan ${remaining} item lainnya*` : '';

            fields.push({
                name: `${typeEmojis[type] || '📦'} **${typeNames[type] || type.toUpperCase()}**`,
                value: itemList + footerText,
                inline: false
            });
        }

        const embed = {
            title: `🎒 **TAS INVENTARIS**`,
            description: `Pemilik: **${interaction.user.username}**\nTotal Barang: **${items.length}** items`,
            color: 0xF1C40F,
            thumbnail: { url: interaction.user.displayAvatarURL() },
            fields: fields,
            footer: { text: '💡 Pakai item? Gunakan command yang sesuai fitur!' }
        };

        await interaction.editReply({ embeds: [embed] });
    } catch (error) {
        console.error('Inventory Error:', error);
        await interaction.editReply({
            content: '❌ **Gagal memuat inventory!**\nAda masalah teknis. Coba lapor admin.',
            embeds: []
        }).catch(() => { });
    }
}
