#!/bin/bash
# PostToolUse hook (Edit|Write): validates the file that was just modified.
#   *.js   → node --check   (project has no linter; catches syntax errors instantly)
#   *.json → python3 -m json.tool  (protects the hand-editable db/ catalog files)
# Exit 2 = report the problem back to Claude so it fixes it immediately.

input=$(cat)
file_path=$(printf '%s' "$input" | python3 -c \
  "import json,sys; print(json.load(sys.stdin).get('tool_input',{}).get('file_path',''))" 2>/dev/null)

[ -z "$file_path" ] || [ ! -f "$file_path" ] && exit 0

case "$file_path" in
  *.js)
    if ! err=$(node --check "$file_path" 2>&1); then
      echo "JS syntax error in $file_path — fix before continuing:" >&2
      echo "$err" >&2
      exit 2
    fi
    ;;
  *.json)
    if ! err=$(python3 -m json.tool "$file_path" 2>&1 >/dev/null); then
      echo "Invalid JSON in $file_path — fix before continuing:" >&2
      echo "$err" >&2
      exit 2
    fi
    ;;
esac

exit 0
