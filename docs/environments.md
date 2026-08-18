# Environments & repository setup

The workflow relies on a few settings that live in GitHub, not in the repo.
Apply these once. You can click through the GitHub UI (steps below) or run the
optional [`scripts/setup-repo.sh`](../scripts/setup-repo.sh) helper.

## 1. Branch protection on `main`

**Settings → Branches → Add branch ruleset** (or *Branch protection rules*) for
`main`:

- ✅ Require a pull request before merging (at least 1 approval).
- ✅ Require status checks to pass before merging. Search for and select these
  two checks (they are the CI job names):
  - `Build & test`
  - `Validate feature flags`
- ✅ Require branches to be up to date before merging.
- ✅ Require linear history (pairs with squash merge).
- ✅ Do not allow bypassing the above / block force pushes.

**Settings → General → Pull Requests:** enable **Allow squash merging**, disable
merge commits, and enable **Automatically delete head branches**.

## 2. Environments

**Settings → Environments → New environment**

### `staging`
- No protection rules (auto-deploy).
- **Variables:** `STAGING_URL` = your staging URL.
- **Secrets:** whatever your deploy target needs (see below).

### `production`
- ✅ **Required reviewers** — add yourself / the team. *This is the approval gate
  that pauses every production deploy.*
- (optional) ✅ **Wait timer** for a cool-down before deploys.
- (optional) Limit deployments to protected branches / tags.
- **Variables:** `PRODUCTION_URL` = your production URL.
- **Secrets:** your deploy-target credentials.

## 3. Deploy secrets

The calendar has a real deploy target: see
[`calendar-deploy.md`](calendar-deploy.md) for the Cloudflare secrets and the
one-time D1 setup it needs. The curriculum publishes to GitHub Pages using the
workflow's own `GITHUB_TOKEN` and needs no secrets of its own.

For any further target you add, When you pick a target, add its credentials as **Environment secrets** on
the matching environment (not repo-wide), so staging and production stay
isolated. Common examples:

| Target        | Secrets to add                                  |
| ------------- | ----------------------------------------------- |
| Vercel        | `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID` |
| Netlify       | `NETLIFY_AUTH_TOKEN`, `NETLIFY_SITE_ID`         |
| SSH / rsync   | `SSH_HOST`, `SSH_USER`, `SSH_KEY`               |
| Cloud (AWS/…) | provider access keys or an OIDC role            |

Then replace the `TODO: deploy` step in `deploy-staging.yml` /
`deploy-production.yml` with the actual command.

## 4. Optional: script it

If you have the [GitHub CLI](https://cli.github.com/) (`gh`) authenticated
locally, [`scripts/setup-repo.sh`](../scripts/setup-repo.sh) applies the branch
protection and creates both environments for you. Review it before running.
