#!/bin/bash

###############################################################################
# MongoDB Restore Script for HASHdash API
# 
# This script restores a MongoDB database from a backup file.
#
# Usage:
#   ./scripts/restore-mongodb.sh <backup-file>
#
# Example:
#   ./scripts/restore-mongodb.sh backups/hashd_backup_20231203_120000.tar.gz
#
# Environment Variables Required:
#   - MONGODB_URI: MongoDB connection string
#   - MONGODB_DB_NAME: Database name to restore to
###############################################################################

set -e  # Exit on error

# Load environment variables
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if backup file is provided
if [ -z "$1" ]; then
    echo -e "${RED}❌ Error: No backup file specified${NC}"
    echo "Usage: ./scripts/restore-mongodb.sh <backup-file>"
    exit 1
fi

BACKUP_FILE="$1"

# Validate backup file exists
if [ ! -f "$BACKUP_FILE" ]; then
    echo -e "${RED}❌ Error: Backup file not found: ${BACKUP_FILE}${NC}"
    exit 1
fi

echo -e "${YELLOW}⚠️  WARNING: This will restore the database and may overwrite existing data!${NC}"
read -p "Are you sure you want to continue? (yes/no): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
    echo -e "${YELLOW}❌ Restore cancelled${NC}"
    exit 0
fi

# Validate required environment variables
if [ -z "$MONGODB_URI" ]; then
    echo -e "${RED}❌ Error: MONGODB_URI not set${NC}"
    exit 1
fi

if [ -z "$MONGODB_DB_NAME" ]; then
    echo -e "${RED}❌ Error: MONGODB_DB_NAME not set${NC}"
    exit 1
fi

echo -e "${GREEN}🔄 Starting MongoDB restore...${NC}"

# Create temporary directory for extraction
TEMP_DIR=$(mktemp -d)
trap "rm -rf $TEMP_DIR" EXIT

# Extract backup
echo -e "${YELLOW}📦 Extracting backup...${NC}"
tar -xzf "$BACKUP_FILE" -C "$TEMP_DIR"

# Find the backup directory
BACKUP_DIR=$(find "$TEMP_DIR" -type d -name "hashd_backup_*" | head -n 1)

if [ -z "$BACKUP_DIR" ]; then
    echo -e "${RED}❌ Error: Could not find backup directory in archive${NC}"
    exit 1
fi

# Restore using mongorestore
echo -e "${YELLOW}🔄 Restoring database: ${MONGODB_DB_NAME}${NC}"

mongorestore \
    --uri="$MONGODB_URI" \
    --db="$MONGODB_DB_NAME" \
    --gzip \
    --drop \
    "$BACKUP_DIR/$MONGODB_DB_NAME"

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Database restored successfully!${NC}"
else
    echo -e "${RED}❌ Restore failed${NC}"
    exit 1
fi
