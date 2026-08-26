#!/usr/bin/env bash
#
# get-superpowers.sh — clone obra/superpowers as a SIBLING of this repo, at the
# commit the diagrams document.
#
# Usage:
#   workflows/develop/tools/get-superpowers.sh [--update]
#
# Why a sibling and not a submodule or a vendored copy:
#   - It stays a real repo, with history and a remote. Anyone who wants to
#     improve superpowers can add their own fork as a remote, branch, and open a
#     PR the ordinary way. A vendored copy is a dead end; a submodule checks out
#     detached HEAD by default, which is where beginners lose commits.
#   - Submodules and git worktrees fight. `git worktree remove` refuses on a
#     worktree containing an initialized submodule, and `git submodule deinit`
#     run inside a worktree silently deinits it in the MAIN checkout, because
#     submodule config lives in the shared .git/config. This repo uses a
#     worktree per branch (see scripts/worktree-new.sh), so that trade is a bad
#     one.
#   - Every worktree shares this one clone. Nothing is duplicated per branch.
#
# The pin below is what workflows/develop/superpowers.bpmn was drawn from. If you
# move it, the diagram and the source can disagree — re-read the skills and
# update the diagram in the same commit that moves the pin.
#
set -euo pipefail

PIN="b36e082"           # v6.3.0, 2026-08-12
UPSTREAM="https://github.com/obra/superpowers.git"

SRC="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"   # this repo's root
DEST="$(dirname "$SRC")/superpowers"                      # sibling of this repo

UPDATE=""
[ "${1:-}" = "--update" ] && UPDATE="yes"

if [ -d "$DEST/.git" ]; then
  if [ -z "$UPDATE" ]; then
    CURRENT="$(git -C "$DEST" rev-parse --short HEAD)"
    echo "✓ Already cloned: $DEST"
    echo "  at $CURRENT (pin is $PIN)"
    if [ "$CURRENT" != "$PIN" ]; then
      echo "  ⚠ not on the pinned commit — the diagrams describe $PIN."
      echo "    git -C \"$DEST\" checkout $PIN"
    fi
    exit 0
  fi
  echo "▸ Fetching…"
  git -C "$DEST" fetch --quiet origin
else
  echo "▸ Cloning obra/superpowers to ${DEST}…"
  git clone --quiet "$UPSTREAM" "$DEST"
fi

echo "▸ Checking out pinned commit ${PIN}…"
git -C "$DEST" checkout --quiet "$PIN"

cat <<EOF

✓ superpowers ready: $DEST
  Pinned at $PIN (v6.3.0). Detached HEAD is expected — this is a reading copy.

  To work on it for real (e.g. to contribute a fix upstream):
    cd "$DEST"
    git remote add fork git@github.com:<you>/superpowers.git
    git checkout -b <your-branch> dev
  Superpowers takes PRs against its 'dev' branch, not 'main'.

  Diagram paths refer to this clone as  obra/superpowers:skills/<name>/SKILL.md
  and workflows/diagram/tools/check-di.mjs resolves them here.
EOF
