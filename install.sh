#!/usr/bin/env bash
set -euo pipefail

PLUGIN_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$PLUGIN_DIR"

# ── 1. Detect Obsidian's Electron version ─────────────────────────────────────
OBSIDIAN_APP="/Applications/Obsidian.app"
ELECTRON_VER_FILE="$OBSIDIAN_APP/Contents/Resources/electron-version"

if [ -f "$ELECTRON_VER_FILE" ]; then
  ELECTRON_VERSION=$(cat "$ELECTRON_VER_FILE")
  echo "Detected Obsidian Electron version: $ELECTRON_VERSION"
else
  # Fallback: extract from the framework binary
  ELECTRON_VERSION=$(strings "$OBSIDIAN_APP/Contents/Frameworks/Electron Framework.framework/Electron Framework" 2>/dev/null | grep -E "^[0-9]+\.[0-9]+\.[0-9]+$" | head -1)
  if [ -z "$ELECTRON_VERSION" ]; then
    echo "Could not detect Electron version — defaulting to 39.0.0"
    ELECTRON_VERSION="39.0.0"
  else
    echo "Detected Obsidian Electron version: $ELECTRON_VERSION"
  fi
fi

# ── 2. Install npm dependencies ────────────────────────────────────────────────
echo ""
echo "Installing npm packages..."
npm install

# ── 3. Rebuild node-pty for Obsidian's Electron ────────────────────────────────
echo ""
echo "Rebuilding node-pty for Electron $ELECTRON_VERSION..."
./node_modules/.bin/electron-rebuild -v "$ELECTRON_VERSION" -w node-pty --force

# ── 4. Build the plugin ────────────────────────────────────────────────────────
echo ""
echo "Building plugin..."
npm run build

# ── 5. Deploy to vault ─────────────────────────────────────────────────────────
echo ""
# Try to find a vault automatically (first .obsidian folder under ~/Documents or ~)
DEFAULT_VAULT=$(find ~/Documents ~/Desktop ~ -maxdepth 3 -name ".obsidian" -type d 2>/dev/null | head -1)
if [ -n "$DEFAULT_VAULT" ]; then
  DEFAULT_VAULT_PARENT="$(dirname "$DEFAULT_VAULT")"
  echo "Found vault: $DEFAULT_VAULT_PARENT"
  echo -n "Deploy there? [Y/n] "
  read -r REPLY
  if [[ "$REPLY" =~ ^[Nn] ]]; then
    DEFAULT_VAULT=""
  fi
fi

if [ -z "$DEFAULT_VAULT" ]; then
  echo -n "Enter your Obsidian vault path: "
  read -r VAULT_PATH
else
  VAULT_PATH="$DEFAULT_VAULT_PARENT"
fi

PLUGIN_INSTALL_DIR="$VAULT_PATH/.obsidian/plugins/obsidian-terminal"
mkdir -p "$PLUGIN_INSTALL_DIR"

echo ""
echo "Copying plugin files to $PLUGIN_INSTALL_DIR..."
cp main.js styles.css manifest.json "$PLUGIN_INSTALL_DIR/"

# Copy node-pty (with native binaries) — node_modules is external in the bundle
echo "Copying node-pty (native module)..."
mkdir -p "$PLUGIN_INSTALL_DIR/node_modules"
cp -r node_modules/node-pty "$PLUGIN_INSTALL_DIR/node_modules/"

echo ""
echo "Done! Enable the plugin:"
echo "  Obsidian → Settings → Community plugins → Installed plugins → Integrated Terminal"
echo ""
echo "Usage: Press Cmd+J to open/focus/close the terminal."
