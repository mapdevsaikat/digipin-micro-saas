import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

class DatabaseConnection {
  private db: Database.Database;
  private static instance: DatabaseConnection;

  private constructor() {
    const dbPath = process.env.DATABASE_PATH || path.join(process.cwd(), 'data', 'digipin.db');
    
    // Ensure data directory exists
    const dataDir = path.dirname(dbPath);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    this.db = new Database(dbPath);
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('foreign_keys = ON');
    
    // Enable verbose logging in development
    if (process.env.NODE_ENV === 'development') {
      this.db.pragma('trace = 1');
    }
  }

  public static getInstance(): DatabaseConnection {
    if (!DatabaseConnection.instance) {
      DatabaseConnection.instance = new DatabaseConnection();
    }
    return DatabaseConnection.instance;
  }

  public getDatabase(): Database.Database {
    return this.db;
  }

  public async runMigrations(): Promise<void> {
    const migrationFiles = [
      '001_create_api_keys_table.sql',
      '002_create_request_logs_table.sql',
      '003_create_digipin_cache_table.sql',
      '004_insert_default_api_keys.sql'
    ];

    for (const migrationFile of migrationFiles) {
      const migrationPath = path.join(__dirname, '..', 'migrations', migrationFile);
      if (fs.existsSync(migrationPath)) {
        const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
        this.db.exec(migrationSQL);
        console.log(`✅ Applied migration: ${migrationFile}`);
      }
    }
  }

  public close(): void {
    this.db.close();
  }
}

export default DatabaseConnection;
