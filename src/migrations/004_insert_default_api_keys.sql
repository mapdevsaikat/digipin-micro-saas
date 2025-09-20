-- Insert default API keys for testing
-- Note: In production, these should be generated securely and stored hashed
-- The key_hash values below are SHA256 hashes of the actual test API keys

-- Free tier API key (1000 requests/month)
-- Actual key: free_test_key_hash_12345
-- Hash: a661b9babfd30e8a1952bc7d56f065fe3a06a6ff0ad0d92bc5c3c8482d68500c
INSERT OR IGNORE INTO api_keys (
    key_hash, 
    key_prefix, 
    tier, 
    monthly_limit, 
    current_usage,
    usage_reset_date,
    is_active,
    created_at,
    updated_at
) VALUES (
    'a661b9babfd30e8a1952bc7d56f065fe3a06a6ff0ad0d92bc5c3c8482d68500c',
    'free_test',
    'free',
    1000,
    0,
    datetime('now', '+1 month'),
    1,
    datetime('now'),
    datetime('now')
);

-- Paid tier API key (10000 requests/month)
-- Actual key: paid_test_key_hash_67890
-- Hash: 927a81626cab3310498d26cd90f34391ab3c706d9b8edc7f6646186700a34407
INSERT OR IGNORE INTO api_keys (
    key_hash, 
    key_prefix, 
    tier, 
    monthly_limit, 
    current_usage,
    usage_reset_date,
    is_active,
    created_at,
    updated_at
) VALUES (
    '927a81626cab3310498d26cd90f34391ab3c706d9b8edc7f6646186700a34407',
    'paid_test',
    'paid',
    10000,
    0,
    datetime('now', '+1 month'),
    1,
    datetime('now'),
    datetime('now')
);

-- Enterprise tier API key (unlimited requests)
-- Actual key: enterprise_test_key_hash_11111
-- Hash: 64cffdeafad5a6d1a1ca235efd3066ab271512f40d7e640f40500ff559a4e3e8
INSERT OR IGNORE INTO api_keys (
    key_hash, 
    key_prefix, 
    tier, 
    monthly_limit, 
    current_usage,
    usage_reset_date,
    is_active,
    created_at,
    updated_at
) VALUES (
    '64cffdeafad5a6d1a1ca235efd3066ab271512f40d7e640f40500ff559a4e3e8',
    'enterprise_test',
    'enterprise',
    999999,
    0,
    datetime('now', '+1 month'),
    1,
    datetime('now'),
    datetime('now')
);
