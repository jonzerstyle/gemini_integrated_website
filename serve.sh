#!/usr/bin/env bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PORT="${1:-8000}"

echo "Starting Gemini Integrated Website & pyZerk Arcade on port ${PORT}..."
exec python3 "${SCRIPT_DIR}/server.py" --port "${PORT}"
