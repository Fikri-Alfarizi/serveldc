import userService from '../services/user.service.js';

export async function distributePassiveIncome(client) {
    const REWARD_PER_MINUTE = 60; // 1 RP per second x 60

    try {
        const onlineUsers = new Map();

        client.guilds.cache.forEach(guild => {
            guild.members.cache.forEach(member => {
                if (!member.user.bot) {
                    const status = member.presence?.status;
                    if (status === 'online' || status === 'idle' || status === 'dnd') {
                        onlineUsers.set(member.user.id, member.user.username);
                    }
                }
            });
        });

        for (const [userId, username] of onlineUsers) {
            await userService.addCoins(userId, username, REWARD_PER_MINUTE);
        }
    } catch (error) {
        console.error('[PASSIVE ERROR]', error);
    }
}
