# Community Kids full-review remediation

## Objective

Resolve every finding from the 2026-08-16 Community Kids review without changing the product's UI, copy, or business behavior. The work fixes the parent-gate security boundary, restores the monorepo typecheck, corrects the public-player gamepad toggle, labels the community composers, adds browser regression coverage, and splits the three largest client components by responsibility.

## Constraints

- Preserve existing visual output, interaction order, copy, routes, API contracts, and state ownership.
- Keep the user's current career-map and course-milestone changes intact.
- Extract presentational responsibilities before moving state or effects.
- Add regression coverage before each behavioral fix.
- Keep parent-gate tokens valid across replicas that share the same secret.
- Run browser tests against a production build and public entry points.

## Security design

The parent gate will issue a versioned token containing the account id and an absolute expiration timestamp. The HMAC will cover the complete payload. Verification will reject malformed tokens, another account, invalid signatures, future-invalid timestamps, and expired tokens. The cookie retains its 15-minute `Max-Age`, while the server enforces the same upper bound independently.

The codec will accept an explicit clock in tests. Production callers will use the current time. This keeps expiration tests deterministic and avoids timer-based assertions.

## Behavioral fixes

The public player will replace the additive `showGamepad || forceGamepad` state with an automatic device preference plus an optional user override. The first render remains unchanged. After the user presses the control, the explicit choice wins, so both “Mostrar controles” and “Ocultar controles” work.

The recado reply and Clube conversation-title controls will receive persistent accessible labels and stable `id`/`name` attributes. Styling and visible copy remain unchanged through screen-reader-only labels.

The Members integration test will use the header type available in the package's Bun-only TypeScript environment. The fix will preserve the accepted runtime shapes instead of suppressing the compiler.

## Component boundaries

### Profiles

`perfis-client.tsx` will keep profile selection, parent-gate orchestration, guide state, and top-level mode selection. Family credits, child dashboard/reporting, subscriptions, purchases, and their display helpers will move to a sibling parent-area module. Shared types and constants will move only when both modules need them.

### Kids spaces

`kids-space-view-client.tsx` will keep data fetching, mutations, pagination, optimistic state, and selected-channel/thread state. The conversation composer, channel/thread presentation, and pure formatting helpers will move to focused sibling modules. Extracted components will receive explicit props and callbacks; they will not fetch data or acquire hidden state.

### Room builder

`room-builder.tsx` will retain the room-editing state machine, persistence, placement rules, and effects. Catalog, inventory, paint, lighting, pet, selection, and action panels will move to sibling modules. The extraction will preserve element order, class names, callback timing, and keyboard behavior.

## Automated coverage

Narrow tests will reproduce the parent-token replay, the mobile gamepad toggle, and missing accessible names before the production fixes. Component extraction will retain existing tests and add focused coverage where a newly exposed boundary contains behavior.

Community Kids will gain a package-local Playwright configuration and CI job. The first browser suite will cover the real login page and the public player at a mobile viewport, including the gamepad visibility regression. Authenticated flows that require the complete local service graph will remain covered at component/API boundaries until the repository provides deterministic cross-service fixtures.

The reachability gate will declare the public player, recado thread, Kids space, and the extracted parent/room boundaries critical. The gate must fail if those modules leave the test import graph.

## Verification

Verification will run the Community Kids formatter/linter, typecheck, unit tests, reachability report, production build, and Playwright suite. It will also run Member Shell tests and typecheck, Members check/typecheck/tests, all Members database tests against Postgres, the monorepo Biome gate, and `git diff --check`.

QA artifacts will live outside the source tree. The final report will distinguish automated proof from any flow blocked by unavailable credentials or services.
