# Successful staging baseline implementation plan

> **For agentic workers:** Use the executing-plans workflow task by task. Root explicitly authorized this isolated correction and approved the bootstrap/epoch direction. Keep the existing deployment observer independent.

**Goal:** Include changes omitted by failed staging deployments without treating a partial old deployment as a coherent release.

**Architecture:** A dependency-free Node resolver runs after full-history checkout and before any provider step. Pushes resolve a successful ancestral CI/deployment baseline after a Git-derived policy epoch, or use the explicitly reviewed bootstrap. Dispatch inputs pass through unchanged. Root supplies the real bootstrap only after reconciliation.

**Tech stack:** Node built-ins, Git read operations, GitHub REST, existing Bun tests and workflow.

**Spec:** Root approvals in this session, 21 October 2026; causal evidence in `.cache/authoring-selector-backlog-r1/`.

## Constraints and evidence

- Work only in `sistema-zero-python-review`, preserving its commits. No Root/staging edits, push, CI actions, provider calls, deployment, browser, build or local TSC.
- Keep dispatch `all`, CSV and `auto` plus `before_sha` semantics. Do not increase timeouts or skip existing gates.
- Resolve and validate the baseline before setup-railway, SSH, plan or apply. GitHub API or malformed/incomplete response failures must stop the job there.
- `6d285f03` is a deployed-Hub reference for backlog analysis, not a verified globally coherent bootstrap.
- The actual immutable FACE selector probe selects 18 services for `6d285f03..FACE`, because `bun.lock` invokes `add_all`. The recent `843048..FACE` projection selects Members/Admin/Kids and adds Auth through the canonical wrapper: four, with actual CI selection still awaiting logs.
- Original causal test result: two controls pass and two backlog protections fail. Original negative log remains unchanged.
- FACE CI plus its deployment of four services alone cannot establish coherence. Root's bootstrap must bind its exact run/attempt/job, the reconciliation receipt for the other services and readiness records for all configured service IDs.

## Design decision

Use an explicit reviewed bootstrap and a separate epoch file introduced with the policy. Derive the epoch's introducing commit through Git history, avoiding a commit SHA embedded in itself. Eligible later baselines must descend from that epoch and be ancestors of the current checkout. Exclude the current run and all dispatch runs.

Reject the alternatives of blindly choosing any green historical workflow, falling back to `event.before`, or deploying everything on every push. They respectively admit partial historical releases, reproduce the defect, or change the requested selection contract.

The bootstrap is a reviewed attestation of external reconciliation, not proof invented by the resolver. Its CI identity is verified through GitHub; its service coverage, IDs, readiness and receipt hashes are validated locally. The helper never queries providers or claims to reverify their live state.

## Task 1: resolver and isolated tests

**Files:**

- Add `scripts/ci/staging-deploy-baseline.mjs` for validation and baseline resolution.
- Add `.github/staging-deploy-epoch-v1.json` with protocol version 1 in the workflow activation commit, after the helper commit.
- Add `scripts/ci/staging-deploy-baseline.test.ts` using existing Bun tests and injected GitHub/Git boundaries.
- Do not create a production bootstrap with example or unverified values.

**Interfaces:**

- `configuredServiceIds(workflowText, env)` reads the existing fixed SVC_ID map and the three configured optional IDs.
- `resolveBefore(context, dependencies)` returns `{ before, source, runId, attempt, jobId, activationSha }` for a push, or preserves the dispatch input before value without GitHub calls.
- Dependencies supply paginated workflow runs, a run record, exact-attempt jobs and Git ancestry. The runtime adapter uses only GitHub REST and read-only Git.

**Bootstrap contract:** version, reconciled head SHA, exact CI run/attempt/deploy job, CI-service and extra-service partitions with receipt hashes, and a readiness receipt containing every configured name/service/deployment ID at the reconciled head. Root authors actual values after reconciliation; absence is an intentional refusal.

Steps:

- [x] Write negative tests for absent/invalid bootstrap, coverage holes, wrong IDs, missing receipts, failed API and malformed pagination.
- [x] Cover historical partial success before epoch, current run, dispatch, non-ancestral heads, failed/skipped/missing/duplicate jobs and attempt mismatches.
- [x] Cover pagination to a valid candidate and successful bootstrap fallback after an exhausted valid history.
- [x] Cover dispatch passthrough with no bootstrap/GitHub/Git access.
- [x] Implement the resolver and runtime adapter; run `bun test ./scripts/ci/staging-deploy-baseline.test.ts`.
- [x] Add a temporary-Git integration check that derives the epoch introduction without a self-referential SHA.
- [x] Run focused Biome and `git diff --check`, obtain independent review, commit only the small isolated lot (`3454f0fa0`, epoch intentionally deferred to activation).

## Task 2: workflow integration after helper review

**File:** `.github/workflows/ci.yml`.

Steps:

- [x] Compare the own-worktree workflow against immutable FACE before editing to avoid importing unrelated Root changes.
- [x] Add a baseline resolver step immediately after full-history checkout and before provider setup.
- [x] Give that step GitHub actions-read access; do not expose or print credentials.
- [x] Emit a single JSON selector output. The existing deployment step consumes its `before` value with no push fallback to `event.before`.
- [x] Keep the dispatch branch, ancestry validation, canonical wrapper, timeouts and selection cases intact.
- [x] Add source-contract tests proving the resolver precedes every provider step, has no unsafe fallback, and dispatch behavior remains unchanged.
- [ ] Re-run only focused tests/checks, obtain independent review, commit the workflow delta separately.

## Task 3: handoff and bootstrap admission

- [ ] Deliver commit IDs, test outputs, byte hashes and the bootstrap schema to Root.
- [ ] State explicitly that no final bootstrap values or activation on staging were performed here.
- [ ] Root separately reconciles the actual missing services and verifies all 18 IDs before publishing its bootstrap.
- [ ] Preserve current FACE deployment and all previous negative/partial receipts. Observation remains read-only and reports actual selection, execution and release separately.

## Verification checkpoint

Fresh focused run: 70 tests, 157 assertions, zero failures (2.52 seconds). Biome six
files clean; Node syntax and Git whitespace checks passed. Independent limited
review found missing job run identity, now closed with four negatives plus the
wrong-workflow negative. Their initial 47-pass/5-fail log is preserved, as are the
original selector RED and prior receipts. Actual Git/Bash synthetic-history control
proves last-push range selects only Admin while the resolved range retains exactly
all 18 configured services; manual all/CSV/auto controls pass.

Read-only review also covered the bootstrap/epoch, pagination and final Link/date
validation changes. No real bootstrap, provider action, staging activation or full
production acceptance follows from these tests.
