import db from '../db/index.js';

class SeasonService {
    async getCurrentSeason() {
        return await db.get('SELECT * FROM seasons WHERE is_active = 1 ORDER BY id DESC LIMIT 1');
    }

    async startNewSeason(name, daysDuration) {
        const current = await this.getCurrentSeason();
        if (current) {
            await this.endSeason(current.id);
        }

        const nextNumber = current ? current.season_number + 1 : 1;
        const startDate = Date.now();
        const endDate = startDate + (daysDuration * 24 * 60 * 60 * 1000);

        await db.run(
            'INSERT INTO seasons (season_number, name, start_date, end_date, is_active) VALUES (?, ?, ?, ?, 1)',
            nextNumber, name, startDate, endDate
        );

        return await this.getCurrentSeason();
    }

    async endSeason(seasonId) {
        await db.run('UPDATE seasons SET is_active = 0 WHERE id = ?', seasonId);
    }

    async getSeasonTimeLeft() {
        const season = await this.getCurrentSeason();
        if (!season) return null;

        const now = Date.now();
        if (now >= season.end_date) return 0;

        return season.end_date - now;
    }
}

export default new SeasonService();
