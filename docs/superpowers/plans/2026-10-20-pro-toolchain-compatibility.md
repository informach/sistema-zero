# JS Pro toolchain compatibility Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Restore execution of existing JavaScript Pro projects after the curated Vite security update, without running the old toolchain.

**Architecture:** Update only the known legacy Vite spec to the existing curated constant, obtain a complete lock through the existing canonical runtime preparer, and apply both project files through the existing revision/CAS/Undo transaction before execution. Preserve every other manifest field, script, dependency, source file and asset. Existing strict manifest and full-lock verification remain authoritative.

**Tech Stack:** TypeScript, React, existing Studio project operations and authenticated host adapters/BFFs.

**Spec:** Root-approved regression repair: exact legacy Vite `8.0.16` to curated `STUDIO_PRO_REMOTE_PACKAGES.vite` (`8.1.6` at this horizon), no AI, credits or new choice UI. No changes to Core studio policy or runtime/profile.

## Global Constraints

- No downgrade, graph-verification exception, silent dependency removal or template replacement.
- Preparation failure, cancellation or revision/profile/authority conflict leaves the original unchanged.
- Only `package.json` and `package-lock.json` may change; application uses `applyProEditorChange` and existing Undo history.
- Opening and export remain available; execution waits for successful preparation/application.
- No browser, Docker, full typecheck, commit or index mutation in this delegated lot.
- A broader host API authorization change requires Root review before implementation.

### Task 1: Pure manifest update and transactional application

**Files:** create `packages/studio/src/state/proToolchainUpdate.ts` and its focused test; reuse `state/proRevision.ts` / `state/projectOperations.ts` unchanged where possible.

**Interfaces:** preparation accepts the captured editable JS Pro project and a callback to the existing canonical dependency preparer; it returns/applies one `StudioProChange` containing the two dependency files. Exact source revision, storage scope, persistence adapter and authority signal are checked before commit.

- [x] Add RED controls for the legacy spec, preserving unrelated manifest fields and all authored files/assets.
- [x] Implement bounded JSON inspection and exact legacy-spec update using the curated constant.
- [x] Prepare the lock before mutation, validate current direct dependencies and apply both files with CAS/Undo.
- [x] Verify cancellation, stale project/profile, preparation failure, idempotence and Undo.

### Task 2: Connect existing execution paths and authorizations

**Files to confirm after Root review:** `src/studio/pro-runtime.tsx`, `src/modes/pro/ProPreview.tsx`; member-shell lesson/live runtime adapters and BFFs; Admin Pro adapter/route; Full Studio host services/routes.

**Interface:** a deterministic dependency-preparation callback independent of AI. Full Studio has no remote-build adapter today. Live authorization accepts a saved context only, not arbitrary candidate source; preparation must preserve this boundary and recheck the same saved revision.

- [x] Confirm the smallest shared host interface and Full Studio authorization route with Root before expanding APIs.
- [x] Bind preparation to existing actor/context/expiry rules for Full Studio, lessons, live and Admin.
- [x] Run the transaction before either WebContainer installation or remote build; reuse existing status/error/history UI.
- [x] Verify host denial, expiry/revocation and concurrent revision errors never apply or execute stale content.

### Task 3: Review and focused evidence

- [x] Run only relevant light unit/HTTP/component tests serially, plus scoped Biome/diff checks.
- [x] Record passing evidence and remaining integration limits, freeze the source and hand off to Root for review/integration.


## Implemented host boundaries and review handoff

Root approved the host extension before implementation: a closed `X-Studio-Pro-Operation: prepare-dependencies` discriminator on the existing lesson/live/Admin build routes, and a thin authenticated dependency-only Full BFF. An absent header retains the existing build operation; any other value is refused.

- `packages/studio/src/core/proToolchain.ts`: bounded manifest inspection (16,000 characters), exact legacy Vite spec only, shared by browser and server via `@sistemazero/studio/pro-toolchain`.
- `packages/studio/src/state/proToolchainUpdate.ts`: capture project/storage/persistence/author authority; drain pending writers; derive candidate; prepare canonical lock; validate returned pair; apply only the two files using the existing CAS transaction and recoverable Undo. Scope/caller cancellation or concurrent edits cannot commit.
- `packages/studio/src/modes/pro/ProPreview.tsx`: withhold both local and remote executors until the pair is applied. An existing mounted WebContainer drains its filesystem writer before npm installation. Undo keeps the old pair and withdraws execution until explicit retry. Successful origins use only SHA-256 fingerprints, reset per project/storage-scope object, bounded to the existing 20-operation recovery history.
- `packages/studio/src/studio/pro-runtime.tsx`, `types.ts`, `StudioCore.tsx`: optional adapter preparation plus a separate Full WebContainer preparation callback. A remote adapter never falls through to a local callback.
- Lesson: `member-shell/src/components/studio/studio-block.tsx` and `routes/lesson-pro-runtime.ts` retain enrollment, lesson/block membership, editable bound baseline and authoritative Pro-template checks. The server derives the repaired manifest from the submitted authorized project.
- Live: `member-shell/src/lib/live/pro-runtime.ts` and `routes/live-pro-runtime.ts` retain journal admission, saved revision/context, writer authority and cancellation. The client sends context only. The server derives the candidate from its private saved snapshot and fetches/revalidates that same snapshot before returning a revision-bound lock.
- Admin: existing `admin/src/lib/studio-pro-authoring.ts` and `app/api/studio/pro-runtime/build/route.ts` retain local Admin authorization; no AI or credit path is involved.
- Full: `member-shell/src/components/studio/studio-pro-editor.tsx`, shared `server/free-pro-toolchain.ts`, and the two apps' `api/studio/pro-runtime/dependencies/route.ts`. Kids reuses `resolveStudioProAccess` with the same session/profile, product and journey capability inputs as its Pro page. Adult reuses `getCreativeToolsState` with `studioAvailable && tier.pro`, identical to its Pro page. Readonly impersonation is refused. The callback is only installed by the existing authenticated free-runtime host, not by a laboratory without a backend.

The BFF uses `prepareStudioProDependencies` and the runtime's existing curated graph. It does not query a registry, install packages on the application server, grant additional tiers or relax the strict graph verifier. Existing supported ranges in other dependencies are preserved; canonical preparation resolves them using the installed trusted graph and the returned manifest/lock pair is checked before application.

### Focused evidence

- Studio: 21 passing tests, 161 assertions across four files, including the legacy rejection control, complete runtime graph validation after repair, failure/cancellation/concurrent source/profile/authorship controls, real Undo and explicit retry in StrictMode, separate Full callback and laboratory refusal, and existing current/candidate/remote preview regressions.
- Hosts/Admin: 22 passing tests, 139 assertions across five top-level files, including the isolated live hook fixture. All HTTP interactions use injected/spied in-memory fetch responses; no network or server was started.
- Scoped Biome: 26 files checked without changes or warnings. `git diff --check` clean.
- Evidence logs: `.cache/pro-toolchain-studio-final.log`, `.cache/pro-toolchain-hosts-final.log`, `.cache/pro-toolchain-biome-final.log`.

### Deliberate limits

- This repair recognizes only the exact retired `8.0.16` spec approved for the regression. Arbitrary old versions, manually inconsistent current manifests/locks and unsupported dependencies continue to use the existing strict error path; the source is preserved.
- Source/manifest semantics are preserved; JSON formatting of the updated package manifest is normalized. No curriculum, Core policy, runtime image/profile, feature flag or Python behavior changed.
- Real WebContainer/npm execution, deployed BFFs, browser automation and full typechecks were not run in this delegated lot. Root owns integration and those checks. Happy DOM reports its existing blocked iframe-navigation diagnostics while the focused DOM assertions pass.
- No staging, commit, push, build, Docker or service operation was performed.
