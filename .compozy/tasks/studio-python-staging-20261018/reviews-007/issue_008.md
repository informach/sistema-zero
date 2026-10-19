# CI analysis-withdrawal fixture reaches deadline before observer withdrawal

Status: resolved — reviewed remote fix adopted and focused cases passed
Severity: medium (CI gate fails; runtime fault not established)

Remote workflow run `39166624552`, SHA `0cd406371fd75959d2243b7b51a9461da3d745b5`, failed only the request-lifetime case in `src/activity/python.lifecycle.test.ts`: expected `Atividade retirada.`, received `signal timed out` after 1509 ms. Studio total: 9252 passed, four existing skips, one failed. Other native/desktop jobs passed; deployment was skipped. Log: `.cache/studio-python-l0/staging-0cd-ci-job.log`.

The stack shows the real analysis iframe was mounted about 35 ms into the case. The test drives withdrawal through HappyDOM MutationObserver; its observation listener stores an otherwise unretained callback in WeakRef. Loss after GC is a plausible hypothesis. The global fake in `useHostAppearanceRevision.test.tsx` restores its original constructor in afterEach, and the following environment case passed, so permanent fake leakage is not demonstrated either.

Reproduce with controlled real observer/GC and retained-target control, then compare the appearance/lifecycle pair. Preserve the 1500 ms deadline and synchronous owned-frame removal assertion. Do not skip, increase timeout or change production cleanup to compensate for an unproven test-driver defect. Native lifetime coverage is supporting evidence, not a substitute for diagnosing this CI failure.

Root's independent `diagnose-observer-gc.ts` reproduced delivery 1 without forced GC, 0 with GC, and 1 with GC while explicitly retaining only the callback target; the real observer remained owned throughout. Receipt: `observer-gc-diagnostic-1.json`. Internal HappyDOM access exists only in this diagnostic, never in the fix.

Remote `2e76fb4487d75fdc9f92dae14c0de65e7d9a418e` independently fixed the driver with a spy calling real `document.body.append`, scheduling withdrawal in the following microtask after frame ownership registration, restoring the spy in finally. Both request/environment cases retain all original assertions and the deadline, and force GC before mounting. Read review confirmed no production change or weaker assertion; source adopted exactly after backup of 26 local files. Root's fresh focused lifecycle + appearance selection passed 7 tests/19 assertions, and Farol passed 9/126 (`remote-2e76-lifecycle-pair-1.log`, `remote-2e76-farol-1.log`). The earlier full-suite success is historical; this does not claim the next remote CI or current complete feature is approved.
