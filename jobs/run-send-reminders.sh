#!/bin/bash
# Wrapper script for running sendReminders.ts from cron
# This ensures environment variables are loaded and the script runs from the correct directory
#
# Usage in crontab (crontab -e):
#   0 9 * * * /absolute/path/to/lysje/jobs/run-send-reminders.sh >> /path/to/logs/cron.log 2>&1
#
# Make sure to use absolute paths in cron!

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

# Change to project directory
cd "$PROJECT_DIR" || {
    echo "Error: Failed to change to project directory: $PROJECT_DIR" >&2
    exit 1
}

# Load environment variables from .env file if it exists
if [ -f .env ]; then
    set -a
    source .env
    set +a
else
    echo "Warning: .env file not found. Environment variables may not be loaded." >&2
fi

# Run the script using npm (which will use tsx)
npm run cron:send-reminders

