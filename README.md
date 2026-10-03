<p align="center">
  <a href="https://orpheus-agents.github.io/">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset=".github/orpheus-logo.svg">
      <img src=".github/orpheus-logo-light.svg" alt="Orpheus" width="240">
    </picture>
  </a>
</p>

# Orpheus Space Web

Shared agent schedules for [Orpheus Space](https://github.com/orpheus-agents/orpheus-space).
Vue 3, TypeScript, Vite, Tailwind CSS and Vue Router; English/Russian and light/dark themes.

Create and edit schedules, pause/resume, filter by multiple owner emails or unowned
schedules, choose profiles, sandbox templates and allowed ENV names and reset reusable context. The list shows each
schedule's last run; validation problems from the API appear under their fields.
All users with Space access can read all schedules and their history/results.
SAML administrators configured in Space can manage every schedule; other users
can create only for themselves and modify only their own schedules. Editing,
pause/resume, deletion and context reset follow the backend's `can_edit` flag.
Users without an email can only read. The header lists Skills as a coming section without a route or API; chat
is not shown yet.

The repeat rule is edited as a plain schedule: daily, weekdays, chosen days, monthly,
every few hours or minutes, or a raw five-field cron. The expression stays the API
model. The form, list and schedule card show a sentence from `cronstrue`, with
the expression available on hover; preview lists the next five
runs in the schedule's time zone, which is picked from a searchable list.

History and occurrence cards use stored Space data: dispatch state, observed run
status, error codes with explanations, timings and duration. Opening run details also loads the result from the core. The open card refreshes
both its stored data and result; closing it stops these requests. Result errors
and `fetched_at` remain separate from the worker's stored status and `observed_at`.
Schedule prompts and run results render Markdown with highlighted code and a
separate YAML front matter block, as in Orpheus Web session messages. Editing
uses a lazily loaded CodeMirror field with Markdown/YAML highlighting, undo/redo,
line wrapping and Tab navigation to the next field. It preserves the raw prompt
text. Rendered Markdown is sanitized and remote images render
as links.

## Development

Use Node from `.node-version`, Docker Compose v2, Make, hadolint and Trivy (versions
are pinned in CI). Branding and interface rules are copied from Orpheus Web under
[`branding/`](branding/README.md).

```sh
npm ci
npm run stack:start
# Open http://127.0.0.1:18095
```

The disposable stack builds the pinned Space commit, migrates an isolated Postgres
and serves the production nginx frontend. Orpheus v0.5.0 provides real profile and
template catalogs, using a separate disposable database. No workers, AgentBox
or model credentials are needed. Fixtures contain public test keys only. `npm run stack:stop`
stops the stack and discards its temporary database.

For Vite with hot reload, start that stack and run:

```sh
ORPHEUS_PUBLIC_URL=http://127.0.0.1:5173 npm run stack:start
ORPHEUS_SPACE_UPSTREAM=http://127.0.0.1:18095 npm run dev -- --port 5173
```

Set Space's `ORPHEUS_PUBLIC_URL` to the browser origin when using Vite; writes
require that exact Origin. For a standalone API on port 8010, point the Vite
upstream to `http://127.0.0.1:8010`. Normal dev/integration uses nginx.

`npm run stack:start:saml` starts an isolated HTTPS Keycloak preview at
`https://localhost:19443`. The `operator` user is an administrator, while `alice`
and `bob` are ordinary users. All use `fixture-password`. Certificates
are disposable and self-signed. The separate technical-panel test client requires
a role this user does not have. Space access does not grant technical-panel access.

Set `ORPHEUS_SPACE_PATH=../orpheus-space` to build from a local clone's pinned Git
commit. Working-tree changes are excluded for committed contracts. Ports can be
changed with `ORPHEUS_SPACE_WEB_HTTP_PORT`, `ORPHEUS_SPACE_WEB_HTTPS_PORT` and
`ORPHEUS_SPACE_WEB_IDP_PORT`; `test:integration` defaults to 18096/19445/19446 so it
runs beside a started dev stack.

## API contract

`api/upstream.yaml`, `api/upstream.lock.json` and generated `src/api/generated.ts`
are updated together from the Space backend. API types and enum constants come
from this generation. Builds never follow main automatically.

```sh
make api-update REF=<tag-or-commit> FROM=../orpheus-space
make generate-check
npm run api:verify
```

For joint staged review before the backend is committed, an explicit draft is
supported: `make api-update REF=worktree FROM=../orpheus-space`. The lock records
`draft: true`, base commit and checksum; local checks/builds work, but CI provenance
verification refuses this draft. Integration then requires `ORPHEUS_SPACE_PATH`.
After backend review/merge, pin its real commit before opening the frontend PR.

## Authentication and deployment

The browser uses same-origin cookie credentials, never a built-in API key.
Runtime `ORPHEUS_SPACE_UPSTREAM` selects the internal Space origin for nginx's
`/api/`, `/auth/` and `/saml/` proxy. POST/PATCH/DELETE are forwarded and carry
`X-Orpheus-CSRF: 1`; the browser supplies Origin. The browser accesses Orpheus catalogs through Space, which uses its own service key.

Configure auth modes on Space: `anonymous` for local development, `saml` for
browser SSO or `api_only` to disable browser access. Space has its own Keycloak
client, cookie and auth storage. 401 prompts sign-in; 503 preserves access state
and permits retry. Local logout does not end the Keycloak/core session.
The frontend contains only the Schedules section and needs no section feature flag.

Profile and template fields offer keyboard-accessible search by name or description,
mark creation defaults and show the selected description below the field. Defaults
are applied once for new schedules; later catalog refreshes preserve the user's choice.
Editing keeps stored names, including removed choices. Catalog failures do not block
local edits or selecting from the last loaded catalog. Unchanged selections are
omitted from PATCH, and switching profiles keeps an explicit model override.
The model placeholder shows the selected profile's model without saving it as an
override. Schedule cards show stored names with optional description tooltips;
unavailable catalogs do not block the card or history.

New schedules take the UI timezone at creation. Existing schedules keep their
stored timezone; changing the header's timezone changes only date display.
Preview always labels and uses the task timezone.
The owner email of a new schedule is prefilled from the signed-in user's SAML
email. Ordinary users see a read-only owner field; editing omits the owner from
PATCH. Users with `can_manage_all` can assign or clear it to create a shared
schedule. Direct editor URLs check the server's permissions and return to the
card/list when access is denied. A 403 `schedule_forbidden` produces a local
notification and preserves browsing; 401 and CSRF errors retain the global
access handling. Opening an editor or receiving `schedule_forbidden` refreshes
session permissions without reloading the page. If an administrator loses full
access while creating a schedule, the draft is kept and its owner switches to
the current user. The server enforces every restriction independently of the UI.
Additional ENV choices are hidden when the allowlist has no names beyond the
base list. Previously selected names that are no longer allowed remain visible
so the user can remove them.

## Checks and releases

- `make check`: generated contract, OpenAPI/Docker/frontend lint, tool/unit tests,
  unused dependencies, vulnerabilities and production build.
- `make test-e2e`: browser fixtures, editing, history, automatic run results and themes.
- `make test-integration`: real nginx + Space + Postgres, anonymous and SAML CRUD,
  CSRF/logout, separate Keycloak client access, real Orpheus catalogs and editing
  with Orpheus offline.
- `make docker-build`: production image. Static assets build on BUILDPLATFORM;
  nginx runs as an unprivileged user and exposes `/healthz` on 8080.

CI runs all checks before publishing a `v*.*.*` tag to
`retailcrm/orpheus-space-web` for linux/amd64 and linux/arm64. Publishing uses
`vars.DOCKERHUB_USERNAME` and `secrets.DOCKERHUB_TOKEN`.

The audit temporarily allows [GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm)
only on the three Tailwind 3 dependency paths listed in `audit-ci.json`, until
2026-11-03. The affected `braces` package has no patched release. These build tools
receive checked-in glob patterns from `tailwind.config.ts`, not schedule text or
browser input, and are absent from the static nginx runtime. Production dependencies
are audited separately without exceptions. New advisories, other dependency paths
and expired exceptions still fail the audit. Remove the exception when a fixed
dependency is available or Tailwind is upgraded.
