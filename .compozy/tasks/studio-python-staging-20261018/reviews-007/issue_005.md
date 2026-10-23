# Exported web server rejects the runtime metadata needed by boot

Status: resolved — causal HTTP regression and all four native exports passed
Severity: high (web export is not playable)

Native Chrome Classic and Pro exports generate and unpack the ZIP, but their independent player cannot prepare the Python channel. The game never creates its canvas. Both failures are preserved in `parallel-c-public-export-1` and its log; Edge is still running at this checkpoint.

Inspection: boot resolves `/runtime-deployment.json`, which the ZIP already contains, while generated `serve.py` allows only index/player/payload/attributions at the package root. The metadata file is omitted from that explicit allowlist. Do not remove confinement, serve every root file, weaken CSP or bypass metadata verification.

Add an assertion to the existing real-HTTP generated-server fixture for exact metadata bytes and JSON MIME, reproduce the 404, then add that single metadata filename to the server allowlist. Native standalone execution must pass afterward, including PNG, input, keyboard, capture, restart, stop and same-origin-only requests. The focused fixture does not replace those native scenarios.

Verification: `web-metadata-http-red-1.log` reproduced 404 instead of 200. Adding only `runtime-deployment.json` to `ROOT_FILES` produced `web-metadata-http-green-1.log` (1 passed, 0 failed), preserving all existing confinement assertions. Independent read review: `staging-web-export-metadata-review.md`, no findings.

Actual standalone ZIP cases in `parallel-c-public-export-2/report.json` passed Classic/Pro × Chrome/Edge with real metadata, Turtle PNG, stdin, keyboard, capture, restart/stop and same-origin requests: four passed, zero retries/skips. The enclosing invocation actually selected 80 cases because of a PowerShell scalar-splat error, yielding 74 passed and six unrelated Free/LSP test failures; it is not an all-green suite. `parallel-c-public-export-selection-correction-2.json` preserves the actual selection, report SHA and four results. Runner now uses `[string[]]` for filename arguments.
