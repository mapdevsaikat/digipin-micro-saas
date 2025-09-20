"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const better_sqlite3_1 = __importDefault(require("better-sqlite3"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
class DatabaseConnection {
    constructor() {
        const dbPath = process.env.DATABASE_PATH || path_1.default.join(process.cwd(), 'data', 'digipin.db');
        const dataDir = path_1.default.dirname(dbPath);
        if (!fs_1.default.existsSync(dataDir)) {
            fs_1.default.mkdirSync(dataDir, { recursive: true });
        }
        this.db = new better_sqlite3_1.default(dbPath);
        this.db.pragma('journal_mode = WAL');
        this.db.pragma('foreign_keys = ON');
        if (process.env.NODE_ENV === 'development') {
            this.db.pragma('trace = 1');
        }
    }
    static getInstance() {
        if (!DatabaseConnection.instance) {
            DatabaseConnection.instance = new DatabaseConnection();
        }
        return DatabaseConnection.instance;
    }
    getDatabase() {
        return this.db;
    }
    async runMigrations() {
        const migrationFiles = [
            '001_create_api_keys_table.sql',
            '002_create_request_logs_table.sql',
            '003_create_digipin_cache_table.sql',
            '004_insert_default_api_keys.sql'
        ];
        for (const migrationFile of migrationFiles) {
            const migrationPath = path_1.default.join(__dirname, '..', 'migrations', migrationFile);
            if (fs_1.default.existsSync(migrationPath)) {
                const migrationSQL = fs_1.default.readFileSync(migrationPath, 'utf8');
                this.db.exec(migrationSQL);
                console.log(`✅ Applied migration: ${migrationFile}`);
            }
        }
    }
    close() {
        this.db.close();
    }
}
exports.default = DatabaseConnection;
//# sourceMappingURL=connection.js.map