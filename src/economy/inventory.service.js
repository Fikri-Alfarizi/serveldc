import db from '../db/index.js';

class InventoryService {
    /**
     * Add item to user inventory
     */
    async addItem(userId, itemId, expiresAt = null, metadata = null) {
        return await db.run(
            `INSERT INTO inventory (user_id, item_id, expires_at, metadata) VALUES (?, ?, ?, ?)`,
            userId, itemId, expiresAt, metadata ? JSON.stringify(metadata) : null
        );
    }

    /**
     * Get user inventory
     */
    async getUserInventory(userId) {
        const now = Math.floor(Date.now() / 1000);
        const items = await db.all(
            `SELECT * FROM inventory WHERE user_id = ? AND (expires_at IS NULL OR expires_at > ?) ORDER BY id DESC`,
            userId, now
        );

        return items.map(item => {
            let meta = null;
            try {
                if (item.metadata) meta = JSON.parse(item.metadata);
            } catch (e) {
                console.error(`Failed to parse metadata for item ${item.id}:`, e);
            }
            return { ...item, metadata: meta };
        });
    }

    /**
     * Check if user has item
     */
    async hasItem(userId, itemId) {
        const now = Math.floor(Date.now() / 1000);
        const result = await db.get(
            `SELECT COUNT(*) as count FROM inventory WHERE user_id = ? AND item_id = ? AND (expires_at IS NULL OR expires_at > ?)`,
            userId, itemId, now
        );
        return result && (result.count > 0 || result['COUNT(*)'] > 0);
    }

    /**
     * Use/consume item
     */
    async useItem(userId, itemId) {
        const item = await db.get(
            `SELECT id FROM inventory WHERE user_id = ? AND item_id = ? LIMIT 1`,
            userId, itemId
        );
        if (!item) return { changes: 0 };

        return await db.run(`DELETE FROM inventory WHERE id = ?`, item.id);
    }

    /**
     * Remove expired items
     */
    async cleanExpiredItems() {
        const now = Math.floor(Date.now() / 1000);
        return await db.run(`DELETE FROM inventory WHERE expires_at IS NOT NULL AND expires_at <= ?`, now);
    }
}

export default new InventoryService();
