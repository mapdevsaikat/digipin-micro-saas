#!/bin/bash

# DigiPin Monitoring and Maintenance Script

set -e

APP_NAME="digipin-micro-saas"
API_URL="http://localhost:3000"
DB_PATH="/var/www/$APP_NAME/data/digipin.db"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_header() {
    echo -e "${BLUE}[MONITOR]${NC} $1"
}

# Function to check API health
check_api_health() {
    log_header "Checking API Health..."
    
    response=$(curl -s -o /dev/null -w "%{http_code}" $API_URL/health 2>/dev/null || echo "000")
    
    if [ "$response" = "200" ]; then
        log_info "✅ API is healthy (HTTP 200)"
    else
        log_error "❌ API is unhealthy (HTTP $response)"
        return 1
    fi
}

# Function to check database
check_database() {
    log_header "Checking Database..."
    
    if [ -f "$DB_PATH" ]; then
        # Check database integrity
        result=$(sqlite3 $DB_PATH "PRAGMA integrity_check;" 2>/dev/null || echo "error")
        if [ "$result" = "ok" ]; then
            log_info "✅ Database integrity check passed"
        else
            log_error "❌ Database integrity check failed: $result"
            return 1
        fi
        
        # Check database size
        db_size=$(du -h $DB_PATH | cut -f1)
        log_info "📊 Database size: $db_size"
        
        # Check table counts
        api_keys_count=$(sqlite3 $DB_PATH "SELECT COUNT(*) FROM api_keys;" 2>/dev/null || echo "0")
        request_logs_count=$(sqlite3 $DB_PATH "SELECT COUNT(*) FROM request_logs;" 2>/dev/null || echo "0")
        cache_count=$(sqlite3 $DB_PATH "SELECT COUNT(*) FROM digipin_cache;" 2>/dev/null || echo "0")
        
        log_info "📈 API Keys: $api_keys_count"
        log_info "📈 Request Logs: $request_logs_count"
        log_info "📈 Cache Entries: $cache_count"
    else
        log_error "❌ Database file not found at $DB_PATH"
        return 1
    fi
}

# Function to check PM2 status
check_pm2_status() {
    log_header "Checking PM2 Status..."
    
    if command -v pm2 >/dev/null 2>&1; then
        pm2_status=$(pm2 jlist | jq -r ".[] | select(.name==\"$APP_NAME\") | .pm2_env.status" 2>/dev/null || echo "not_found")
        
        if [ "$pm2_status" = "online" ]; then
            log_info "✅ PM2 process is online"
            
            # Get additional PM2 info
            cpu_usage=$(pm2 jlist | jq -r ".[] | select(.name==\"$APP_NAME\") | .monit.cpu" 2>/dev/null || echo "N/A")
            memory_usage=$(pm2 jlist | jq -r ".[] | select(.name==\"$APP_NAME\") | .monit.memory" 2>/dev/null || echo "N/A")
            uptime=$(pm2 jlist | jq -r ".[] | select(.name==\"$APP_NAME\") | .pm2_env.pm_uptime" 2>/dev/null || echo "N/A")
            
            if [ "$cpu_usage" != "N/A" ]; then
                log_info "🖥️  CPU Usage: ${cpu_usage}%"
            fi
            
            if [ "$memory_usage" != "N/A" ]; then
                memory_mb=$((memory_usage / 1024 / 1024))
                log_info "💾 Memory Usage: ${memory_mb}MB"
            fi
            
            if [ "$uptime" != "N/A" ]; then
                uptime_hours=$((uptime / 1000 / 60 / 60))
                log_info "⏱️  Uptime: ${uptime_hours} hours"
            fi
        else
            log_error "❌ PM2 process is $pm2_status"
            return 1
        fi
    else
        log_error "❌ PM2 not found"
        return 1
    fi
}

# Function to check system resources
check_system_resources() {
    log_header "Checking System Resources..."
    
    # Check disk space
    disk_usage=$(df -h / | awk 'NR==2 {print $5}' | sed 's/%//')
    if [ $disk_usage -gt 80 ]; then
        log_warn "⚠️  Disk usage is high: ${disk_usage}%"
    else
        log_info "💿 Disk usage: ${disk_usage}%"
    fi
    
    # Check memory usage
    memory_info=$(free -m | awk 'NR==2{printf "%.1f%%", $3*100/$2}')
    log_info "🧠 Memory usage: $memory_info"
    
    # Check load average
    load_avg=$(uptime | awk -F'load average:' '{print $2}')
    log_info "⚖️  Load average:$load_avg"
}

# Function to check recent errors
check_recent_errors() {
    log_header "Checking Recent Errors..."
    
    error_log="/var/log/pm2/$APP_NAME-error.log"
    if [ -f "$error_log" ]; then
        recent_errors=$(tail -n 50 $error_log | grep -c "ERROR" 2>/dev/null || echo "0")
        if [ $recent_errors -gt 0 ]; then
            log_warn "⚠️  Found $recent_errors recent errors in logs"
            log_warn "Check logs with: pm2 logs $APP_NAME --err"
        else
            log_info "✅ No recent errors found"
        fi
    else
        log_warn "⚠️  Error log file not found"
    fi
}

# Function to perform maintenance
perform_maintenance() {
    log_header "Performing Maintenance..."
    
    # Clean expired cache entries
    if [ -f "$DB_PATH" ]; then
        expired_count=$(sqlite3 $DB_PATH "DELETE FROM digipin_cache WHERE expires_at < datetime('now'); SELECT changes();" 2>/dev/null || echo "0")
        if [ $expired_count -gt 0 ]; then
            log_info "🧹 Cleaned $expired_count expired cache entries"
        fi
        
        # Vacuum database to reclaim space
        sqlite3 $DB_PATH "VACUUM;" 2>/dev/null
        log_info "🗜️  Database vacuumed"
    fi
    
    # Restart PM2 if memory usage is too high
    if command -v pm2 >/dev/null 2>&1; then
        memory_usage=$(pm2 jlist | jq -r ".[] | select(.name==\"$APP_NAME\") | .monit.memory" 2>/dev/null || echo "0")
        memory_mb=$((memory_usage / 1024 / 1024))
        
        if [ $memory_mb -gt 700 ]; then
            log_warn "⚠️  High memory usage detected (${memory_mb}MB), restarting..."
            pm2 restart $APP_NAME
            log_info "🔄 Application restarted"
        fi
    fi
}

# Main monitoring function
main() {
    echo "🔍 DigiPin Micro-SaaS Health Monitor"
    echo "===================================="
    echo "$(date)"
    echo ""
    
    failed_checks=0
    
    check_api_health || ((failed_checks++))
    echo ""
    
    check_database || ((failed_checks++))
    echo ""
    
    check_pm2_status || ((failed_checks++))
    echo ""
    
    check_system_resources
    echo ""
    
    check_recent_errors
    echo ""
    
    perform_maintenance
    echo ""
    
    if [ $failed_checks -eq 0 ]; then
        log_info "🎉 All health checks passed!"
    else
        log_error "❌ $failed_checks health check(s) failed!"
        exit 1
    fi
}

# Run main function
main
