-- Create api_keys table
CREATE TABLE IF NOT EXISTS api_keys (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    key_hash TEXT NOT NULL UNIQUE,
    key_prefix TEXT NOT NULL,
    tier TEXT NOT NULL DEFAULT 'free' CHECK (tier IN ('free', 'paid', 'enterprise')),
    monthly_limit INTEGER NOT NULL DEFAULT 1000,
    current_usage INTEGER NOT NULL DEFAULT 0,
    usage_reset_date TEXT NOT NULL DEFAULT (datetime('now', '+1 month')),
    is_active BOOLEAN NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_api_keys_hash ON api_keys(key_hash);
CREATE INDEX IF NOT EXISTS idx_api_keys_prefix ON api_keys(key_prefix);
CREATE INDEX IF NOT EXISTS idx_api_keys_tier ON api_keys(tier);
