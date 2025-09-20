#!/bin/bash

# DigiPin Database Backup Script

set -e

# Configuration
APP_NAME="digipin-micro-saas"
DB_PATH="/var/www/$APP_NAME/data/digipin.db"
BACKUP_DIR="/var/backups/$APP_NAME"
RETENTION_DAYS=30

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
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

# Create backup directory
mkdir -p $BACKUP_DIR

# Generate backup filename with timestamp
BACKUP_FILE="$BACKUP_DIR/digipin-$(date +%Y%m%d_%H%M%S).db"

log_info "Starting database backup..."

# Check if database exists
if [ ! -f "$DB_PATH" ]; then
    log_error "Database file not found at $DB_PATH"
    exit 1
fi

# Create backup using SQLite backup command
sqlite3 $DB_PATH ".backup $BACKUP_FILE"

if [ $? -eq 0 ]; then
    log_info "Backup created successfully: $BACKUP_FILE"
    
    # Compress the backup
    gzip $BACKUP_FILE
    log_info "Backup compressed: $BACKUP_FILE.gz"
    
    # Clean up old backups (keep only last 30 days)
    find $BACKUP_DIR -name "*.gz" -mtime +$RETENTION_DAYS -delete
    log_info "Cleaned up backups older than $RETENTION_DAYS days"
    
    # Display backup info
    BACKUP_SIZE=$(du -h "$BACKUP_FILE.gz" | cut -f1)
    log_info "Backup size: $BACKUP_SIZE"
    
else
    log_error "Backup failed!"
    exit 1
fi

# Optional: Upload to cloud storage (uncomment and configure as needed)
# log_info "Uploading to cloud storage..."
# aws s3 cp "$BACKUP_FILE.gz" s3://your-backup-bucket/digipin/
# gsutil cp "$BACKUP_FILE.gz" gs://your-backup-bucket/digipin/

log_info "Database backup completed successfully! 🎉"
