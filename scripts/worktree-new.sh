#!/usr/bin/env bash
#
# worktree-new.sh — spin up an isolated git worktree for a feature branch and
# bootstrap it so a fresh Claude / VS Code session can start working immediately.
#
# Usage:
#   scripts/worktree-new.sh <feature> <plan-file> [--base <ref>]
#
#   <feature>    short kebab-case name. Becomes branch `<feature>` and
#                directory `~/Documents/Documents/code/.worktrees/SI212-<feature>`.
#                Branch name and directory suffix are the SAME string — /land and
#                /teardown both reconstruct one from the other, so don't diverge
#                them by hand.
#   <plan-file>  REQUIRED since 2026-08-24: path (relative to repo root) to the
#                plan this worktree is for, normally plans/<feature>.md so /start
#                can find it by branch name. If it's an untracked file in the main
#                checkout, it's copied into the worktree's plans/.
#
#                It does not have to be a deliberated plan. Most work here comes
#                off a running task list or straight from conversation, and for that a
#                brief recording what the master session worked out is the point:
#                a fresh worktree has no commits and no uncommitted changes, so
#                without this file /start has nothing but a branch name to go on.
#   --base <ref> base to branch from. Defaults to the branch THIS checkout is on,
#                so the new worktree inherits its work including local unpushed
#                commits. This repo has no remote, so `--base origin/...` will
#                not resolve until one exists.
#
# What it does:
#   1. Branches the worktree from <base> (default: this checkout's branch).
#   2. Copies the gitignored files git won't carry into a worktree.
#   3. Runs npm install in workflows/diagram/tools/ so check-di and bpmnlint work there.
#   4. Opens a new VS Code window on the worktree.
#
# No parallel-work guardrails apply here: nothing in this repo binds a port or
# shares a database. Two worktrees can run the validators and the renderer at the
# same time without interfering.
#
set -euo pipefail

# --- Parse args: <feature> <plan-file> [--base <ref>] ---
FEATURE=""
PLAN=""
BASE=""
while [ $# -gt 0 ]; do
  case "$1" in
    --base)   BASE="${2:?--base needs a ref}"; shift 2 ;;
    --base=*) BASE="${1#*=}"; shift ;;
    -*)       echo "✗ unknown option: $1" >&2; exit 1 ;;
    *)        if [ -z "$FEATURE" ]; then FEATURE="$1"
              elif [ -z "$PLAN" ]; then PLAN="$1"
              else echo "✗ unexpected argument: $1" >&2; exit 1; fi
              shift ;;
  esac
done
USAGE="usage: scripts/worktree-new.sh <feature> <plan-file> [--base <ref>]"
[ -n "$FEATURE" ] || { echo "$USAGE" >&2; exit 1; }
[ -n "$PLAN" ] || {
  echo "✗ a plan file is required." >&2
  echo "  A fresh worktree has no commits and no uncommitted changes, so without" >&2
  echo "  one /start has nothing but a branch name. It needn't be a deliberated" >&2
  echo "  plan — a brief of what was just worked out is the point." >&2
  echo "  Conventionally plans/$FEATURE.md, so /start finds it by branch name." >&2
  echo "$USAGE" >&2
  exit 1
}

SRC="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"   # repo root (this checkout)
REPO="$(basename "$SRC")"                                 # SI212
CORRAL="$HOME/Documents/Documents/code/.worktrees"
WT="$CORRAL/${REPO}-${FEATURE}"
BRANCH="$FEATURE"

# Check the plan BEFORE creating anything. Failing after the worktree exists
# would leave a half-bootstrapped directory to clean up by hand.
[ -f "$SRC/$PLAN" ] || {
  echo "✗ plan-file '$PLAN' not found in $SRC" >&2
  echo "  Write it first. (If it only exists on the --base branch and not in" >&2
  echo "  this checkout's working tree, check that branch out here first.)" >&2
  exit 1
}

mkdir -p "$CORRAL"

if [ -e "$WT" ]; then
  echo "✗ $WT already exists. Remove it first: scripts/worktree-rm.sh $FEATURE" >&2
  exit 1
fi
if git -C "$SRC" show-ref --verify --quiet "refs/heads/$BRANCH"; then
  echo "✗ branch '$BRANCH' already exists. Pick another name or delete it." >&2
  exit 1
fi

# Default base = the branch this checkout (the master session) is on, so the new
# worktree inherits its work, including local unpushed commits.
if [ -z "$BASE" ]; then
  BASE="$(git -C "$SRC" rev-parse --abbrev-ref HEAD)"
  if [ "$BASE" = "HEAD" ]; then
    echo "✗ this checkout is in detached HEAD — pass --base <ref> explicitly." >&2
    exit 1
  fi
fi

# If branching from a remote-tracking ref, refresh it first. No remote exists in
# this repo today; this is here for when one does.
case "$BASE" in
  origin/*)
    if git -C "$SRC" remote | grep -qx origin; then
      echo "▸ Fetching ${BASE#origin/}…"
      git -C "$SRC" fetch --quiet origin "${BASE#origin/}"
    else
      echo "✗ --base '$BASE' but this repo has no 'origin' remote." >&2
      exit 1
    fi
    ;;
esac

echo "▸ Creating worktree on new branch '$BRANCH' from '$BASE'…"
git -C "$SRC" worktree add -b "$BRANCH" "$WT" "$BASE"

# --- Bootstrap gitignored files (git does NOT carry these into a worktree) ---
echo "▸ Copying gitignored config…"
copy() {
  if [ -f "$SRC/$1" ]; then
    mkdir -p "$WT/$(dirname "$1")"
    cp "$SRC/$1" "$WT/$1"
    echo "    + $1"
  fi
}
copy ".claude/settings.local.json"

# workflows/diagram/tools/node_modules is gitignored, and check-di.mjs / bpmnlint /
# render.mjs are how every diagram change gets validated. A worktree without them
# can edit a .bpmn but cannot check it. It is the only npm install in the repo.
echo "▸ npm install (workflows/diagram/tools/)…"
( cd "$WT/workflows/diagram/tools" && npm install --silent )

# --- Surface the plan this worktree is for ---
if [ -n "$PLAN" ]; then
  if [ -f "$WT/$PLAN" ]; then
    echo "▸ Plan present on branch: $PLAN"
  elif [ -f "$SRC/$PLAN" ]; then
    mkdir -p "$WT/plans"
    cp "$SRC/$PLAN" "$WT/plans/$(basename "$PLAN")"
    echo "▸ Copied untracked plan into worktree: plans/$(basename "$PLAN")"
  else
    echo "⚠ plan-file '$PLAN' not found in worktree or main checkout — skipping." >&2
  fi
fi

# --- Open VS Code (code may not be on PATH; fall back to the app bundle) ---
CODE_BIN=""
if command -v code >/dev/null 2>&1; then
  CODE_BIN="code"
elif [ -x "/Applications/Visual Studio Code.app/Contents/Resources/app/bin/code" ]; then
  CODE_BIN="/Applications/Visual Studio Code.app/Contents/Resources/app/bin/code"
fi

echo ""
echo "✓ Worktree ready: $WT"
if [ -n "$CODE_BIN" ]; then
  echo "▸ Opening a new VS Code window…"
  "$CODE_BIN" "$WT"
else
  echo "  Open it: VS Code → File → Open Folder → $WT"
fi
echo ""
echo "  Then start a fresh Claude session in that window — a session in the"
echo "  VS Code extension, not a terminal one, or you lose the selection context."
echo "  Kick it off with: /start — it works out what this worktree is for."
echo "  When done:  /land $FEATURE  then  scripts/worktree-rm.sh $FEATURE"
