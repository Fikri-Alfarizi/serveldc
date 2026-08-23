import env from '../config/env.js';
import mysql from 'mysql2/promise';
import path from 'path';
import fs from 'fs';

let isMySQL = false;
let mysqlPool = null;
let sqliteDb = null;

// Determine DB mode based on env
if (env.dbType === 'mysql' && env.dbUser && env.dbName) {
    isMySQL = true;
    console.log(`🗄️ Database Mode: MySQL (${env.dbHost}:${env.dbPort}/${env.dbName})`);
    mysqlPool = mysql.createPool({
        host: env.dbHost,
        port: env.dbPort,
        user: env.dbUser,
        password: env.dbPassword,
        database: env.dbName,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0
    });
} else {
    console.log('🗄️ Database Mode: SQLite (Local)');
    try {
        const dataDir = path.resolve('data');
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir);
        }
        const dbPath = path.join(dataDir, 'santuy.db');
        const { default: Database } = await import('better-sqlite3');
        sqliteDb = new Database(dbPath);
        sqliteDb.pragma('journal_mode = WAL');
    } catch (err) {
        console.error('⚠️ SQLite loading fallback failed:', err.message);
    }
}

// Unified Async Database Interface
class DatabaseAdapter {
    async query(sql, params = []) {
        if (isMySQL) {
            const [rows] = await mysqlPool.execute(sql, params);
            return rows;
        } else if (sqliteDb) {
            const stmt = sqliteDb.prepare(sql);
            if (sql.trim().toUpperCase().startsWith('SELECT')) {
                return stmt.all(...params);
            } else {
                return stmt.run(...params);
            }
        }
        return [];
    }

    async get(sql, ...params) {
        const flatParams = params.flat();
        if (isMySQL) {
            const [rows] = await mysqlPool.execute(sql, flatParams);
            return rows[0] || undefined;
        } else if (sqliteDb) {
            return sqliteDb.prepare(sql).get(...flatParams);
        }
        return undefined;
    }

    async all(sql, ...params) {
        const flatParams = params.flat();
        if (isMySQL) {
            const [rows] = await mysqlPool.execute(sql, flatParams);
            return rows;
        } else if (sqliteDb) {
            return sqliteDb.prepare(sql).all(...flatParams);
        }
        return [];
    }

    async run(sql, ...params) {
        const flatParams = params.flat();
        if (isMySQL) {
            const [result] = await mysqlPool.execute(sql, flatParams);
            return {
                changes: result.affectedRows,
                lastInsertRowid: result.insertId
            };
        } else if (sqliteDb) {
            return sqliteDb.prepare(sql).run(...flatParams);
        }
        return { changes: 0, lastInsertRowid: 0 };
    }

    async exec(sql) {
        if (isMySQL) {
            const statements = sql.split(';').map(s => s.trim()).filter(s => s.length > 0);
            for (const stmt of statements) {
                await mysqlPool.query(stmt);
            }
        } else if (sqliteDb) {
            sqliteDb.exec(sql);
        }
    }

    prepare(sql) {
        const self = this;
        return {
            async get(...params) {
                return self.get(sql, ...params);
            },
            async all(...params) {
                return self.all(sql, ...params);
            },
            async run(...params) {
                return self.run(sql, ...params);
            }
        };
    }
}

const db = new DatabaseAdapter();

// Initialize Tables
async function initTables() {
    try {
        if (isMySQL) {
            await db.exec(`
                CREATE TABLE IF NOT EXISTS users (
                    id VARCHAR(64) PRIMARY KEY,
                    username VARCHAR(255),
                    xp BIGINT DEFAULT 0,
                    level INT DEFAULT 1,
                    coins BIGINT DEFAULT 0,
                    last_daily BIGINT DEFAULT 0,
                    last_weekly BIGINT DEFAULT 0,
                    is_afk TINYINT DEFAULT 0,
                    afk_reason TEXT DEFAULT NULL,
                    afk_timestamp BIGINT DEFAULT 0,
                    job VARCHAR(64) DEFAULT 'Pengangguran',
                    daily_spins INT DEFAULT 0,
                    last_spin_time BIGINT DEFAULT 0,
                    seasonal_xp BIGINT DEFAULT 0
                );

                CREATE TABLE IF NOT EXISTS guild_settings (
                    guild_id VARCHAR(64) PRIMARY KEY,
                    welcome_channel_id VARCHAR(64),
                    leave_channel_id VARCHAR(64),
                    log_channel_id VARCHAR(64),
                    game_source_channel_id VARCHAR(64),
                    request_channel_id VARCHAR(64),
                    news_channel_id VARCHAR(64),
                    general_chat_channel_id VARCHAR(64),
                    welcome_message TEXT,
                    auto_role_id VARCHAR(64),
                    alarm_channel_id VARCHAR(64),
                    alarm_schedule VARCHAR(32) DEFAULT '07:00',
                    levelup_channel_id VARCHAR(64),
                    admin_allowed_roles TEXT
                );

                CREATE TABLE IF NOT EXISTS games_cache (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    guild_id VARCHAR(64) NOT NULL,
                    message_id VARCHAR(64) UNIQUE,
                    title VARCHAR(255) NOT NULL,
                    content TEXT,
                    link TEXT,
                    image_url TEXT,
                    created_at BIGINT
                );

                CREATE TABLE IF NOT EXISTS news_history (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    news_guid VARCHAR(255) UNIQUE,
                    created_at BIGINT
                );

                CREATE TABLE IF NOT EXISTS seasons (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    season_number INT,
                    name VARCHAR(255),
                    start_date BIGINT,
                    end_date BIGINT,
                    is_active TINYINT DEFAULT 1
                );

                CREATE TABLE IF NOT EXISTS reputation (
                    user_id VARCHAR(64) PRIMARY KEY,
                    rep_points INT DEFAULT 0,
                    last_given BIGINT DEFAULT 0
                );

                CREATE TABLE IF NOT EXISTS trust_score (
                    user_id VARCHAR(64) PRIMARY KEY,
                    score INT DEFAULT 100,
                    reason TEXT
                );

                CREATE TABLE IF NOT EXISTS invites (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    inviter_id VARCHAR(64),
                    invited_id VARCHAR(64),
                    timestamp BIGINT,
                    is_valid TINYINT DEFAULT 1,
                    UNIQUE KEY unique_invite (inviter_id, invited_id)
                );

                CREATE TABLE IF NOT EXISTS inventory (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    user_id VARCHAR(64) NOT NULL,
                    item_id VARCHAR(64) NOT NULL,
                    quantity INT DEFAULT 1,
                    expires_at BIGINT,
                    metadata TEXT,
                    created_at BIGINT
                );
            `);
            console.log('✅ MySQL tables initialized successfully.');
        } else if (sqliteDb) {
            // SQLite Table Setup
            sqliteDb.exec(`
                CREATE TABLE IF NOT EXISTS users (
                    id TEXT PRIMARY KEY,
                    username TEXT,
                    xp INTEGER DEFAULT 0,
                    level INTEGER DEFAULT 1,
                    coins INTEGER DEFAULT 0,
                    last_daily INTEGER DEFAULT 0,
                    last_weekly INTEGER DEFAULT 0,
                    is_afk INTEGER DEFAULT 0,
                    afk_reason TEXT DEFAULT NULL,
                    afk_timestamp INTEGER DEFAULT 0,
                    job TEXT DEFAULT 'Pengangguran',
                    daily_spins INTEGER DEFAULT 0,
                    last_spin_time INTEGER DEFAULT 0,
                    seasonal_xp INTEGER DEFAULT 0
                );
                CREATE TABLE IF NOT EXISTS guild_settings (
                    guild_id TEXT PRIMARY KEY,
                    welcome_channel_id TEXT,
                    leave_channel_id TEXT,
                    log_channel_id TEXT,
                    game_source_channel_id TEXT,
                    request_channel_id TEXT,
                    news_channel_id TEXT,
                    general_chat_channel_id TEXT,
                    welcome_message TEXT DEFAULT 'Selamat datang {user} di {server}!',
                    auto_role_id TEXT
                );
                CREATE TABLE IF NOT EXISTS games_cache (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    guild_id TEXT NOT NULL,
                    message_id TEXT UNIQUE,
                    title TEXT NOT NULL,
                    content TEXT,
                    link TEXT,
                    image_url TEXT,
                    created_at INTEGER DEFAULT (strftime('%s', 'now'))
                );
                CREATE TABLE IF NOT EXISTS news_history (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    news_guid TEXT UNIQUE,
                    created_at INTEGER DEFAULT (strftime('%s', 'now'))
                );
                CREATE TABLE IF NOT EXISTS seasons (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    season_number INTEGER,
                    name TEXT,
                    start_date INTEGER,
                    end_date INTEGER,
                    is_active INTEGER DEFAULT 1
                );
                CREATE TABLE IF NOT EXISTS reputation (
                    user_id TEXT PRIMARY KEY,
                    rep_points INTEGER DEFAULT 0,
                    last_given INTEGER DEFAULT 0
                );
                CREATE TABLE IF NOT EXISTS trust_score (
                    user_id TEXT PRIMARY KEY,
                    score INTEGER DEFAULT 100,
                    reason TEXT
                );
                CREATE TABLE IF NOT EXISTS invites (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    inviter_id TEXT,
                    invited_id TEXT,
                    timestamp INTEGER,
                    is_valid INTEGER DEFAULT 1,
                    UNIQUE(inviter_id, invited_id)
                );
                CREATE TABLE IF NOT EXISTS inventory (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id TEXT NOT NULL,
                    item_id TEXT NOT NULL,
                    quantity INTEGER DEFAULT 1,
                    expires_at INTEGER,
                    metadata TEXT,
                    created_at INTEGER DEFAULT (strftime('%s', 'now'))
                );
            `);
            console.log('✅ SQLite tables initialized successfully.');
        }
    } catch (err) {
        console.error('❌ Table initialization error:', err.message);
    }
}

initTables();

export default db;
