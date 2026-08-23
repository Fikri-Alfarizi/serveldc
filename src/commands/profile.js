import { SlashCommandBuilder } from 'discord.js';
import userService from '../services/user.service.js';

export const data = new SlashCommandBuilder()
    .setName('profile')
    .setDescription('Cek statistik dan level kepangkatan kamu')
    .addUserOption(option =>
        option.setName('user')
            .setDescription('Mau kepoin siapa? (Kosongin buat cek diri sendiri)'));

export async function execute(interaction) {
    await interaction.deferReply();

    const targetUser = interaction.options.getUser('user') || interaction.user;

    const userData = await userService.getUser(targetUser.id, targetUser.username);
    const member = await interaction.guild.members.fetch(targetUser.id);

    const xpNeeded = userData.level * 100;
    const progress = Math.min(Math.floor((userData.xp / xpNeeded) * 100), 100);

    const barSize = 15;
    const filled = Math.round((progress / 100) * barSize);
    const empty = barSize - filled;
    const filledChar = '█';
    const emptyChar = '░';
    const progressBar = filledChar.repeat(filled) + emptyChar.repeat(empty);

    let titleBadge = 'Anggota Teladan';
    if (userData.level >= 50) titleBadge = '👑 LEGEND';
    else if (userData.level >= 20) titleBadge = '🔥 ELITE';
    else if (userData.level >= 10) titleBadge = '⭐ RISING STAR';

    const embed = {
        title: `👤 **IDENTITY CARD**`,
        description: `**${targetUser.username.toUpperCase()}**\n*${titleBadge} of ${interaction.guild.name}*`,
        thumbnail: { url: targetUser.displayAvatarURL({ dynamic: true, size: 512 }) },
        color: member.displayColor !== 0 ? member.displayColor : 0x00A8FF,
        fields: [
            {
                name: '💵 **ECONOMY**',
                value: `>>> 💰 **Cash:** \`RP ${userData.coins.toLocaleString()}\`\n💎 **Asset:** \`Top Secret\``,
                inline: true
            },
            {
                name: '⚔️ **RANKING**',
                value: `>>> 🔰 **Level:** \`${userData.level}\`\n✨ **Total XP:** \`${userData.total_xp || userData.xp}\``,
                inline: true
            },
            {
                name: '📈 **LEVEL PROGRESS**',
                value: `\`${progressBar}\` **${progress}%**\n*Need ${xpNeeded - userData.xp} XP to Level up!*`,
                inline: false
            },
            {
                name: '📅 **MEMBERSHIP**',
                value: `Joined: <t:${Math.floor(member.joinedTimestamp / 1000)}:D> (<t:${Math.floor(member.joinedTimestamp / 1000)}:R>)`,
                inline: false
            }
        ],
        footer: { text: `💳 ID: ${targetUser.id} • SantuyTL System`, icon_url: interaction.guild.iconURL() },
        timestamp: new Date()
    };

    await interaction.editReply({ embeds: [embed] });
}
