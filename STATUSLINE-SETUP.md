# Claude Code Status Line — Reproducible Setup

A drop-in guide to install the **exact** custom status line used in this project.
Hand this whole file to someone (or paste the "Prompt" section to an agent) and they
will get a byte-for-byte identical status bar.

## What it looks like

```
Opus 4.8 | [#·········] 6% | 59k/1000k | main
```

Left → right, the segments are:

| Segment            | Example        | Meaning |
|--------------------|----------------|---------|
| Model              | `Opus 4.8`     | `model.display_name` with any `(… )` suffix (e.g. `(1M context)`) stripped |
| Progress bar       | `[#·········]`  | 10 chars wide; `#` = filled, `·` = empty, scaled to the used % |
| Used percent       | `6%`           | The harness's own `context_window.used_percentage` (authoritative) |
| Tokens / window    | `59k/1000k`    | Current context occupancy vs. the model's context-window size, in `k` |
| Git branch / tree  | `main`         | Current branch; shows `wt:<name> (branch)` when inside a git worktree |

### Key behavior — no `0%` flash after `/compact`

Right after `/compact` (and before a session's first API turn), Claude Code zeroes the
**entire** `context_window` block — `current_usage`, `total_*`, and `used_percentage` all
read `0`, because no API request has been sent since the compaction. A naive script shows a
misleading `0% | 0/1000k` for that one render cycle.

This script is **sticky**: every live render caches its reading per-session to
`/tmp/claude-statusline-<session_id>.cache`, and whenever a render comes back all-zero it
reuses the last real reading instead of dropping to `0%`. A brand-new session with no cache
still honestly shows `0%` until its first turn runs.

## Prerequisites

- **Claude Code** `v2.1.207` or later (the status-line JSON schema this relies on:
  `model.display_name`, `context_window.{context_window_size,used_percentage,current_usage.*}`,
  `session_id`, `cwd`).
- **`jq`** on `PATH` — `brew install jq` (macOS) / `apt-get install jq` (Debian/Ubuntu).
- **`bash`**, **`awk`**, **`git`** — standard on macOS and Linux.

## Install (3 steps)

### 1. Create the script at `~/.claude/statusline-command.sh`

```bash
#!/bin/bash
input=$(cat)

# Model name (strip parenthetical suffix like "(1M context)")
model=$(echo "$input" | jq -r '.model.display_name // "Unknown"' | sed 's/ (.*)//')

# Context window size (falls back to 200k if the field is absent)
context_size=$(echo "$input" | jq -r '.context_window.context_window_size // 200000')

# Current context occupancy = the whole last-request window:
# cache read + cache creation + fresh input + output. This is the real
# "how full is the context" figure that used_percentage is computed from.
cache_read=$(echo "$input" | jq -r '.context_window.current_usage.cache_read_input_tokens // 0')
cache_creation=$(echo "$input" | jq -r '.context_window.current_usage.cache_creation_input_tokens // 0')
input_tokens=$(echo "$input" | jq -r '.context_window.current_usage.input_tokens // 0')
output_tokens=$(echo "$input" | jq -r '.context_window.current_usage.output_tokens // 0')

total_tokens=$(awk "BEGIN {printf \"%.0f\", $cache_read + $cache_creation + $input_tokens + $output_tokens}")

# Prefer the harness's own authoritative percentage; derive it only if absent.
used=$(echo "$input" | jq -r '.context_window.used_percentage // empty')
if [ -z "$used" ]; then
  used=$(awk "BEGIN {printf \"%.0f\", ($context_size > 0) ? $total_tokens * 100 / $context_size : 0}")
fi

# Sticky cache: right after /compact (and before a session's first API turn) the
# harness zeroes the ENTIRE context_window block — current_usage, total_*, and
# used_percentage all read 0 because no request has been sent since. That's the
# transient "0% | 0/1000k" flash. Rather than show a misleading 0, hold the last
# real reading for this session until the next turn produces a live number.
session_id=$(echo "$input" | jq -r '.session_id // "default"')
cache_file="/tmp/claude-statusline-${session_id}.cache"

if [ "$total_tokens" -gt 0 ]; then
  # Live reading — trust it and refresh the cache ("tokens percent").
  echo "${total_tokens} ${used}" > "$cache_file" 2>/dev/null
elif [ -r "$cache_file" ]; then
  # Transient zero — reuse the last real reading instead of flashing 0.
  read -r cached_tokens cached_used < "$cache_file"
  [ -n "$cached_tokens" ] && total_tokens=$cached_tokens
  [ -n "$cached_used" ] && used=$cached_used
fi

[ "$used" -lt 0 ] 2>/dev/null && used=0
[ "$used" -gt 100 ] 2>/dev/null && used=100

# Progress bar (10 chars wide)
bar_width=10
filled=$(awk "BEGIN {printf \"%.0f\", $used * $bar_width / 100}")
[ "$filled" -lt 0 ] 2>/dev/null && filled=0
[ "$filled" -gt "$bar_width" ] 2>/dev/null && filled=$bar_width

bar=""
for ((i=0; i<filled; i++)); do bar="${bar}#"; done
for ((i=filled; i<bar_width; i++)); do bar="${bar}·"; done

status="${model} | [${bar}] ${used}%"

# Token count with a k suffix
if [ "$total_tokens" -ge 1000 ]; then
  tokens_display=$(awk "BEGIN {printf \"%.0f\", $total_tokens / 1000}")k
else
  tokens_display="${total_tokens}"
fi

if [ "$context_size" -ge 1000 ]; then
  context_display=$(awk "BEGIN {printf \"%.0f\", $context_size / 1000}")k
else
  context_display="${context_size}"
fi

status="${status} | ${tokens_display}/${context_display}"

# Git branch / worktree info
cwd=$(echo "$input" | jq -r '.cwd // ""')
if [ -z "$cwd" ]; then
  cwd="$(pwd)"
fi

if git -C "$cwd" rev-parse --is-inside-work-tree &>/dev/null; then
  branch=$(git -C "$cwd" branch --show-current 2>/dev/null)
  [ -z "$branch" ] && branch="detached"

  # Check if we're in a worktree (not the main working tree)
  main_tree=$(git -C "$cwd" worktree list --porcelain 2>/dev/null | head -1 | sed 's/^worktree //')
  current_tree=$(git -C "$cwd" rev-parse --show-toplevel 2>/dev/null)

  if [ -n "$main_tree" ] && [ "$current_tree" != "$main_tree" ]; then
    wt_name=$(basename "$current_tree")
    status="${status} | wt:${wt_name} (${branch})"
  else
    status="${status} | ${branch}"
  fi
fi

echo "$status"
```

### 2. Make it executable

```bash
chmod +x ~/.claude/statusline-command.sh
```

### 3. Point `~/.claude/settings.json` at it

Add (or merge) this top-level key into `~/.claude/settings.json`:

```json
{
  "statusLine": {
    "type": "command",
    "command": "~/.claude/statusline-command.sh"
  }
}
```

That's it. The status line refreshes on the next render — no restart required. Because this
lives in `~/.claude/` (not the project), it applies to **every** session in **every** project.

## Verify without launching Claude Code

Pipe a mock of the JSON Claude Code feeds the script on stdin:

```bash
echo '{"session_id":"demo","cwd":"'"$PWD"'","model":{"display_name":"Opus 4.8 (1M context)"},"context_window":{"context_window_size":1000000,"used_percentage":6,"current_usage":{"input_tokens":2,"output_tokens":172,"cache_creation_input_tokens":1435,"cache_read_input_tokens":57595}}}' \
  | ~/.claude/statusline-command.sh
# => Opus 4.8 | [#·········] 6% | 59k/1000k | <branch>
```

To confirm the sticky behavior, run the line above once (populates the cache), then feed an
all-zero `context_window` with the **same** `session_id` — it should still show `6% | 59k`,
not `0%`.

## Notes & customization

- **Bar width:** change `bar_width=10`.
- **Fill glyphs:** the bar uses `#` (filled) and `·` (empty) — swap them in the two `for` loops.
- **Status-line vs `/context`:** these differ by a few points on purpose. This bar reports the
  real billed context window (cache tokens included, straight from the harness's
  `used_percentage`); `/context` is the client's estimate of message *composition*. They track
  closely but measure slightly different things.
- **Cache files** accumulate one small file per session under `/tmp` (e.g.
  `/tmp/claude-statusline-<session_id>.cache`). They're harmless and cleared on reboot; delete
  anytime with `rm /tmp/claude-statusline-*.cache`.
