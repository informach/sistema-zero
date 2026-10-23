---
id: '001'
title: Python frames are blocked by the Pro host embedder policy
status: resolved
severity: high
file: packages/studio/src/runtime/python/session.ts
line: 521
---

Execution and analysis frames navigate to the isolated runtime without the iframe `credentialless` attribute. The Pro routes in both Next hosts retain `Cross-Origin-Embedder-Policy: credentialless`; the runtime entry deliberately has no COEP. Allowlisting its origin in CSP and serving CORP cross-origin does not satisfy the inherited iframe embedder policy. A Python project admitted in Pro can therefore remain unavailable before the interpreter starts. The external trusted candidate preview has the same embedding boundary.

Reproduction: actual production Next headers extracted by `.cache/studio-python-l0/staging-host-csp-config.ts`; native Chrome proof `staging-host-csp-browser-3.log`. Adult base allows the frame and JavaScript srcdoc. Adult Pro requests the allowed frame, blocks its execution, preserves JS srcdoc, and correctly blocks the unconfigured frame. No timeout increase, server policy relaxation, or production mutation in this reproduction.

The three iframe factories now set `credentialless` before navigation. Permanent regression `python-host-isolation.spec.ts` exercises real CPython execution (Classic and Pro), Turtle capture/Stop, and analysis without executing the source. With the loopback QA permission held constant, temporarily removing only the execution/analysis attributes caused `net::ERR_BLOCKED_BY_RESPONSE` in both paths (RED2). Exact corrected source bytes were restored, then GREEN4 passed all six cases in Chrome and Edge without retries or skips. A positive cookie control and bounded server-side received-header records establish that the anonymous frames send no cookies; intercepted Playwright navigation headers alone were not accepted as wire evidence. Independent review: `.cache/studio-python-l0/staging-host-csp-review.md`.

The source correction is resolved for the intermediate checkpoint after its focused proof and the checkpoint gates. These browser artifacts precede the latest copy-only distribution fingerprint. CandidatePreview has structural/unit coverage, but its full SDK/browser path and the effect of ephemeral frame caching on performance are not yet qualified. The user requested normal Python operation in staging without an additional rollout flag, and production only after complete validation. The runtime's required deployment catalog, services and contextual authorizations remain normal execution contracts.

Primary references: [Chrome iframe credentialless](https://developer.chrome.com/blog/iframe-credentialless), [WICG anonymous iframe draft](https://wicg.github.io/anonymous-iframe/), [WHATWG COEP inheritance](https://html.spec.whatwg.org/multipage/browsers.html). The iframe attribute is described by Chrome and the WICG draft; it is not attributed here to the current HTML Living Standard. `COEP: credentialless` on a document is distinct from `credentialless` on its iframe. Anonymous embedding preserves sandbox, exact origin/catalog pin and lifetime ownership. The Pro embedder policy and learner frames' opaque origin remain intact. Requalify the distribution, real browsers and exports after the correction.


## Intermediate checkpoint verification — 2026-10-18

Resolved after the focused causal/source proofs, independent review and the current checkpoint gates. Studio 9257, Core 1354, member-shell 1591, Admin 651, runtime 191, language 23, Molda 3411 and Community 8 passed; release/CI contracts passed 33 with four pre-existing Linux-shell cases skipped on Windows. Host types, three language-service type configurations, build, image audit, current image, isolation smoke and all six JavaScript kit playtests/captures passed. Biome CI passed with its recorded existing warnings. The receipt audit also verifies the 24 isolated producers, 255 cases and all 49 source hashes. See [checkpoint review](../_review.md) and the execution state for commands, receipts and limits.

This closes the reproduced issue for the authorized intermediate delivery. It does not declare the complete Python feature, current SDK/export paths, full browser matrix or performance qualified. Those remain in the original implementation and final review.
