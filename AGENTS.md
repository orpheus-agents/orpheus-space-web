# AGENTS.md

Read [README.md](README.md).

## General rules
* Do not preserve backward compatibility.
* Choose the simplest implementation that fully meets the current requirements.
* Prefer established, well-maintained libraries over custom implementations.
* Fix the cause, not the symptom.
* Suggest best practices, even if they may require refactoring.

## Implementation
* Always include a complete set of tests covering the implementation.
* Follow a spec-first approach for API work: specification, type generation, then implementation.
* Always use generated types and enum constants for frontend API data when available. Do not redeclare API types manually or compare enum fields with string literals.
* If the frontend and backend disagree on the API contract, fix the source of the mismatch in the specification, generation or backend, along with the corresponding tests. Do not add frontend normalization, fallbacks or defensive compatibility for incorrect responses from a backend we control.

### Documentation
* Review and update documentation to reflect the current code.

### Frontend
* Stack: Vite, TypeScript, Vue 3, Tailwind CSS and Vue Router.
* Keep SFC components compact (aim for no more than approximately 150 lines). Split larger screens into presentational components under `src/components/` and views under `src/views/`.
* Put state and network requests in composables under `src/composables/`. Each composable owns its refs and returns a narrowly typed object; UI components consume it without knowing its implementation details.
* Use `usePolling` for polling and all recurring requests: an `AbortController` for each tick, pause while `document.hidden`, and exponential backoff on errors. Do not use bare `setInterval` calls.
* Route exclusively through `vue-router`. Custom `pushState`/`popstate` handling is prohibited. Configure `scrollBehavior` and `document.title` in `src/router/index.ts`.
* Format `document.title` as reverse breadcrumbs from the current page to the root: `Subchild / Child / Orpheus Space`. Do not repeat those breadcrumbs in the page body unless specifically requested.
* Design rules live in `branding/interface.md` and `branding/colors.md`; follow them instead of restating them here. Colours and surfaces come only from the semantic Tailwind tokens defined in `src/styles/main.css` (CSS variables for both themes); do not hardcode classes such as `bg-white` or `text-amber-800`. Reuse the classes in `src/styles/main.css` (`section-title`, `panel-title`, `brand-lockup`, `caps`, `button`, `field`, `data-table`, `marker`, `console`, `frontmatter`, `prose-output`) instead of restyling elements in templates.
* Format timestamps and durations through `src/format/`: `formatDate`, `formatDuration` and `formatRelativeTime`. Render relative times with `<RelativeTime>`, which updates itself, and stored states with `<StatusBadge>`, `<OccurrenceStatus>` and `<ErrorCode>` (dictionaries in `src/occurrence/outcome.ts`).
* Report slow or failed actions with toasts (`useToasts().push`), not persistent banners; a 422 additionally maps `details[].path` to `<FieldError>` under the field (`useScheduleEditor`). Show polling connection failures through the “Reconnecting…” indicator in `<RefreshStatus>` in the page header; history uses the indicator in `<HistoryPanel>`.
* Use `<EmptyState>` for empty states and `<PageState>`/`<SkeletonBlock>` for loading states.
* Sanitize every `v-html` value with DOMPurify. Disable `vue/no-v-html` only for the specific file, with a comment explaining the sanitization.
* Render Markdown through `src/render/markdown.ts` (highlight.js and DOMPurify). Load heavy renderers, languages and `cronstrue` lazily with dynamic imports. Cron editing goes through `src/cron/` (`parse`, `build`, `describe`) and `<CronBuilder>`; the five-field expression stays the form model.
* The API client in `src/api/client.ts` must always accept an `AbortSignal` and pass it to `fetch`, allowing obsolete requests to be cancelled on the next tick.
* **Always** use i18n (`vue-i18n`) for user-visible strings. Do not hardcode template text nodes or `title`/`placeholder`/`aria-label`/`alt` values. Keep matching key structures in `src/i18n/locales/{en,ru}.json`; use small helper components (such as `<RelativeTime>` and `<FieldError>`) for compound text instead of assembling strings in templates.
* Escape `@` in vue-i18n messages as `{'@'}` (for example, `name{'@'}company.com`) so it is not interpreted as linked-message syntax.
* Use i18n pluralization (`t('key', count)`) for text containing counts and inflected words, instead of composing strings manually. Russian forms use `ruPluralRule` in `src/i18n/index.ts` (three forms: 1 / 2–4 / 5 and above).
* `src/i18n/i18n.test.ts` checks en/ru key parity, correct `@` compilation, coverage of all `$t(...)`/`t(...)` keys in en.json, dictionaries for every generated enum value (`status`, `sessionMode`, `occurrence`, `runStatus`, `errorCode`, `cron.kind`), absence of hardcoded text in `.vue` templates, and Russian pluralization. Do not disable these checks or add files to `ALLOWLIST_PATHS` without justification.
* Place tests next to their implementation (`*.test.ts`). Use `@vue/test-utils` for UI tests; for asynchronous timers, use `vi.useFakeTimers()` and `await vi.advanceTimersByTimeAsync(...)`, not `setTimeout` wrappers. After every `router.replace`/`router.push` in a test, call `await flushPromises()`.
* Before handing off work, run `make check`: generated API checks, OpenAPI/Docker/frontend lint, script and unit tests, knip, vulnerability checks and production build. Run the browser and integration suites when affected by the change.

### Containers and releases
* Keep Dockerfiles and nginx runtime configuration under `.docker/app/prod/`, and disposable development/integration fixtures under `.docker/dev/`.
* Tags `v*.*.*` publish the versioned Docker Hub image only after checks pass. Build static assets on `BUILDPLATFORM`; the runtime image supports both `linux/amd64` and `linux/arm64`.
* Keep vulnerability and unused-dependency checks mandatory. Explain and scope any scanner exception; do not silence findings just to make CI pass.
