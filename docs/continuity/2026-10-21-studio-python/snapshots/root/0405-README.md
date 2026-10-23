# WebContainer diagnostic R1 — prepared, never browser-executed here

`profile.mjs` is frozen at SHA256
`916ac8959738480978e4ac8fc0c4e1fcaf5d2508a60ea838a306fa58f16ac5e1`.
Root/Core independently read these bytes. Five Node24 tests passed without
browser, service, provider, native Job or application startup. They exercise
closed projections, the real plain-p DOM reader, serial delayed sampling,
non-throwing/idempotent stop, errors and detach uncertainty through inert ports.
This is not a profile result or a qualification of WebContainer/performance.

## Integration

`const profile = await startProfile({browser,page,signal,onUpdate})`

Use only the existing owned Chromium instance and the actual Pro page after its
real URL transition. `onUpdate` is a synchronous projection sink, for example
`value => receipt.ui.diagnostic = value`; async sinks are explicitly refused.
No provider, credential, source or command line belongs in this interface.

`await profile.stop()` is non-throwing/idempotent. It cancels its timer, waits the
bounded in-flight sample and detaches its two CDP sessions. Call it before the
page's context closes, including the mid-scenario first-context close, and in
the leaf finally. An already-closed browser or uncertain detach produces an
explicit diagnostic NEG, not ownership/cleanup authority. The final report
retains last-known samples and a closed failure reason. A late session creation
is closed when returned; an unconfirmed creation never becomes detachConfirmed.

Sampling is serial with a500ms target interval and maximum120 completed samples.
Each batch of requests has a1s observer bound; this does not cancel underlying
CDP calls. Failure stops sampling and session detach is attempted with its own
1s bound. No tracing, screenshots, heap dumps, GC, pause/debugger commands,
launch flags, application interception or owner/threshold changes occur.

## Data and interpretation

Browser session calls only SystemInfo.getProcessInfo. Projection is capped at128
rows and keeps safe PID, closed type enum (otherwise unknown) and finite CPU
seconds. Page session calls Performance.enable/getMetrics and Runtime.getHeapUsage;
only the explicit numerical whitelist is retained. DOM inspection checks at most
128 plain paragraphs for the exact existing boot/install/dev labels; no role is
invented. A bounded4096-text-node/4096-char-per-node scan returns only three
booleans for the specified Rolldown downloading/NAPI/atomic patterns. These are
DOM observations, not exhaustive process stdout or absence proofs.

No raw URL, title, target description, command line, arbitrary console line,
error message, stack, source text or CDP response is persisted. Callbacks receive
cloned closed projections. Native Job membership/FILETIME remains the ONLY
ownership authority. Correlate a CDP PID with bracketing native observations of
the same PID+birth; a missing/mismatched mapping is unknown, never PID adoption.

SystemInfo process type cannot associate a renderer PID with a specific page or
WebContainer worker target. Runtime heap figures describe the addressed page
isolate, not every worker or all physical/WASM/GPU memory in that process. Do not
sum these overlapping metrics with native WS, subtract commit to deduplicate RAM,
or claim that a large renderer is proved to be WebContainer. Observed UI phase
and metrics supply correlation; they do not by themselves prove causality.

The next Root-owned attempt must keep the2048 functional quota and ordinary
sandbox/criteria. Earlier strict1024 and functional2048 NEG receipts remain NEG.
No Start authorization, binding or operational plan is created by this package.

Primary API references: [SystemInfo](https://chromedevtools.github.io/devtools-protocol/tot/SystemInfo/#method-getProcessInfo),
[Runtime](https://chromedevtools.github.io/devtools-protocol/tot/Runtime/#method-getHeapUsage),
[Performance](https://chromedevtools.github.io/devtools-protocol/tot/Performance/#method-getMetrics),
[Playwright browser CDP](https://playwright.dev/docs/api/class-browser#browser-new-browser-cdp-session).
The installed Playwright1.60 protocol declarations were also inspected.
