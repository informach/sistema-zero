export const meta = {
  name: 'community-full-review',
  description: 'Full review of @sistemazero/community (the ADULT learner app) + the @sistemazero/member-shell BFF it runs: finder dimensions read real code, every finding adversarially verified.',
  phases: [
    { title: 'Find', detail: 'parallel finders per dimension read real code and report grounded findings' },
    { title: 'Verify', detail: 'one adversarial verifier per finding re-reads the cited code and renders a verdict' },
  ],
}

const CO = 'packages/community/src'
const MS = 'packages/member-shell/src'

const DESIGN_CONTEXT = `
SCOPE: @sistemazero/community is the ADULT learner area (Next.js 16 App Router + React 19 + Tailwind v4, port 3007).
It is a BFF: the browser hits same-origin Route Handlers /api/* (HttpOnly cookies sz_member_*) which call the api-gateway
(NEVER the services directly). In 06/2026 ~all logic was EXTRACTED to @sistemazero/member-shell (${MS}/) — shared with
community-kids. So the community app today is: src/server/shell.ts (one createShell({cookieBase:'sz_member',audience:'adult'})
call) + thin shims + 1-3 line route.ts files that re-export shell.routes.* + proxy.ts (config+matcher) + identity components +
globals.css. THE REAL BEHAVIOR LIVES IN member-shell — review it as part of community (it is what the adult app executes).

WHICH member-shell surface the ADULT app actually exposes (it has route.ts for these — others like gamification/avatar/room/
profiles are KIDS-ONLY and NOT reachable here, do not review them): auth (login/logout/forgot/reset/otp/me/me-password),
me/avatar upload, course attachment download + ebook PDF (R2 private, watermarked), the FULL hub/forum (spaces/channels/threads/
comments/reactions/seen/report/uploads), certificate state+issue + public /validar/:id, members lesson complete/position/
quiz-attempts/rating/studio-submission/studio-carryover, payments/my.

ARCHITECTURE INVARIANTS (these are CORRECT — do not report them as bugs):
- Community never calls services directly; only via gateway (server/gateway.ts). Exception: /api/me/avatar + hub image upload +
  studio publish talk to R2 directly (external provider) and have their OWN strict session guard (requireUploadSession) + the
  same anti-CSRF check; they sit OUTSIDE the proxy matcher (proxy would buffer the multipart body).
- Session (server/session.ts): access JWT verified by alg — HS256 (JWT_HS256_SECRET, dev) or RS256 via JWKS (JWT_JWKS_URL, prod).
  PROD boot REQUIRES JWT_JWKS_URL and REFUSES JWT_HS256_SECRET (a weak HS256 secret would forge the LOCAL session that authorizes
  media/download routes, which do NOT pass through the gateway). getSession tolerates exp ONLY for display; the media/download
  guard is STRICT (expired token does NOT authorize: verifyAccessToken + ONE tryRefresh + re-verify).
- Cookies (lib/cookies.ts is the single source of names): sz_member_*, in prod prefixed __Host- (Secure+Path=/+no Domain).
  REMOVAL must use expireCookieOptions (set('', maxAge:0) WITH Secure) — a bare cookies().delete() is REJECTED by the browser for
  __Host-* and the cookie SURVIVES (logout would not log out). SameSite=Lax.
- Refresh (server/refresh.ts): single-flight + 60s cache PER refresh token, state in globalThis via Symbol.for (NOT module scope —
  Turbopack emits separate proxy/RSC/handler bundles with their own module copies; same process => globalThis is the meeting
  point). Presenting the same refresh token twice would trip the auth's reuse-detection and revoke the family (surprise logout).
  RÉPLICA ÚNICA per app is a deliberate constraint (globalThis state is per-process).
- Every OUTBOUND call (data/login/otp/refresh, incl. the proxy's) forwards x-forwarded-for / x-request-id (so the auth's per-IP
  rate limit — login 20/min, OTP 5/min — and failed-login audit see the LEARNER, not the host) and has AbortSignal.timeout
  (data 60s, auth 15s). x-internal-token is injected by the GATEWAY, never forwarded from the client.
- Anti-CSRF: proxy blocks non-same-origin MUTATIONS to /api/* (Sec-Fetch-Site with Origin×host fallback, lib/csrf.ts) — defense in
  depth beyond SameSite=Lax (which does NOT block a sibling subdomain). Security HEADERS live in next.config.ts headers() (cover
  ALL responses incl. routes outside the matcher), NOT in the proxy.
- Lesson blocks are third-party content: NEVER interpolate a raw src into an iframe — extract the id and build the canonical URL
  (youtube-nocookie/embed/<id>, player.vimeo.com/video/<id>). Embed v3 is ALWAYS srcDoc sandbox (fixed allow-scripts, NO
  allow-same-origin — content.sandbox from members is IGNORED on purpose; the CSP of the parent is inherited by srcDoc, the real
  boundary is the sandbox). rich_text + quiz render markdown via a controlled converter (lib/markdown.tsx, no raw HTML).
- UGC privacy (hub/forum, NON-NEGOTIABLE): the BFF REDACTS the authorId of THIRD parties in thread/comment views (lib/hub-redact:
  okRedacted) — only the viewer's own id reaches the browser (so HubThreadView/HubCommentView.authorId is string|null; apps only
  compare to label "Você"/"Colega"). UGC bodies render via renderUgcMarkdown (restricted: NO external <img> = pixel tracker
  leaking the reader's IP, links as TEXT only) and the WRITE strips image markdown at the source. renderMarkdown (raw, with
  ![](…)/<a>) is ONLY for ADMIN content. Hub/profile path ids are validated as UUID at the edge.
- Showcase ("Mural"): the BFF does NOT send title/summary/author-name/idempotency — the HUB re-validates eligibility S2S at the
  members service and uses the authoritative title + the trusted x-auth-profile-name header. redactAuthors preserves
  authorDisplayName (showcase-only) and exposes authorProfileId only when the author is PUBLIC (parental opt-in).
- Certificate: name comes from TRUSTED gateway headers, never the body. The PDF authoring config is fetched SERVER-SIDE and
  fetchImage has an SSRF guard isSafeRemoteUrl (rejects localhost/.internal/private IP/link-local 169.254). PDF cached in R2
  private certificates/<id>.pdf. Public /validar/:id is FORA dos protectedPrefixes, noindex; the shim /api/certificates/:id/validate
  is OUTSIDE the proxy matcher. Impersonation = 403 read-only on issue.
- Media/downloads: files >20MB (DIRECT_DELIVERY_MIN_BYTES) => 302 to a presigned R2 GET (avoids zombie downloads holding RAM);
  watermark preserved via a per-learner cache key watermarkCacheKey = sha256(srcKey) (INJECTIVE — a lossy substitution could
  collide and serve the wrong learner's PDF). Watermarking passes a concurrency GATE (watermark-queue.ts, max 1, FIFO, globalThis)
  — buffering+marking without a cap would OOM the host. storageRef NEVER reaches the browser. mediaErrorResponse does NOT leak the
  internal message in prod (goes to Sentry). meAvatar.POST refuses a PROFILE session (account-only). Content-Length is MANDATORY on
  upload (411 if absent; 413 if over) BEFORE formData(). watermarkImage has limitInputPixels + total-pixel cap for animated GIF.
- Studio sharing: POST /api/studio/publish (multipart, OUTSIDE matcher, own requireUploadSession) runs sanitizePlayableProject
  (canonical files required; extraFiles/assets/installedExtensions safe arrays; size caps re-checked; invalid JSON 400, over 413)
  before persisting to R2 private studio/play/<uuid>.json; GET /api/studio/play/:id is PUBLIC (no login), same-origin stream, 404
  on miss. The studio project id key must stay in /^[A-Za-z0-9_-]+$/ (the Studio rejects ids with ':' and swaps a random ULID,
  orphaning the child's autosaved draft) — lessonStudioProjectId(blockId, viewerId).
- Studio block draft SEED ORDER is deliberate: (1) local IndexedDB draft per PROFILE ALWAYS wins → (2) own cloud submission →
  (3) carryover → (4) admin template. DB-first was rejected on purpose (would lose blocks made after submitting).
- Build: next build (Turbopack), React pinned ^19, output standalone. createShell must NOT touch getEnv()/zod in module scope (it
  runs at import of each app's shell.ts wrapper; next build's page-data collection runs with NODE_ENV=production over a dev .env).
  vimeo-player: the SDK OWNS the iframe (new Player(divHost,{id})) — never new Player(iframe-in-JSX) (destroy() would remove a
  React-managed node and orphan it under StrictMode double-invoke). Exports map subpaths carry the extension (tsc needs it).
- Capas/imagens de curso use <img> (arbitrary external author URLs; noImgElement off on purpose).

HOW TO REVIEW:
- READ THE ACTUAL CODE. Do NOT trust comments or CLAUDE.md; verify every claim against source with Read (whole files) and Grep
  (follow symbols across files and into packages/member-shell, packages/community, and packages/api-gateway / packages/hub /
  packages/members when a contract is claimed).
- Every finding MUST cite an exact file path + line range and QUOTE the offending code. No speculation, no "add tests" filler. If
  you cannot point at specific code, do not report it.
- Severity: critical = security breach / auth bypass / cross-user or cross-profile data leak / a learner reaching content or a
  credential they must not / forging a session / data corruption. high = a real correctness bug affecting users, or a race that
  corrupts persisted state or causes a surprise logout. medium = edge-case bug, perf cliff at scale, missing validation with real
  impact. low = smell / defense-in-depth gap. info = nit.
- Prefer FEWER, HIGHER-CONFIDENCE findings. Quality over quantity. Do NOT report the deliberate trade-offs above.
`

const DIMENSIONS = [
  {
    key: 'session-refresh',
    title: 'Session, refresh single-flight & cookies',
    concerns: `The session lifecycle and token rotation — the foundation of every authorized request. Hunt for: (1) session.ts
alg-based key selection: can an attacker pick "alg":"none" or downgrade RS256->HS256 (jose verify must pin algorithms; a "none"
or alg-confusion would forge a session that authorizes LOCAL media/download routes)? Are issuer/audience actually enforced when
configured? Is exp tolerance leaking into the STRICT media guard (verifyAccessToken vs getSession)? (2) refresh.ts single-flight:
is the cache keyed by the refresh TOKEN and stored in globalThis via Symbol.for (NOT module scope)? Can two concurrent callers
present the same token and trip reuse-detection (race window between cache read and write)? Is the 60s cache TTL/cleanup correct,
and does an 'invalid' result clear it? (3) cookies.ts: __Host- prefix only in prod, expireCookieOptions carries Secure, names are
the single source. (4) act.ts: parseActClaim / parseProfileClaim robustness (malformed act/pfl must not throw or mislabel).`,
    files: [
      `${MS}/server/session.ts`,
      `${MS}/server/refresh.ts`,
      `${MS}/lib/cookies.ts`,
      `${MS}/lib/act.ts`,
      `${MS}/lib/env.ts`,
      `${CO}/server/shell.ts`,
      `${CO}/lib/cookies.ts`,
      `${MS}/../tests/refresh.test.ts`,
      `${MS}/../tests/cookies.test.ts`,
    ],
  },
  {
    key: 'proxy-csrf',
    title: 'Edge proxy — anti-CSRF, route gate, CSP/headers & matcher coverage',
    concerns: `The proxy is the edge gate. Hunt for: (1) anti-CSRF coverage: requiresOriginCheck + isSameOriginRequest — does
EVERY state-changing /api/* go through it? The matcher EXCLUDES api/me/avatar, api/hub/uploads/image, api/certificates — confirm
each excluded route has its OWN same-origin check (requireUploadSession) and that api/certificates is read-only/public so excluding
it is safe. Is the Sec-Fetch-Site/Origin×host logic forgeable (missing header => allowed? x-forwarded-host trust)? (2) the
protected-prefix / isRootProtected gate vs the real layout gate — any protected page reachable without the refresh cookie, or any
sensitive page NOT in protectedPrefixes? (3) the expired-access rotation path: cookie rewrite on request+response, __Host- attrs,
'invalid'/'unavailable' handling. (4) CSP in next.config.ts: frame-src allowlist (youtube-nocookie/vimeo), worker-src blob for
pdf.js, the 'https:' in script/style/etc. because srcDoc inherits the parent CSP — is anything dangerously broad (unsafe-inline/
unsafe-eval/wildcards) beyond what the srcDoc sandbox justifies? HSTS prod-only, noindex, COOP/CORP present. (5) does the matcher
literal actually match what the comment claims?`,
    files: [
      `${MS}/server/proxy.ts`,
      `${CO}/proxy.ts`,
      `${MS}/lib/csrf.ts`,
      `${CO}/next.config.ts`,
      `${MS}/lib/env.ts`,
      `${CO}/app/api/me/avatar/route.ts`,
      `${CO}/app/api/hub/uploads/image/route.ts`,
      `${CO}/app/api/certificates/[id]/validate/route.ts`,
    ],
  },
  {
    key: 'gateway-clients',
    title: 'Gateway forwarding, clients, readonly variants & Sentry',
    concerns: `The outbound seam to the gateway. Hunt for: (1) does gateway.ts forward x-forwarded-for/x-request-id on ALL paths
(data, auth, refresh) and set AbortSignal.timeout, and does it ever forward an attacker-controllable x-internal-token / X-Auth-*
header inbound→outbound (header injection / trust-boundary bypass)? Can a client set a header that the gateway would trust? (2)
clients.ts: every list call sends ?audience=<app> (adult here) so kids/adult data never mix; the *Readonly() variants must NOT
refresh or write cookies (RSC) and must degrade on 401; React.cache memoization correctness. (3) error handling: are upstream
non-2xx and aborts mapped without leaking internal details; is a 401 from a readonly call swallowed correctly? (4) does any client
interpolate user input into a gateway URL path/query without encoding (id injection)? (5) Sentry: scrubbing of PII (email/UUID),
no 'server-only' on the module that onRequestError needs.`,
    files: [
      `${MS}/server/gateway.ts`,
      `${MS}/server/clients.ts`,
      `${MS}/server/sentry.ts`,
      `${MS}/lib/env.ts`,
    ],
  },
  {
    key: 'media-watermark',
    title: 'Media downloads, watermark, R2 & direct delivery',
    concerns: `The download/watermark pipeline (R2 private, per-learner watermark). Hunt for: (1) the STRICT guard
(requireUploadSession): expired token must NOT authorize; a PROFILE session must be refused for /me/avatar (account-only); the
anti-CSRF check inside it for mutations. (2) watermarkCacheKey = sha256(srcKey) injectivity — confirm no lossy/colliding key path
that could serve learner A's cached watermarked PDF to learner B; confirm the cache write is keyed by srcKey AND learner. (3) the
>20MB => 302 presigned path: does the presigned URL ever expose storageRef or escape the learner's authorization (presign only
AFTER authz)? TTL of the presign. (4) OOM gates: watermark-queue max-1 FIFO globalThis; watermarkImage limitInputPixels + total
pixel cap; non-markable formats streamed (not buffered); WATERMARK_MAX_BYTES fallback. (5) Content-Length pre-check ordering (411/
413 BEFORE formData) for avatar upload; mediaErrorResponse not leaking in prod; r2.ts S3 timeouts + cause preserved. (6)
download-mime: does fileType (free admin text) ever DISABLE the watermark when the real Content-Type/extension says PDF/image?`,
    files: [
      `${MS}/server/media.ts`,
      `${MS}/server/r2.ts`,
      `${MS}/server/private-delivery.ts`,
      `${MS}/server/watermark.ts`,
      `${MS}/server/watermark-queue.ts`,
      `${MS}/server/image-optimizer.ts`,
      `${MS}/lib/download-mime.ts`,
      `${CO}/app/api/cursos/[slug]/aulas/[lessonId]/anexos/[attachmentId]/route.ts`,
      `${CO}/app/api/cursos/[slug]/aulas/[lessonId]/blocos/[blockId]/ebook/route.ts`,
      `${CO}/app/api/me/avatar/route.ts`,
    ],
  },
  {
    key: 'hub-privacy',
    title: 'Hub/forum — UGC privacy, redaction, markdown & attachments',
    concerns: `The forum is the highest privacy risk (learner-to-learner content). Hunt for: (1) authorId redaction: does
okRedacted/redactAuthors zero the authorId of EVERY third party on EVERY view that reaches the browser (thread list, single thread,
comments, nested replies, reactions, showcase)? Any field carrying a third party's account/profile/email/UUID that escapes? Is the
viewer's own id the ONLY id preserved? (2) renderUgcMarkdown is REALLY restricted (no external <img>, links as text only) AND the
write path strips image markdown (stripImageMarkdown on create+edit of thread AND comment) — any UGC field rendered with the raw
renderMarkdown? (3) path ids (threadId/commentId/channel/spaceSlug/emoji/reason) validated (UUID / allowlist) at the edge before
hitting the gateway? emoji/reason injection? (4) showcase publish: the BFF must NOT trust caller-supplied title/author/idempotency;
hub re-validates S2S. (5) attachment helpers: MIME allowlist, size limits, sanitizeFilename, isInlineKind — any inline kind that
enables stored XSS or an SVG/HTML served inline? (6) authorProfileId exposed ONLY for public authors.`,
    files: [
      `${MS}/routes/hub.ts`,
      `${MS}/lib/hub-redact.ts`,
      `${MS}/lib/markdown.tsx`,
      `${MS}/lib/hub-attachments.ts`,
      `${MS}/lib/profile-redaction.ts`,
      `${MS}/server/clients.ts`,
      `${CO}/app/api/hub/threads/[id]/route.ts`,
      `${CO}/app/api/hub/threads/[id]/comments/route.ts`,
      `${CO}/app/api/hub/uploads/presign/route.ts`,
    ],
  },
  {
    key: 'studio-certificate',
    title: 'Studio sharing/publish/play + Certificate (SSRF, public routes, sanitization)',
    concerns: `Two surfaces with PUBLIC, unauthenticated endpoints. STUDIO — hunt for: (1) GET /api/studio/play/:id is public:
id validation (uuid; no path traversal into the R2 key), does it ever leak the child's name or a private project beyond the
playable snapshot? (2) publish: requireUploadSession (outside matcher) + sanitizePlayableProject — can an oversized or malformed
project slip past the caps (413/400), or a data-URL asset bomb? rate-limit. (3) lessonStudioProjectId charset (/^[A-Za-z0-9_-]+$/)
— any caller building an id with ':' that would orphan the draft. (4) openrouter describe: fail-soft, child-safety clause, output
sanitized+truncated, does it send only the clamped canonical files (not assets/PII)? CERTIFICATE — hunt for: (5) fetchImage SSRF
guard isSafeRemoteUrl: is it applied to baseImageUrl AND every signatures[].imageUrl, and does it reject localhost/.internal/
private-IP/link-local AND handle redirects/DNS-rebinding (does it follow redirects to a private IP)? (6) public /validar/:id +
the /api/certificates/:id/validate shim: id validated (uuid, no 500), and only {valid,studentName,courseTitle,issuedAt,serial}
escapes (no PII)? (7) issue is read-only under impersonation (403); student name from trusted header not body.`,
    files: [
      `${MS}/routes/studio.ts`,
      `${MS}/server/openrouter.ts`,
      `${MS}/lib/studio-project-id.ts`,
      `${MS}/routes/certificate.ts`,
      `${MS}/server/certificate-pdf.ts`,
      `${MS}/lib/types.ts`,
      `${CO}/app/api/certificates/[id]/validate/route.ts`,
      `${CO}/app/api/members/lessons/[lessonId]/blocks/[blockId]/studio-carryover/route.ts`,
      `${CO}/app/api/members/lessons/[lessonId]/blocks/[blockId]/certificate/route.ts`,
    ],
  },
  {
    key: 'lesson-render',
    title: 'Lesson player & block rendering — XSS, iframe sandbox, player lifecycle',
    concerns: `The client-side rendering of polymorphic lesson blocks (third-party + admin content). Hunt for: (1) lesson-blocks:
embed v3 srcDoc sandbox really fixed allow-scripts WITHOUT allow-same-origin (content.sandbox ignored); video blocks build the
CANONICAL url from an extracted id (no raw src in iframe src/srcDoc); any dangerouslySetInnerHTML fed by non-admin content. (2)
markdown.tsx renderMarkdown XSS: javascript:/data: links or images falling through as live links; attribute injection. (3)
vimeo-player: the SDK owns the iframe (new Player(divHost,{id})), destroy() in cleanup, StrictMode double-invoke safety; watermark
email present. (4) quiz-block: answers submitted server-side, no gabarito leaked client-side, cooldown countdown correctness. (5)
studio-block seed order (local draft wins) and the project id passed; expand overlay (CSS not native Fullscreen) scroll-lock
refcount. (6) ebook use-pdf-pages: AbortController on unmount, texture.dispose window, worker singleton; certificate-block POST/
download. (7) lesson-player-context: position/complete throttle + sendBeacon, no token/secret in client context.`,
    files: [
      `${MS}/components/lesson-blocks.tsx`,
      `${MS}/components/quiz-block.tsx`,
      `${MS}/components/vimeo-player.tsx`,
      `${MS}/components/certificate-block.tsx`,
      `${MS}/components/studio/studio-block.tsx`,
      `${MS}/components/lesson-player-context.tsx`,
      `${MS}/components/ebook/ebook-block.tsx`,
      `${MS}/components/ebook/use-pdf-pages.ts`,
      `${MS}/components/lesson-attachments.tsx`,
      `${CO}/app/(app)/cursos/[slug]/aulas/[lessonId]/lesson-player-client.tsx`,
    ],
  },
  {
    key: 'wiring-worktree',
    title: 'App wiring, env/boot fail-fast, exports map & uncommitted working-tree changes',
    concerns: `The composition seam and the freshest (uncommitted) code. Hunt for: (1) createShell must NOT evaluate getEnv()/zod
in module scope (would break next build); cookie names use process.env.NODE_ENV directly; globalThis state via Symbol.for inside
modules, not factory closures. (2) env fail-fast SYNC: src/instrumentation.ts (dev) and packages/member-shell/scripts/boot-check.mjs
(real prod fail-fast) must agree on the prod rules (GATEWAY_URL/JWT_JWKS_URL required, JWT_HS256_SECRET refused in prod,
JWT_ISSUER/JWT_AUDIENCE required). Any drift => prod boots with an unsafe config. (3) exports map / index.ts: component subpaths
carry the .tsx extension (tsc), no kids-only route accidentally exposed by the adult app. (4) THE UNCOMMITTED WORKING-TREE CHANGES
— read the current content of these and judge correctness on their own terms (they are the newest, least-reviewed code):
packages/community/src/app/(app)/cursos/[slug]/aulas/[lessonId]/page.tsx, packages/community/src/app/(app)/cursos/[slug]/page.tsx,
packages/community/src/app/(app)/cursos/[slug]/aulas/[lessonId]/lesson-player-client.tsx, packages/member-shell/src/lib/types.ts.
Look for: locked/nextHref gating bugs, 423 LESSON_LOCKED handling, type drift between the member-shell view types and what the
pages consume, any new prop wired wrong.`,
    files: [
      `${CO}/server/shell.ts`,
      `${MS}/index.ts`,
      `${CO}/instrumentation.ts`,
      `packages/member-shell/scripts/boot-check.mjs`,
      `${MS}/routes/index.ts`,
      `${CO}/next.config.ts`,
      `${CO}/app/(app)/cursos/[slug]/aulas/[lessonId]/page.tsx`,
      `${CO}/app/(app)/cursos/[slug]/page.tsx`,
      `${CO}/app/(app)/cursos/[slug]/aulas/[lessonId]/lesson-player-client.tsx`,
      `${MS}/lib/types.ts`,
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
          category: { type: 'string', description: 'e.g. security, correctness, race, idempotency, perf, leak, deadcode, contract, xss, ssrf, csrf' },
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
    `You are reviewing @sistemazero/community (the ADULT learner app) + the @sistemazero/member-shell BFF it runs.
DIMENSION: ${d.title}.

${DESIGN_CONTEXT}

YOUR FOCUS:
${d.concerns}

START by reading these files (and follow symbols/imports into others as needed with Read/Grep, including into
packages/member-shell, packages/community, packages/api-gateway, packages/hub, packages/members when a contract is claimed):
${d.files.map((f) => '  - ' + f).join('\n')}

Return ONLY grounded findings (each with exact file:lines and a quoted code snippet). If a file in the list does not exist, skip
it silently. Be thorough but precise — a wrong finding wastes a verifier. Order findings by severity.`,
    { label: `find:${d.key}`, phase: 'Find', schema: FINDINGS_SCHEMA },
  ),
  (review, d) => {
    if (!review || !review.findings || review.findings.length === 0) return []
    return parallel(review.findings.map((f, i) => () =>
      agent(
        `You are an ADVERSARIAL verifier for a code review of @sistemazero/community + @sistemazero/member-shell.
Your job is to REFUTE the finding below. Open the cited file, read the cited lines AND enough surrounding context to judge
correctly, and follow any symbols needed (including into other packages for contract claims). Decide whether the finding is a
real defect.

Rules:
- Default to "false-positive" if you are not convinced. Misreadings, "bugs" actually handled elsewhere, and the documented
  deliberate trade-offs in the design context (the architecture invariants section) are NOT defects — mark them false-positive.
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
