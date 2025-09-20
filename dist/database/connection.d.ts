import Database from 'better-sqlite3';
declare class DatabaseConnection {
    private db;
    private static instance;
    private constructor();
    static getInstance(): DatabaseConnection;
    getDatabase(): Database.Database;
    runMigrations(): Promise<void>;
    close(): void;
}
export default DatabaseConnection;
//# sourceMappingURL=connection.d.ts.map