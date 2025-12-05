#!/bin/bash

###############################################################################
# MongoDB Backup Script for HASHdash API
# 
# This script creates automated backups of the MongoDB database
# and uploads them to a secure location.
#
# Usage:
#   ./scripts/backup-mongodb.sh
#
# Environment Variables Required:
#   - MONGODB_URI: MongoDB connection string
#   - MONGODB_DB_NAME: Database name to backup
#   - BACKUP_RETENTION_DAYS: Number of days to keep backups (default: 30)
###############################################################################

set -e  # Exit on error

# Load environment variables
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

# Configuration
BACKUP_DIR="./backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_NAME="hashd_backup_${TIMESTAMP}"
RETENTION_DAYS=${BACKUP_RETENTION_DAYS:-30}

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}🔄 Starting MongoDB backup...${NC}"

# Validate required environment variables
if [ -z "$MONGODB_URI" ]; then
    echo -e "${RED}❌ Error: MONGODB_URI not set${NC}"
    exit 1
fi

if [ -z "$MONGODB_DB_NAME" ]; then
    echo -e "${RED}❌ Error: MONGODB_DB_NAME not set${NC}"
    exit 1
fi

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Create backup using mongodump
echo -e "${YELLOW}📦 Creating backup: ${BACKUP_NAME}${NC}"

mongodump \
    --uri="$MONGODB_URI" \
    --db="$MONGODB_DB_NAME" \
    --out="$BACKUP_DIR/$BACKUP_NAME" \
    --gzip

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Backup created successfully${NC}"
    
    # Create compressed archive
    echo -e "${YELLOW}🗜️  Compressing backup...${NC}"
    cd "$BACKUP_DIR"
    tar -czf "${BACKUP_NAME}.tar.gz" "$BACKUP_NAME"
    rm -rf "$BACKUP_NAME"
    cd ..
    
    echo -e "${GREEN}✅ Backup compressed: ${BACKUP_NAME}.tar.gz${NC}"
    
    # Calculate backup size
    BACKUP_SIZE=$(du -h "$BACKUP_DIR/${BACKUP_NAME}.tar.gz" | cut -f1)
    echo -e "${GREEN}📊 Backup size: ${BACKUP_SIZE}${NC}"
    
    # Clean up old backups
    echo -e "${YELLOW}🧹 Cleaning up backups older than ${RETENTION_DAYS} days...${NC}"
    find "$BACKUP_DIR" -name "hashd_backup_*.tar.gz" -mtime +${RETENTION_DAYS} -delete
    
    # Count remaining backups
    BACKUP_COUNT=$(ls -1 "$BACKUP_DIR"/hashd_backup_*.tar.gz 2>/dev/null | wc -l)
    echo -e "${GREEN}✅ Total backups: ${BACKUP_COUNT}${NC}"
    
    # Optional: Upload to cloud storage (uncomment and configure)
    # echo -e "${YELLOW}☁️  Uploading to cloud storage...${NC}"
    # aws s3 cp "$BACKUP_DIR/${BACKUP_NAME}.tar.gz" "s3://your-bucket/hashd-backups/"
    # OR
    # rclone copy "$BACKUP_DIR/${BACKUP_NAME}.tar.gz" "remote:hashd-backups/"
    
    echo -e "${GREEN}✅ Backup completed successfully!${NC}"
else
    echo -e "${RED}❌ Backup failed${NC}"
    exit 1
fi
