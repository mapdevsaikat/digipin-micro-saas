#!/usr/bin/env node

/**
 * DigiPin API Key Management Script
 * Usage: node scripts/manage-keys.js [command] [options]
 */

const Database = require('better-sqlite3');
const crypto = require('crypto');
const path = require('path');

// Configuration
const DB_PATH = process.env.DATABASE_PATH || path.join(__dirname, '..', 'data', 'digipin.db');

// Initialize database
let db;
try {
    db = new Database(DB_PATH);
} catch (error) {
    console.error('❌ Failed to connect to database:', error.message);
    process.exit(1);
}

// Helper functions
function hashApiKey(apiKey) {
    return crypto.createHash('sha256').update(apiKey).digest('hex');
}

function generateApiKey(prefix = 'dp') {
    return `${prefix}_${crypto.randomBytes(32).toString('hex')}`;
}

function formatDate(dateString) {
    return new Date(dateString).toLocaleString();
}

// Commands
const commands = {
    // List all API keys
    list() {
        console.log('📋 API Keys List');
        console.log('================');
        
        const stmt = db.prepare(`
            SELECT id, key_prefix, tier, monthly_limit, current_usage, 
                   usage_reset_date, is_active, created_at
            FROM api_keys 
            ORDER BY created_at DESC
        `);
        
        const keys = stmt.all();
        
        if (keys.length === 0) {
            console.log('No API keys found.');
            return;
        }
        
        keys.forEach(key => {
            const status = key.is_active ? '✅ Active' : '❌ Inactive';
            const usage = `${key.current_usage}/${key.monthly_limit}`;
            const usagePercent = ((key.current_usage / key.monthly_limit) * 100).toFixed(1);
            
            console.log(`
ID: ${key.id}
Prefix: ${key.key_prefix}
Tier: ${key.tier.toUpperCase()}
Status: ${status}
Usage: ${usage} (${usagePercent}%)
Reset Date: ${formatDate(key.usage_reset_date)}
Created: ${formatDate(key.created_at)}
${'─'.repeat(50)}`);
        });
    },

    // Create new API key
    create(tier = 'free', monthlyLimit = null) {
        console.log(`🔑 Creating new ${tier} tier API key...`);
        
        // Validate tier
        const validTiers = ['free', 'paid', 'enterprise'];
        if (!validTiers.includes(tier)) {
            console.error('❌ Invalid tier. Valid tiers: free, paid, enterprise');
            return;
        }
        
        // Set default limits
        const defaultLimits = {
            free: 50000,
            paid: 500000,
            enterprise: 999999
        };
        
        const finalLimit = monthlyLimit || defaultLimits[tier];
        
        // Generate API key
        const apiKey = generateApiKey('dp');
        const keyHash = hashApiKey(apiKey);
        const keyPrefix = `dp_${apiKey.substring(3, 8)}`;
        
        // Calculate reset date (next month)
        const resetDate = new Date();
        resetDate.setMonth(resetDate.getMonth() + 1);
        
        try {
            const stmt = db.prepare(`
                INSERT INTO api_keys (
                    key_hash, key_prefix, tier, monthly_limit, 
                    current_usage, usage_reset_date, is_active
                ) VALUES (?, ?, ?, ?, 0, ?, 1)
            `);
            
            const result = stmt.run(keyHash, keyPrefix, tier, finalLimit, resetDate.toISOString());
            
            console.log('✅ API key created successfully!');
            console.log(`
API Key: ${apiKey}
ID: ${result.lastInsertRowid}
Prefix: ${keyPrefix}
Tier: ${tier.toUpperCase()}
Monthly Limit: ${finalLimit.toLocaleString()} requests
Reset Date: ${formatDate(resetDate.toISOString())}

⚠️  IMPORTANT: Save this API key securely. It cannot be retrieved again!
`);
            
        } catch (error) {
            console.error('❌ Failed to create API key:', error.message);
        }
    },

    // Deactivate API key
    deactivate(keyId) {
        if (!keyId) {
            console.error('❌ Please provide API key ID');
            return;
        }
        
        try {
            const stmt = db.prepare('UPDATE api_keys SET is_active = 0 WHERE id = ?');
            const result = stmt.run(keyId);
            
            if (result.changes > 0) {
                console.log(`✅ API key ${keyId} deactivated successfully`);
            } else {
                console.log(`❌ API key ${keyId} not found`);
            }
        } catch (error) {
            console.error('❌ Failed to deactivate API key:', error.message);
        }
    },

    // Activate API key
    activate(keyId) {
        if (!keyId) {
            console.error('❌ Please provide API key ID');
            return;
        }
        
        try {
            const stmt = db.prepare('UPDATE api_keys SET is_active = 1 WHERE id = ?');
            const result = stmt.run(keyId);
            
            if (result.changes > 0) {
                console.log(`✅ API key ${keyId} activated successfully`);
            } else {
                console.log(`❌ API key ${keyId} not found`);
            }
        } catch (error) {
            console.error('❌ Failed to activate API key:', error.message);
        }
    },

    // Reset usage for API key
    reset(keyId) {
        if (!keyId) {
            console.error('❌ Please provide API key ID');
            return;
        }
        
        try {
            const resetDate = new Date();
            resetDate.setMonth(resetDate.getMonth() + 1);
            
            const stmt = db.prepare(`
                UPDATE api_keys 
                SET current_usage = 0, usage_reset_date = ? 
                WHERE id = ?
            `);
            const result = stmt.run(resetDate.toISOString(), keyId);
            
            if (result.changes > 0) {
                console.log(`✅ Usage reset for API key ${keyId}`);
                console.log(`New reset date: ${formatDate(resetDate.toISOString())}`);
            } else {
                console.log(`❌ API key ${keyId} not found`);
            }
        } catch (error) {
            console.error('❌ Failed to reset usage:', error.message);
        }
    },

    // Show usage statistics
    stats() {
        console.log('📊 Usage Statistics');
        console.log('==================');
        
        try {
            // Total API keys by tier
            const tierStats = db.prepare(`
                SELECT tier, COUNT(*) as count, SUM(current_usage) as total_usage
                FROM api_keys 
                WHERE is_active = 1
                GROUP BY tier
            `).all();
            
            console.log('\n🏷️  Active API Keys by Tier:');
            tierStats.forEach(stat => {
                console.log(`${stat.tier.toUpperCase()}: ${stat.count} keys, ${stat.total_usage.toLocaleString()} total requests`);
            });
            
            // Recent request logs
            const recentRequests = db.prepare(`
                SELECT COUNT(*) as count, endpoint
                FROM request_logs 
                WHERE created_at > datetime('now', '-24 hours')
                GROUP BY endpoint
                ORDER BY count DESC
                LIMIT 5
            `).all();
            
            if (recentRequests.length > 0) {
                console.log('\n📈 Top Endpoints (Last 24h):');
                recentRequests.forEach(req => {
                    console.log(`${req.endpoint}: ${req.count} requests`);
                });
            }
            
            // Cache statistics
            const cacheStats = db.prepare(`
                SELECT 
                    COUNT(*) as total_entries,
                    COUNT(CASE WHEN expires_at > datetime('now') THEN 1 END) as active_entries,
                    cache_type
                FROM digipin_cache 
                GROUP BY cache_type
            `).all();
            
            if (cacheStats.length > 0) {
                console.log('\n💾 Cache Statistics:');
                cacheStats.forEach(stat => {
                    console.log(`${stat.cache_type}: ${stat.active_entries}/${stat.total_entries} active entries`);
                });
            }
            
        } catch (error) {
            console.error('❌ Failed to get statistics:', error.message);
        }
    },

    // Show help
    help() {
        console.log(`
🔧 DigiPin API Key Management

Usage: node scripts/manage-keys.js [command] [options]

Commands:
  list                     List all API keys
  create [tier] [limit]    Create new API key (tier: free|paid|enterprise)
  deactivate [id]          Deactivate API key
  activate [id]            Activate API key  
  reset [id]               Reset usage counter for API key
  stats                    Show usage statistics
  help                     Show this help message

Examples:
  node scripts/manage-keys.js list
  node scripts/manage-keys.js create paid 100000
  node scripts/manage-keys.js deactivate 5
  node scripts/manage-keys.js stats
`);
    }
};

// Main execution
function main() {
    const args = process.argv.slice(2);
    const command = args[0] || 'help';
    
    if (commands[command]) {
        commands[command](...args.slice(1));
    } else {
        console.error(`❌ Unknown command: ${command}`);
        commands.help();
    }
}

// Handle cleanup
process.on('exit', () => {
    if (db) {
        db.close();
    }
});

process.on('SIGINT', () => {
    console.log('\n👋 Goodbye!');
    process.exit(0);
});

// Run the script
main();
