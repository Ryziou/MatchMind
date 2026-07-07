#!/usr/bin/env bash
set -euo pipefail

if [ ! -f .env ]; then
  cp .env.example .env
  echo "Created .env from .env.example. Add your GEMINI_API_KEY before running the server."
fi

npm install
npm run build --workspace=@matchmind/shared

bash .devcontainer/setup-git-ssh.sh

echo ""
echo "Dev container ready."
echo ""
echo "App:"
echo "  Set GEMINI_API_KEY in .env, then run:"
echo "  docker compose up --build"
echo "  or npm run dev --workspace=@matchmind/server (with chroma running)"
