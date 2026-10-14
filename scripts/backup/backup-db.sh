#!/bin/bash
set -e
BACKUP_DIR="./backups"
mkdir -p "$BACKUP_DIR"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="$BACKUP_DIR/school_erp_$TIMESTAMP.sql"

echo "💾 Creating PostgreSQL backup to $BACKUP_FILE..."
pg_dump -U postgres -h localhost -d school_erp > "$BACKUP_FILE"
echo "✅ Backup successfully created at $BACKUP_FILE"
