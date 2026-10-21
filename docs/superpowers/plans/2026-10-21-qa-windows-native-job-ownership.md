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
actual phase1 PASS and Node+Job actual PASS (2026-10-21 05:44:42–44Z). Those prove
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
  named-reopen/lifetime/QUERY-only control for Root execution later. No native
  job or process fixture is started by implementation checks.
- [x] Compile-only C#, parser/focused inert checks; report paths/diff to Root.

## Batch 2: connect existing supervision and Node scenarios

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
  granted small window, then one existing Admin→Kids scenario. No implicit Start.
- [ ] Accept only real functional and cleanup evidence. A missing named job is
  never empty proof; a consumer must capture the still-live expected root or
  retain a previously validated context. No force result becomes normal PASS.

## Current status

Batch1 is implemented on the isolated Root8c0bb250-based branch. Fresh inert
contract14, C# compile-only, parser4 and named-control Plan passed; no native
job/process fixture was started. The actual named lifecycle control remains
unexecuted and awaits Root review/window. Batch2 has not started.
The repository's agent-runtime native launcher was inspected: it uses suspended
launch, hard limits/KILL_ON_JOB_CLOSE and stdin revocation for a different
product contract. Reuse its existing Bun.build Node pattern, not those conflicting
termination/resource semantics or a dependency from QA into product runtime.
