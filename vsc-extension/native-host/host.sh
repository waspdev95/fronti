#!/bin/bash
# Mac/Linux wrapper for native host
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
node "$DIR/host.js" "$@"
