# Python Operational Promoter Implementation Plan

**Goal:** prepare a reviewable native-R2 promotion Worker, isolated from public runtime readers, without deploying or authenticating remotely.

**Approved design:** `.cache/studio-python-l0/r2-preview-hop-diagnostic-20261020-r6-analysis/PROFESSIONAL-SLICE.md`.

**Architecture:** a Node-only generator verifies the existing canonical promotion plan plus a separately pinned approval and emits an exclusive deployment artifact. A separate Worker accepts one authenticated finite binary frame, calls the existing native-R2 stores, verifies readback and closes owned bodies. The checked-in unconfigured entrypoint is unavailable by default.

**Constraints:** no historical plan/release inheritance, no API token in the Worker, no generic object endpoint or write fallback, no reader/public-worker changes, 32 MiB frame ceiling, existing store copies accounted for but 128 MiB native feasibility remains pending. No Git/deploy/credentials/remote call. Heavy/native gates require coordination.

- [x] Implement strict operational approval/plan, fixed frame views, HMAC/expiry/version binding; test malformed/oversized/truncated frames and auth negatives.
- [x] Implement isolated handler using current store ports, owned settlement/readback and closed failure receipts; test store order and primary/cleanup failures through explicit synthetic ports. Native in-flight calls are not claimed cancellable.
- [x] Implement Node-only artifact preparation with canonical-plan verification, explicit approval digest, exclusive output and source pins; default generated plan stays null.
- [x] Add isolated config/documentation and local-native test recipe; do not edit public runtime configuration or package entrypoints.
- [x] Run focused pure tests and Biome and freeze reviewed sources:14 tests/96 assertions in `.cache/studio-python-l0/python-operational-promoter-r3/`; root review recorded separately. The overbudget-before-payload regression and its original ENOENT negative remain preserved.
- [x] Qualify fresh UTF-8 ownership and the native digest declaration boundary:7 focused tests/1051 assertions, real Node24 declaration emit and strict Worker checking passed. References: `.cache/studio-python-l0/python-operational-owned-boundary-qualified-r1/receipt.json` and `python-operational-owned-boundary-proposal-r1b/root-{focused,node-api,worker}.log`.
- [x] Add the serial versioned `typecheck:promoter` gate. Its actual Node24 run passed local RTTI generation, strict Node CLI/adapter compilation and strict Worker compilation at `.cache/python-promoter-types-nfbxHo/receipt.json`. The earlier TMP-classification and inferred-JS-result negatives remain at `python-promoter-types-usIjad` and `python-promoter-types-cVzPrF`. This proves the recorded type contract, not an independently observed complete native process tree.
- [x] Qualify the actual bundle/metafile at `.cache/studio-python-l0/python-operational-bundle-r4/bundle-proof.json`:140 actual inputs,2 outputs, exactly one external native `node:crypto`, no fs/zlib/polyfills; before/after332 sources/358 pins match current profile `c9d45929575d652c63ee16b254da308b515e951bfc30296971ca12599cbba772`. CLI exited0 without timeout/signal/retention. This is a bundle boundary proof, not native handler or independent full-process-tree qualification.
- [ ] Qualify the operational handler with local native R2, final-payload128MiB feasibility, deployed authentication and approved final promotion. No deployment, completed promotion or final-memory claim follows from pure/type/RTTI gates.
