export const meta = {
  name: 'members-full-review',
  description: 'Full review of @sistemazero/members: 8 finder dimensions over the unreviewed surface, each finding adversarially verified against real code',
  phases: [
    { title: 'Find', detail: 'parallel finders per dimension read real code and report grounded findings' },
    { title: 'Verify', detail: 'one adversarial verifier per finding re-reads the cited code and renders a verdict' },
  ],
}

// ---- Shared context handed to every finder so they ground in real code, not docs,
//      and do not re-report documented & deliberate trade-offs as bugs. ----
const ROOT = 'packages/members'

const DESIGN_CONTEXT = `
PACKAGE: @sistemazero/members (root: ${ROOT}/). Bun + TypeScript (ESM) + Elysia + PostgreSQL/Drizzle + Zod + TypeBox.
DDD/Hexagonal. Backend-only API on port 3004; only reachable through the api-gateway over private networking.
It is the "members area": access engine (entitlements materialized from payments/funnel webhooks) + content/progress
(courses→modules→lessons→polymorphic blocks) + a large KIDS GAMIFICATION layer (XP/streak/badges, Zappy Coins,
avatar, virtual room, missions, weekly leagues) + Studio submissions (auto-grading/carryover/showcase) + Netflix-style
child PROFILES.

HOW TO REVIEW:
- READ THE ACTUAL CODE. Do NOT trust comments or the CLAUDE.md; verify every claim against source. Use Read on whole
  files and Grep to follow symbols across files.
- Every finding MUST cite an exact file path + line range and QUOTE the offending code. If you cannot point to specific
  code, do not report it. No speculation, no "consider adding tests" filler.
- Severity rubric: critical = security breach / access-control bypass / money or access loss / data corruption or
  cross-user(or cross-profile) data leak. high = a real correctness bug that affects users, or a race that corrupts
  persisted state. medium = edge-case bug, perf cliff at scale, missing input validation with real impact. low =
  smell / minor inconsistency / defense-in-depth gap. info = nit/style.
- Prefer FEWER, HIGHER-CONFIDENCE findings over a long list. Quality over quantity.

ACCEPTED & DELIBERATE TRADE-OFFS (do NOT report these as bugs unless you find the stated rationale is actually wrong):
- Webhook dedupe (processed_webhooks) is best-effort "mark only AFTER success": two concurrent deliveries of the same
  x-delivery-id may both run; that is INOCUOUS because grant/revoke are idempotent. Claim-first was rejected on purpose
  (it would dedupe-forever a grant that crashed mid-flight). This is intentional.
- AwardGamificationService is FAIL-OPEN by design: any error logs gamification.award_failed and returns gamification:null
  so gamification never breaks complete/quiz. The try/catch is intentional; the ledger self-heals on the next call.
- Revokes (admin manage + subscription cancel/expire) do NOT notify the hub; loss of community access happens within the
  hub's ~30s TTL. Accepted.
- Elysia.stop() does not drain in-flight requests; idempotency + redelivery mitigates. Accepted.
- entitlement update() persists only status/expiresAt/revokedAt/version; other field transitions would be silently
  dropped. Documented limitation.
- No backfill of XP/streak for activity before the gamification deploy. Accepted.
- Team/staff (privileged) get a VIRTUAL all_courses entitlement (never persisted) and are excluded from rankings;
  staff XP/ratings still get recorded (trade-off accepted).
- Master key all_courses covers only audience='adult' courses; kids courses require a specific entitlement. Intentional.

WHAT TO HUNT (in addition to your dimension's specifics): real bugs, security holes, race conditions, idempotency
breaks, money/XP/coin duplication or loss, cross-user/cross-profile data leakage, broken access control, SQL/query
correctness, timezone/date bugs, missing validation that reaches the DB or leaks internal data, perf cliffs at scale,
and contract drift. Also flag genuinely dead/duplicated code and clear correctness-relevant inconsistencies.
`

const DIMENSIONS = [
  {
    key: 'access-entitlements',
    title: 'Access engine & entitlements',
    concerns: `The access/entitlement engine. Hunt for: idempotency breaks in grant/revoke/extend; snapshot-freeze
correctness; the all_courses / all_kids_courses MASTER KEY logic and its audience gating in findActiveForCourse
(could a kids course be unlocked by an adult master key or vice-versa? could a stale snapshot grant more than intended?);
the entitlement state machine (reactivate vs extendTo vs expire vs revoke — can a revoked entitlement be wrongly
resurrected, or a legit renewal be lost?); optimistic-concurrency (version) correctness and the extendWithRetry loop;
subscription cancel/expire set-based UPDATE (lost updates? wrong rows matched by subscriptionId?); the virtualAllCourses
privileged path (can a non-privileged caller obtain it? does draft still 404 before the bypass?); manual grant sentinels
(MANUAL_ALL_COURSES_PRODUCT_ID nil-uuid); catalog gateway resolution (offer unresolved/empty → 502 and NOT marked).`,
    files: [
      `${ROOT}/src/domain/entitlement/entitlement.aggregate.ts`,
      `${ROOT}/src/domain/entitlement/entitlement.status.ts`,
      `${ROOT}/src/domain/entitlement/entitlement-snapshot.ts`,
      `${ROOT}/src/domain/entitlement/fulfillment.ts`,
      `${ROOT}/src/domain/entitlement/entitlement.errors.ts`,
      `${ROOT}/src/application/grant-entitlement/grant-entitlement.service.ts`,
      `${ROOT}/src/application/grant-manual-entitlement/grant-manual-entitlement.service.ts`,
      `${ROOT}/src/application/revoke-entitlement/revoke-entitlement.service.ts`,
      `${ROOT}/src/application/manage-entitlement/manage-entitlement.service.ts`,
      `${ROOT}/src/application/access/check-access.service.ts`,
      `${ROOT}/src/application/access-check/access-check.service.ts`,
      `${ROOT}/src/application/list-my-courses/list-my-courses.service.ts`,
      `${ROOT}/src/application/list-catalog/list-catalog.service.ts`,
      `${ROOT}/src/infrastructure/persistence/drizzle/entitlement.repository.ts`,
      `${ROOT}/src/infrastructure/gateways/catalog-http.gateway.ts`,
      `${ROOT}/src/interfaces/http/routes/webhooks.routes.ts`,
    ],
  },
  {
    key: 'gami-domain',
    title: 'Gamification domain math (pure logic)',
    concerns: `The PURE domain logic of gamification. Hunt for: XP/coin computation errors; the Sao Paulo civil-day /
timezone logic (localDateSaoPaulo, the "day flips at 03:00Z" assumption — is it correct across DST? Brazil dropped DST,
but verify the offset handling is fixed-correct); advanceStreak / effectiveStreak / freezesNeeded / inVacation coverage
(off-by-one on inclusive [from,to] vacation windows; can a streak be wrongly kept or wrongly broken? does the free
monthly freeze grant correctly? can freezes go negative or exceed the cap?); applyDailyCap for coins (can the cap be
bypassed, or can earned-today reset incorrectly across the civil-day boundary?); streak milestone bonuses (exempt from
cap — double-credit?); missions determinism (FNV-1a assignment by (userId, period); week starts Monday — is the period
key stable and correct? could two periods collide?); league tier/promotion/relegation math; badge derivation from ledger
counts (1/2/3 courses, 1/10/30 perfect quizzes, studio mastery, coin-saver). Compare against docs/gamificacao.md for the
INTENDED numbers and call out any mismatch between doc and code.`,
    files: [
      `${ROOT}/src/domain/gamification/gamification.ts`,
      `${ROOT}/src/domain/gamification/coins.ts`,
      `${ROOT}/src/domain/gamification/missions.ts`,
      `${ROOT}/src/domain/gamification/league.ts`,
      `${ROOT}/src/domain/gamification/badges.ts`,
      `${ROOT}/src/domain/gamification/gamification.errors.ts`,
      `${ROOT}/src/domain/gamification/coins.errors.ts`,
      `${ROOT}/src/domain/room/room-catalog.ts`,
      `${ROOT}/src/domain/room/room.errors.ts`,
      `${ROOT}/src/domain/avatar/avatar-config.ts`,
      `${ROOT}/src/domain/avatar/parts-catalog.ts`,
      `${ROOT}/src/domain/avatar/avatar.errors.ts`,
      `docs/gamificacao.md`,
    ],
  },
  {
    key: 'gami-persistence',
    title: 'Gamification persistence, idempotency & ranking',
    concerns: `The gamification REPOSITORY + application services + ranking/profiles. This is the highest-risk area for
money/XP duplication and cross-profile leaks. Hunt for: ledger idempotency (xp_events / coin_events UNIQUE constraints +
onConflictDoNothing + RETURNING to separate new vs replay — can XP or coins be double-credited under retry/concurrency?);
the per-user advisory lock in award() (pg_advisory_xact_lock(hashtextextended(...)) — correct namespace, correct txn
scope?); coin_balance as source of truth vs coin_events.balanceAfter audit (can they diverge? is spend charge-first &
idempotent? can balance go negative under concurrent spend?); last_activity_date mode:'string' vs 'date' (UTC day-shift
bug); account_id immutability (written only on INSERT — could a profile-session call without x-auth-account-id re-key a
profile to itself?); the ranking query (competition ranking, snapshot consistency under concurrent award, index usage,
full-table scan risk, cohort = accounts with entitlement in the audience — is the requester correctly omitted when out
of cohort?); children-stats and public-profile services (do they leak another user's/profile's data? authz by account
vs data by profile). Avatar/room buy services: charge-first idempotency, ownership enforcement.`,
    files: [
      `${ROOT}/src/infrastructure/persistence/drizzle/gamification.repository.ts`,
      `${ROOT}/src/domain/ports/gamification-repository.port.ts`,
      `${ROOT}/src/application/gamification/award-gamification.service.ts`,
      `${ROOT}/src/application/gamification/buy-streak-freeze.service.ts`,
      `${ROOT}/src/application/gamification/claim-mission.service.ts`,
      `${ROOT}/src/application/gamification/get-gamification.service.ts`,
      `${ROOT}/src/application/gamification/get-league.service.ts`,
      `${ROOT}/src/application/gamification/get-missions.service.ts`,
      `${ROOT}/src/application/gamification/set-vacation.service.ts`,
      `${ROOT}/src/application/avatar/buy-avatar-part.service.ts`,
      `${ROOT}/src/application/avatar/equip-avatar.service.ts`,
      `${ROOT}/src/application/avatar/get-avatar.service.ts`,
      `${ROOT}/src/application/room/buy-room-item.service.ts`,
      `${ROOT}/src/application/room/get-room.service.ts`,
      `${ROOT}/src/application/room/save-room.service.ts`,
      `${ROOT}/src/application/children-stats/get-children-stats.service.ts`,
      `${ROOT}/src/application/profiles/get-public-profile.service.ts`,
      `${ROOT}/src/application/profile-allowance/get-profile-allowance.service.ts`,
      `${ROOT}/src/infrastructure/persistence/drizzle/avatar.repository.ts`,
      `${ROOT}/src/infrastructure/persistence/drizzle/room.repository.ts`,
    ],
  },
  {
    key: 'studio',
    title: 'Studio submissions, grading & anti-fraud',
    concerns: `The Studio activity submission/grading/carryover/showcase. The security model is "hybrid grading": the
client runs all checks and reports results, but the SERVER must RECALCULATE structure checks (verifiedBy:'server') and
only trust client for behavior/testcase/code. Hunt for: can a client forge a passing grade for a GATED activity (i.e. is
the structure recalculation actually authoritative for the gate, and does validateStudioActivityAuthoring truly require
>=1 structure check when passingScore is set?); the STICKY passed_at/score columns (can a later worse submission lower a
sticky pass, or can passed regress?); upsert last-wins correctness (1 row per user+block); body-size limits for the
project payload (MAX_STUDIO_BODY_BYTES / MAX_STUDIO_PROJECT_CHARS — enforced on BOTH author and student routes? bypass?);
carryover and showcase services — CROSS-PROFILE / CROSS-USER ISOLATION (access by ACCOUNT, project by PROFILE: can one
child read another child's project, or another account's?); showcase eligibility re-validation as an S2S trust boundary
(the hub re-checks via /internal/showcase-eligibility because the publish route is reachable by any active account — is
that re-check actually equivalent and un-forgeable?); the gradeStudioActivity / evaluateStructureRule logic correctness.`,
    files: [
      `${ROOT}/src/domain/course/studio-activity.ts`,
      `${ROOT}/src/application/submit-studio-project/submit-studio-project.service.ts`,
      `${ROOT}/src/application/get-studio-carryover/get-studio-carryover.service.ts`,
      `${ROOT}/src/application/get-showcase-payload/get-showcase-payload.service.ts`,
      `${ROOT}/src/application/studio-submissions-admin/studio-submissions-admin.service.ts`,
      `${ROOT}/src/infrastructure/persistence/drizzle/studio-submission.repository.ts`,
      `${ROOT}/src/domain/ports/studio-submission-repository.port.ts`,
      `${ROOT}/src/application/mark-lesson-complete/mark-lesson-complete.service.ts`,
      `${ROOT}/src/infrastructure/persistence/drizzle/course.repository.ts`,
    ],
  },
  {
    key: 'security-authz',
    title: 'Security & authz boundaries (HTTP edge)',
    concerns: `The HTTP edge security. Hunt for: internal-token enforcement — is x-internal-token (INTERNAL_API_TOKEN)
required on EVERY student route, EVERY /members/admin/* route, AND the S2S /members/internal/* routes? Find any route
missing it. HMAC webhook verification (webhook-auth.ts): canonical message "<METHOD>.<path>.<rawBody>", timing-safe
compare, timestamp/replay window, checked in transform BEFORE body validation; can a webhook be replayed or forged?
requireAdmin (X-Auth-User-* trust, missing x-auth-user-status treated as inactive, RBAC); profile/account header
handling (resolveAccountId = x-auth-account-id ?? x-auth-user-id) — any route that should isolate by profile but uses
the wrong id, enabling cross-profile/cross-account access or data writes? uuid validation at ALL id borders (params +
webhook/grant userIds) — any id reaching the DB unvalidated (22P02→500)? body-size limits (global 64KB vs the larger
studio limit — is bodyLimitForPath correct, and applied before parsing?); any header value that could be attacker-set
and trusted. Also check raw-body handling and error-handler for info leakage (stack traces, internal details to client).`,
    files: [
      `${ROOT}/src/interfaces/http/auth.ts`,
      `${ROOT}/src/interfaces/http/webhook-auth.ts`,
      `${ROOT}/src/interfaces/http/server.ts`,
      `${ROOT}/src/interfaces/http/raw-body.ts`,
      `${ROOT}/src/interfaces/http/error-handler.ts`,
      `${ROOT}/src/interfaces/http/dtos.ts`,
      `${ROOT}/src/interfaces/http/routes/members.routes.ts`,
      `${ROOT}/src/interfaces/http/routes/admin.routes.ts`,
      `${ROOT}/src/interfaces/http/routes/content.routes.ts`,
      `${ROOT}/src/interfaces/http/routes/internal.routes.ts`,
      `${ROOT}/src/interfaces/http/routes/webhooks.routes.ts`,
      `${ROOT}/src/interfaces/http/routes/health.routes.ts`,
    ],
  },
  {
    key: 'persistence-perf',
    title: 'Persistence, perf & concurrency (non-gamification)',
    concerns: `The non-gamification repositories + the cron + core student flows. Hunt for: N+1 queries (especially
list/outline/progress paths), missing/incorrect indexes for hot queries, full-table scans; Drizzle gotchas — unique
violation (23505) hidden in error.cause (DrizzleQueryError) so a top-level code===23505 guard never matches; mode:'date'
vs 'string' date columns; the retention cron (pg_try_advisory_xact_lock key, batched prune LIMIT loop, statement_timeout
on the shared DB); transaction boundaries and lost updates in mark-complete / quiz-attempt cooldown (the per-(user,block)
advisory lock — correct hashing, correct re-check inside txn?); progress computation counting only PUBLISHED lessons in
both numerator and denominator; quiz gabarito leak (does any read path send correctChoiceIds/explanation?); query
correctness in content-admin reorder (exact-children check), sortOrder max+1 inside INSERT, slug-duplicate handling;
upsert correctness in lesson_progress / video-position / course-rating.`,
    files: [
      `${ROOT}/src/infrastructure/persistence/drizzle/course.repository.ts`,
      `${ROOT}/src/infrastructure/persistence/drizzle/content-admin.repository.ts`,
      `${ROOT}/src/infrastructure/persistence/drizzle/progress.repository.ts`,
      `${ROOT}/src/infrastructure/persistence/drizzle/quiz-attempt.repository.ts`,
      `${ROOT}/src/infrastructure/persistence/drizzle/video-position.repository.ts`,
      `${ROOT}/src/infrastructure/persistence/drizzle/course-rating.repository.ts`,
      `${ROOT}/src/infrastructure/persistence/drizzle/processed-webhook.repository.ts`,
      `${ROOT}/src/infrastructure/persistence/drizzle/db.ts`,
      `${ROOT}/src/composition-root.ts`,
      `${ROOT}/src/application/mark-lesson-complete/mark-lesson-complete.service.ts`,
      `${ROOT}/src/application/submit-quiz-attempt/submit-quiz-attempt.service.ts`,
      `${ROOT}/src/application/get-course-progress/get-course-progress.service.ts`,
      `${ROOT}/src/application/get-lesson/get-lesson.service.ts`,
      `${ROOT}/src/application/get-my-course/get-my-course.service.ts`,
      `${ROOT}/src/application/save-video-position/save-video-position.service.ts`,
      `${ROOT}/src/application/save-course-rating/save-course-rating.service.ts`,
      `${ROOT}/src/domain/progress/progress.ts`,
    ],
  },
  {
    key: 'contracts-mappers',
    title: 'HTTP contracts, mappers, data leaks & cross-package',
    concerns: `Output mappers, DTO completeness, and contract drift. Hunt for: data leaks in member-facing projections —
any mapper that forwards internal fields it should strip (storageRef/url of attachments & ebook, quiz correctChoiceIds/
explanation, snapshot internals, other users' data); Date→ISO conversion correctness (timezone, null handling); DTO
input validation completeness vs what services assume (e.g. numeric ranges, enum mirrors, nullable handling); the
error-handler domain-error → HTTP status mapping completeness (every DomainError subclass mapped? unmapped → 500?);
cross-package contract alignment — grep packages/api-gateway for the members route table and confirm EVERY members route
exposed here is routed AND has x-internal-token injected (student + admin + internal); confirm the catalog S2S contract
(GET /catalog/offers/:slug/entitlements) shape matches catalog-http.gateway parsing; confirm community/community-kids
BFFs and hub showcase-eligibility consume the shapes these mappers emit. Flag any field a mapper emits that no consumer
needs (or vice versa: a consumer expecting a field the mapper dropped).`,
    files: [
      `${ROOT}/src/application/mappers/views.ts`,
      `${ROOT}/src/application/mappers/admin-views.ts`,
      `${ROOT}/src/application/mappers/admin-content-views.ts`,
      `${ROOT}/src/interfaces/http/dtos.ts`,
      `${ROOT}/src/interfaces/http/error-handler.ts`,
      `${ROOT}/src/domain/course/lesson-block.ts`,
      `${ROOT}/src/domain/course/quiz.ts`,
      `${ROOT}/src/domain/course/course.ts`,
      `${ROOT}/src/interfaces/http/routes/members.routes.ts`,
      `${ROOT}/src/interfaces/http/routes/internal.routes.ts`,
    ],
  },
  {
    key: 'config-deploy',
    title: 'Config, deploy, migrations & prod-readiness',
    concerns: `Boot/config/deploy correctness. Hunt for: env.ts fail-fast refines — are all prod-required secrets/URLs
truly enforced in production (GATEWAY_HMAC_SECRET always; INTERNAL_API_TOKEN, CATALOG_INTERNAL_TOKEN, CATALOG_BASE_URL
not localhost, HUB_BASE_URL not localhost when set; numeric envs validated)? any env read directly via process.env
outside the validated config? Dockerfile + railway.json correctness (healthcheck /readyz, preDeployCommand = db:migrate
ONLY not seed, build context, watchPatterns, EXPOSE/PORT, HOST=:: dual-stack); index.ts boot order (Sentry init after
loadEnv, signal handlers, graceful shutdown, flush); composition-root wiring (any port left noop in prod that should be
real, cron intervals); MIGRATION CONSISTENCY — spot-check the newer migration SQL (0008–0022) against schema.ts and the
meta snapshots/_journal.json: do the DDL columns/enums/indexes/constraints match what schema.ts declares and what the
repositories query? any migration that creates an index the code never uses, or a column the code reads but the migration
never created? readyz/health correctness.`,
    files: [
      `${ROOT}/src/infrastructure/config/env.ts`,
      `${ROOT}/src/index.ts`,
      `${ROOT}/src/composition-root.ts`,
      `${ROOT}/src/infrastructure/observability/sentry.ts`,
      `${ROOT}/src/infrastructure/persistence/drizzle/schema.ts`,
      `${ROOT}/Dockerfile`,
      `${ROOT}/railway.json`,
      `${ROOT}/drizzle.config.ts`,
      `${ROOT}/src/infrastructure/persistence/drizzle/migrations/0008_closed_mephistopheles.sql`,
      `${ROOT}/src/infrastructure/persistence/drizzle/migrations/0009_aromatic_captain_stacy.sql`,
      `${ROOT}/src/infrastructure/persistence/drizzle/migrations/0014_thin_slayback.sql`,
      `${ROOT}/src/infrastructure/persistence/drizzle/migrations/0015_nostalgic_wolfpack.sql`,
      `${ROOT}/src/infrastructure/persistence/drizzle/migrations/0018_add_zappy_coins.sql`,
      `${ROOT}/src/infrastructure/persistence/drizzle/migrations/0021_add_missions_and_freeze.sql`,
      `${ROOT}/src/infrastructure/persistence/drizzle/migrations/0022_add_league.sql`,
    ],
  },
]

const FINDINGS_SCHEMA = {
  type: 'object',
  required: ['dimension', 'summary', 'findings'],
  additionalProperties: false,
  properties: {
    dimension: { type: 'string' },
    summary: { type: 'string', description: 'one-paragraph assessment of this dimension overall' },
    findings: {
      type: 'array',
      items: {
        type: 'object',
        required: ['title', 'severity', 'file', 'lines', 'category', 'description', 'evidence', 'impact', 'suggestedFix', 'confidence'],
        additionalProperties: false,
        properties: {
          title: { type: 'string' },
          severity: { type: 'string', enum: ['critical', 'high', 'medium', 'low', 'info'] },
          file: { type: 'string', description: 'path relative to repo root' },
          lines: { type: 'string', description: 'e.g. "123-145"' },
          category: { type: 'string', description: 'e.g. security, correctness, race, idempotency, perf, leak, deadcode, contract' },
          description: { type: 'string', description: 'what is wrong and why' },
          evidence: { type: 'string', description: 'the exact offending code, quoted' },
          impact: { type: 'string', description: 'concrete consequence' },
          suggestedFix: { type: 'string' },
          confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
        },
      },
    },
  },
}

const VERDICT_SCHEMA = {
  type: 'object',
  required: ['verdict', 'confidence', 'reasoning', 'adjustedSeverity'],
  additionalProperties: false,
  properties: {
    verdict: { type: 'string', enum: ['confirmed', 'false-positive', 'uncertain'] },
    confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
    reasoning: { type: 'string', description: 'what the code at the cited lines actually does, and why the finding holds or fails' },
    adjustedSeverity: { type: 'string', enum: ['critical', 'high', 'medium', 'low', 'info'] },
    correctedClaim: { type: 'string', description: 'if the finding is partially right, the accurate version; else empty' },
  },
}

phase('Find')

const results = await pipeline(
  DIMENSIONS,
  // STAGE 1 — find
  (d) => agent(
    `You are reviewing the @sistemazero/members package. DIMENSION: ${d.title}.

${DESIGN_CONTEXT}

YOUR FOCUS:
${d.concerns}

START by reading these files (and follow symbols/imports into others as needed with Read/Grep):
${d.files.map((f) => '  - ' + f).join('\n')}

Return ONLY grounded findings (each with exact file:lines and a quoted code snippet). If a file in the list does not
exist, skip it silently. Be thorough but precise — a wrong finding wastes a verifier. Order findings by severity.`,
    { label: `find:${d.key}`, phase: 'Find', schema: FINDINGS_SCHEMA },
  ),
  // STAGE 2 — adversarially verify each finding
  (review, d) => {
    if (!review || !review.findings || review.findings.length === 0) return []
    return parallel(review.findings.map((f, i) => () =>
      agent(
        `You are an ADVERSARIAL verifier for a code review of @sistemazero/members (root: ${ROOT}/).
Your job is to REFUTE the finding below. Open the cited file, read the cited lines AND enough surrounding context to
judge correctly, and follow any symbols needed. Decide whether the finding is a real defect.

Rules:
- Default to "false-positive" if you are not convinced. Misreadings, "bugs" actually handled elsewhere, and deliberate
  documented trade-offs (best-effort webhook dedupe; fail-open gamification; revokes not notifying hub; no XP backfill;
  virtual privileged all_courses; master key adult-only) are NOT defects — mark them false-positive.
- Only "confirmed" if you can SEE the defect in the actual code and articulate a concrete failing scenario.
- If real but mis-stated, use "confirmed" with correctedClaim and the right adjustedSeverity.
- Be honest about severity: downgrade theoretical/defense-in-depth items; reserve critical/high for real impact.

FINDING (dimension: ${d.title}):
  title: ${f.title}
  severity(claimed): ${f.severity}   confidence(claimed): ${f.confidence}
  file: ${f.file}   lines: ${f.lines}   category: ${f.category}
  description: ${f.description}
  evidence: ${f.evidence}
  impact: ${f.impact}
  suggestedFix: ${f.suggestedFix}`,
        { label: `verify:${d.key}#${i + 1}`, phase: 'Verify', schema: VERDICT_SCHEMA, effort: 'high' },
      ).then((v) => ({ ...f, dimension: d.title, dimensionKey: d.key, verdict: v }))
    ))
  },
)

// Flatten, drop nulls, keep everything (confirmed + uncertain + false-positive) so the synthesizer can see the full picture.
const all = results.flat().filter(Boolean)
const confirmed = all.filter((f) => f.verdict && f.verdict.verdict === 'confirmed')
const uncertain = all.filter((f) => f.verdict && f.verdict.verdict === 'uncertain')
const rejected = all.filter((f) => f.verdict && f.verdict.verdict === 'false-positive')

const sevRank = { critical: 0, high: 1, medium: 2, low: 3, info: 4 }
const bySev = (a, b) => (sevRank[a.verdict?.adjustedSeverity ?? a.severity] ?? 9) - (sevRank[b.verdict?.adjustedSeverity ?? b.severity] ?? 9)

log(`Findings: ${confirmed.length} confirmed, ${uncertain.length} uncertain, ${rejected.length} rejected (of ${all.length} raw).`)

return {
  confirmed: confirmed.sort(bySev),
  uncertain: uncertain.sort(bySev),
  rejected: rejected.sort(bySev),
  counts: { confirmed: confirmed.length, uncertain: uncertain.length, rejected: rejected.length, raw: all.length },
}
