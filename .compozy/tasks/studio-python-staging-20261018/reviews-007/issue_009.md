# Typing while Python completion is pending leaves generic suggestions

Status: resolved — causal native RED and fresh Chrome/Edge GREEN
Severity: medium (real authoring behavior)

In native `parallel-c-public-export-3-language-free`, Chrome diagnostics pass, but typing `for` while the initial Turtle completion is still pending leaves only `for`/`from` suggestions for the full 15-second expectation. Edge happened to pass. This is separate from owned-session teardown: all 22 cases cleaned up 19 exact allocated IDs, with zero owned/global backlog or cleanup errors, including five failing bodies (`language-owned-cleanup-receipt-3.json`).

Trace `language-completion-trace-3-chrome.json` shows completions revision1/offset98 at 21:43:47.001, cancellation at 47.132, sync revision2/diagnostics afterward, and no new completion request. `client.update` correctly aborts obsolete queries; editorSession discards stale answers; providers converts undefined to an empty list. Monaco does not requery while its initial completion model is pending, then retains the generic provider's items. An empty list marked incomplete alone cannot recover: Monaco tracks incomplete providers through existing items.

Do not wait for the original response in the test, return stale ranges, fabricate suggestions, increase deadlines or access private Monaco controllers. Recover only a pending completion invalidated by typing, through the public editor action and strict owner/model/token/current-position/version/serial guards. No recovery on navigation, Escape/disposal, unrelated edits, newer requests or transport failure without a source edit; at most once per current version.

A new native case gates the first real Pyright answer at the transport, types while the browser answer remains pending, verifies cancellation, then requires a fresh query and real `forward` suggestion. The implementation candidate and unit coverage were initially kept in cache until this native RED completed, preserving causal evidence before applying the fix.

The gate reproduced the original failure in both browsers (`parallel-c-public-export-4-completion-red`, 2 failed). First candidate passed units but remained natively red in runs5/6. Temporary console-only instrumentation (backed up/restored by exact SHA, absent from final source) proved every recovery guard was satisfied. The missing cause was Monaco's public trigger action precondition: it refuses to run while the prior suggestion popup is visible. Installed Monaco source shows public `hideSuggestWidget` synchronously cancels/clears that request and resets visibility.

Final correction uses that public hide command immediately before the public trigger action, after all ownership/current-input guards and the once-per-version mark. No event-loop yield exists between hide/run; Escape before recovery still blocks it. The error callback no longer checks the old token, intentionally cancelled by hide, and instead retains current owner/serial/version checks. Read review found no remaining issue.

Units execute real Session/Providers/Client through controlled public ports: 14 passed/57 assertions, including cancellation and hide→run order (`completion-recovery-unit-green-3.log`). Fresh native run7 passed 24/24 with zero retries/skips, including both controlled race cases plus original diagnostics/completion/navigation scenarios. Exact-ID cleanup also passed. Typecheck and full Bridge regression remain broader gates; no global feature/performance approval is implied.
