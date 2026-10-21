# QA Windows native job ownership implementation plan

> Use the executing-plans skill in this isolated worktree, with Root review after
> each batch. No delegation or native/browser/service execution is authorized by
> this plan; Root owns the explicit resource windows and final integration.

**Goal:** execute the existing Admin/Kids QA scenarios with reliable native
ownership and Node browser automation, preserving product assertions and memory.

**Architecture:** one exclusive named Local job per owned role, assigned to its
exact gated creator before claim; consumers reopen QUERY-only and validate native
PID/FILETIME/membership. Shared native handles replace racy per-process CIM
metadata for browser, Next and retained-base discovery/working set. The current
gate/stop/ACK/handoff/latch protocols and product runtime remain intact.

**Tech stack:** Windows Job Objects/SafeHandles, PowerShell7.5+, Node24 browser,
existing Bun.build(target=node) for QA-only TS compilation, installed Chrome155,
Playwright1.60. Bun remains the SUT services runtime.

**Spec:** cache windows-job-integration-design-r1/DESIGN.md, refined by Root's
actual phase1 PASS and Node+Job actual PASS (2026-10-21 05:44:42-44Z). Those prove
only the OS/browser primitives, not the full lesson flow or a unique Bun cause.

## Constraints

- No product, curriculum, authorizations, Docker image, runtime/profile, provider,
  backend, UI, dependency lock or production fingerprint changes.
- Whole admission2688MiB, heap768, shared Next+Browser2048, browser1024,
  base-growth128, reserve512, rounding128; sampled500ms, existing deadlines.
- Zero job/UI flags; no breakaway, kill-on-close, PID/name process sweep or
  process-CIM fallback. Unknown remains NEG. Native creator identity is exact.
- New .cs is explicit in cache copy/source pins/preflight; current filters may
  not include C#. No assumption that a product source fingerprint covers it.
- A primitive takes owned launch/state inputs; product roles/grants are not
  encoded or broadened. The same primitive may supervise a hosted JS .mjs runner.
- Historical receipts/caches stay immutable. Only one current ownership contract;
  do not preserve a second executable CIM owner path or add profile flags.

## Batch 1: native primitive and current identity contract

- [x] Add windows/python-lesson-windows-job.cs using the reviewed native helper;
  exclusive Local name/current-user DACL, QUERY-only open, bounded complete list,
  creator-bound assignment, exact SafeHandle FILETIME/WS and exit proof.
- [x] Add windows/python-lesson-windows-job.ps1 for pinned initialization,
  role-neutral CreateNoWindow/cleared-env launch construction, root/state identity,
  query contexts, native sampled reconciliation and disposal. Import is inert.
- [x] Add focused inert real-caller controls and a single Plan-default native
  overlapping named-handoff/lifetime/QUERY-only control for Root execution later. No native
  job or process fixture is started by implementation checks.
- [x] Compile-only C#, parser/focused inert checks; report paths/diff to Root.

## Batch 2a: existing hosted JS Pro scenario first

- [ ] Reuse this same native owner for Core's existing .mjs hosted JS Pro leaf;
  no Next/PG dependency, browser1024/reserve512 and native WS observation. Preserve
  normal/emergency result separation, no new product roles or provider grants.
- [ ] Reserve the private Node stdin for exactly Core R2's one-shot provider
  envelope; no competing reader, env/argv/file/log credential transport. See
  the contract below before connecting the existing caller and leaf.

## Batch 2b: connect existing Admin/Kids supervision and Node scenarios

- [ ] Replace process-CIM discovery/ownership in browser-owned/watch and
  memory-watch, including Next/base; preserve locks/latches/ACK/normal stops and
  original primary/unknown failure semantics. No ConHost image exception.
- [ ] Root witness/equality uses native identity plus pinned actual launch shape;
  derived UTC may remain for existing QA DTOs, never CIM precision truncation.
- [ ] Compile the SAME admin/kids TS entrypoints with existing Bun.build target
  node/ESM, with pinned Playwright external path and source/build/dependency
  receipts. No imports/run of actual scenario while compiling. Keep Bun SUT.
- [ ] Update relevant QA controls/docs. Run only focused inert/unit/format/parser
  checks; no broad TSC/build/browser/service. Report for independent Root review.

## Batch 3: fresh operational composition

- [ ] Regenerate new cache controller copies/pins for host/chain/Next; Start uses
  same native creator-before-claim and Stop uses QUERY/native proof plus existing
  listener checks. Explicit .cs/.ps1/source/Node artifact pins and pointer checks.
- [ ] Root reviews and executes the one native named-query lifecycle proof in a
  granted small window, then one existing Admin->Kids scenario. No implicit Start.
- [ ] Accept only real functional and cleanup evidence. A missing named job is
  never empty proof; a consumer must capture the still-live expected root or
  retain a previously validated context. No force result becomes normal PASS.

## Current status

Batch1 is implemented on the isolated Root8c0bb250-based branch. Fresh inert
contract14, C# compile-only, parser4 and named-control Plan passed; no native
job/process fixture was started by the preparer. Root's actual named lifecycle
was NEG after2 checks, with cleanup true. Root's subsequent EMPTY-job diagnosis
confirmed second CreateNamedJob/5 while QUERY4 succeeded; zero processes and all
handles closed. The old mask-based sources/NEG remain in commit464792077 and the
immutable diagnosis. Candidate correction uses current-SID SDDL GA, preserves
QUERY4 and exact collision183 refusal. Root renewed actual proof passed those
3 checks, then failed OpenJobQuery/2 after all job handles closed. Its original
NEG/cleanup-null remains unchanged. The next proof retains a QUERY anchor while
closing the creator, opens/confirms a successor QUERY consumer, and only then
closes the anchor; it never depends on name reopen after last-handle close.
Root's actual overlapping-handoff proof passed7 checks at06:21:28.051–28.705Z:
QUERY binding, Assign denied5, collision183, live successor before/after anchor
close, normal fixture exit0 and final empty-job/handle cleanup. Receipt
f25d211babcc897d2d0a8b839bbeea1e535ee00ed468b6083ba2a414cab4a402;
Flags/UI0, operatorForceUsed=false. Root independently confirmed root41916 and
its direct children absent at06:21:36Z. Window closed. Earlier NEG receipts are
not requalified. Batch2a hosted JS Pro is authorized for isolated implementation;
execution still requires Root review and a new window. Admin/Kids remains later.
The repository's agent-runtime native launcher was inspected: it uses suspended
launch, hard limits/KILL_ON_JOB_CLOSE and stdin revocation for a different
product contract. Reuse its existing Bun.build Node pattern, not those conflicting
termination/resource semantics or a dependency from QA into product runtime.

## Reserved Node stdin contract for Core R2

Core's `pro-legacy-staging-ui-owned-r2/provider-context.mjs` already defines one
envelope <=32768 UTF8 bytes including newline, private stdin+EOF, attemptId UUID,
version1, expiresAt, identityPath and closed env keys. The leaf calls
receiveRailwayProvider(process.stdin,{attemptId}) exactly once after native claim,
keeps its capability in closure and passes it to runOwnedScenario with the owner
browser/signal/requestStop/binding. It never mutates Node/Chrome process.env.
Core's existing10s read bound, one-shot capability and expiry checks stay intact.

The native Node launch must redirect stdin privately. The owner must not use
stdin for commands, completion, ACK, diagnostics or a second JSON reader. Existing
claim/stop/ACK remain their own files. No token/key/config goes in job.json,
binding, env Node, argv, transcript or logs; close input after the one envelope.

Interface impedance to resolve in batch2a: sendToChild requires a Node ChildProcess;
the native owner creates its Node through ProcessStartInfo (a .NET Process).
Use the existing trusted Node caller's private pipe to its own PowerShell owner,
then an opaque bounded relay to the assigned Node's redirected StandardInput.
sendToChild can target that caller-created owner ChildProcess; only the final
Node leaf parses/validates the envelope. The PS relay must not log/parse/persist
body, must close EOF and enforce the same32KiB/10s bounds. No named broker or
credential file is introduced. Confirm this small interface with Core before
implementation; it is a transport composition, not a second ownership mechanism.

Primary basis for the DACL candidate: [SDDL GA](https://learn.microsoft.com/en-us/windows/win32/secauthz/ace-strings),
[generic access mapping](https://learn.microsoft.com/en-us/windows/win32/secauthz/generic-access-rights),
and [CreateJobObject existing ALL-access open](https://learn.microsoft.com/en-us/windows/win32/api/jobapi2/nf-jobapi2-createjobobjectw).
No alternate numeric ALL mask is asserted or invented.

## Handle lifetime and owner custody

Microsoft's [Job Objects](https://learn.microsoft.com/en-us/windows/win32/procthread/job-objects)
distinguishes closing handles from job destruction after associated processes
exit. That lifecycle is not a promise that the name remains reopenable after the
last handle closes; the actual second proof observed OpenJobQuery/2 in that gap.
Use explicit overlapping handle custody instead of that disproved assumption.

The hosted Pro PowerShell owner remains running and keeps its original creator
job handle through the Node/Chrome lifetime, observations, normal drain and
possible creator-bound emergency teardown. Publishing job.json does not transfer
custody. A QUERY consumer must open and confirm the same live native root while
that owner/previous anchor still holds a handle; only then may the previous
anchor close. A long-lived role must retain a watcher/anchor until all consumers
have finished or the next confirmed custodian has taken over. A launcher cannot
return and dispose its last job handle expecting a later stop controller to
reopen the name. Admin/Kids/Next/base connection remains batch2b, not implemented.


## Batch2a adapter contract (implementation, not an execution receipt)

Files: `python-lesson-native-browser-owner.ps1`, `-common.ps1`, `-worker.mjs`
under the existing Kids QA Windows directory, plus the Admin inert control.
The primitive launch helper adds only optional RedirectInput (default false).
The generic owner has Plan-default/Verify/Run, requires an exact SHA-pinned
version1 `hosted-js-pro-node-job` plan, and pins its actual C#/PS/worker bytes,
Node/Chrome, Playwright/provider/scenario imports, dependencies and fresh binding.
Core assembles the operational packet/binding from real per-service metadata.
No R1/FACE provider context is an execution authority.

Core's Node caller retains the owner ChildProcess through actual close, sends
its one capability to private stdin, drains classified/closed output and retains
all provider-refresh CLI handles in its existing registry outside the browser
Job. The PS owner reads opaque32KiB/10s, creates the Node root with NoWindow,
heap768, cleared environment/owned AppData, assigns before claim and samples
before launch permission. Only the final Node parses the provider envelope.
Chrome uses the reviewed normal sandbox path and12s launch; no protection flags.
The unchanged Core scenario owns its300s functional criteria and account/cloud
retention receipt; browser close belongs to the adapter.

The owner samples native WS every500ms, browser tree<=1024MiB and OS free>=512MiB;
preflight requires1536MiB free. These are sampled admission/monitoring thresholds,
not kernel memory caps. Work ends at330s, cooperative normal drain continues to355,
emergency deallocation may use only the original creator-bound Job after failure,
and reconciliation ends by360s/windowEnd. Force always means NEG/normalCleanup=false.
An independent caller must supervise its retained owner process/pipe EOF; owner
receipt is not proof of the caller's own exit. No operational window is granted
by this plan.

Completion ACK accepts only matching nonce/PID/schema after native ownership
observation, including functional NEG receipts so normal cleanup can finish.
It does not assert cleanup. Final functional PASS additionally requires root
native exit0, Core passed+SSHclosed, browser.close completed, closed streams and
no observed Playwright force marker. Native unknown remains sticky. Drain audits
native membership separately from budget assertions and rechecks immediately
before emergency; a prior memory refusal cannot cause stale forced teardown of
an already empty Job. Missing job never becomes empty proof. Primary failure,
functional result, normal cleanup and resource release remain separate.

Output is closed marker counts/native operation+code; no error message, stack,
line body, CLI, envelope or credential is persisted. The4096-character line
classification check happens after ReadLineAsync; it is not a hard allocation cap.
Playwright internals are not exhaustively attested by public marker observation.
Admin/Kids/Next/base still use their prior code until the separate batch2b.
