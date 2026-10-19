---
id: '001'
title: Submission viewer mock leaks into authoring tests across discovery orders
status: resolved
severity: medium
file: packages/admin/tests/studio-submission-viewer.test.tsx
line: 11
---

CI39163502111 on ac85a7a failed all four authoring UI scenarios at their first readiness checks. The preceding submission viewer suite globally replaced StudioEmbed through its alias and never withdrew that mock. Its double does not call the embed loader or install the editor handle. The actual authorship runtime checks were never reached.

Causal proof on the same Windows/Bun1.3.11 toolchain: authoring alone passes4 cases/34 assertions; a cache orchestrator importing Viewer before Authoring reproduces3 passes/4 failures at the same four readiness checks. This is test module contamination, not evidence of a Linux production-path or authorization failure. Neither polling deadlines nor assertions were changed.

Remediation isolates the producing Viewer suite in a child process. Its original three cases, four mocks, assertions and per-case deadlines are preserved byte for byte except two relative module paths rebased into tests/fixtures. The wrapper verifies child exit0, positive case count and0fail; it drains both pipes, bounds process lifetime and reclaims its child in finally. The controlled order now passes5 parent cases/37 assertions, plus the original3 child cases/9 assertions. Source hashes and inverse-byte preservation are recorded locally.

The local isolated-producer variant passed Admin typecheck and the full official suite:649 parent cases/2420 assertions, plus all3 original child cases/9 assertions. Independent review verified inverse-byte preservation, ownership and the controlled RED/GREEN. While these gates ran, another session published the same producer isolation in remote2a5485c78. Both checkouts adopted that remote correction instead of publishing a duplicate. Its fixture inverses the same two paths to the exact committed original bytes, and a fresh controlled-order run on the exact remote wrapper passes5 parent cases/36 assertions. The one fewer parent assertion reflects the remote wrapper checks, not removal of original Viewer or Authoring assertions. Current remote CI39164324612 remains in progress; no CI/deploy success is claimed here. The original failure and the local bounded-wrapper alternative are preserved in cache/stash. Runtime lot C remains separate local work.
