# Native language cleanup assertions count unrelated sessions and teardown is not committed

Status: resolved — committed UI teardown and exact-ID cleanup verified natively
Severity: medium (qualification blocker; no productive leak established)

In broad run80, Chrome language cases29/32 complete navigation/Turtle completion but fail the global `/metrics.alive` expectations (1/0 versus4). This counter is `sessions.size` in the loopback qualification probe, including reservations; it is not a count of native Pyright PIDs.

`pythonBridgeProbe.unmount()` currently schedules `root.render(null)` and returns immediately. Cases ending right after that call can close the page before React commits component cleanup. A preceding FreePro failure also skips its final close, and a subsequent case failure skips its unmount. The exact contribution of each retained session cannot be established from a global count alone. Production lease TTL/disposal is separate and must not be declared broken based on this probe.

Correction direction reviewed independently: make fixture component removal synchronous while preserving its reusable root; guarantee teardown even on assertion failure; observe exact allocated session IDs through existing HTTP responses and verify their removal individually. Keep global backlog visible for diagnosis. Do not clear the server Map, kill previous leases, replace0 by the observed count, filter only by a potentially reused project ID, or add product APIs for testing. Removal from the QA registry proves the lease/request closure and disposal request; native process exit requires separate observation.

The original 80-case source was frozen through completion. Initial review: `staging-python-language-metrics-isolation-review.md` in the local cache. Fresh focused evidence follows; full Bridge verification is a separate remaining gate.

Bridge fixture teardown now commits `root.render(null)` through React flushSync. The automatic test fixture captures exact reservation reply IDs with envelope/project correlation, tracks in-flight collection, observes stable metrics without converting an unstable read to zero, and always releases the actual UI owner before checking those IDs. Free registers its own public close callback; the global backlog remains in the attachment. No server registry clearing, force-delete or foreign-lease termination is used.

Run3's 22 cases captured 19 reservations and all cleaned up despite five failed bodies: zero owned/global backlog, zero collection/cleanup errors. Run7 passed all 24 cases, capturing 21 reservations with the same zero results. Receipts: `language-owned-cleanup-receipt-3.json` and `language-owned-cleanup-receipt-7.json`. This proves UI disposal/QA lease registry closure, not native Pyright process exit. The broader Bridge rerun is still a separate suite gate.
