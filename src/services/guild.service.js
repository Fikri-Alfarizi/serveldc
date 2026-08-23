import db from '../db/index.js';

class GuildService {
    async getSettings(guildId) {
        let settings = await db.get('SELECT * FROM guild_settings WHERE guild_id = ?', guildId);
        if (!settings) {
            await db.run('INSERT INTO guild_settings (guild_id) VALUES (?)', guildId);
            settings = {
                guild_id: guildId,
                welcome_channel_id: null,
                leave_channel_id: null,
                log_channel_id: null,
                welcome_message: 'Selamat datang {user} di {server}!',
                auto_role_id: null,
                admin_allowed_roles: null
            };
        }
        return settings;
    }

    async updateSetting(guildId, key, value) {
        await this.getSettings(guildId); // Ensure exists
        const sql = `UPDATE guild_settings SET ${key} = ? WHERE guild_id = ?`;
        return await db.run(sql, value, guildId);
    }

    // --- ACCESS CONTROL ---

    async getAdminRoles(guildId) {
        const settings = await this.getSettings(guildId);
        if (!settings.admin_allowed_roles) return [];
        try {
            return JSON.parse(settings.admin_allowed_roles);
        } catch (e) {
            return [];
        }
    }

    async addAdminRole(guildId, roleId) {
        const roles = await this.getAdminRoles(guildId);
        if (!roles.includes(roleId)) {
            roles.push(roleId);
            await this.updateSetting(guildId, 'admin_allowed_roles', JSON.stringify(roles));
        }
        return roles;
    }

    async removeAdminRole(guildId, roleId) {
        let roles = await this.getAdminRoles(guildId);
        roles = roles.filter(id => id !== roleId);
        await this.updateSetting(guildId, 'admin_allowed_roles', JSON.stringify(roles));
        return roles;
    }

    async isAdmin(interaction) {
        // 1. Check Owner
        if (interaction.user.id === interaction.guild.ownerId) return true;

        // 2. Check Allowed Roles
        const allowedRoles = await this.getAdminRoles(interaction.guild.id);
        if (allowedRoles.length > 0) {
            if (interaction.member.roles.cache.some(r => allowedRoles.includes(r.id))) {
                return true;
            }
        }

        return false;
    }
}

export default new GuildService();
