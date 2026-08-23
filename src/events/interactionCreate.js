import {
    Events,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    ActionRowBuilder,
    EmbedBuilder,
    ButtonStyle,
    ButtonBuilder
} from 'discord.js';
import userService from '../services/user.service.js';
import { getPackageById } from '../economy/topup.config.js';
import { logEconomy } from '../utils/auditLogger.js';
import { handleAdminInteraction } from '../commands/admin.js';

export default {
    name: 'interactionCreate',
    async execute(interaction) {
        // --- AUTOCOMPLETE (for /game search) ---
        if (interaction.isAutocomplete()) {
            const command = interaction.client.commands.get(interaction.commandName);
            if (!command || !command.autocomplete) return;

            try {
                await command.autocomplete(interaction);
            } catch (error) {
                console.error('Autocomplete error:', error);
            }
            return;
        }

        // --- CHAT COMMANDS ---
        if (interaction.isChatInputCommand()) {
            const command = interaction.client.commands.get(interaction.commandName);
            if (!command) return;

            try {
                await command.execute(interaction);
            } catch (error) {
                console.error(error);
                const reply = { content: '❌ Error executing command!', ephemeral: true };
                if (interaction.replied || interaction.deferred) await interaction.followUp(reply);
                else await interaction.reply(reply);
            }
        }

        // --- BUTTONS & SELECT MENUS ---
        else if (interaction.isMessageComponent()) {
            const { customId } = interaction;

            // ROLE PANEL TOGGLE
            if (customId.startsWith('role_toggle_')) {
                const roleId = customId.split('role_toggle_')[1];
                const role = interaction.guild.roles.cache.get(roleId);

                if (!role) {
                    return interaction.reply({ content: '❌ Role not found (maybe deleted?).', ephemeral: true });
                }

                // Check Bot Permission (in case role hierarchy changed)
                if (!role.editable) {
                    return interaction.reply({ content: '❌ **I cannot manage this role!** It might be higher than my role.', ephemeral: true });
                }

                const member = interaction.member;
                const hasRole = member.roles.cache.has(roleId);

                try {
                    if (hasRole) {
                        await member.roles.remove(role);
                        return interaction.reply({ content: `🗑️ Role **${role.name}** dilepas.`, ephemeral: true });
                    } else {
                        await member.roles.add(role);
                        return interaction.reply({ content: `✅ Role **${role.name}** berhasil diambil!`, ephemeral: true });
                    }
                } catch (error) {
                    console.error('Role Toggle Error:', error);
                    return interaction.reply({ content: `❌ Error changing role: ${error.message}`, ephemeral: true });
                }
            }

            // ADMIN DASHBOARD HANDLER
            if (customId.startsWith('admin_') || customId.startsWith('mod_')) {
                try {
                    await handleAdminInteraction(interaction);
                } catch (error) {
                    console.error('Admin Interaction Error:', error);
                    try {
                        if (!interaction.replied && !interaction.deferred) {
                            await interaction.reply({
                                content: `❌ **Error Dashboard:**\n\`\`\`${error.message}\`\`\``,
                                ephemeral: true
                            });
                        } else {
                            await interaction.followUp({
                                content: `❌ **Error Dashboard:**\n\`\`\`${error.message}\`\`\``,
                                ephemeral: true
                            });
                        }
                    } catch (e) { /* ignore */ }
                }
                return;
            }

            // TOPUP: Confirm Payment -> Show Modal
            if (customId.startsWith('confirm_pay_')) {
                const parts = customId.split('_'); // confirm, pay, trxId, pkgId
                const trxId = parts[2];
                const pkgId = parts[3];

                const modal = new ModalBuilder()
                    .setCustomId(`modal_pay_${trxId}_${pkgId}`)
                    .setTitle('Konfirmasi Pembayaran');

                const senderInput = new TextInputBuilder()
                    .setCustomId('sender_name')
                    .setLabel("Nama Pengirim / No. Dana")
                    .setStyle(TextInputStyle.Short)
                    .setPlaceholder('Contoh: Fikri (0812...)')
                    .setRequired(true);

                const row = new ActionRowBuilder().addComponents(senderInput);
                modal.addComponents(row);

                await interaction.showModal(modal);
            }

            // TOPUP: Cancel
            if (customId === 'cancel_pay') {
                await interaction.update({ content: '❌ Transaksi dibatalkan.', embeds: [], components: [] });
            }

            // ADMIN: Approve Topup
            if (customId.startsWith('approve_pay_')) {
                // customId: approve_pay_USERID_AMOUNT_TRXID
                const parts = customId.split('_');
                const userId = parts[2];
                const amount = parseInt(parts[3]);
                const trxId = parts[4];

                try {
                    await userService.addCoins(userId, 'StartTopup', amount);

                    // Notify Admin (Update Message)
                    const embed = EmbedBuilder.from(interaction.message.embeds[0]);
                    embed.setColor(0x00FF00);
                    embed.setTitle('✅ APPROVED');
                    embed.addFields({ name: 'Approver', value: interaction.user.tag });

                    await interaction.update({ embeds: [embed], components: [] });

                    // Notify User
                    const user = await interaction.client.users.fetch(userId);
                    if (user) {
                        try {
                            await user.send(`✅ **TOPUP BERHASIL!**\nCoins sebesar **${amount.toLocaleString()}** telah ditambahkan ke akunmu.`);
                        } catch (e) {
                            // User DM closed
                        }
                    }

                    logEconomy('TOPUP_APPROVED', { id: userId, tag: user?.tag || 'Unknown' }, amount, `TRX: ${trxId} by Admin ${interaction.user.tag}`);

                } catch (error) {
                    console.error(error);
                    await interaction.reply({ content: '❌ Gagal memproses approval.', ephemeral: true });
                }
            }

            // ADMIN: Reject Topup
            if (customId.startsWith('reject_pay_')) {
                const parts = customId.split('_');
                const userId = parts[2];

                // Update Admin Message
                const embed = EmbedBuilder.from(interaction.message.embeds[0]);
                embed.setColor(0xFF0000);
                embed.setTitle('❌ REJECTED');
                embed.addFields({ name: 'Rejecter', value: interaction.user.tag });

                await interaction.update({ embeds: [embed], components: [] });

                // Notify User
                const user = await interaction.client.users.fetch(userId);
                if (user) {
                    try {
                        await user.send(`❌ **TOPUP DITOLAK!**\nBukti pembayaran tidak valid atau belum masuk. Silakan hubungi admin jika ini kesalahan.`);
                    } catch (e) { }
                }
            }

            // VERIFIKASI SISTEM (Legacy)
            if (customId.startsWith('verify_btn_')) {
                const roleId = customId.split('_')[2];
                const role = interaction.guild.roles.cache.get(roleId);

                if (!role) {
                    return interaction.reply({ content: '❌ Role tidak ditemukan/sudah dihapus!', ephemeral: true });
                }

                if (interaction.member.roles.cache.has(roleId)) {
                    return interaction.reply({ content: '✅ Kamu sudah terverifikasi!', ephemeral: true });
                }

                try {
                    await interaction.member.roles.add(role);
                    await interaction.reply({
                        content: `🎉 **Selamat Datang!** Kamu berhasil verifikasi dan mendapatkan role **${role.name}**.`,
                        ephemeral: true
                    });
                } catch (error) {
                    console.error(error);
                    await interaction.reply({ content: '❌ Bot gagal memberi role. Pastikan role Bot lebih tinggi dari role target!', ephemeral: true });
                }
            }
        }

        // --- MODALS ---
        else if (interaction.isModalSubmit()) {
            const { customId } = interaction;

            // ADMIN: Edit Welcome Message
            if (customId === 'modal_edit_welcome_msg') {
                const text = interaction.fields.getTextInputValue('welcome_text');
                const guildService = await import('../services/guild.service.js').then(m => m.default);
                await guildService.updateSetting(interaction.guildId, 'welcome_message', text);
                await interaction.reply({ content: '✅ Welcome Message updated!', ephemeral: true });
                return;
            }

            if (customId.startsWith('modal_pay_')) {
                const parts = interaction.customId.split('_');
                const trxId = parts[2];
                const pkgId = parts[3];

                const senderName = interaction.fields.getTextInputValue('sender_name');
                const pkg = getPackageById(pkgId);
                const amount = pkg ? pkg.coins : 0;
                const price = pkg ? pkg.price : 0;

                await interaction.reply({
                    content: '✅ **Konfirmasi Terkirim!**\nAdmin akan mengecek pembayaranmu. Mohon tunggu maksimal 1x24 jam.',
                    ephemeral: true
                });

                // Send to Admin Channel
                const adminChannelId = process.env.PAYMENT_ADMIN_CHANNEL_ID;
                if (!adminChannelId) return;

                const channel = await interaction.client.channels.fetch(adminChannelId);
                if (channel) {
                    const embed = new EmbedBuilder()
                        .setTitle('💸 NEW TOPUP REQUEST')
                        .setDescription(`User requesting topup for **${pkg ? pkg.label : 'Unknown Package'}**.`)
                        .addFields(
                            { name: 'User', value: `${interaction.user} (${interaction.user.tag})`, inline: true },
                            { name: 'Sender Name', value: `\`${senderName}\``, inline: true },
                            { name: 'Amount (Coins)', value: `**${amount.toLocaleString()}**`, inline: true },
                            { name: 'Price (IDR)', value: `Rp ${price.toLocaleString()}`, inline: true },
                            { name: 'TRX ID', value: `\`${trxId}\``, inline: false }
                        )
                        .setTimestamp()
                        .setColor(0xF1C40F);

                    const row = new ActionRowBuilder().addComponents(
                        new ButtonBuilder()
                            .setCustomId(`approve_pay_${interaction.user.id}_${amount}_${trxId}`)
                            .setLabel('✅ Approve')
                            .setStyle(ButtonStyle.Success),
                        new ButtonBuilder()
                            .setCustomId(`reject_pay_${interaction.user.id}_${trxId}`)
                            .setLabel('❌ Reject')
                            .setStyle(ButtonStyle.Danger)
                    );

                    await channel.send({ embeds: [embed], components: [row] });
                }
            }
        }
    },
};
