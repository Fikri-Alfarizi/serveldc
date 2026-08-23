import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, ChannelSelectMenuBuilder, RoleSelectMenuBuilder, UserSelectMenuBuilder, ComponentType, ChannelType, PermissionFlagsBits, ModalBuilder, TextInputBuilder, TextInputStyle } from 'discord.js';
import guildService from '../services/guild.service.js';

export const data = new SlashCommandBuilder()
    .setName('admin')
    .setDescription('👑 One-Stop Admin Dashboard')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

export async function execute(interaction) {
    if (!await guildService.isAdmin(interaction)) {
        return interaction.reply({
            content: '📛 **Access Denied!**\nHanya Owner dan Role Admin yang diizinkan mengakses dashboard ini.',
            ephemeral: true
        });
    }

    await showDashboard(interaction);
}

async function showDashboard(interaction, isUpdate = false) {
    const guild = interaction.guild;
    const settings = await guildService.getSettings(guild.id);
    const adminRoles = await guildService.getAdminRoles(guild.id);

    const memberCount = guild.memberCount;
    const adminCount = adminRoles.length;
    const channelsConfigured = Object.values(settings).filter(v => v && typeof v === 'string' && v.length > 10).length;

    const embed = new EmbedBuilder()
        .setTitle(`🛡️ ADMIN DASHBOARD: ${guild.name}`)
        .setDescription('Selamat datang di panel kontrol terpusat. Pilih menu di bawah untuk mengelola server.')
        .addFields(
            { name: '👥 Members', value: `${memberCount}`, inline: true },
            { name: '👮 Admin Roles', value: `${adminCount} roles`, inline: true },
            { name: '⚙️ Configured', value: `${channelsConfigured} settings`, inline: true },
        )
        .setColor(0x2B2D31)
        .setThumbnail(guild.iconURL());

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('admin_menu_settings_1').setLabel('⚙️ Settings (Core)').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('admin_menu_settings_2').setLabel('🎮 Settings (Features)').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('admin_menu_mod').setLabel('🛡️ Moderation').setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId('admin_menu_access').setLabel('👮 Access').setStyle(ButtonStyle.Secondary)
    );

    const row2 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('admin_home').setLabel('🔄 Refresh').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('admin_close').setLabel('❌ Close').setStyle(ButtonStyle.Danger)
    );

    const payload = { content: '', embeds: [embed], components: [row, row2], ephemeral: true };

    if (isUpdate) {
        await interaction.update(payload);
    } else {
        await interaction.reply(payload);
    }
}

async function showSettingsPanel1(interaction) {
    const settings = await guildService.getSettings(interaction.guildId);

    const embed = new EmbedBuilder()
        .setTitle('⚙️ CORE SETTINGS (Page 1/2)')
        .setDescription('Setting channel utama server. Perubahan langsung tersimpan.')
        .setColor(0x3498DB);

    const row1 = new ActionRowBuilder().addComponents(
        new ChannelSelectMenuBuilder()
            .setCustomId('admin_set_welcome')
            .setPlaceholder('👋 Welcome Channel')
            .setChannelTypes(ChannelType.GuildText)
            .setDefaultChannels(settings.welcome_channel_id ? [settings.welcome_channel_id] : [])
    );

    const row2 = new ActionRowBuilder().addComponents(
        new ChannelSelectMenuBuilder()
            .setCustomId('admin_set_leave')
            .setPlaceholder('👋 Leave Channel')
            .setChannelTypes(ChannelType.GuildText)
            .setDefaultChannels(settings.leave_channel_id ? [settings.leave_channel_id] : [])
    );

    const row3 = new ActionRowBuilder().addComponents(
        new ChannelSelectMenuBuilder()
            .setCustomId('admin_set_log')
            .setPlaceholder('📜 Log Channel')
            .setChannelTypes(ChannelType.GuildText)
            .setDefaultChannels(settings.log_channel_id ? [settings.log_channel_id] : [])
    );

    const row4 = new ActionRowBuilder().addComponents(
        new ChannelSelectMenuBuilder()
            .setCustomId('admin_set_general')
            .setPlaceholder('💬 General Chat Channel')
            .setChannelTypes(ChannelType.GuildText)
            .setDefaultChannels(settings.general_chat_channel_id ? [settings.general_chat_channel_id] : [])
    );

    const rowNav = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('admin_home').setLabel('🏠 Home').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('admin_menu_settings_2').setLabel('➡️ Next Page').setStyle(ButtonStyle.Primary)
    );

    await interaction.update({ embeds: [embed], components: [row1, row2, row3, row4, rowNav] });
}

async function showSettingsPanel2(interaction) {
    const settings = await guildService.getSettings(interaction.guildId);

    const embed = new EmbedBuilder()
        .setTitle('🎮 FEATURE SETTINGS (Page 2/2)')
        .setDescription('Setting fitur bot. Perubahan langsung tersimpan.')
        .setColor(0x9B59B6);

    const row1 = new ActionRowBuilder().addComponents(
        new ChannelSelectMenuBuilder()
            .setCustomId('admin_set_levelup')
            .setPlaceholder('🎉 Level Up & Coins Channel')
            .setChannelTypes(ChannelType.GuildText)
            .setDefaultChannels(settings.levelup_channel_id ? [settings.levelup_channel_id] : [])
    );

    const row2 = new ActionRowBuilder().addComponents(
        new ChannelSelectMenuBuilder()
            .setCustomId('admin_set_gamesource')
            .setPlaceholder('🎮 Game Premium Source')
            .setChannelTypes(ChannelType.GuildText)
            .setDefaultChannels(settings.game_source_channel_id ? [settings.game_source_channel_id] : [])
    );

    const row3 = new ActionRowBuilder().addComponents(
        new ChannelSelectMenuBuilder()
            .setCustomId('admin_set_request')
            .setPlaceholder('🙏 Request Game Channel')
            .setChannelTypes(ChannelType.GuildText)
            .setDefaultChannels(settings.request_channel_id ? [settings.request_channel_id] : [])
    );

    const row4 = new ActionRowBuilder().addComponents(
        new ChannelSelectMenuBuilder()
            .setCustomId('admin_set_alarm')
            .setPlaceholder('⏰ Alarm Channel')
            .setChannelTypes(ChannelType.GuildText)
            .setDefaultChannels(settings.alarm_channel_id ? [settings.alarm_channel_id] : [])
    );

    const rowNav2 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('admin_menu_settings_1').setLabel('⬅️ Prev').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('admin_menu_settings_3').setLabel('➡️ Next (Roles)').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('admin_home').setLabel('🏠 Home').setStyle(ButtonStyle.Secondary)
    );

    await interaction.update({ embeds: [embed], components: [row1, row2, row3, row4, rowNav2] });
}

async function showSettingsPanel3(interaction) {
    const settings = await guildService.getSettings(interaction.guildId);

    const embed = new EmbedBuilder()
        .setTitle('🛡️ ROLE & TEXT SETTINGS (Page 3/3)')
        .setDescription('Setting Role dan Text Message.')
        .setColor(0xE67E22);

    const row1 = new ActionRowBuilder().addComponents(
        new RoleSelectMenuBuilder()
            .setCustomId('admin_set_autorole')
            .setPlaceholder('🛡️ Set Auto Role (User Join)')
    );

    const row2 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('admin_edit_chk_welcome').setLabel('📝 Edit Welcome Message').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('admin_edit_chk_alarm').setLabel('⏰ Edit Alarm Schedule').setStyle(ButtonStyle.Secondary)
    );

    const statusEmbed = {
        title: 'Current Config',
        fields: [
            { name: 'Auto Role', value: settings.auto_role_id ? `<@&${settings.auto_role_id}>` : '*Not Set*', inline: true },
            { name: 'Welcome Msg', value: settings.welcome_message ? `"${settings.welcome_message.substring(0, 50)}..."` : '*Default*', inline: true },
            { name: 'Alarm', value: settings.alarm_schedule || '07:00', inline: true }
        ],
        color: 0x2B2D31
    };

    const rowNav = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('admin_menu_settings_2').setLabel('⬅️ Prev').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('admin_home').setLabel('🏠 Home').setStyle(ButtonStyle.Secondary)
    );

    await interaction.update({ embeds: [embed, statusEmbed], components: [row1, row2, rowNav] });
}

async function showAccessPanel(interaction) {
    const guildId = interaction.guildId;
    const allowedRoles = await guildService.getAdminRoles(guildId);

    const rolesDescription = allowedRoles.length > 0
        ? allowedRoles.map(id => `<@&${id}>`).join(', ')
        : '*Belum ada role tambahan (Hanya Owner)*';

    const embed = new EmbedBuilder()
        .setTitle('👮 ACCESS CONTROL')
        .setDescription(`Role di bawah ini diizinkan mengakses command \`/admin\`.\n\n**Allowed Roles:**\n${rolesDescription}`)
        .setColor(0x95A5A6);

    const rowSelect = new ActionRowBuilder().addComponents(
        new RoleSelectMenuBuilder()
            .setCustomId('admin_add_role')
            .setPlaceholder('➕ Tambah Role Admin')
    );

    const rowRemove = new ActionRowBuilder().addComponents(
        new RoleSelectMenuBuilder()
            .setCustomId('admin_remove_role')
            .setPlaceholder('➖ Hapus Role Admin')
    );

    const rowNav = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('admin_home').setLabel('🏠 Back to Home').setStyle(ButtonStyle.Secondary)
    );

    await interaction.update({ embeds: [embed], components: [rowSelect, rowRemove, rowNav] });
}

async function showModPanel(interaction) {
    const embed = new EmbedBuilder()
        .setTitle('🛡️ MODERATION PANEL')
        .setDescription('Pilih user di bawah untuk melakukan tindakan (Kick/Ban).')
        .setColor(0xE74C3C);

    const userSelect = new ActionRowBuilder().addComponents(
        new UserSelectMenuBuilder()
            .setCustomId('admin_mod_select')
            .setPlaceholder('Select User to Moderate...')
    );

    const rowNav = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('admin_home').setLabel('🏠 Back to Home').setStyle(ButtonStyle.Secondary)
    );

    await interaction.update({ embeds: [embed], components: [userSelect, rowNav] });
}

async function showModAction(interaction, userId) {
    const member = await interaction.guild.members.fetch(userId).catch(() => null);
    const username = member ? member.user.tag : userId;

    const embed = new EmbedBuilder()
        .setTitle(`🛡️ Action for: ${username}`)
        .setDescription(`Apa yang ingin kamu lakukan pada <@${userId}>?`)
        .setColor(0xE74C3C)
        .setThumbnail(member ? member.user.displayAvatarURL() : null);

    const rowActions = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`mod_kick_${userId}`).setLabel('🥾 Kick').setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId(`mod_ban_${userId}`).setLabel('🔨 Ban').setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId(`mod_to_${userId}`).setLabel('timeout 1h').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('admin_menu_mod').setLabel('🔙 Cancel').setStyle(ButtonStyle.Secondary)
    );

    await interaction.update({ embeds: [embed], components: [rowActions] });
}

export async function handleAdminInteraction(interaction) {
    if (!await guildService.isAdmin(interaction)) {
        return interaction.reply({ content: '🚫 Access Denied.', ephemeral: true });
    }

    const { customId } = interaction;

    try {
        if (customId === 'admin_home') return await showDashboard(interaction, true);
        if (customId === 'admin_close') {
            return await interaction.update({
                content: '✅ Dashboard ditutup.',
                embeds: [],
                components: []
            });
        }
        if (customId === 'admin_menu_settings_1') return await showSettingsPanel1(interaction);
        if (customId === 'admin_menu_settings_2') return await showSettingsPanel2(interaction);
        if (customId === 'admin_menu_settings_3') return await showSettingsPanel3(interaction);
        if (customId === 'admin_menu_mod') return await showModPanel(interaction);
        if (customId === 'admin_menu_access') return await showAccessPanel(interaction);

        if (customId.startsWith('admin_set_')) {
            const settingKeyMap = {
                'admin_set_welcome': 'welcome_channel_id',
                'admin_set_leave': 'leave_channel_id',
                'admin_set_log': 'log_channel_id',
                'admin_set_general': 'general_chat_channel_id',
                'admin_set_levelup': 'levelup_channel_id',
                'admin_set_gamesource': 'game_source_channel_id',
                'admin_set_request': 'request_channel_id',
                'admin_set_alarm': 'alarm_channel_id',
                'admin_set_autorole': 'auto_role_id'
            };

            const key = settingKeyMap[customId];
            if (key) {
                if (!interaction.values || interaction.values.length === 0) {
                    throw new Error("No option selected");
                }
                const value = interaction.values[0];

                await guildService.updateSetting(interaction.guildId, key, value);

                if (['welcome_channel_id', 'leave_channel_id', 'log_channel_id', 'general_chat_channel_id'].includes(key)) {
                    return await showSettingsPanel1(interaction);
                } else if (key === 'auto_role_id') {
                    return await showSettingsPanel3(interaction);
                } else {
                    return await showSettingsPanel2(interaction);
                }
            }
        }

        if (customId === 'admin_add_role') {
            const roleId = interaction.values[0];
            await guildService.addAdminRole(interaction.guildId, roleId);
            return await showAccessPanel(interaction);
        }
        if (customId === 'admin_remove_role') {
            const roleId = interaction.values[0];
            await guildService.removeAdminRole(interaction.guildId, roleId);
            return await showAccessPanel(interaction);
        }
    } catch (innerError) {
        console.error("Inner Admin Logic Error:", innerError);
        throw innerError;
    }

    if (customId === 'admin_mod_select') {
        const userId = interaction.values[0];
        return showModAction(interaction, userId);
    }

    if (customId.startsWith('mod_kick_')) {
        const userId = customId.split('_')[2];
        await interaction.guild.members.kick(userId, 'Admin Dashboard Action').catch(e =>
            interaction.reply({ content: `Missing Permissions: ${e.message}`, ephemeral: true }));
        await interaction.reply({ content: `✅ <@${userId}> has been Kicked!`, ephemeral: true });
        return showModPanel(interaction);
    }

    if (customId.startsWith('mod_ban_')) {
        const userId = customId.split('_')[2];
        await interaction.guild.members.ban(userId, { reason: 'Admin Dashboard Action' }).catch(e =>
            interaction.reply({ content: `Missing Permissions: ${e.message}`, ephemeral: true }));
        await interaction.reply({ content: `✅ <@${userId}> has been Banned!`, ephemeral: true });
        return showModPanel(interaction);
    }

    if (customId.startsWith('mod_to_')) {
        const userId = customId.split('_')[2];
        const member = await interaction.guild.members.fetch(userId);
        if (member) member.timeout(60 * 60 * 1000, 'Admin Dashboard Timeout').catch(e =>
            interaction.reply({ content: `Missing Permissions: ${e.message}`, ephemeral: true }));
        else return interaction.reply({ content: 'Member not found', ephemeral: true });

        await interaction.reply({ content: `✅ <@${userId}> has been Timeout for 1 hour!`, ephemeral: true });
        return showModPanel(interaction);
    }

    if (customId === 'admin_edit_chk_welcome') {
        const modal = new ModalBuilder()
            .setCustomId('modal_edit_welcome_msg')
            .setTitle('Edit Welcome Message');

        const input = new TextInputBuilder()
            .setCustomId('welcome_text')
            .setLabel('Message ({user} for mention)')
            .setStyle(TextInputStyle.Paragraph)
            .setPlaceholder('Welcome {user} to {server}!')
            .setRequired(true);

        modal.addComponents(new ActionRowBuilder().addComponents(input));
        await interaction.showModal(modal);
        return;
    }
}
