# Operational Python runtime promoter

This is a separate operational Worker, not the public runtime or an app endpoint. The checked-in plan is `null` and its config has no bucket binding, routes or workers.dev endpoint. It cannot promote anything as checked in. No existing reader, public Worker configuration or JS runtime is changed.

The current checkpoint is **offline implementation**. Pure tests use explicit synthetic storage ports; they do not qualify native R2 conditionals/checksums, deployment authentication, 128 MiB memory feasibility or full promotion.

## Approval and preparation

First obtain a new canonical plan from the existing `promote-python-runtime.ts prepare` command, using the final qualified distribution and a fresh public baseline preserving existing JS/Python configuration. Historical diagnostic distribution996 is explicitly refused. No Linux b969/639 plan is inherited.

Root reviews a separate public approval JSON with exactly these fields:

```json
{
  "version": 1,
  "kind": "studio.python.operational-promotion-approval",
  "planSha256": "<canonical plan SHA256>",
  "distributionSha256": "<qualified distribution SHA256>",
  "qualificationSha256": "<final qualification receipt SHA256>",
  "workerName": "sistemazero-python-promoter-staging-<first 12 plan hash characters>",
  "operatorOrigin": "https://<independently verified dedicated Worker origin>",
  "notBefore": 0,
  "expiresAt": 0
}
```

The values above are placeholders, intentionally invalid. The real window is at most 30 minutes. The name/environment/bucket are cross-checked. Approval presence/digest is an explicit trusted-operator input, not a claim that a JSON file itself cryptographically proves human approval. Its canonical SHA must be supplied independently.

Offline command from the repository root:

```text
bun --no-env-file packages/studio-runtime/scripts/promote-python-runtime-worker.ts prepare --plan PLAN.json --expect-plan-sha256 PLAN_SHA --approval APPROVAL.json --expect-approval-sha256 APPROVAL_SHA --out NEW_EXCLUSIVE_DIRECTORY
```

This command reads no credentials, imports no SDK and performs no fetch/deploy. It verifies the canonical plan/files, frames the exact payload, snapshots source/lock hashes before/after, and writes exclusive public artifacts. `artifact.json` is last; partial output is never ready. `verifyOperationalArtifact(directory, expectedArtifactSha)` rechecks every file and source before a separate reviewed build/deploy step. The generated entry imports the pinned handler from this checkout, so sources must remain frozen through bundling and be checked again afterwards. The artifact is explicitly **not built/deployed**.

## Wire and authority

Only POST `/execute/<operational plan SHA256>` at the approved exact origin is accepted. There is no arbitrary method/key/bucket/URL input. The operator supplies the approved frame, fresh nonce, short request expiry and exact deployed version. `createPromotionRequest` constructs/signs a `Request` only; it never sends it or obtains credentials. The caller must independently verify actual deployed version/source/bindings before signing.

Authentication is HMAC-SHA256 using a dedicated 32-byte hex `OPERATOR_HMAC_KEY`, bound to operational/canonical plan hashes, deployed version, nonce, expiry and frame digest. The Worker has no Cloudflare API token. Provision this secret only in the separate operational deployment, never source/config/CLI arguments. Credentials and raw errors are not logged or returned. No CORS access is granted.

The binary body has a fixed magic/count and length-prefixed files in compiled order; no paths are taken from payload. Total frame ceiling is 32 MiB. One owned buffer provides per-file views. Real store functions still make per-file copies, and gzip/crypto/metadata add memory: 32 MiB is **not** total memory. A semaphore admits at most one authorized payload per isolate before reading its body; a second gets 429 without a body read. This is not global coordination. The 128 MiB feasibility and CPU/stream budgets must be measured with the actual final payload before deployment; do not silently increase the budget or fragment a plan.

The narrow storage port delegates to actual native R2 get/put methods and returns native objects unchanged. Native SHA256 and `onlyIf.etagDoesNotMatch='*'` are mandatory. A collision is verified, never replaced; missing native SHA fails too. Distribution files and completion marker use the existing store order, followed by the existing configuration store. Every expected object is read back by exact size/native SHA and every acquired body is closed before the response. Failed operations and cleanup rejections, including falsy values, remain separate. No early ACK, `waitUntil`, delete/list or activation occurs.

Native R2 operations have no cancellation parameter. The handler checks abort/expiry before and after each awaited call, retains admission through actual settlement/cleanup and never races away an in-flight write to report completion. A native call accepted before expiry can finish later; it then produces a failed receipt, not a promise that storage rolled back. Provider/native timeout, late completion and cancellation behavior still require the coordinated local/deployed gates.

## Separate operational closure

Before real use: generate actual binding types with the pinned Wrangler, typecheck the isolated entry, build/pin the exact bundle, qualify local workerd with the real native R2 binding, then have root review resource measurements and the deployed read-only/limited-write controls. No new native/remote operation is automatic from these source files.

The coordinated native matrix must specifically cover: store cancellation followed by owner cancellation on the same real R2 body; abort while an actual body read is pending; expiry immediately after get acquires an object (the owner must still close it); native same-key conditional collision/concurrent identical writes and checksum mismatch; failure before marker; and the actual final frame under the 128 MiB budget. Pure stream/port tests cover control flow only and do not replace these cases. The earlier local R2 R4 proof is a reference for ownership/cleanup of the native process, not qualification of this new handler.

The private operator's deployment/invocation/revocation orchestration is intentionally not exposed as an `apply` CLI in this offline checkpoint. Root must review exact config/version/receipt/source pins and commands first. After the authorized operation, explicitly revoke the dedicated secret and remove/disable only this operational Worker, then verify endpoint rejection/absence and record cleanup. Revocation failure is an unresolved credentialed surface. Uploaded immutable objects remain permanently untouched. There is no secret rotation, app rollout or reader activation in cleanup.

Retries/concurrency within the authorization window are limited to the identical compiled plan and verified bytes. Native atomic preconditions provide immutable idempotence across isolates; there is no claim of globally one invocation without durable coordination. A negative never triggers another attempt, another transport or an activation automatically.
