---
id: '001'
title: Eager editor dependencies and fragmented shared modules exceed JavaScript loading budgets
status: resolved
severity: medium
file: packages/studio/src/state/persistence.ts
line: 465
---

The existing `initialBundleBudget.test.ts` fails on the reconciled sources. The project list initially loads 15 JavaScript files (limit 10) and 354563 raw bytes (limit 350000); gzip is 118924 bytes (limit 120000). Editor route and mode file counts also exceed their unchanged limits. The full Studio suite reproduced the initial failure, and an isolated production Vite build confirmed it with module metadata in `.cache/studio-python-l0/staging-initial-bundle-review-before-1.json`.

Two demonstrated eager boundaries are `sanitizeProjectAssets` imported by persistence even though asset loading is asynchronous, and `buildProProject` imported by the metadata-only template list even though creation is asynchronous. The first correction loads those implementations at their actual use sites. The next isolated measurement reduced the initial graph to 8 files, 344204 raw bytes and 113895 gzip bytes, without changing any budget. Focused behavior tests passed (86 cases/665 assertions, including the separate 70 persistence cases).

That first correction alone was not sufficient: after that change the route still has 30 files, Blocks 26, Bridge 27 and Code 29. These are file-budget failures; the measured byte budgets of those paths remain within their limits. The remaining graph includes producer/report schemas through the Python preview reference facade and fragmented editor document leaves. Inspect and reduce actual dependencies before considering coherent editor-only grouping. Do not bring asset factories back into the initial graph, duplicate canonical schemas, weaken preview validation, raise limits or treat chunk regrouping alone as proof of reduced code.

The reference-only leaf must preserve the same route, strict schema and synchronous verifier, with facade reexports preserving bindings and all project/revision/runtime/origin/lifetime checks. Revalidate golden accepted/rejected values, focused preview consumers, the complete loading-budget test, relevant types and the Studio suite. These build metrics do not establish interactive latency, mobile qualification or overall Python performance approval.

Remediation now passes the complete existing bundle gate (1 test/27 assertions): initial 8 files/343569 raw/113693 gzip, route 19, Blocks 18, Bridge 19 and Code 18, all original limits unchanged. Canonical identity and preview-reference leaves preserve 28 identity and 56 reference/scope golden vectors and facade binding identity. The editor-only group contains small document/runtime contracts; its Core Zod selection is derived from the actual Core dependency, with exactly the same 23 module IDs as before and none in the initial graph. No Python VM, producer, SDK or loader was added to that group. Small metadata added to Blocks/Bridge is explicit and measured (+114/+39 raw bytes relative to the first grouping, with gzip reduced). Three existing production Vite browser scenarios passed, including Bridge source persistence and Pro file creation. Independent source review found no concrete regression. The final snapshot types, full suite and checkpoint gates have now been collected successfully.


## Intermediate checkpoint verification — 2026-10-18

Resolved after the focused causal/source proofs, independent review and the current checkpoint gates. Studio 9257, Core 1354, member-shell 1591, Admin 651, runtime 191, language 23, Molda 3411 and Community 8 passed; release/CI contracts passed 33 with four pre-existing Linux-shell cases skipped on Windows. Host types, three language-service type configurations, build, image audit, current image, isolation smoke and all six JavaScript kit playtests/captures passed. Biome CI passed with its recorded existing warnings. The receipt audit also verifies the 24 isolated producers, 255 cases and all 49 source hashes. See [checkpoint review](../_review.md) and the execution state for commands, receipts and limits.

This closes the reproduced issue for the authorized intermediate delivery. It does not declare the complete Python feature, current SDK/export paths, full browser matrix or performance qualified. Those remain in the original implementation and final review.
