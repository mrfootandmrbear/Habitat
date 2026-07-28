#!/usr/bin/env bash
# Reminds the agent to keep docs/BUILD_GUIDE.md (and MVP_SCOPE gate) current on commit.
set -euo pipefail

input=$(cat)
command=$(printf '%s' "$input" | python3 -c 'import json,sys; print(json.load(sys.stdin).get("command",""))' 2>/dev/null || true)

if [[ ! "$command" =~ git[[:space:]]+commit ]]; then
  printf '%s\n' '{"permission":"allow"}'
  exit 0
fi

# Fail open: reminder only, never block the commit.
staged=$(git diff --cached --name-only 2>/dev/null || true)
has_plan=0
printf '%s\n' "$staged" | grep -qE '^docs/BUILD_GUIDE\.md$' && has_plan=1 || true
has_scope=0
printf '%s\n' "$staged" | grep -qE '^docs/MVP_SCOPE\.md$' && has_scope=1 || true

if [[ "$has_plan" -eq 1 ]]; then
  msg="BUILD_GUIDE is staged — good. Confirm Current gate / checkboxes match this commit before finishing."
else
  msg="Commit reminder: update docs/BUILD_GUIDE.md (checkboxes + Current gate) and usually docs/MVP_SCOPE.md / README Current slice for this change, then stage them with the commit. Project rule: update-build-plan-on-commit."
fi

if [[ "$has_scope" -eq 0 && "$has_plan" -eq 0 ]]; then
  msg="$msg MVP_SCOPE joint table is also unstaged."
fi

python3 -c 'import json,sys; print(json.dumps({"permission":"allow","agent_message":sys.argv[1]}))' "$msg"
exit 0
