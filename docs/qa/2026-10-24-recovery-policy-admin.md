# Administrative recovery policy

The Admin now has a Regularização tab under Vendas. It reads the persisted version, window, reminders and admission setting, explains the shared Kids/adult policy and keeps the audience-specific communication distinction. An unavailable read never exposes local defaults as saved server policy. Staff can read; only admin/superadmin can save. Writes retain the read version, use a synchronous submission guard and are never retried automatically after an uncertain response. Explicit reload reconciles the result.

The BFF authenticates locally, separates read/write permissions, accepts JSON only, streams at most 1,024 bytes, uses fixed upstream paths and marks responses private/no-store. Gateway routes require active JWT accounts; mutation is admin-only, bounded, audited and carries the trusted identity. Payments rechecks internal caller/role, refuses impersonated writes and derives the audit actor from the trusted header. Browser actor fields are rejected by a strict schema. Stale versions produce a generic 409 without disclosing an internal record identifier.

Startup initializes the existing policy seed idempotently, disabled by default, before workers start. Existing operator settings are preserved. Activation requires messaging transport, public Efí tokenization identifier and the two billing destinations. The outbound Gateway origin/Payments HMAC secret must be configured together. Billing URLs require HTTPS outside localhost and cannot contain URL credentials, query tokens or fragments. IaC lists preserve the new variable names for both environments; no variable values were changed for this lot.

Fresh local evidence:

- Payments + real PostgreSQL: 438 pass, 1,206 assertions, no failures/skips, 6.94 seconds in the last complete run.
- Gateway: 290 pass, 2 optional real-Redis tests skipped, 1,214 assertions.
- Admin, from its package directory: 916 pass, no failures, 3,819 assertions; includes isolated UI/BFF boundary fixtures.
- Payments/Gateway typechecks and focused Admin component/fixture typecheck: exit zero with bounded 1 GiB heaps. Full Admin page/BFF types remain for the hosted CI.
- Biome over the 22 affected source/test/config paths and git diff check: clean.

Invalid attempts are retained separately: running the full Admin suite from the repository root broke four older package-relative test launchers (910 other tests passed); the correct package command passed 916 tests. Another Payments run contained a hook timeout across a 20,142-second interruption; no suspension root cause is asserted. Its log remains intact. After checking the owned database health, the new complete attempt passed in 6.94 seconds. Neither invalid attempt is erased or counted as successful evidence.

This lot does not activate automatic recovery in staging/production and is not a real-browser qualification of the new page. Admission/orchestration, cancellation origin/actor audit, native sandbox retry-period proof, templates, operational case/exception views and integrated activation remain outstanding. The required first full review follows completion of that financial work; the adult outline and objective/script/voice naming lots and second full review follow it, before final integration/deployment.
