-- Create digipin_cache table for caching geocoding results
CREATE TABLE IF NOT EXISTS digipin_cache (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cache_key TEXT NOT NULL UNIQUE,
    cache_type TEXT NOT NULL CHECK (cache_type IN ('geocode', 'reverse', 'validate')),
    input_data TEXT NOT NULL,
    output_data TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    hit_count INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Create indexes for cache operations
CREATE INDEX IF NOT EXISTS idx_digipin_cache_key ON digipin_cache(cache_key);
CREATE INDEX IF NOT EXISTS idx_digipin_cache_type ON digipin_cache(cache_type);
CREATE INDEX IF NOT EXISTS idx_digipin_cache_expires ON digipin_cache(expires_at);
