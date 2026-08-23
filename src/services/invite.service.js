import db from '../db/index.js';

class InviteService {
    async trackInvite(inviterId, invitedId) {
        try {
            const now = Date.now();
            await db.run(
                'INSERT INTO invites (inviter_id, invited_id, timestamp, is_valid) VALUES (?, ?, ?, 1)',
                inviterId, invitedId, now
            );
            return true;
        } catch (e) {
            return false;
        }
    }

    async getInviteCount(userId) {
        const result = await db.get('SELECT COUNT(*) as count FROM invites WHERE inviter_id = ? AND is_valid = 1', userId);
        return result ? (result.count || result['COUNT(*)'] || 0) : 0;
    }
}

export default new InviteService();
