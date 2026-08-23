import { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } from 'discord.js';
import gameService from '../services/game.service.js';
import guildService from '../services/guild.service.js';

export const data = new SlashCommandBuilder()
    .setName('game')
    .setDescription('🎮 Cari dan dapatkan link game premium!')
    .addStringOption(opt =>
        opt.setName('nama')
            .setDescription('Ketik nama game yang dicari')
            .setRequired(true)
            .setAutocomplete(true)
    );

export async function autocomplete(interaction) {
    try {
        if (!interaction.guild) {
            return interaction.respond([]);
        }

        const query = interaction.options.getFocused();
        const guildId = interaction.guild.id;

        const games = await gameService.searchGames(guildId, query, 25);

        const choices = games.map(game => ({
            name: game.title.substring(0, 100),
            value: game.message_id
        }));

        await interaction.respond(choices);
    } catch (error) {
        console.error('Autocomplete error:', error);
        await interaction.respond([]);
    }
}

export async function execute(interaction) {
    if (!interaction.guild) {
        return interaction.reply({
            content: '❌ Command ini hanya bisa digunakan di server!',
            ephemeral: true
        });
    }

    const messageId = interaction.options.getString('nama');
    const guildId = interaction.guild.id;

    const settings = await guildService.getSettings(guildId);
    if (!settings || !settings.game_source_channel_id) {
        return interaction.reply({
            content: '❌ **Admin belum setup sumber game!**\nMinta admin buka dashboard `/admin` -> `Settings (Features)` -> Set `Game Premium Source`.',
            ephemeral: true
        });
    }

    const game = await gameService.getGameByMessageId(messageId);

    if (!game) {
        const searchResults = await gameService.searchGames(guildId, messageId, 1);
        if (searchResults.length === 0) {
            return interaction.reply({
                content: '❌ **Game tidak ditemukan!**\nCoba ketik nama game dan pilih dari daftar yang muncul.',
                ephemeral: true
            });
        }
        return showGamePreview(interaction, searchResults[0]);
    }

    await showGamePreview(interaction, game);
}

async function showGamePreview(interaction, game) {
    let description = game.content || 'Tidak ada deskripsi';
    if (description.length > 500) {
        description = description.substring(0, 500) + '...';
    }

    const embed = {
        title: `🎮 ${game.title}`,
        description: description,
        color: 0x5865F2,
        fields: [
            {
                name: '📦 Status',
                value: 'Klik tombol dibawah untuk mengirim link ke DM kamu!',
                inline: false
            }
        ],
        footer: {
            text: '⚠️ Link akan dikirim secara private ke DM'
        }
    };

    if (game.image_url) {
        embed.thumbnail = { url: game.image_url };
    }

    const confirmButton = new ButtonBuilder()
        .setCustomId(`game_confirm_${game.message_id}`)
        .setLabel('📬 Kirim ke DM')
        .setStyle(ButtonStyle.Success);

    const cancelButton = new ButtonBuilder()
        .setCustomId('game_cancel')
        .setLabel('❌ Batal')
        .setStyle(ButtonStyle.Secondary);

    const row = new ActionRowBuilder().addComponents(confirmButton, cancelButton);

    const response = await interaction.reply({
        embeds: [embed],
        components: [row],
        ephemeral: true
    });

    const collector = response.createMessageComponentCollector({
        componentType: ComponentType.Button,
        time: 60000
    });

    collector.on('collect', async i => {
        if (i.customId === 'game_cancel') {
            await i.update({
                content: '❌ **Dibatalkan.**',
                embeds: [],
                components: []
            });
            collector.stop();
        } else if (i.customId.startsWith('game_confirm_')) {
            await sendGameToDM(i, game);
            collector.stop();
        }
    });

    collector.on('end', async (collected, reason) => {
        if (reason === 'time') {
            try {
                await interaction.editReply({
                    content: '⏰ **Waktu habis!** Silakan coba lagi.',
                    embeds: [],
                    components: []
                });
            } catch (e) {
            }
        }
    });
}

async function sendGameToDM(interaction, game) {
    const dmEmbed = {
        title: `🎮 ${game.title}`,
        description: game.content || 'Tidak ada deskripsi',
        color: 0x00FF00,
        fields: [],
        footer: {
            text: `From: ${interaction.guild.name} | Simpan pesan ini!`
        },
        timestamp: new Date()
    };

    if (game.link) {
        dmEmbed.fields.push({
            name: '📥 Download Link',
            value: game.link,
            inline: false
        });
    }

    if (game.image_url) {
        dmEmbed.image = { url: game.image_url };
    }

    let dmStatus = '✅ **Link game berhasil dikirim ke DM kamu!**\nCek DM untuk mengambil hadiahnya.';

    try {
        await interaction.user.send({ embeds: [dmEmbed] });
    } catch (error) {
        console.error('Failed to send game DM:', error.message);
        dmStatus = '❌ **Gagal mengirim DM!**\nPastikan DM kamu tidak tertutup (Settings > Privacy & Safety > Allow direct messages from server members).';
    }

    await interaction.update({
        content: dmStatus,
        embeds: [],
        components: []
    });
}
