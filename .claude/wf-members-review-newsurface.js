export const meta = {
  name: 'members-full-review-newsurface',
  description: 'Full review of @sistemazero/members NEW surface since the 3rd full review (certificates + sequential lesson-lock + studio sharing/showcase + content-admin authoring): finder dimensions read real code; every finding adversarially verified.',
  phases: [
    { title: 'Find', detail: 'parallel finders per dimension read real code and report grounded findings' },
    { title: 'Verify', detail: 'one adversarial verifier per finding re-reads the cited code and renders a verdict' },
  ],
}

const ROOT = 'packages/members'

const DESIGN_CONTEXT = `
PACKAGE: @sistemazero/members (root: ${ROOT}/). Bun + TypeScript (ESM) + Elysia + PostgreSQL/Drizzle + Zod + TypeBox.
DDD/Hexagonal. Backend-only API on port 3004; only reachable through the api-gateway over private networking. It is the
"members area": access engine (entitlements materialized from payments/funnel webhooks) + content/progress
(courses→modules→lessons→polymorphic blocks) + kids gamification + Studio submissions + Netflix-style child PROFILES.

THIS REVIEW TARGETS ONLY THE NEW SURFACE built AFTER the previous full review (which already covered the access engine,
gamification, base studio submissions, profiles, children-stats, leagues). The new surface is:
  (A) CERTIFICATES of completion (block kind 'certificate'; migration 0025; certificates_issued table): eligibility gate,
      idempotent issuance, public validation, admin revoke, PDF authoring config.
  (B) SEQUENTIAL LESSON-LOCK (Duolingo-style; migration 0027; courses.sequential_lock): a lesson unlocks only when ALL
      PRECEDING PUBLISHED lessons are completed. (This part is UNCOMMITTED working-tree code.)
  (C) STUDIO SHARING / SHOWCASE / load-own-submission (showcase publish + hub S2S re-validation; carryover).
  (D) CONTENT-ADMIN AUTHORING refinements (block catalog + per-lesson toolbox restriction + studio block config).

HOW TO REVIEW:
- READ THE ACTUAL CODE. Do NOT trust comments or CLAUDE.md; verify every claim against source. Use Read on whole files
  and Grep to follow symbols across files (and into other packages where a contract is claimed).
- Every finding MUST cite an exact file path + line range and QUOTE the offending code. No speculation, no
  "consider adding tests" filler. If you cannot point to specific code, do not report it.
- Severity rubric: critical = security breach / access-control bypass / a learner obtaining a credential or content they
  must not / data corruption or cross-user(or cross-profile) data leak. high = a real correctness bug affecting users, or
  a race that corrupts persisted state. medium = edge-case bug, perf cliff at scale, missing input validation with real
  impact. low = smell / minor inconsistency / defense-in-depth gap. info = nit/style.
- Prefer FEWER, HIGHER-CONFIDENCE findings over a long list. Quality over quantity.

ACCEPTED & DELIBERATE TRADE-OFFS (do NOT report these as bugs unless you can show the stated rationale is actually wrong):
CERTIFICATES:
- The certificate does NOT have to be the LAST lesson (user decision): lessons may exist AFTER it (they do not gate); only
  PUBLISHED lessons BEFORE the certificate lesson gate eligibility. There is a FLOOR of >=1 preceding published lesson (a
  certificate on the very first lesson must NOT issue a diploma for zero work).
- Issuance CONCLUDES the certificate lesson DIRECTLY (it does not go through mark-lesson-complete), so the certificate
  lesson is forbidden by authoring from containing a COMPLETION-GATING block (quiz with passingScore, or studio) — because
  such a gate would be skipped. The authoring guard (isCompletionGatingBlock / lessonHasGatingBlock) is the safety. A cert
  lesson MAY contain non-gating content (video/text/image/fixation quiz).
- certificates_issued.course_id is a SNAPSHOT with NO FK to courses — the diploma is a permanent public credential; deleting
  the course must not destroy it. Validation runs only over course_ref/course_title/student_name/serial.
- The student NAME comes from TRUSTED gateway headers (x-auth-profile-name kids ?? x-auth-user-name, URI-decoded), never
  from the request body.
- Revoke is TERMINAL: re-issue after revoke returns 410 CERTIFICATE_REVOKED; the lesson/course stay completed (revoke only
  invalidates the credential). Old PDF config fields (title/logoUrl/issuerName/signatureImageUrl/message) are deprecated but
  TOLERATED for back-compat.
SEQUENTIAL LOCK:
- Default ON; existing courses backfilled ON (migration 0027 default true). Toggle per course by admin. CREATE without the
  field => true; UPDATE without the field => PRESERVE current (do not silently turn off).
- Privileged actors (superadmin/admin/staff) IGNORE the lock (mirrors the virtual master key). A completed lesson NEVER
  locks (mirrors "completion never regresses"). The first published lesson never locks.
- It REUSES precedingPublishedLessonIds from the certificate domain on purpose so lock order == progress order == cert order.
GENERAL (still in force from prior reviews):
- Webhook dedupe is best-effort "mark only AFTER success" (idempotent grant/revoke). AwardGamificationService is FAIL-OPEN.
  Master key all_courses covers only audience='adult'. Privileged = virtual entitlement, excluded from rankings.

WHAT TO HUNT (in addition to your dimension's specifics): access-control / gate bypass (can a learner get a certificate or
reach a locked lesson they should not?), idempotency breaks, cross-user/cross-profile data leakage, SQL/query correctness,
N+1 and perf cliffs, duplicate DB round-trips, missing input validation that reaches the DB or leaks internal data,
timezone/date bugs, unmapped domain errors (=> 500), and cross-package contract drift (gateway route table, BFF/hub consumers).
Also flag genuinely dead/duplicated code and clear correctness-relevant inconsistencies.
`

const DIMENSIONS = [
  {
    key: 'cert-gate',
    title: 'Certificates — eligibility gate, issuance idempotency & state machine',
    concerns: `The certificate ISSUANCE path and its eligibility GATE. This is the highest risk: issuance concludes the
lesson DIRECTLY, bypassing mark-lesson-complete's gates. Hunt for: (1) can a learner ISSUE a certificate without truly
finishing the required work? Verify eligibleForCertificate + precedingPublishedLessonIds really require ALL published
lessons BEFORE the cert lesson to be completed, the >=1 floor holds, and that quiz/studio gates of PRECEDING lessons are
covered transitively (a preceding lesson is only "completed" if its own gates passed). (2) Is the authoring guard that
forbids a COMPLETION-GATING block on the certificate lesson airtight (create + update + turning a block into a gating one
+ turning a lesson into a certificate)? If a gating block could coexist on the cert lesson, issuance would skip it. (3)
Issuance idempotency by (user, course) — concurrent double-POST: can two certificates be issued, or two serials burned?
Is there a unique constraint / advisory lock / onConflict, and does the RETURNING distinguish new vs replay? (4) generateSerial
collision/format. (5) does issuance correctly conclude the lesson and award the course-complete badge fail-open? (6) revoke
TERMINAL + reissue 410; does revoke leave lesson/course completed? Read the domain helpers AND the service AND the repo.`,
    files: [
      `${ROOT}/src/domain/certificate/certificate.ts`,
      `${ROOT}/src/application/issue-certificate/issue-certificate.service.ts`,
      `${ROOT}/src/application/get-certificate/get-certificate.service.ts`,
      `${ROOT}/src/application/mark-lesson-complete/mark-lesson-complete.service.ts`,
      `${ROOT}/src/domain/course/lesson-block.ts`,
      `${ROOT}/src/domain/course/course.ts`,
      `${ROOT}/src/infrastructure/persistence/drizzle/certificate.repository.ts`,
      `${ROOT}/src/domain/ports/certificate-repository.port.ts`,
      `${ROOT}/src/application/content-admin/content-admin.service.ts`,
    ],
  },
  {
    key: 'cert-validation',
    title: 'Certificates — public validation, revoke, PDF config & cross-package',
    concerns: `The certificate READ/validation/revoke surface and its contracts. Hunt for: (1) public validation route
GET /members/internal/certificates/:id/validate is exposed as PUBLIC at the gateway — does ValidateCertificateService leak
ANY PII or sensitive field (only {valid, studentName, courseTitle, issuedAt, serial} should escape)? Is the id validated
(uuid) so junk does not 22P02->500? (2) admin revoke route authz (x-internal-token + requireAdmin) and idempotency/terminal
semantics. (3) PDF authoring CONFIG validation in DTOs: baseImageUrl / signatures[].imageUrl / accentColor / introLine /
coursePhrase / bodyText — are URLs constrained to http(s) (no javascript:/data: that the admin panel or BFF would render)?
length caps? signatures capped at 2? (4) name resolution from TRUSTED headers (URI-decode failure handling). (5) cross-package:
grep packages/api-gateway for the certificate routes (get/issue/validate/revoke) — every one routed, validate marked public,
the others with x-internal-token injected; confirm migration 0025 DDL matches schema.ts certificates_issued + what the repo
reads/writes; confirm the community/community-kids/admin BFFs + the /validar/:id page consume exactly the emitted shape.`,
    files: [
      `${ROOT}/src/application/validate-certificate/validate-certificate.service.ts`,
      `${ROOT}/src/infrastructure/persistence/drizzle/certificate.repository.ts`,
      `${ROOT}/src/domain/ports/certificate-repository.port.ts`,
      `${ROOT}/src/interfaces/http/routes/members.routes.ts`,
      `${ROOT}/src/interfaces/http/routes/internal.routes.ts`,
      `${ROOT}/src/interfaces/http/routes/admin.routes.ts`,
      `${ROOT}/src/interfaces/http/dtos.ts`,
      `${ROOT}/src/application/mappers/views.ts`,
      `${ROOT}/src/application/mappers/admin-content-views.ts`,
      `${ROOT}/src/infrastructure/persistence/drizzle/schema.ts`,
      `${ROOT}/src/infrastructure/persistence/drizzle/migrations/0025_add_certificates.sql`,
    ],
  },
  {
    key: 'lock-domain',
    title: 'Sequential lesson-lock — pure domain & gate semantics',
    concerns: `The PURE locking logic and the deep gate. Hunt for: (1) do isLessonLocked (single) and lockedLessonIds (batch)
agree on EVERY input? Walk the O(n) batch loop vs the per-lesson definition for off-by-one (the lesson whose immediate
predecessor is incomplete; the first lesson; a lesson after a long completed prefix). (2) "completed never locks" — both
functions must exempt already-completed lessons even if an earlier one is incomplete (reopened/unpublished). (3) the gate
is skipped for privileged and when sequentialLock is false — verify assertLessonUnlocked* and lockedLessonSetForCourse
honor BOTH. (4) ordering: orderedPublishedLessonIds is module.sortOrder -> lesson.sortOrder and PUBLISHED-only, identical to
precedingPublishedLessonIds (shared) and to progress order — any divergence is a real bug. (5) interaction with the
certificate lesson placed mid-course: a certificate lesson can itself be LOCKED (intended), and lessons after it are not
gated by it — confirm no contradiction between "cert not last" and the lock chain. (6) LessonLockedError -> 423 mapping.`,
    files: [
      `${ROOT}/src/domain/progress/locking.ts`,
      `${ROOT}/src/application/lesson-locking/lesson-locking.ts`,
      `${ROOT}/src/domain/certificate/certificate.ts`,
      `${ROOT}/src/domain/course/course.errors.ts`,
      `${ROOT}/src/domain/course/course.ts`,
      `${ROOT}/src/domain/progress/progress.ts`,
      `${ROOT}/src/interfaces/http/error-handler.ts`,
    ],
  },
  {
    key: 'lock-integration',
    title: 'Sequential lesson-lock — integration, perf, DTO & cross-package',
    concerns: `How the lock plugs into the student flows. Hunt for: (1) DUPLICATE DB work — resolveLessonLockState fetches
findOutline(publishedOnly) + listCompletedLessonIds; does get-lesson.service ALSO already fetch the outline and/or completed
ids elsewhere in the same request (redundant round-trips on the hot path)? Same for get-my-course building the locked set.
(2) get-my-course outline 'locked' projection correctness + any N+1. (3) does the 423 deep gate in get-lesson run AFTER the
existing access/published checks (a locked lesson the learner has no access to should still 403/404 first, not reveal lock
state)? (4) mark-lesson-complete: completing a lesson must unlock the next; verify there is no stale-read race and the
completed set used for locking reflects the just-completed lesson where required. (5) DTO: LessonOutlineView.locked present
and typed; CourseBody.sequentialLock optional with CREATE=>true / UPDATE=>preserve actually implemented in the admin update
path; content.routes wiring. (6) composition-root wiring of the new service (ports passed correctly). (7) cross-package:
grep packages/community and packages/community-kids for 'locked' consumption and the 423 LESSON_LOCKED handling.`,
    files: [
      `${ROOT}/src/application/get-lesson/get-lesson.service.ts`,
      `${ROOT}/src/application/get-my-course/get-my-course.service.ts`,
      `${ROOT}/src/application/mark-lesson-complete/mark-lesson-complete.service.ts`,
      `${ROOT}/src/application/lesson-locking/lesson-locking.ts`,
      `${ROOT}/src/application/list-my-courses/list-my-courses.service.ts`,
      `${ROOT}/src/application/mappers/views.ts`,
      `${ROOT}/src/interfaces/http/dtos.ts`,
      `${ROOT}/src/interfaces/http/routes/content.routes.ts`,
      `${ROOT}/src/composition-root.ts`,
      `${ROOT}/src/application/content-admin/content-admin.service.ts`,
      `${ROOT}/src/infrastructure/persistence/drizzle/course.repository.ts`,
      `${ROOT}/src/domain/ports/content-admin-repository.port.ts`,
    ],
  },
  {
    key: 'studio-sharing',
    title: 'Studio sharing / showcase / load-own-submission — isolation & trust boundary',
    concerns: `The newer Studio sharing surface. Security model: access is by ACCOUNT, the project/submission is by PROFILE
(child) — one child must never read another child's or another account's project. Hunt for: (1) cross-profile / cross-account
leakage in get-showcase-payload, get-own-studio-submission, get-studio-carryover (getOne(userId, ...) must scope to the
PROFILE, access checked by ACCOUNT). (2) the showcase PUBLISH path is reachable by any active account at the edge, so the HUB
re-validates eligibility via GET /members/internal/showcase-eligibility — is that S2S re-check truly equivalent and
un-forgeable (same service, privileged:false, ids from S2S not from caller body)? (3) eligibility flags (eligible:false when
not showcase/disabled/no submission) — any way to coax eligible:true without a real qualifying submission? (4) body-size limit
for the project payload still enforced on these routes.`,
    files: [
      `${ROOT}/src/application/get-showcase-payload/get-showcase-payload.service.ts`,
      `${ROOT}/src/application/get-own-studio-submission/get-own-studio-submission.service.ts`,
      `${ROOT}/src/application/get-studio-carryover/get-studio-carryover.service.ts`,
      `${ROOT}/src/application/submit-studio-project/submit-studio-project.service.ts`,
      `${ROOT}/src/infrastructure/persistence/drizzle/studio-submission.repository.ts`,
      `${ROOT}/src/domain/ports/studio-submission-repository.port.ts`,
      `${ROOT}/src/interfaces/http/routes/members.routes.ts`,
      `${ROOT}/src/interfaces/http/routes/internal.routes.ts`,
    ],
  },
  {
    key: 'content-admin',
    title: 'Content-admin authoring — block catalog, toolbox restriction & studio config',
    concerns: `The content-admin authoring refinements (block catalog + per-lesson toolbox restriction + studio block config).
Hunt for: (1) validation of the studio block config (allowBlocks RESTRICTIVE semantics, allowCategories, allowedModes, level,
initialProject size cap MAX_STUDIO_PROJECT_CHARS) — any field that reaches the DB unvalidated or a cap not enforced. (2)
validateStudioActivityAuthoring still requires >=1 server-verifiable structure check when passingScore is set (a gated
activity gradable purely by client-trusted checks is forgeable). (3) the certificate-lesson authoring guards (no gating block)
wired in create/update/reorder. (4) reorder exact-children check + sortOrder max+1 inside INSERT + unique sort_order indexes
(migration 0024) — any way to violate them or to corrupt order. (5) any member-facing projection of authoring config leaking
something it should not (config is not secret, but confirm). (6) DTO completeness for the new authoring fields.`,
    files: [
      `${ROOT}/src/application/content-admin/content-admin.service.ts`,
      `${ROOT}/src/infrastructure/persistence/drizzle/content-admin.repository.ts`,
      `${ROOT}/src/domain/ports/content-admin-repository.port.ts`,
      `${ROOT}/src/domain/course/studio-activity.ts`,
      `${ROOT}/src/domain/course/lesson-block.ts`,
      `${ROOT}/src/interfaces/http/dtos.ts`,
      `${ROOT}/src/application/mappers/admin-content-views.ts`,
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
  (d) => agent(
    `You are reviewing the @sistemazero/members package. DIMENSION: ${d.title}.

${DESIGN_CONTEXT}

YOUR FOCUS:
${d.concerns}

START by reading these files (and follow symbols/imports into others as needed with Read/Grep, including into
packages/api-gateway, packages/community, packages/community-kids when a contract is claimed):
${d.files.map((f) => '  - ' + f).join('\n')}

Return ONLY grounded findings (each with exact file:lines and a quoted code snippet). If a file in the list does not
exist, skip it silently. Be thorough but precise — a wrong finding wastes a verifier. Order findings by severity.`,
    { label: `find:${d.key}`, phase: 'Find', schema: FINDINGS_SCHEMA },
  ),
  (review, d) => {
    if (!review || !review.findings || review.findings.length === 0) return []
    return parallel(review.findings.map((f, i) => () =>
      agent(
        `You are an ADVERSARIAL verifier for a code review of @sistemazero/members (root: ${ROOT}/).
Your job is to REFUTE the finding below. Open the cited file, read the cited lines AND enough surrounding context to judge
correctly, and follow any symbols needed (including into other packages for contract claims). Decide whether the finding is
a real defect.

Rules:
- Default to "false-positive" if you are not convinced. Misreadings, "bugs" actually handled elsewhere, and the documented
  deliberate trade-offs (certificate not-last-lesson; >=1 preceding floor; gating-block authoring guard; snapshot no-FK
  course_id; name from trusted headers; revoke terminal; sequential lock default-ON / privileged-bypass / completed-never-
  locks / UPDATE-preserves; best-effort webhook dedupe; fail-open gamification) are NOT defects — mark them false-positive.
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
