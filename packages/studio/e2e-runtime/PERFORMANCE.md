# Local Python performance gates

These are QA instruments. They do not modify the runtime distribution or original game modules.
Unit tests prove refusal logic, not a new graphic/performance result. Historical receipts and
negative runs retain their original meaning. No reference-PC, video, mobile or hosted acceptance
follows from a successful local run alone.

## Causal input presentation

`gamePerformance.ts` keeps cadence separate from input latency. Only trusted canvas inputs are
numbered. The QA fixture delegates the real callback and waits for the corresponding original
actor pose/velocity effect and original render. A 6×6 RGB primitive then encodes that input's
sequence and key in the **same real Turtle update**, after the ordinary drawing is queued.
It adds no Turtle: F3 still has exactly 20. Space retains its original source/media, pools,
camera and simulation. The marker is declared observer drawing and adds its own measured work.
It is queued only on initialization, a new effect token or resize; idle updates do not gain
artificial drawing/cadence. Space requires the original ship stamp, active/playing state and
actual camera-offset visibility. Paused, culled or inactive actors cannot acknowledge input.

The browser reads the marker in rAF and verifies the same pixels after one further display
opportunity. This is a conservative QA pixel-presentation boundary, not GPU scanout timing.
Callback acknowledgement, print output, unchanged input state and unrelated animation cannot
supply the witness. Missing, stale/future, wrong-key or inverted witnesses refuse qualification.
Each new protected frame owns a new generation; Stop/restart must not reuse its arrays/marker.
The initializer rejects a second generation in the same frame and nonzero old marker pixels.
Input samples and negative reasons are attached before assertions.

F3 and Space default to 600,000 ms. `SZ_F3_PLAY_MS`/`SZ_GAMES_PLAY_MS` may request a shorter diagnostic
window (1,000 ms minimum); its test name and attachment explicitly say `diagnostic`. Shorter
runs never close the ten-minute acceptance. Space restart default is 30; 1–29 is diagnostic.
Run the existing games config serially, against one verified distribution/host authority:

```text
node node_modules/@playwright/test/cli.js test --config=playwright.python-games.config.ts python-f3-performance.spec.ts --workers=1
node node_modules/@playwright/test/cli.js test --config=playwright.python-games.config.ts python-space-arena-performance.spec.ts --workers=1
```

## F1 statistical gate

Set `PYTHON_LIVE_WORKLOAD=f1` and run `live-performance.spec.ts` in the live config with
`--repeat-each=30 --workers=1`. This activates `f1AcceptanceReporter.ts`; the ordinary small
drawing diagnostic remains distinct. The collector's schema validates the measured workload,
browser/kind/distribution/network identity and cold-reset evidence. The reporter persists
the complete positive/negative series before returning failed when evidence is incomplete,
mixed, duplicated, failed, or its phase p95 exceeds 12,000/3,000/1,500 ms.
The full deployment must match the explicit distribution pin (default: the versioned
`65c9bffd…` candidate). A selected release pin is also enforced. HTTP and boot-generation
cache resets are required. Unshaped network is recorded explicitly as `null`; shaped
responses must identify 20 Mbps / 80 ms. CPU-profiled runs are diagnostic and cannot
approve this normal budget. Receipt paths resolve from the Studio config directory.

```text
node node_modules/@playwright/test/cli.js test --config=playwright.python-live.config.ts live-performance.spec.ts --repeat-each=30 --workers=1
```

The budget result is explicitly **local-F1-budget-only**, with no reference acceptance: the
current controlled actor/storage collector does not include a lesson video or the 8 GB machine.
The exact command additionally needs the existing pinned runtime/network environment described
by the live fixture. It is a planned browser gate; it was not executed to validate these fixes.

## Focused type verification on limited memory

From `packages/studio`, after stopping performance runs:

```text
node --max-old-space-size=1536 node_modules/typescript/bin/tsc --noEmit --project tsconfig.python-qa.json
```

This strict profile checks the explicit helper/instrument roots and their dependencies.
It does not replace or modify the full Studio typecheck. The editor fixture graph and
legacy local process library are outside this focused profile; functional tests,
the browser runs and full CI remain separate evidence.
