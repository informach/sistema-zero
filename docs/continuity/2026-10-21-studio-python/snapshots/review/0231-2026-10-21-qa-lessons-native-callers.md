# QA Lessons: caller inventory and staging alternative

Design only. Batch2b code is on HOLD. No services, browser, native jobs, provider
requests, actors, fixtures, bindings or operational authority were created here.
The hosted JS Pro owner from batch2a remains unchanged.

## Current local callers and handle custody

Historical composition inspected read-only: Root
`.cache/studio-python-l0/lessons-root-face-preparation-r10/`.

| Role | Actual entry / current launcher | Custody required by native contract |
| --- | --- | --- |
| pythonHost | Bun `experiments/studio-python-runtime/server.ts`; cache `host/host-owned.ps1` | Existing launcher must remain alive with original Job until host drain. It currently returns/disposes. |
| chain | Bun `packages/members/tests/e2e/adult-parity-stack.mjs`; cache `operators/windows/windows-owned.ps1` | Same persistent original creator anchor; current launcher returns/disposes. |
| adminNext / kidsNext | Node Next CLI, heap768, ports43107/43108; same cache windows-owned | Warmup must remain an owner after the memory handoff. Current warmup returns at handoff, which cannot end Job custody. |
| adminBrowser / kidsBrowser | Current Bun TS entries via tracked `python-lesson-browser-owned.ps1` and `-browser-watch.ps1` | Persistent browser supervisor owns its original Job until browser drain. Replace Bun browser runner with Node compiled TS; retain native QUERY contexts for the three base/Next Jobs. |

The current root-based CIM ancestry functions are in tracked
`python-lesson-process-ownership.ps1`, `-browser-watch.ps1` and `-memory-watch.ps1`.
The last also measures host+chain base growth and Next+browser shared memory.
Cache controllers contain additional duplicated witness/Stop implementations.
Merely replacing the browser sampler would leave these callers inconsistent.

For a local implementation, role Start must create an exclusive Job, spawn via
CreateNoWindow, record exact native creator before assignment, assign while its
entry remains gated, then publish claim. Its same existing controller stays alive
with the original handle until normal stop and native drain. A separately invoked
Stop requests that retained owner and consumes its bound terminal receipt; it
cannot reconstruct ownership from absent name/PID/port or re-create a Job.

Next warmup retains QUERY handles to host+chain; browser opens and confirms QUERY
handles to host+chain+Next before the existing locked memory handoff. The lock
transfers memory supervision only. Creator anchors remain alive after transfer
and after browser completion until their own role stops. Original controller
failure/missing Job is NEG; neither missing name nor closed ports is empty proof.
Every true custody transfer requires overlapping handles and same native root.

Local scope would therefore be three pieces, each with review:

1. One tracked native role launcher replacing both cache-only controller bodies,
   plus fresh composition copies/pins later; original anchors persist to drain.
2. Browser-owned/watch and memory-watch switch completely to existing native Job
   contexts/WS/FILETIME. Remove current runtime CIM ancestry/ConHost exception,
   preserve lock/NEG latch/ACK/stop order and pure memory budget rules. Obsolete
   ancestry controls must be replaced rather than left as an executable fallback.
3. Compile the same Admin/Kids TS entries to Node ESM using existing Bun.build
   target-node pattern (as in scripts/tui-release/package.ts), pin source closure,
   outputs and real Playwright dependency closure. No product code or assertions
   change. Current admission DTO can retain createdAt derived from native FILETIME
   and argv hash; actual ownership stays in the native reference, not this DTO.

Budgets remain pool2048/browser1024/basegrowth128/OSreserve512, heap768,
whole admission2688 and128 rounding. Test-LessonCompactSample arithmetic stays.
This is a substantial QA ownership integration across six roles and cache glue,
not a one-file sampler fix. No code for it has been written.

## Can the same functional scenarios run against staging instead?

Yes in architecture; the current files are deliberately loopback-only, so this
is not a command-line URL substitution. The concrete constraints are below.

| Current constraint | File / evidence | Minimum staging composition change |
| --- | --- | --- |
| Exact Admin localhost43107 | admin fixture `pythonAdminOrigin`, line69; Admin config calls it | Explicit reviewed staging Admin origin, never arbitrary URL/env fallback. Existing closed local origin can remain for historical local usage. |
| Provider must be HTTP/127.0.0.1 | Admin lines166-168; Kids line134 | Bind the actual HTTPS staging runtime origin and require every decision.frame URL and allowedOrigins to match it exactly. Keep runtime/revision/actor comparisons. |
| Kids origin hardcoded localhost43108 | Kids line63 | Bind exact staging Kids origin from declared deployment, not the adult Community origin. |
| Next-specific admission | admission.ts strict v1/v2/v3 nextTree; both scenarios read it before own launch | Externally supplied browser from the existing native owner; owner proves browser1024/reserve512. Do not invent a fake Next PID/WS/admission for a remote server. Keep old local admission path only if still used. |
| Scenario launches/closes browser internally | Admin221-223, Kids155-157 and existing cleanup helper | Small QA dependency injection of owned Browser/stop signal; reuse the same UI steps, response assertions and cleanup. No second Chrome, no response mocks. Compile these same sources to Node ESM. |
| Local input identifies synthetic actors and probe runtime | R10 admin-input.json uses python-probe/probe-1/manifest0123 and local actor UUIDs | Fresh staging-only actor/ownership evidence and actual advertised runtime selection. Do not copy local UUIDs or infer catalog from a deployed Worker. |

Declared staging URLs are Admin
`https://admin-staging-f8fe.up.railway.app`, Kids
`https://community-kids-staging.up.railway.app` (runtime wrangler declaration),
and runtime `https://sistemazero-studio-runtime-staging.helena-bcc.workers.dev`.
These are source declarations, not fresh observations. Bind exact per-service
deployment/source tuples plus Worker/distribution/catalog evidence before actual
execution; Admin/Kids were not part of the three-service hosted JS leaf binding.

The existing fixture producer already uses real authenticated Admin BFF APIs:
three exclusive POSTs create course/module/empty lesson, then UI authors the
project and publishes. Enrollment reads back that owned tree/published source,
publishes only its own course, creates a one-seat cohort/session, opens it and
enrolls the exact account/learner. It is nonce-scoped, never retries mutations,
and does not seed a fake Studio project. No new fixture API is required.

The actual staging actors remain a concrete pending input: a fresh authorized
admin/superadmin teacher, distinct parent account and owned active learner/profile
must be verified/created exclusively. JS Pro's staff QA actor cannot discover the
Python selector and must not be silently promoted/reused. Local PG reconciliation
does not establish staging actors. A narrowly bound producer can reuse the
existing private provider/SSH transport and current Auth/Members schemas; actor
creation must preserve its exact IDs/partial-write outcome/retention, not alter
real users, global journey/catalog or existing courses. It still requires its
own reviewed implementation and actual evidence.

Distribution a8 and local manifest0123 are different facts. Browser bytes a8 may
already be deployed; the input must select the actual staging-advertised runtime
profile/manifest/release and prove its distribution identity. If that selection
is not advertised/authorized, the scenario stops with a real finding. Do not
change catalog or service policy merely to make this test pass.

## Criteria retained and limits

Remote Admin can retain: actual admin login, empty fixture ownership, real Python
environment/Pro choice, Turtle extension installation, keyboard edit, actual
frame execution/input/pixels/Stop, UI publish/readback/reopen, rehearsal execute
authorization with exact actor/revision/runtime and live seat enrollment.

Remote Kids can retain: real parent login/device/profile, enrolled live workspace
claim, canonical saved Python project, reload/takeover, actual runtime revision,
409 stale-write rejection, second-tab epoch transition/old-frame withdrawal,
Turtle input/pixels and Stop. Exact HTTP denials/console/page-error checks stay.
Admin and Kids should be serial separate owned attempts with existing300s leaf
bounds, not a combined600s owner or an increased timeout.

Mural/public play is not in either current Lessons scenario. Do not report it as
covered by relocating them. A third explicit browser leaf must publish only the
owned QA project through the real BFF/Hub, observe its Mural card, open `/jogar/id`
in a zero-cookie context, check real Python runtime/retained source/Turtle pixels
and Stop, and exercise JS public play as its regression control. Existing real
public-chain plan/implementation can supply those oracles; unit mocks alone do
not qualify storage/Hub/public authorization. Kids Mural/Pro entitlement must be
derived from the exclusive QA actor and ordinary rules, never unlocked globally
or relaxed for this proof. No live call/media/microphone is implied by before-call
workspace coverage; recorded-student lessons also remain separate.

## Recommended next step

After hosted JS Pro actual qualification, prefer the staging route for the first
product proof. It reuses the reviewed browser owner and already deployed runtime,
avoids local Next/PG/host/chain resource contention and does not require native
custody integration for three extra services. Its finite remaining work is QA
origin/runtime binding, an exclusive actor producer, small browser injection and
Node compilation of the same scenarios. Its result is functional staging proof,
not a desktop hardware benchmark or proof of all remote infrastructure internals.

Keep local2b implementation on HOLD unless staging exposes an actual blocker that
requires local reproduction. This inventory is not a Start authorization and
does not claim that remote actor/catalog/CSP/CORS/headers have been validated.
