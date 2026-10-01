export const meta = {
  name: 'admin-full-review',
  description: 'Full review of @sistemazero/admin (the operator panel + BFF aggregator): finder dimensions read real code, every finding adversarially verified, freshest uncommitted diff emphasized.',
  phases: [
    { title: 'Find', detail: 'parallel finders per dimension read real code and report grounded findings' },
    { title: 'Verify', detail: 'one adversarial verifier per finding re-reads the cited code and renders a verdict' },
  ],
}

const A = 'packages/admin/src'

const DESIGN_CONTEXT = `
SCOPE: @sistemazero/admin is the OPERATOR panel (Next.js 16 App Router + React 19 + Tailwind v4, port 3005). It is a
BFF AGGREGATOR: the browser hits same-origin Route Handlers /api/* (HttpOnly cookies sz_admin_*) which call the api-gateway
(NEVER the services directly). The gateway verifies JWT + RBAC and injects X-Auth-* downstream. Operators are TRUSTED users
with role in {superadmin, admin, staff} — login REJECTS any other role (403). So the threat model is NOT arbitrary learners;
it is: session/token theft & revocation (critical because /api/media/* routes BYPASS the gateway and self-authorize),
privilege escalation BETWEEN operator roles (staff < admin < superadmin: impersonation matrix, hub moderation RBAC), CSRF from a
compromised sibling subdomain, secrets leaking into the client bundle, SSRF in server-side fetches, internal error bodies/PII
leaking to the browser, and DoS (unbounded list windows, densification). Plus plain correctness of the BFF aggregation.

ARCHITECTURE INVARIANTS (these are CORRECT — do NOT report them as bugs):
- The admin NEVER calls services directly; only via the gateway (server/gateway.ts: gatewayFetch / gatewayFetchRaw). The ONE
  conscious exception is /api/media/* which talks to Cloudflare R2 + Vimeo (EXTERNAL providers) — it does not pass through the
  gateway and therefore carries its OWN strict guard requireMediaSession (server/media.ts) + the SAME anti-CSRF same-origin
  check; these routes sit OUTSIDE the proxy matcher (the proxy buffers the body ~10MB and would strangle multipart upload).
- Session (server/session.ts): the access JWT is verified by picking the key from the token's alg — HS256 with JWT_HS256_SECRET
  (dev/local) and/or RS256 via JWT_JWKS_URL (PROD). PROD boot REQUIRES JWT_JWKS_URL and REFUSES JWT_HS256_SECRET (a weak HS256
  secret would forge the LOCAL session that authorizes /api/media/*). getSession() tolerates an EXPIRED token ONLY for display
  (decodeJwt) — it MUST NOT be used to authorize outside the gateway. The media guard is STRICT: verifyAccessToken (exp included)
  + ONE tryRefresh + re-verify; expired => 401. jose validates the signature BEFORE exp.
- Cookies (lib/cookies.ts is the SINGLE source of names): sz_admin_access (JWT) + sz_admin_refresh (opaque), HttpOnly,
  SameSite=Lax, Secure in prod, Path=/, no Domain. In PROD they get the __Host- prefix. REMOVAL must use expireCookieOptions
  (set('', maxAge:0) WITH the write-time attributes incl. Secure) — a bare cookies().delete() is REJECTED by the browser for
  __Host-* so the cookie SURVIVES (logout would not log out). session.ts writes; proxy.ts reads.
- Session transition (login/logout) navigates with window.location.replace — NEVER router.replace + router.refresh (next.js#54766
  race leaves the user stuck on /login). This is deliberate.
- Refresh (server/gateway.ts): on 401 calls /auth/refresh, rewrites cookies, retries ONCE. Rotation is single-flight PER refresh
  token, and the map lives in globalThis (NOT module scope — Turbopack emits separate proxy/route-handler bundles with their own
  module copies; globalThis is the per-process meeting point). RÉPLICA ÚNICA is a DELIBERATE constraint (per-process state; do not
  report "won't scale horizontally" as a bug — it is documented). A NETWORK failure on refresh does NOT clear cookies (transient);
  only an auth REFUSAL clears them. Cookies are only writable in Route Handlers/Server Actions.
- Every OUTBOUND call forwards x-forwarded-for / x-request-id (so the gateway's per-IP rate limit and the auth's failed-login audit
  see the real client, not the admin host) and has AbortSignal.timeout (data/gateway 60s, auth 15s, Vimeo API 30s / bytes 60s,
  S3/R2 connection 5s / request 120s). x-internal-token is injected by the GATEWAY, never forwarded from the client.
- Anti-CSRF: proxy.ts blocks non-same-origin MUTATIONS to /api/* (requiresOriginCheck + isSameOriginRequest from lib/csrf.ts:
  Sec-Fetch-Site, with Origin×host fallback; NO browser signal => treated as non-browser => allowed). This is defense-in-depth
  beyond SameSite=Lax (which does NOT block a sibling subdomain on the apex domain). The SAME check runs inside requireMediaSession
  (media is outside the matcher). Security HEADERS + CSP live in next.config.ts headers() (cover ALL responses incl. /api/media/*),
  NOT in the proxy. CSP is NO-NONCE: 'unsafe-inline' for the Next bootstrap; connect-src allows Vimeo TUS *.cloud.vimeo.com +
  *.r2.cloudflarestorage.com; img-src https:; frame-src player.vimeo + blob:; AND script-src data: https: (REQUIRED so the Studio
  embed preview — the student's script.js injected as <script src="data:..."> in a sandboxed srcdoc — is not blank; the real
  security boundary there is the sandbox WITHOUT allow-same-origin + the srcdoc's own meta-CSP, NOT the parent CSP).
- BFF forwarding: server/forward.ts forwardUpstream({status,body}) repasses the gateway response — on SUCCESS the body is intact,
  on ERROR it is normalized to {error:{code,message}} (lib/upstream.ts normalizeUpstreamError) so the internal body never leaks.
  Pass-through route handlers use it. Routes that TRANSFORM the body on success (api/members list + [userId] + the studio-submissions
  routes) keep their OWN normalization and remap a 200-without-body to 502 (a 200 read as success with undefined .map would crash
  the screen). lib/list-params.ts parseLimit has a HARD CEILING of 100 / parseOffset (do not reintroduce an unbounded num()).
- Money is in CENTS (integer). The payments + fiscal services serialize amounts as STRING (bigint) => use formatCentsStr. The sales
  daily series is DENSIFIED in the BFF (server/payments.ts: civil days in America/Sao_Paulo + zeros + BigInt totals; window clamped
  <=750d and to<=now+1d to bound densification; >90d aggregates to week, >270d to month). Drizzle gotcha: a raw Date in a sql
  fragment becomes JS toString() and breaks PG => pass .toISOString().
- Media (stateless, no asset table — orphan R2 objects are DOCUMENTED debt, not a bug): images sharp->WebP->R2 public; audio->R2
  public (the <audio> plays the URL directly, private bucket would break it — deliberate); attachments/ebook->R2 PRIVATE via a
  server-generated key, uploaded DIRECT browser->R2 with a presigned PUT (the admin is behind Cloudflare Free with a HARD 100MB
  body cap; direct upload skips it); url = "r2priv:<key>" (NON-navigable, never the bytes). Content-Length is MANDATORY before
  formData() (411 if absent, 413 if over). Video -> Vimeo TUS direct from the browser. mediaErrorResponse does NOT leak the internal
  message in prod (Sentry gets it). Env R2_*/VIMEO_* are OPTIONAL (absent => 503 MEDIA_NOT_CONFIGURED, never breaks boot).
- Sentry (server/sentry.ts): NO SDK — speaks the ingestion protocol over fetch (the standalone/Turbopack tracing does not reliably
  copy external packages). Mirrors only the panel's OWN errors; 5xx from upstream is NOT mirrored (the gateway already captures).
- Studio block: the admin embeds @sistemazero/studio (components/studio/*) to author the initial project + a RESTRICTIVE block
  allow-list; "Entregas" opens the student's submitted project in an embedded Studio. Kids identity: a submission carries accountId,
  so the submissions BFF shows the CHILD (profile name via getUserProfiles) + the RESPONSIBLE (account via batchGetUsers) — profile
  != account in kids, equal in adult. Do not report the dual-identity as a leak; it is the intended support view for the operator.
- Build: next build (Turbopack), React pinned ^19, output standalone. Env fail-fast lives in TWO files that must stay in sync:
  src/instrumentation.ts (covers next dev) and scripts/boot-check.mjs (the REAL prod fail-fast — in prod Next 16 does NOT run
  register() at boot). Capas/imagens use <img> (arbitrary external author URLs).

FRESHEST CODE (uncommitted working tree — the least-reviewed, judge on its own terms): the "recado do professor" feature — a
student can attach an OPTIONAL message (<=1000 chars, validated in the members service DTO) when submitting a Studio project, and
it now surfaces in the admin "Entregas" view. Touched files: src/lib/types.ts (StudioSubmissionRow.message + StudioSubmissionDetailView.message),
src/server/members.ts (the two upstream return-type shapes gain message), src/app/api/members/blocks/[id]/studio-submissions/route.ts
(forwardUpstream on non-200 + a hardened 200-without-body => 502 remap + pipes s.message into each row), and
src/app/admin/membros/cursos/[courseId]/aulas/[lessonId]/studio-submissions-dialog.tsx (renders the recado in the list badge +
the detail card, whitespace-pre-wrap). Also: src/app/api/nfse/invoices/[id]/substitute/route.ts switched its tail from
NextResponse.json(result,{status}) to forwardUpstream({status,body:result}). Scrutinize these for: the message escaping (React text
node auto-escapes — confirm no dangerouslySetInnerHTML), the 502-remap correctness vs the sibling routes, type drift between the
admin view types and what the members service actually returns, and whether forwardUpstream on the substitute route changes a
SUCCESS body the UI depends on (substitute returns 201 {id}).

HOW TO REVIEW:
- READ THE ACTUAL CODE. Do NOT trust comments or CLAUDE.md; verify every claim against source with Read (whole files) and Grep
  (follow symbols across files and into packages/api-gateway, packages/auth, packages/members, packages/catalog, packages/payments,
  packages/fiscal, packages/hub when a CONTRACT is claimed).
- Every finding MUST cite an exact file path + line range and QUOTE the offending code. No speculation, no "add tests" filler. If
  you cannot point at specific code, do not report it.
- Severity: critical = security breach / auth bypass / session forge / privilege escalation between operator roles / secret leaked
  to client bundle / SSRF reaching internal services / cross-user or cross-profile data leak. high = a real correctness bug
  affecting operators, or a race that corrupts persisted state / causes surprise logout, or an internal error body / PII leaking to
  the browser. medium = edge-case bug, perf cliff at scale, missing validation with real impact, a DoS vector. low = smell /
  defense-in-depth gap. info = nit.
- Prefer FEWER, HIGHER-CONFIDENCE findings. Quality over quantity. Do NOT report the deliberate trade-offs above (RÉPLICA ÚNICA,
  no-SDK Sentry, stateless media / orphan R2, getSession exp tolerance for DISPLAY, script-src data: for the Studio preview,
  no-signal CSRF allow, audio in a public bucket, <img> for cover images, decodeJwt without iss/aud for display only).
`

const DIMENSIONS = [
  {
    key: 'session-refresh-cookies',
    title: 'Session verification, refresh single-flight & cookies',
    concerns: `The auth foundation — every authorized request rides on it. Hunt for: (1) session.ts alg-based key selection: can an
attacker pick "alg":"none" or downgrade RS256->HS256 (jose verify MUST pin the algorithm list per key type; an alg-confusion or
"none" would forge a session that authorizes the LOCAL /api/media/* routes)? Are issuer/audience actually ENFORCED when configured
(not just decoded)? Does the exp tolerance of getSession (decodeJwt for display) ever leak into an AUTHORIZATION path outside the
gateway? Confirm verifyAccessToken really includes exp and is what the media guard uses. (2) gateway.ts refresh: is the single-flight
keyed by the refresh TOKEN and stored in globalThis (NOT module scope)? Is there a race window between the cache read and write that
lets two concurrent callers present the same refresh token (auth reuse-detection => family revoke => surprise logout)? Does a NETWORK
failure correctly NOT clear cookies while an auth REFUSAL does? Does gatewayFetchRaw share the same refresh path without double-rotating?
(3) cookies.ts: __Host- only in prod, expireCookieOptions carries Secure, names single-sourced. (4) do gatewayFetch/Raw set
AbortSignal.timeout and forward x-forwarded-for / x-request-id on ALL paths, and never forward an inbound x-internal-token / X-Auth-*?`,
    files: [
      `${A}/server/session.ts`,
      `${A}/server/gateway.ts`,
      `${A}/lib/cookies.ts`,
      `${A}/lib/env.ts`,
      `packages/admin/tests/cookies.test.ts`,
      `packages/api-gateway/src`,
    ],
  },
  {
    key: 'proxy-csrf-headers',
    title: 'Edge proxy — anti-CSRF, route gate, CSP/headers & matcher coverage',
    concerns: `The proxy is the edge gate; the CSP/headers live in next.config.ts. Hunt for: (1) anti-CSRF coverage: does EVERY
state-changing /api/* (POST/PATCH/DELETE/PUT) go through requiresOriginCheck + isSameOriginRequest? Is the Sec-Fetch-Site / Origin×host
logic forgeable — does a MISSING signal fall open in a way a real browser could exploit (a fetch from a malicious page DOES send
Sec-Fetch-Site: cross-site), or is x-forwarded-host trusted to compute "host"? (2) the matcher: does the literal actually match what
the comment claims, and does it correctly EXCLUDE api/media (which must instead rely on requireMediaSession's own same-origin check)?
Any sensitive mutating route OUTSIDE the matcher AND without its own check? (3) the /admin/* gate: any protected page reachable
without the refresh cookie, given app/admin/layout.tsx does the real signature+role check? (4) next.config.ts CSP: is anything
dangerously broad beyond what's justified — unsafe-eval, wildcard script/connect sources, an open frame-ancestors (clickjacking),
missing XFO/nosniff/Referrer-Policy, HSTS not prod-gated, noindex present? Confirm script-src data: and frame-src blob: are scoped
and that the Studio srcdoc sandbox (no allow-same-origin) is what actually contains the injected script.`,
    files: [
      `${A}/proxy.ts`,
      `${A}/next.config.ts`,
      `${A}/lib/csrf.ts`,
      `${A}/app/admin/layout.tsx`,
      `packages/admin/tests/csrf.test.ts`,
    ],
  },
  {
    key: 'media-pipeline',
    title: 'Media uploads — strict guard, presigned PUT, SSRF, R2/Vimeo, OOM',
    concerns: `The /api/media/* pipeline talks to R2 + Vimeo DIRECTLY (bypasses the gateway). Hunt for: (1) requireMediaSession is
STRICT — an EXPIRED token must NOT authorize (verifyAccessToken + ONE tryRefresh + re-verify, not getSession); the role gate is
superadmin/admin; the anti-CSRF same-origin check runs inside it. Is any media route MISSING the guard? (2) the presigned PUT
(media/files/presign): is the R2 key generated SERVER-SIDE (no client filename in the key => no path traversal / overwrite of
another object), is the MIME allowlist + size cap enforced BEFORE presigning, and does the presigned URL grant ONLY a single PUT to
that one key (not list/get on the bucket)? (3) Content-Length pre-check: 411 if absent, 413 if over, BEFORE formData() materializes
the body. (4) SSRF: does any media route fetch a URL derived from client input (thumbnail/caption/poster) without a private-IP /
localhost / .internal guard? Does the Vimeo status route re-host a VTT from a URL it should treat as trusted-only? (5) r2.ts / vimeo.ts:
S3 + fetch timeouts present, error cause preserved, mediaErrorResponse does NOT leak internal message in prod; image-optimizer sharp
limitInputPixels / pixel cap against a decompression bomb. (6) does fileType (free admin-supplied text) ever drive a security
decision (bucket choice, content-disposition) in a forgeable way?`,
    files: [
      `${A}/server/media.ts`,
      `${A}/server/r2.ts`,
      `${A}/server/vimeo.ts`,
      `${A}/server/image-optimizer.ts`,
      `${A}/app/api/media/files/presign/route.ts`,
      `${A}/app/api/media/files/route.ts`,
      `${A}/app/api/media/images/route.ts`,
      `${A}/app/api/media/audio/route.ts`,
      `${A}/app/api/media/videos/ticket/route.ts`,
      `${A}/app/api/media/videos/[id]/status/route.ts`,
      `${A}/app/api/media/videos/[id]/thumbnail/route.ts`,
    ],
  },
  {
    key: 'bff-forwarding',
    title: 'BFF forwarding, error normalization, list clamps & id encoding',
    concerns: `The pass-through seam between Route Handlers and the gateway. Hunt for: (1) forward.ts forwardUpstream + lib/upstream.ts
normalizeUpstreamError: on SUCCESS the body must be passed INTACT (status preserved, no double-wrap); on ERROR the internal body must
NOT leak — confirm it cannot pass through an upstream error body verbatim, and that it sets a sane content-type. (2) lib/list-params.ts
parseLimit/parseOffset: is the ceiling (100) actually applied on EVERY listing route, with no surviving unbounded num() (?limit=1e9
reaching the gateway / a densification or batch path)? (3) ID ENCODING: do route handlers / server adapters interpolate a path param
or query value into the gateway URL without encodeURIComponent/enc (id/slug/courseRef injection that could reach a different upstream
path or inject query params)? Check enc() usage in server/*.ts. (4) lib/query.ts building querystrings — array/CSV params (offerIds)
encoded correctly. (5) any route that returns NextResponse.json(upstreamBody,{status}) directly instead of forwardUpstream, leaking
the internal shape — and conversely any route that SHOULD transform but now blindly forwards.`,
    files: [
      `${A}/server/forward.ts`,
      `${A}/lib/upstream.ts`,
      `${A}/lib/list-params.ts`,
      `${A}/lib/query.ts`,
      `${A}/server/catalog.ts`,
      `${A}/app/api/catalog/offers/route.ts`,
      `${A}/app/api/payments/transactions/route.ts`,
      `${A}/app/api/nfse/invoices/[id]/substitute/route.ts`,
      `packages/admin/tests/upstream.test.ts`,
      `packages/admin/tests/list-params.test.ts`,
    ],
  },
  {
    key: 'members-aggregation-fresh',
    title: 'Members BFF aggregation + the FRESH "recado do professor" diff',
    concerns: `THE FRESHEST, LEAST-REVIEWED CODE — judge on its own terms. Hunt for: (1) the studio-submissions route
(app/api/members/blocks/[id]/studio-submissions/route.ts): is the new "200-without-body => 502" remap correct and does it still
forward genuine non-200 upstream statuses (via forwardUpstream)? Does it validate body.submissions is an array before .map? Does
s.message flow through untransformed, and is there any spot where message is rendered as HTML rather than a React text node? (2) the
detail route [userId] + member-detail (api/members/route.ts + [userId]): the kids dual-identity (CHILD profile name via
getUserProfiles + RESPONSIBLE account via batchGetUsers) — confirm NO cross-account/cross-profile mismatch (e.g. a profile from
account A paired with a name from account B because of an index/lookup bug), and that the account email/PII shown is the intended
support view, not an accidental over-share. (3) server/members.ts: the two upstream return-type shapes that gained message — type
drift vs what the members service actually returns (string|null)? (4) batchGetUsers / getUserProfiles: N+1 or unbounded fan-out over
a large member list, and a missing user id handled (not crashing the whole list). (5) entitlement grant/patch routes: any unchecked
mode/ref reaching the gateway. (6) the studio-submissions-dialog.tsx recado rendering (whitespace-pre-wrap text — confirm it is a
text child, not innerHTML).`,
    files: [
      `${A}/server/members.ts`,
      `${A}/server/users.ts`,
      `${A}/app/api/members/blocks/[id]/studio-submissions/route.ts`,
      `${A}/app/api/members/blocks/[id]/studio-submissions/[userId]/route.ts`,
      `${A}/app/api/members/route.ts`,
      `${A}/app/api/members/[userId]/route.ts`,
      `${A}/app/admin/membros/cursos/[courseId]/aulas/[lessonId]/studio-submissions-dialog.tsx`,
      `${A}/lib/types.ts`,
      `packages/members/src/application/studio-submissions-admin/studio-submissions-admin.service.ts`,
      `packages/members/src/interfaces/http/dtos.ts`,
    ],
  },
  {
    key: 'payments-nfse-bff',
    title: 'Payments + NFS-e BFF — money, densification DoS, pdf stream, substitute diff',
    concerns: `The money surfaces. Hunt for: (1) server/payments.ts getDailyPaymentsStats densification: is the window clamp
(<=750d, to<=now+1d) actually enforced server-side so a crafted ?from/?to can't make the BFF allocate a huge dense array (DoS)? Are
Date values passed as .toISOString() into any sql/gateway path (the Drizzle raw-Date gotcha)? Are BigInt sums correct (no Number
overflow on cents)? Is the offer micro-cache TTL keyed safely and never caching an empty/failed result? (2) server/nfse.ts +
lib/nfse.ts: the pdf route is a STREAMING pass-through via gatewayFetchRaw — confirm it does not buffer the binary and preserves the
404-without-pdf; the substitute route now uses forwardUpstream({status,body:result}) — does the UI depend on the 201 {id} body
shape, and does forwardUpstream pass a 201 SUCCESS body intact (it should, since success is untouched)? cancel reason length
(15..255) validated; emit-now / manual-emit uuid validation (isValidUuid) BEFORE the gateway. (3) refund route: the 409
REFUND_IN_PROGRESS surfaced correctly (not as a generic failure); money as STRING => formatCentsStr (no Number() precision loss for
display). (4) any amount or count rendered with the wrong cents/string helper.`,
    files: [
      `${A}/server/payments.ts`,
      `${A}/server/nfse.ts`,
      `${A}/lib/nfse.ts`,
      `${A}/lib/guarantee.ts`,
      `${A}/lib/sales-series.ts`,
      `${A}/lib/format.ts`,
      `${A}/app/api/payments/stats/daily/route.ts`,
      `${A}/app/api/payments/transactions/[id]/refund/route.ts`,
      `${A}/app/api/nfse/invoices/[id]/pdf/route.ts`,
      `${A}/app/api/nfse/invoices/route.ts`,
      `packages/admin/tests/nfse.test.ts`,
      `packages/admin/tests/sales-series.test.ts`,
    ],
  },
  {
    key: 'studio-embed-hub',
    title: 'Studio embed config + Hub admin moderation (RBAC, CSP, dynamic import)',
    concerns: `Two surfaces. STUDIO EMBED — hunt for: (1) components/studio/* embeds @sistemazero/studio with persistence:'none' and
a RESTRICTIVE block allow-list; the "Entregas" dialog opens the student's submitted project in an embedded Studio and PREVIEWS it.
Confirm the preview iframe is sandboxed WITHOUT allow-same-origin (the real boundary), the project JSON is treated as untrusted
(no eval of student code in the PARENT context), and the studio-config-clipboard localStorage payload can't be abused to inject
script when pasted. The dynamic import of BLOCK_CATALOG — any code execution at import beyond loading the catalog? (2) does the
submissions dialog render any student-supplied field (name, message, project name) as HTML? HUB ADMIN — hunt for: (3) server/hub.ts +
the app/api/hub/admin/* tree: is the RBAC the documented "read staff+, write admin+" actually enforced (or only at the gateway —
and does the BFF leak a write path a staff session could call)? (4) the [id]/[action] dynamic action routes (threads, comments):
is :action validated against an allowlist before being interpolated into the gateway URL (action injection)? (5) reorder / report
ids validated as UUID at the edge.`,
    files: [
      `${A}/components/studio/studio-embed.tsx`,
      `${A}/components/studio/studio-blocks-picker.tsx`,
      `${A}/components/studio/studio-config-clipboard.tsx`,
      `${A}/server/hub.ts`,
      `${A}/lib/hub-types.ts`,
      `${A}/app/api/hub/admin/threads/[id]/[action]/route.ts`,
      `${A}/app/api/hub/admin/comments/[id]/[action]/route.ts`,
      `${A}/app/api/hub/admin/spaces/[id]/channels/reorder/route.ts`,
      `${A}/app/api/hub/admin/reports/[id]/resolve/route.ts`,
    ],
  },
  {
    key: 'wiring-boot-secret-boundary',
    title: 'Secret boundary, env/boot fail-fast sync, impersonation matrix & scripts',
    concerns: `The composition seam. Hunt for: (1) the SECRET BOUNDARY: is anything from lib/env.ts (server-only) or server/* ever
imported by a Client Component (a 'use client' file) — which would inline a secret into the browser bundle? Grep for imports of
@/server/ and @/lib/env from files with 'use client'. (2) env fail-fast SYNC: src/instrumentation.ts (dev) and scripts/boot-check.mjs
(the REAL prod fail-fast) MUST agree on the prod rules (GATEWAY_URL required, JWT_JWKS_URL required AND JWT_HS256_SECRET REFUSED in
prod, JWT_ISSUER/JWT_AUDIENCE required). Any DRIFT => prod could boot with an unsafe config (e.g. a weak HS256 secret accepted).
(3) lib/impersonation.ts canImpersonate matrix: superadmin -> any active; admin -> only customer/staff; never self/inactive — is the
gating correct and does the BFF route (admin/users/[id]/impersonate) RE-CHECK or rely on the auth re-checking (acceptable) without
WIDENING it? (4) scripts/r2-cors-private.ts + verify-private-bucket.ts: any credential printed unredacted, or a CORS PUT that
clobbers existing rules (it should GET->merge->PUT). (5) impersonation handoff: the single-use ~60s token opened via window.open —
no token logged or left in a URL that persists.`,
    files: [
      `${A}/lib/env.ts`,
      `${A}/instrumentation.ts`,
      `packages/admin/scripts/boot-check.mjs`,
      `${A}/lib/impersonation.ts`,
      `${A}/server/users.ts`,
      `${A}/app/api/admin/users/[id]/impersonate/route.ts`,
      `${A}/app/api/admin/login/route.ts`,
      `${A}/app/api/admin/logout/route.ts`,
      `packages/admin/scripts/r2-cors-private.ts`,
      `packages/admin/scripts/verify-private-bucket.ts`,
      `packages/admin/tests/impersonation.test.ts`,
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
          category: { type: 'string', description: 'e.g. security, correctness, race, idempotency, perf, leak, deadcode, contract, xss, ssrf, csrf, authz' },
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
    `You are reviewing @sistemazero/admin (the OPERATOR panel + BFF aggregator).
DIMENSION: ${d.title}.

${DESIGN_CONTEXT}

YOUR FOCUS:
${d.concerns}

START by reading these files (and follow symbols/imports into others as needed with Read/Grep, including into
packages/api-gateway, packages/auth, packages/members, packages/catalog, packages/payments, packages/fiscal, packages/hub when a
contract is claimed):
${d.files.map((f) => '  - ' + f).join('\n')}

Return ONLY grounded findings (each with exact file:lines and a quoted code snippet). If a file in the list does not exist, skip
it silently. Be thorough but precise — a wrong finding wastes a verifier. Order findings by severity.`,
    { label: `find:${d.key}`, phase: 'Find', schema: FINDINGS_SCHEMA },
  ),
  (review, d) => {
    if (!review || !review.findings || review.findings.length === 0) return []
    return parallel(review.findings.map((f, i) => () =>
      agent(
        `You are an ADVERSARIAL verifier for a code review of @sistemazero/admin (the operator panel + BFF aggregator).
Your job is to REFUTE the finding below. Open the cited file, read the cited lines AND enough surrounding context to judge
correctly, and follow any symbols needed (including into other packages for contract claims). Decide whether the finding is a
real defect.

Rules:
- Default to "false-positive" if you are not convinced. Misreadings, "bugs" actually handled elsewhere, and the documented
  deliberate trade-offs in the design context (the architecture invariants section) are NOT defects — mark them false-positive.
- Remember the threat model: operators are TRUSTED (role in superadmin/admin/staff). A "finding" that requires a malicious
  operator to attack themselves, or that an operator could already do through the legitimate UI, is NOT a vulnerability. Real
  risks are: forging/stealing a session (esp. the LOCAL one that authorizes /api/media/*), escalating BETWEEN operator roles,
  CSRF from a sibling subdomain, a secret reaching the client bundle, SSRF, an internal body/PII leaking to the browser, a race
  corrupting state, or a plain correctness bug in the BFF.
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
