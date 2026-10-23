# Free Pro native test assumes automatic execution has not finished

Status: resolved — current-source execution and revocation passed all six Free cases
Severity: medium (native qualification is nondeterministic)

The broader Bridge run `parallel-c-public-export-2` failed Chrome Free Pro at case17 after waiting90s for an `Executar` button. The error context shows `Reiniciar`, `Programa concluído`, the old execution iframe and the current edited source with its stale-execution banner. This is a different failure from the HTTP counter.

The real StudioCore defaults `autoRun=true`, and the actual Pro host used in this fixture preserves that default. The preview auto-starts when the owner/environment is ready; editing source intentionally does not restart it. The earlier six Free cases passing does not prove the button will always remain `Executar` before the test reaches it.

Correction direction: preserve automatic execution; initiate the current version through Execute/Restart, verify removal of the previous generation, and require the edited drawing/output before testing revocation. The original 80-case source was retained unchanged until that run finished. No old canvas, longer timeout or changed production behavior was accepted to satisfy this test.

The corrected test uses the available Execute/Restart action, verifies previous iframe handles are disconnected, and requires a unique fresh canvas with the edited red segment, stdout scoped to the real Console, and no stale-source banner. It captures Monaco's edited model text before execution (normalizing only its legitimate EOL when comparing the requested LF fixture) and verifies exact model-text preservation across execution/revocation. The initial strengthening exposed LF/CRLF and Blockly/Console locator assumptions in run3; both are retained as negative evidence and corrected specifically, without production changes.

Fresh `parallel-c-public-export-7-language-free` passed 24/24, including all six Free Classic/Pro/recovery cases in Chrome/Edge, with zero retries/skips. Read review confirmed actual Console locators and no stale-canvas false pass. No performance approval follows from the drawing attachment.
