# Oficinas ao vivo Implementation Plan

> **For agentic workers:** Use `executing-plans` task by task; `writing-plans` recommends delegating independent tasks. Validate each result before integration. The approved proposal is the acceptance contract.

**Goal:** Integrate reusable live workshops, dated cohorts, a supervised classroom and consented Studio assistance into Sistema Zero.

**Architecture:** Members owns access and durable room state. Core exposes framework-free contracts; member-shell owns the classroom and BFF, Kids/Admin provide their existing shells. Cloudflare Realtime transports media; recording and isolated execution are separate services with explicit readiness gates.

**Tech Stack:** Bun, TypeScript, Elysia, PostgreSQL/Drizzle, Next.js/React, native WebRTC, Cloudflare Realtime/R2.

**Spec:** `docs/plans/2026-10-14-aulas-ao-vivo-{design,arquitetura,infraestrutura-e-custos,revisao}.md`.

## Global constraints

- Six to eight children per assigned teacher; browser only, no operating-system control.
- The per-lesson grant starts at the scheduled release and ends exclusively after calendar days in the cohort timezone. Replay publication never renews it.
- Existing recorded learning, identity, palettes, avatar, room and Mural remain the shared experience.
- Teacher editing requires child consent, a durable checkpoint and one writer epoch.
- Private observation never becomes a collective media subscription.
- Capture only the teacher and safe demonstration; no claim of recording before durable receipt.
- No deployment, production migrations or paid resource provisioning in this execution.
- Preserve unrelated marketing/editor proposal work already in the working tree.

## 1. Shared contracts and policy

Files: `packages/core/src/live/{contracts,policy,index}.ts`, `packages/core/tests/live.test.ts`, `packages/core/package.json`.

- [x] Define `LiveProgram`, `LiveCohort`, `LiveSession`, `LiveOccurrence`, `LiveEnrollment`, `LiveRoomView`, `LiveControl`, `LiveWriteGuard` and requests.
- [x] Define `lessonAccess(startsAt, endsAt, now, revoked)` and `addCalendarDays(instant, days, timeZone)` without framework imports.
- [x] Verify inclusive start/exclusive end and DST in core; mute policy and old epochs in Members behavior tests.

```ts
expect(lessonAccess('2026-11-07T17:00:00Z', '2026-12-07T17:00:00Z', new Date('2026-12-07T17:00:00Z'))).toBe('expired')
```

## 2. Members persistence, enrollment and classroom

Files: `members/src/{domain/ports/live-repository.port.ts,application/live/live.service.ts,infrastructure/persistence/drizzle/live.repository.ts,interfaces/http/routes/live.routes.ts}`, schema/composition/server and generated migration.

- [x] Persist programs/templates, immutable cohort lesson snapshots, independent occurrences and per-profile enrollment grants.
- [x] Enforce capacity and duplicate learner constraints transactionally; enroll manually for the pilot.
- [x] Derive account/profile identity from authenticated headers; require teacher assignment for conduction.
- [x] Implement classroom admission, device takeover, teacher heartbeat, hands/help, chat and versioned controls.
- [x] Verify family isolation, pre-release/expiry, two simultaneous seats, stale commands, reconnect and supervision in unit/integration tests.
- [x] Generate additive migrations 0102–0106 with the repository script; inspect SQL and journal, never apply to production.

```ts
await expect(service.join(otherLearner, sessionId, request)).rejects.toThrow()
await expect(service.control(unassignedTeacher, sessionId, command)).rejects.toThrow()
```

## 3. Authenticated UI and navigation

Files: `member-shell/src/{components/live,lib/live,routes/live.ts}`, Kids `/oficinas`, `/pais/oficinas`, admin `/admin/oficinas`, `/admin/professor/ao-vivo`, navigation and gateway route rules.

- [x] Implement reusable catalog, schedules, preflight, classroom and teacher dashboard against the contracts.
- [x] Reuse existing fonts/tokens/components and focus companions; keep five mobile tabs.
- [x] Implement materials/chat panels, hand/help, microphone/camera controls with server-authorized behavior and clear network state.
- [x] Add authoring/cohort scheduling/enrollment and replay review screens; retain historical occurrences.
- [x] Test route policy, access states and shared learning components; typecheck affected packages. Full rendered classroom inspection remains in the browser checklist below.

## 4. Media and recording transport

Files: `members/src/infrastructure/live`, `member-shell/src/lib/live`, recorder and supervisor packages/configuration.

- [x] Implement server-only Cloudflare credentials, authorized publication/subscription and complete serialized SDP exchange.
- [x] Close retired generations and reject uncertain or partial successful operations; rebuild missing tracks.
- [x] Validate System Zero tab capture; support local camera preview/effects without silently exposing raw images.
- [x] Implement selective recorder lifecycle, progressive private storage and publication review; cap playback URLs by current grants.
- [x] Exercise transport failures with deterministic tests and document the separate real-provider rehearsal.

## 5. Studio assistance and shared project

Files: Studio public types/core/preview, Members live workspace service and Creations guards/retention, member-shell live editor adapter.

- [x] Add observer mode, flush/checkpoint acknowledgement and silent observed revision application.
- [x] Implement consent, lease/epoch checks, revocation/device takeover and final acknowledgement on return.
- [x] Render labeled teacher cursor and semantic guidance with revision checks.
- [x] Retain self-contained snapshots/assets and enforce the same write guard through Criar aliases.
- [x] Isolate execution from classroom controls; keep observation non-running.
- [x] Reuse the normal explicit child Mural publication pipeline.

## 6. Verification and operational handoff

- [x] Run focused behavior tests, package typechecks/checks and regression tests required by package instructions; record skips and the isolated rerun of Studio timing failures below.
- [x] Review migrations, authorization boundaries, retention, credentials and untrusted project execution.
- [ ] Compare rendered Kids/Admin screens with existing lessons, including mobile and keyboard/focus behavior.
- [x] Document exact configuration and measured versus untested capabilities. Keep rollout disabled where provider/recorder/isolation requirements are not validated.
- [x] Update this checklist only with fresh evidence. Do not describe partial implementation as a finished classroom.

## Execution log

- 2026-10-14: read reviewed specs and relevant package rules; verified pre-existing modifications; consulted current Drizzle and Elysia documentation through Context7. No application implementation existed at start.
- Added versioned live learning steps, reused existing activity renderers/evaluators and independent session/profile progress. Teacher rehearsal cannot persist child answers. Unchanged plans and workspace snapshots are omitted from polling responses.
- Full Members suite: **1,415 pass, 49 skip, 0 fail**, 10,467 assertions. Auth: **240 pass, 29 skip, 0 fail**. Hub: **158 pass, 0 fail**.
- Full Studio run: **8,768 pass and 3 timing failures** under concurrent checks. Isolated rerun of all affected runtime files: **43 pass, 0 fail**. Focused observation/persistence/cover/share regression: 98 pass; additional isolation suite plus observation: 6 pass, 22 assertions. Studio typecheck passed after the final isolation-test correction.
- Core access policy: 3 pass, 10 assertions. Preview BFF: 4 pass, 15 assertions. Workspace unit suite: 11 pass, 46 assertions. PostgreSQL tests cover concurrent claims/revisions, checkpoint retention, learning, publication and account erasure.
- Media verification: **24 pass**, 82 assertions, including PostgreSQL command fencing, Chromium WebRTC, MediaRecorder segments and FFmpeg MP4. Recorder and supervisor typechecks passed. R2/SFU/supervisor integration in these tests uses controlled adapters, not production infrastructure.
- Baseline production Admin build passed (58 pages), along with Kids/Admin/member-shell/Gateway typechecks.
- Final Members typecheck passed after scene checkpoint correction; the final focused HTTP/learning/PostgreSQL run passed 18 tests. Shared recorded/live learning UI regressions passed **86 tests, 523 assertions**. BFF/cache/expiry tests passed 12 tests. Final UI Biome check passed for 21 files.
- Final integration review corrected browser requests to use the existing document-session proof. BFF/client verification now passes **13 tests, 49 assertions**, including a real session-wrapper test. The live learning adapter rerun passed 2 tests. Final member-shell/Kids/Admin/Gateway typechecks passed.
- Production camera runtime rehearsal used actual Turbopack chunks and exported production Kids/Admin response policies. It found and fixed classic-worker versus module-loader selection in MediaPipe. Both policies processed frames; removing WASM permission from the worker response blocked processing. No CSP permissions were expanded. This is a media runtime test, not visual validation of the application.
- **Final production Admin build passed**, including Turbopack, TypeScript, generation of **58/58 pages** and finalization. Fresh member-shell and Kids typechecks passed against the session-fetch correction. The media fetch dependency now describes the callable browser contract instead of requiring Bun's extra `preconnect` member; its 4 tests/10 assertions passed. No verification processes remain pending.
- Visual validation could not run: authorized browser reported no available browser. No deployment, paid provisioning or production migration was performed. `LIVE_MEDIA_READY` remains false by default. See [operational handoff](../../plans/2026-10-14-aulas-ao-vivo-implementacao.md).
