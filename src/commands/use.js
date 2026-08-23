import { SlashCommandBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ActionRowBuilder, ComponentType, ModalBuilder, TextInputBuilder, TextInputStyle } from 'discord.js';
import inventoryService from '../economy/inventory.service.js';
import { getItemById } from '../economy/shop.items.js';

export const data = new SlashCommandBuilder()
    .setName('use')
    .setDescription('Pakai item dari inventory tanpa ribet');

export async function execute(interaction) {
    const userId = interaction.user.id;
    const inventory = await inventoryService.getUserInventory(userId);

    const distinctItems = [];
    const seen = new Set();

    for (const inv of inventory) {
        if (!seen.has(inv.item_id)) {
            const def = getItemById(inv.item_id);
            if (def) {
                distinctItems.push({ ...inv, def });
                seen.add(inv.item_id);
            }
        }
    }

    if (distinctItems.length === 0) {
        return interaction.reply({ content: '🎒 **Tas kamu kosong!** Gak ada yang bisa dipakai.', ephemeral: true });
    }

    const options = distinctItems.slice(0, 25).map(item => {
        return new StringSelectMenuOptionBuilder()
            .setLabel(item.def.name)
            .setDescription(item.def.type === 'role' ? 'Pasang Role (Durasi)' : 'Gunakan item ini')
            .setValue(item.item_id)
            .setEmoji('⚡');
    });

    const selectMenu = new StringSelectMenuBuilder()
        .setCustomId('use_select_item')
        .setPlaceholder('Pilih item yang mau dipakai...')
        .addOptions(options);

    const row = new ActionRowBuilder().addComponents(selectMenu);

    const reply = await interaction.reply({
        content: '🛠️ **Pilih item yang mau digunakan:**',
        components: [row],
        ephemeral: true,
        fetchReply: true
    });

    const collector = reply.createMessageComponentCollector({ componentType: ComponentType.StringSelect, time: 60000 });

    collector.on('collect', async i => {
        const itemId = i.values[0];
        const itemDef = getItemById(itemId);

        if (itemId === 'color_custom') {
            const modal = new ModalBuilder()
                .setCustomId(`color_modal_${itemId}`)
                .setTitle('🎨 Atur Warna Role Kamu');

            const colorInput = new TextInputBuilder()
                .setCustomId('color_hex')
                .setLabel("Masukkan Kode Hex (contoh: #FF0000)")
                .setStyle(TextInputStyle.Short)
                .setPlaceholder('#FF0000')
                .setMaxLength(7)
                .setMinLength(4)
                .setRequired(true);

            const row = new ActionRowBuilder().addComponents(colorInput);
            modal.addComponents(row);

            await i.showModal(modal);

            try {
                const submitted = await i.awaitModalSubmit({ time: 60000, filter: m => m.customId === `color_modal_${itemId}` && m.user.id === i.user.id });

                const hexColor = submitted.fields.getTextInputValue('color_hex');
                if (!/^#[0-9A-F]{6}$/i.test(hexColor)) {
                    await submitted.reply({ content: '❌ **Format Salah!** Harus kode HEX valid (contoh: #FF0000). Coba lagi.', ephemeral: true });
                    return;
                }

                const guild = i.guild;
                const member = await guild.members.fetch(i.user.id);
                const roleName = `Color-${i.user.username}`;

                let role = guild.roles.cache.find(r => r.name === roleName);

                if (role) {
                    await role.edit({ color: hexColor });
                } else {
                    role = await guild.roles.create({
                        name: roleName,
                        color: hexColor,
                        position: guild.roles.highest.position - 5,
                        reason: 'Custom Color Item Used'
                    });
                }

                if (!member.roles.cache.has(role.id)) {
                    await member.roles.add(role);
                }

                await inventoryService.useItem(userId, itemId);

                await submitted.reply({
                    embeds: [{
                        title: '🎨 **WARNA BERUBAH!**',
                        description: `Role warna kamu **${hexColor}** berhasil dipasang!`,
                        color: parseInt(hexColor.replace('#', ''), 16)
                    }],
                    components: []
                });

            } catch (err) {
                console.error(err);
            }
            return;
        }

        let successMessage = '';
        try {
            switch (itemDef.type) {
                case 'role':
                    if (itemDef.roleId) {
                        const member = await i.guild.members.fetch(userId);

                        const role = i.guild.roles.cache.get(itemDef.roleId);
                        if (!role) {
                            return i.update({ content: `⚠️ **Error Config:** Role ID \`${itemDef.roleId}\` tidak ditemukan di server ini. Hubungi Admin.`, components: [] });
                        }

                        if (member.roles.cache.has(itemDef.roleId) && itemDef.duration === 0) {
                            return i.update({ content: '⚠️ **Kamu sudah punya role permanen ini!**', components: [] });
                        }

                        await member.roles.add(itemDef.roleId);
                        successMessage = `🎉 **ROLE DIPASANG!**\nKamu sekarang punya role <@&${itemDef.roleId}>.`;
                    } else {
                        successMessage = '⚠️ **Error Config:** Role ID belum disetting oleh Admin.';
                    }
                    break;
                case 'xp_boost':
                    successMessage = '⚡ **XP Boost Diaktifkan!** (Effect simulated)';
                    break;
                case 'premium_spin_ticket':
                    return i.update({ content: '🛑 **Salah Tempat!**\nTiket ini otomatis dipakai saat kamu ketik `/spin` dan pilih tombol Premium.', components: [] });
                default:
                    successMessage = `✅ **${itemDef.name}** berhasil dipakai!`;
                    break;
            }

            await inventoryService.useItem(userId, itemId);

            await i.update({
                content: '',
                embeds: [{
                    title: '✅ **ITEM DIGUNAKAN**',
                    description: successMessage,
                    color: 0x00FF00
                }],
                components: []
            });

        } catch (e) {
            console.error(e);
            await i.update({ content: '❌ Gagal menggunakan item.', components: [] });
        }
    });
}
