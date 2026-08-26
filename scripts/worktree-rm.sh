#!/usr/bin/env bash
#
# worktree-rm.sh — tear down a feature worktree created by worktree-new.sh.
#
# Usage:
#   scripts/worktree-rm.sh <feature> [--force]
#
# Refuses to remove a worktree with uncommitted changes unless --force is given.
# The branch itself is left intact; the command to delete it is printed.
#
# This repo has no submodules, so --force here only ever means "the tree is
# dirty and I accept losing that" or "the worktree link is broken/orphaned".
# Treat it as destructive and confirm with the user first.
#
set -euo pipefail

FEATURE="${1:?usage: scripts/worktree-rm.sh <feature> [--force]}"
FORCE="${2:-}"

SRC="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
REPO="$(basename "$SRC")"
WT="$HOME/Documents/Documents/code/.worktrees/${REPO}-${FEATURE}"

if [ "$FORCE" = "--force" ]; then
  git -C "$SRC" worktree remove --force "$WT"
else
  git -C "$SRC" worktree remove "$WT"
fi

echo "✓ Removed worktree $WT"
echo "  Branch '$FEATURE' still exists. Delete it once merged:"
echo "    git -C \"$SRC\" branch -d $FEATURE"
