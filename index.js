import 'dotenv/config';
import express from 'express';
import { Client, GatewayIntentBits } from 'discord.js';
import mysql from 'mysql2/promise';

const app = express();
const PORT = process.env.PORT || process.env.SERVER_PORT || 5000;

app.get('/', (req, res) => {
    res.json({ status: 'online', bot: 'SantuyTL Simple Bot', port: PORT });
});

app.listen(PORT, () => {
    console.log(`🌐 Web API active on port ${PORT}`);
});

// MySQL Connection Test
async function testDatabase() {
    if (process.env.DB_USER && process.env.DB_NAME) {
        try {
            const pool = mysql.createPool({
                host: process.env.DB_HOST || '127.0.0.1',
                port: parseInt(process.env.DB_PORT || '3306', 10),
                user: process.env.DB_USER,
                password: process.env.DB_PASSWORD,
                database: process.env.DB_NAME,
            });

            const [rows] = await pool.query('SELECT 1 + 1 AS solution');
            console.log(`🗄️ MySQL Connected! Test Query result: ${rows[0].solution}`);
        } catch (err) {
            console.error('❌ MySQL Connection Error:', err.message);
        }
    }
}

testDatabase();

// Discord Bot Client
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

client.once('ready', () => {
    console.log(`🔥 Simple Bot is Ready! Logged in as ${client.user.tag}`);
});

client.on('messageCreate', async (message) => {
    if (message.author.bot) return;
    if (message.content.toLowerCase() === '!ping') {
        await message.reply('🏓 Pong! Bot sederhana SantuyTL aktif di Pterodactyl VPS!');
    }
});

if (process.env.DISCORD_BOT_TOKEN) {
    client.login(process.env.DISCORD_BOT_TOKEN).catch(err => {
        console.error('❌ Discord Login Error:', err.message);
    });
} else {
    console.warn('⚠️ DISCORD_BOT_TOKEN missing in .env');
}
