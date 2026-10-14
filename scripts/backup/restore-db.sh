#!/bin/bash
set -e
if [ -z "$1" ]; then
    echo "Usage: ./restore-db.sh <path_to_backup_file.sql>"
    exit 1
fi

BACKUP_FILE="$1"
echo "🔄 Restoring database from $BACKUP_FILE..."
psql -U postgres -h localhost -d school_erp < "$BACKUP_FILE"
echo "✅ Database restored successfully."
