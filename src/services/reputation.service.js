import db from '../db/index.js';

class ReputationService {
    async getReputation(userId) {
        const data = await db.get('SELECT rep_points, last_given FROM reputation WHERE user_id = ?', userId);
        return data || { rep_points: 0, last_given: 0 };
    }

    async giveReputation(giverId, receiverId) {
        const giverData = await this.getReputation(giverId);
        const now = Date.now();
        const COOLDOWN = 24 * 60 * 60 * 1000;

        if (now - giverData.last_given < COOLDOWN) {
            const timeLeft = COOLDOWN - (now - giverData.last_given);
            const hours = Math.ceil(timeLeft / (1000 * 60 * 60));
            return { success: false, message: `Sabar bro! Lo baru bisa kasih Rep lagi dalam ${hours} jam.` };
        }

        if (giverId === receiverId) {
            return { success: false, message: "Gak bisa kasih Rep ke diri sendiri lah, kocak!" };
        }

        const existingGiver = await db.get('SELECT user_id FROM reputation WHERE user_id = ?', giverId);
        if (existingGiver) {
            await db.run('UPDATE reputation SET last_given = ? WHERE user_id = ?', now, giverId);
        } else {
            await db.run('INSERT INTO reputation (user_id, rep_points, last_given) VALUES (?, 0, ?)', giverId, now);
        }

        const existingReceiver = await db.get('SELECT user_id FROM reputation WHERE user_id = ?', receiverId);
        if (existingReceiver) {
            await db.run('UPDATE reputation SET rep_points = rep_points + 1 WHERE user_id = ?', receiverId);
        } else {
            await db.run('INSERT INTO reputation (user_id, rep_points, last_given) VALUES (?, 1, 0)', receiverId);
        }

        return { success: true, message: "Respect +1! Reputasi berhasil dikirim." };
    }
}

export default new ReputationService();
