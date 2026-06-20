#!/bin/bash
# PostToolUse hook (Edit|Write): validates the file that was just modified.
#   *.js        → syntax check + SonarQube rules (no console.log, no var)
#   *.json      → valid JSON
#   db/*.json   → valid JSON + bilingual integrity (every en must have km)
# Exit 2 = report the problem back to Claude so it fixes it immediately.

input=$(cat)
file_path=$(printf '%s' "$input" | python3 -c \
  "import json,sys; print(json.load(sys.stdin).get('tool_input',{}).get('file_path',''))" 2>/dev/null)

# Fix: braces required — bare || and && don't chain as expected in bash
{ [ -z "$file_path" ] || [ ! -f "$file_path" ]; } && exit 0

case "$file_path" in
  *.js)
    # 1. Syntax check
    if ! err=$(node --check "$file_path" 2>&1); then
      echo "JS syntax error in $file_path — fix before continuing:" >&2
      echo "$err" >&2
      exit 2
    fi

    # 2. No console.log in production code (SonarQube rule — use console.error/warn)
    #    Skips commented-out lines and test files (tests/ dir uses console.log intentionally)
    case "$file_path" in
      */tests/*)
        ;;  # test runner output — console.log is correct here
      *)
        if grep -En '^[^/]*console\.log' "$file_path" | grep -q .; then
          echo "BLOCKED: console.log found in $file_path. Use console.error / console.warn instead:" >&2
          grep -En '^[^/]*console\.log' "$file_path" >&2
          exit 2
        fi
        ;;
    esac

    # 3. No var declarations (use const / let)
    if grep -En '(^|[;{(,])\s*var\s' "$file_path" | grep -q .; then
      echo "BLOCKED: 'var' declaration in $file_path. Use const or let:" >&2
      grep -En '(^|[;{(,])\s*var\s' "$file_path" >&2
      exit 2
    fi
    ;;

  *.json)
    # 4. Valid JSON
    if ! err=$(python3 -m json.tool "$file_path" 2>&1 >/dev/null); then
      echo "Invalid JSON in $file_path — fix before continuing:" >&2
      echo "$err" >&2
      exit 2
    fi

    # 5. Bilingual integrity: every object with 'en' must have 'km' and vice versa
    case "$file_path" in
      */db/*.json)
        if ! err=$(python3 -c "
import json, sys
def chk(o, p=''):
    if isinstance(o, dict):
        if 'en' in o and 'km' not in o:
            sys.stderr.write('Missing km at: ' + p + '\n'); sys.exit(1)
        if 'km' in o and 'en' not in o:
            sys.stderr.write('Missing en at: ' + p + '\n'); sys.exit(1)
        [chk(v, p + '.' + k) for k, v in o.items()]
    elif isinstance(o, list):
        [chk(v, p + '[' + str(i) + ']') for i, v in enumerate(o)]
chk(json.load(open(sys.argv[1])))
" "$file_path" 2>&1); then
          echo "Bilingual integrity error in $file_path — every 'en' field needs a matching 'km':" >&2
          echo "$err" >&2
          exit 2
        fi
        ;;
    esac
    ;;
esac

exit 0
