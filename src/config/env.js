import 'dotenv/config';

// Optional: Add validation logic here if needed
if (!process.env.DISCORD_BOT_TOKEN) {
  console.warn('⚠️  Warning: DISCORD_BOT_TOKEN is missing in .env');
}

export default {
    token: process.env.DISCORD_BOT_TOKEN,
    clientId: process.env.DISCORD_CLIENT_ID,
    guildId: process.env.DISCORD_GUILD_ID,
    webhookUrl: process.env.WEBHOOK_URL,
    botSecret: process.env.DISCORD_BOT_SECRET,
    port: process.env.PORT || process.env.SERVER_PORT || 3001,
    dbType: process.env.DB_TYPE || 'sqlite',
    dbHost: process.env.DB_HOST || '127.0.0.1',
    dbPort: parseInt(process.env.DB_PORT || '3306', 10),
    dbUser: process.env.DB_USER || '',
    dbPassword: process.env.DB_PASSWORD || '',
    dbName: process.env.DB_NAME || ''
};
