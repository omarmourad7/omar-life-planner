#!/bin/bash
# Outlook to Google Calendar Sync Script
# Runs every 15 minutes via launchd
# Uses M365 MCP to read Outlook calendar, writes to Google Calendar

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_FILE="$SCRIPT_DIR/sync.log"
LOCK_FILE="/tmp/outlook-gcal-sync.lock"
MAX_RETRIES=5
RETRY_DELAY=60  # seconds

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> "$LOG_FILE"
}

# Check if lock exists (MCP might be in use)
check_lock() {
    if [ -f "$LOCK_FILE" ]; then
        LOCK_PID=$(cat "$LOCK_FILE")
        if ps -p "$LOCK_PID" > /dev/null 2>&1; then
            return 1  # Lock is held by running process
        else
            rm -f "$LOCK_FILE"  # Stale lock, remove it
        fi
    fi
    return 0
}

acquire_lock() {
    echo $$ > "$LOCK_FILE"
}

release_lock() {
    rm -f "$LOCK_FILE"
}

cleanup() {
    release_lock
}
trap cleanup EXIT

# Main sync function
sync_calendars() {
    log "Starting Outlook to Google Calendar sync..."

    # Run the Node.js sync script
    cd "$SCRIPT_DIR"
    node sync-calendars.js 2>&1 | while read line; do
        log "$line"
    done

    return ${PIPESTATUS[0]}
}

# Main loop with retry logic
main() {
    log "=== Sync script started ==="

    for ((i=1; i<=MAX_RETRIES; i++)); do
        if check_lock; then
            acquire_lock
            log "Lock acquired, attempt $i of $MAX_RETRIES"

            if sync_calendars; then
                log "Sync completed successfully"
                exit 0
            else
                log "Sync failed on attempt $i"
            fi

            release_lock
        else
            log "MCP in use, waiting ${RETRY_DELAY}s before retry (attempt $i of $MAX_RETRIES)"
        fi

        if [ $i -lt $MAX_RETRIES ]; then
            sleep $RETRY_DELAY
        fi
    done

    log "All retry attempts exhausted"
    exit 1
}

main
