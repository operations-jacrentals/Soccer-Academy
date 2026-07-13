#!/usr/bin/env bash
#
# Configure the GitHub repo for the trunk-based workflow:
#   * branch protection on main (require PR + CI checks, linear history)
#   * a `staging` environment (auto-deploy)
#   * a `production` environment with a required-reviewer approval gate
#
# Requires the GitHub CLI (https://cli.github.com), authenticated with a token
# that can administer the repo:  gh auth login
#
# Review before running. Re-running is safe (idempotent PUTs).
#
# Usage:
#   scripts/setup-repo.sh [--reviewer <github-login>] [owner/repo]
#
set -euo pipefail

REPO="${GH_REPO:-operations-jacrentals/Soccer-Academy}"
REVIEWER=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --reviewer) REVIEWER="$2"; shift 2 ;;
    -h|--help) grep '^#' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
    *) REPO="$1"; shift ;;
  esac
done

command -v gh >/dev/null || { echo "error: gh (GitHub CLI) is required"; exit 1; }

echo "==> Repo: $REPO"

echo "==> Enabling squash-only merges + auto-delete branches"
gh api -X PATCH "repos/$REPO" \
  -F allow_squash_merge=true \
  -F allow_merge_commit=false \
  -F allow_rebase_merge=false \
  -F delete_branch_on_merge=true >/dev/null

echo "==> Applying branch protection on 'main'"
gh api -X PUT "repos/$REPO/branches/main/protection" \
  --input - >/dev/null <<'JSON'
{
  "required_status_checks": {
    "strict": true,
    "checks": [
      { "context": "Build & test" },
      { "context": "Validate feature flags" }
    ]
  },
  "enforce_admins": false,
  "required_pull_request_reviews": {
    "required_approving_review_count": 1,
    "require_last_push_approval": false
  },
  "required_linear_history": true,
  "allow_force_pushes": false,
  "allow_deletions": false,
  "restrictions": null
}
JSON

create_env() {
  local env="$1"; shift
  echo "==> Creating environment: $env"
  gh api -X PUT "repos/$REPO/environments/$env" "$@" >/dev/null
}

create_env staging

if [[ -n "$REVIEWER" ]]; then
  # Look up the reviewer's numeric user id for the protection rule.
  REVIEWER_ID="$(gh api "users/$REVIEWER" --jq .id)"
  echo "==> Creating environment: production (required reviewer: $REVIEWER)"
  # No deployment_branch_policy on purpose: production deploys from release TAGS
  # (and the rollback path passes a tag as the workflow_dispatch ref). GitHub's
  # "protected branches only" policy EXCLUDES tags and would reject those
  # deploys. The required-reviewer gate is the control here. To additionally
  # restrict which refs may deploy, add a "Selected branches and tags" policy
  # (e.g. v*) in Settings → Environments. See docs/environments.md.
  gh api -X PUT "repos/$REPO/environments/production" --input - >/dev/null <<JSON
{
  "reviewers": [ { "type": "User", "id": $REVIEWER_ID } ]
}
JSON
else
  create_env production
  echo "    note: no --reviewer given. Add required reviewers to the 'production'"
  echo "    environment in Settings → Environments to enable the approval gate."
fi

cat <<'DONE'

==> Done. Remaining manual steps:
    * Set environment variables STAGING_URL / PRODUCTION_URL.
    * Add your deploy-target secrets to each environment.
    * Fill in the TODO deploy steps in .github/workflows/deploy-*.yml.
    See docs/environments.md.
DONE
