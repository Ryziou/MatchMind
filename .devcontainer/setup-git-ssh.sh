#!/usr/bin/env bash
# Container-only SSH key for git@github.com. Stored in the matchmind-git-ssh Docker
# volume, never committed to git, never reads your host ~/.ssh private keys.
set -euo pipefail

SSH_DIR=/home/node/.ssh

# Fresh Docker volumes mount with root/nobody ownership; fix before writing keys.
if ! mkdir -p "$SSH_DIR" 2>/dev/null || [ ! -w "$SSH_DIR" ]; then
  sudo mkdir -p "$SSH_DIR"
  sudo chown -R node:node "$SSH_DIR"
fi
chmod 700 "$SSH_DIR"

KEY_FILE="$SSH_DIR/id_ed25519"

if [ ! -f "$KEY_FILE" ]; then
  ssh-keygen -t ed25519 -f "$KEY_FILE" -N "" -C "matchmind-devcontainer"
  echo ""
  echo "=========================================="
  echo "New Dev Container SSH key created."
  echo "Add this public key to GitHub once:"
  echo "  https://github.com/settings/ssh/new"
  echo ""
  cat "${KEY_FILE}.pub"
  echo "=========================================="
  echo ""
else
  echo "Dev Container SSH key already present (${KEY_FILE})."
fi

if ! grep -q github.com "$SSH_DIR/known_hosts" 2>/dev/null; then
  ssh-keyscan -t ed25519 github.com >> "$SSH_DIR/known_hosts" 2>/dev/null
fi

chmod 600 "$KEY_FILE" "${KEY_FILE}.pub"

if ssh -T git@github.com -o BatchMode=yes -o ConnectTimeout=10 2>&1 | grep -q "successfully authenticated"; then
  echo "GitHub SSH auth: OK"
else
  echo "GitHub SSH auth: not configured yet (add the public key above, then run: ssh -T git@github.com)"
fi
