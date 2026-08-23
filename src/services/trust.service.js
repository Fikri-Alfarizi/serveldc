import db from '../db/index.js';

class TrustService {
    async getTrustScore(userId) {
        const data = await db.get('SELECT score, reason FROM trust_score WHERE user_id = ?', userId);
        return data ? data.score : 100;
    }

    async deductTrust(userId, amount, reason) {
        const currentScore = await this.getTrustScore(userId);
        const newScore = Math.max(0, currentScore - amount);

        const existing = await db.get('SELECT user_id FROM trust_score WHERE user_id = ?', userId);
        if (existing) {
            await db.run('UPDATE trust_score SET score = ?, reason = ? WHERE user_id = ?', newScore, reason, userId);
        } else {
            await db.run('INSERT INTO trust_score (user_id, score, reason) VALUES (?, ?, ?)', userId, newScore, reason);
        }

        return newScore;
    }

    async observeUserBehavior(userId, activityType) {
        let penalty = 0;
        let reason = '';

        if (activityType === 'spam') {
            penalty = 5;
            reason = 'Detected Spamming';
        } else if (activityType === 'exploit_attempt') {
            penalty = 20;
            reason = 'Attempted System Exploit';
        }

        if (penalty > 0) {
            await this.deductTrust(userId, penalty, reason);
        }
    }
}

export default new TrustService();
