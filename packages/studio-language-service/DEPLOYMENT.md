# Initial deployment of the current Python language service

The current service uses the SQLite class and binding `PythonLanguageSessions`.
Its `leases` table requires `binding` and `bootstrap` from creation. There is no
SQL upgrade path, optional bootstrap or implementation of `PythonLanguageOwner`.

`wrangler.jsonc` retains the original `v1` **platform migration record** and adds
`language-sessions-initial`: create `PythonLanguageSessions`, delete
`PythonLanguageOwner`. Default and staging use the new binding; staging inherits
the top-level migration list. `PythonLanguageSandbox` is unchanged. Worker URLs,
service credentials, limits and the analysis protocol are unchanged.

This is a new namespace, not a class rename or data transfer. Cloudflare rename
migrations preserve stored objects, which would preserve an incompatible table.
Deleting the old class permanently deletes its objects, leases and alarms. See
[Cloudflare's create/delete/rename migration contract](https://developers.cloudflare.com/durable-objects/reference/durable-object-class-migrations-legacy/).

## Required gate before any remote deployment

Remote state is unknown until inspected. Python has not been activated for
learners, but QA may have deployed the old namespace and started containers.
These instructions do not authorize a deployment or deletion by themselves.

For the **specific target environment**:

1. Record the account, Worker name/version, applied migration tag, namespace IDs
   and exact `PythonLanguageSandbox` container application. Inspect any external
   bindings as well. Do not infer that default and staging share state, or that
   an unused-looking namespace is empty.
2. Pause QA/browser/Builder callers before draining. Keep the existing Worker
   available for cleanup; do not replace it with this code yet. Do not change or
   expose credentials to perform the inspection.
3. Close every known old session through the existing authenticated endpoint,
   `DELETE /v1/python-language/<owner>/<sessionId>`, and require `closed: true`.
   Preserve ownership evidence from the QA run and the cleanup receipts. Wait
   for startup/request operations already in flight to finish their cleanup.
4. Inspect the target container application's instances and require **zero live
   or pending containers** belonging to it before applying the deletion. If a
   session/instance cannot be accounted for, stop here. An orphan requires an
   explicitly authorized cleanup of its verified instance ID; do not delete a
   shared application or another environment's resources. Recheck after the
   last cleanup while callers remain paused.
5. Record this gate's result. The service's 30-second reservation expiry,
   5-minute idle expiry, 2-hour maximum lifetime and sandbox sleep configuration
   are bounds, not proof that physical cleanup succeeded. Do not replace the
   zero-container check with a fixed wait.

Draining first is mandatory: after the namespace switch, closing an old session
ID reaches a coordinator with no corresponding lease. Its idempotent success
does **not** prove that the old sandbox was destroyed. Deleting the old namespace
also removes alarms that could otherwise retry that cleanup. Starting fresh
coordinators before draining could temporarily bypass the per-owner two-session
quota by leaving old containers alongside new ones.

If the environment has never had this Worker, record the confirmed absence of
both namespaces and its container application instead of fabricating drain
receipts. The migration history is still applied normally; do not rewrite `v1`
or add SQL compatibility code based on a guessed deployment state.

## Applying and checking the cutover

Only after the gate and deployment authorization, use the repository's pinned
Wrangler from this package. For staging the intended command is
`bunx --no-install wrangler deploy --env staging`; default is a separate explicit
decision. Build and qualify the current container image first under the normal
release procedure. Do not reuse an older container because its URL is unchanged.

The deployment must report the creation of `PythonLanguageSessions` and deletion
of `PythonLanguageOwner`, without renaming/transferring either class and without
replacing `PythonLanguageSandbox`. Record actual namespace IDs and the deployed
Worker/image identities. Do not resume callers if those identities or the
migration result differ from the reviewed configuration.

Before resuming callers, verify authenticated Open with a fully pinned current
release, Start, Sync, a real Pyright query and Close. Also verify rejection of
Open without `runtimeRelease` and of an incorrect context binding, owner quota
enforcement, cancellation during startup and final zero-container cleanup.
Reconnecting intentionally creates a new session; no old session is recovered.

This lifecycle deletion cannot be treated as a code-only rollback. A failed
cutover keeps callers paused while the current service is repaired; do not
redeploy a former implementation or restore an old table as a fallback.

## Local evidence and its limits

`bun test worker-tests/deployment.test.ts worker-tests/lifecycle.test.ts` checks
the two configured bindings, forward migration record, current SQLite schema,
restart/context isolation, quota and cleanup races using controlled platform
boundaries. It does not apply Cloudflare migrations, inspect remote state or
prove container destruction. Real workerd, container and remote qualification
remain separate gates.
