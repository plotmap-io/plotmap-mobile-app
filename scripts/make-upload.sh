#!/usr/bin/env bash
#
# Build the archive to mount in a Taiga session, and refuse to build a bad one.
#
#   npm run upload        →  dist/upload/plotmap-mobile-app.zip
#
# What must never be inside, and why:
#   .git/          the session cannot record the model's code changes when it
#                  is present — the diff and the saved final code come out
#                  empty, which is only visible after the fact
#   node_modules/  size; a .gitignore keeps generated folders out of the diff
#   .env           a live config file; .env.example is the one to ship
#   AGENTS.md, CLAUDE.md, .claude/, .agents/
#                  agent instruction files are not allowed in an uploaded repo
#
# The archive is built from files git is tracking, so .gitignore decides what
# ships. Anything uncommitted is reported before packing — it will not be in
# the archive.
set -euo pipefail

cd "$(dirname "$0")/.."
NAME="plotmap-mobile-app"
OUT="dist/upload/$NAME.zip"

command -v git >/dev/null || { echo "git is required"; exit 1; }
command -v zip >/dev/null || { echo "zip is required"; exit 1; }

dirty=$(git status --porcelain)
if [ -n "$dirty" ]; then
  echo "Not committed — these will NOT be in the archive:"
  echo "$dirty" | sed 's/^/  /'
  echo
fi

rm -rf dist/upload
mkdir -p "dist/upload/$NAME"

# Tracked files only, NUL-separated so a space in a path cannot split it.
git ls-files -z | while IFS= read -r -d '' f; do
  mkdir -p "dist/upload/$NAME/$(dirname "$f")"
  cp "$f" "dist/upload/$NAME/$f"
done

( cd dist/upload && zip -qr "$NAME.zip" "$NAME" )
rm -rf "dist/upload/$NAME"

# --- verify what was actually packed, not what we meant to pack -------------
listing=$(unzip -Z1 "$OUT")
bad=$(printf '%s\n' "$listing" | grep -E '(^|/)(\.git/|node_modules/|\.expo/|\.claude/|\.agents/|AGENTS\.md|CLAUDE\.md|\.env$|\.logs/)' || true)
if [ -n "$bad" ]; then
  echo "REFUSING to ship — the archive contains:"
  printf '%s\n' "$bad" | sed 's/^/  /'
  rm -f "$OUT"
  exit 1
fi

for required in "$NAME/LICENSE" "$NAME/.gitignore" "$NAME/package.json"; do
  printf '%s\n' "$listing" | grep -qx "$required" || {
    echo "REFUSING to ship — missing $required"; rm -f "$OUT"; exit 1; }
done

echo "$OUT"
echo "  $(printf '%s\n' "$listing" | grep -vc '/$') files, $(du -h "$OUT" | cut -f1)"
echo "  no .git, no node_modules, no .env, no agent instruction files"
