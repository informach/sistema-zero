# R2 Public CORS Deploy Gate Implementation Plan

> **Execution:** implement sequentially in this session; no subagents are authorized for this task.

**Goal:** Make staging deployment configure and prove the public R2 CORS contract required by the Community Kids Rive runtime.

**Architecture:** Extract the desired-rule merge and response validation into pure TypeScript helpers. Turn the existing Admin script into an idempotent ensure command that uses the R2 S3 API for control-plane configuration and a temporary public object for a data-plane browser-origin probe. Run that command through Railway CLI in the staging deploy job so credentials remain owned by the Admin service.

**Tech Stack:** TypeScript, Bun test, AWS SDK S3 client, Railway CLI, GitHub Actions.

**Spec:** `docs/plans/2026-09-21-r2-public-cors-deploy-design.md`

## Constraints

- Configure staging only in this change.
- Preserve every unmanaged R2 CORS rule.
- Do not copy R2 credentials into GitHub secrets or logs.
- Verify the public URL with the exact staging Kids origin before any service deploy starts.
- Delete the probe object on success and failure.
- Fail closed when the configured rule or public response is wrong.

### Task 1: Pure CORS contract

**Files:**
- Create: `packages/admin/scripts/r2-cors-public-lib.ts`
- Create: `packages/admin/tests/r2-cors-public.test.ts`

- [x] Write failing tests for preserving unmanaged rules, replacing duplicate managed rules, exact managed-rule equivalence, and public response validation.
- [x] Implement the desired rule, merge/equivalence helpers, and probe-response validator.
- [x] Run `cd packages/admin && bun test tests/r2-cors-public.test.ts` and require PASS.

### Task 2: Idempotent ensure plus real CDN probe

**Files:**
- Modify: `packages/admin/scripts/r2-cors-public.ts`
- Modify: `packages/admin/package.json`
- Modify: `packages/admin/CLAUDE.md`

- [x] Change the default operation from dry-run/manual apply to ensure-and-verify; retain `--check` for diagnosis.
- [x] Require `R2_PUBLIC_URL`, apply only when the managed rule differs, and verify the exact rule after the write.
- [x] Create a unique no-cache probe object, fetch it with the configured staging origin until the expected CORS response appears or the deadline expires, and always delete it before returning.
- [x] Add a package command for the deployment gate and document the automated contract.

### Task 3: Deployment gate

**Files:**
- Modify: `.github/workflows/ci.yml`

- [x] Prepare Bun and dependencies in `deploy-staging`.
- [x] Invoke the ensure command via a pinned Railway CLI using the Admin service variables and explicit staging project/environment/service selectors.
- [x] Keep the gate before the existing Railway deployment trigger so CORS failure prevents release.

### Task 4: Verification and staging application

- [x] Run the focused unit test, Admin typecheck, Biome on changed source, workflow parse check, and `git diff --check`.
- [x] Execute the exact ensure command locally through Railway CLI against staging.
- [x] Fetch an existing `.riv` with the Community Kids staging `Origin` and assert the real `Access-Control-Allow-Origin` header.
- [x] Review the full diff for secret exposure, cleanup guarantees, idempotency, workflow ordering, and false-positive probes; fix every confirmed issue and rerun affected checks.
