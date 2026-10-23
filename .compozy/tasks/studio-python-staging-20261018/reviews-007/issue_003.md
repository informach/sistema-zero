# Windows qualification-server connections survive in spawned children

Status: resolved
Severity: medium (qualification blocker)

The Windows Bun1.3.11 qualification server inherited listening/accepted sockets into its Node Pyright children. After the parent closed an idle connection, a client could reuse the still-open socket and send a request that never reached the server handler. This blocked reliable F1 qualification; the product language service runs separately in Node24.

## Causal evidence

- The unprofiled F1 baseline reproduced three `/network` timeouts. A multi-context diagnostic reproduced six timeouts: requests finished writing on reused sockets, received no response bytes and had no matching server-handler entry. Heartbeat evidence excluded a corresponding five-second event-loop stall. All logs and incomplete samples are retained.
- A minimal loopback server without Studio, Pyodide, a browser or shaping passed24/24 scenarios without subprocesses. Adding an owned Node child reproduced seven failures: native HTTP9/12 and Playwright8/12 passed. The full JSON corrects an earlier tail-only reading that had incorrectly counted all native outcomes as passing.
- The unchanged child-spawn reproducer passed24/24 with isolated official Bun1.4.3+c6da4a4d3. Its official archive SHA256 is `0bf84e808552beea67bf1202a287a35c6c825d837b287b3f8e9dd513dba35d3d`.
- The upstream source matches the mechanism: [Bun PR36938](https://github.com/oven-sh/bun/pull/36938) fixes inheritable Windows sockets; [Bun1.4 release notes](https://bun.sh/blog/bun-v1.4) include the correction.

The small diagnostic's explicit one-second idle threshold was never a production change. No counter client, timeout, response, connection policy or retry allowance was altered.

## Fix and artifact identity

The server now refuses Windows runtimes below Bun1.4 before building or listening. The fixed binary remains isolated; the repository's compiler/runtime pins, manifests, lockfile and global PATH were not upgraded.

Building with Bun1.4.3 changes browser artifacts, so qualification explicitly separates server and compiler. Host-only `PYTHON_PROBE_DISTRIBUTION_DIRECTORY` and `PYTHON_PROBE_DISTRIBUTION_SHA256` must be supplied together. The server validates the canonical manifest hash and every file/gzip representation before listening, with no silent rebuild fallback. A simultaneous standard-library recipe is refused by variable presence, including JSON false/null or an empty variable. The auxiliary `/runtime/*` alias serves copies of verified stored bytes instead of reopening files after verification.

Readonly review found the recipe-presence and mutable-alias defects. Both were reproduced against the first implementation and passed after correction. A second review confirmed remediation. Persistent tests now cover these cases, a different manifest pin and corrupt file bytes before startup. The test harness drains `close`/pipes and aggregates primary/cleanup failures while deleting only known owned flat files.

## Fresh verification and limits

- `bun-1.4.3-isolated/persistent-qualification-receipt-1.json`: four real process/HTTP tests passed,13 assertions; Biome checked three files without remaining diagnostics. The old Windows runtime was refused with the documented diagnostic.
- `parallel-c-f1-fixed-server-pinned-20261018T230905503Z`: real workflow13/13 functional, zero retries/skips/flaky outcomes, no counter timeouts and no retained language sessions. It retains three warmups and ten complete baseline repetitions.
- That replay used the original browser distribution `bb10dfef789ab3caccdbd11373e693fb754d55ac959d9be9c51dd6bf4c2bc391` and release `d97a11329a840f2863fb52d938fbe424b7235a8fe38bcc09d85d67dcd6582cae`. The compiler comparison produced different distribution `f4d3103293b68211ce52b9ceb6ce061d24db236871cd8678d887ccdb51682d1b`, which was not used or qualified. Server provenance and source snapshot are retained beside the replay.

Edited execution remains above1500ms and is tracked separately in issue004. A cached-canvas failure from the earlier diagnostic and the cold Ponte failure in issue011 are retained; this transport correction alone does not establish their cause or approve those scenarios. The F1 replay is not a thirty-run, reference-computer, video, p99 or complete deployment qualification.