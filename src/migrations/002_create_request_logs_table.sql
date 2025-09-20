-- Create request_logs table
CREATE TABLE IF NOT EXISTS request_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    api_key_id INTEGER NOT NULL,
    endpoint TEXT NOT NULL,
    method TEXT NOT NULL,
    request_ip TEXT,
    user_agent TEXT,
    request_body TEXT,
    response_status INTEGER,
    response_time_ms INTEGER,
    error_message TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (api_key_id) REFERENCES api_keys(id) ON DELETE CASCADE
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_request_logs_api_key_id ON request_logs(api_key_id);
CREATE INDEX IF NOT EXISTS idx_request_logs_endpoint ON request_logs(endpoint);
CREATE INDEX IF NOT EXISTS idx_request_logs_created_at ON request_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_request_logs_status ON request_logs(response_status);
