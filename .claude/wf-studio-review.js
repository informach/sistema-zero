export const meta = {
  name: 'studio-full-review',
  description: 'Exhaustive full review of @sistemazero/studio: 18 scoped finders → adversarial per-finding verification → deduped prioritized synthesis',
  phases: [
    { title: 'Review', detail: '18 scoped reviewers across security/correctness/perf/quality' },
    { title: 'Verify', detail: 'adversarially refute each finding against the real code + CLAUDE.md' },
    { title: 'Synthesize', detail: 'dedup, prioritize, executive summary + fix order' },
  ],
}

// --- shared context fed to every agent -------------------------------------

const ROOT = 'packages/studio'

const ACCEPTED = `
ACCEPTED TRADE-OFFS — DO NOT report these as findings (they are DELIBERATE and documented in ${ROOT}/CLAUDE.md). Flag them ONLY if you find the documented mitigation is actually BROKEN (e.g. a targetOrigin '*' that slipped in, a missing ev.source check, a bypassable guard):
- Preview CSP uses script-src 'unsafe-inline' + data: + blob: (required for srcdoc inline scripts + importmap). The iframe sandbox (null-origin, NO allow-same-origin) is the primary barrier; CSP is defense-in-depth.
- One-way PASSIVE GET exfil is accepted: img/media/font/frame-src allow https: while connect-src is 'none'. There is no readable response and no first-party cookies/origin to steal. Do NOT flag this.
- frame-src https: intentionally EXCLUDES data:/blob:; worker-src is 'none' intentionally.
- iframe sandbox NEVER includes allow-same-origin. postMessage of storage snapshots NEVER uses targetOrigin '*'. The cover-capture and activity sandboxes authenticate the iframe by ev.source (not targetOrigin), by design.
- storageBridge.ts and activity/harness.ts are STRING-PURE (injected into a <script>): no imports / no external refs by design.
- The activity harness runs teacher code via an inline <script> (createElement+textContent), NOT eval/new Function, precisely because the CSP has no 'unsafe-eval'. This is intentional.
- Zustand stores are per-instance factories via StudioStoresContext; settingsStore is a singleton on purpose; static useXStore.getState/setState operate on the module-default store (a test contract).
- Workers MUST be created with a literal inline new URL('./x.ts', import.meta.url) — no ?worker, no variables in arg 1 (cross-bundler rule). loader.config({monaco}) is intentional.
- studio.css intentionally has no @import "tailwindcss"/@source/@custom-variant. Theme scoped by [data-sz-theme], never on host <html>.
- convertToPro is one-way; minifiers are injectable (identityMinifiers in tests).
- Known backlog (NOT findings): locale 'en' falls back to pt-BR; OpenRouter has no baseUrl option; settingsStore.fontSize has no UI; ProjectList is coupled to IndexedDB.
- MAX_GENERATOR_DEPTH (200) guard via assertJSDepth is intentional.
`

const CHANGED = `
RECENTLY CHANGED / NEW (uncommitted) files deserve EXTRA scrutiny — run \`git -C ${ROOT} diff HEAD -- <file>\` to see exactly what changed. New files: preview/modalGuard.ts, state/errorGloss.ts (+ their tests), plus new tests for ai/prompts, blockly canvasNewBlocks, ImportButton, state/extensionImportConsent. Modified: ai/{prompts,providers/openRouterProvider}, blockly/{canvas,index,values blocks, buildIR, toolbox, workspaceState}, components/{ai/AIPanel, console/ConsolePanel, layout/ErrorViews, preview/PreviewIframe, projects/ImportButton, terminal/{Terminal,webContainerClient}}, core/i18n/pt-BR, export/{deployTemplates,fileMap,productionHtml}, generators/{escape,expr,html,js}, ir/schema, monaco/MonacoTabs, official-extensions/{game-2d/ai, game-3d/runtime}, parsers/{html,js}, persistence/{local,service,types}, preview/{assetsBridge,bootstrap,csp,index,inputBridge,loopGuard,storageBridge}, state/{persistence,projectStore}.
`

const BASELINE = 'BASELINE (already verified by the orchestrator): bun test = 1221 pass / 0 fail; tsc --noEmit clean; biome check clean. So do NOT report "tests fail" or "type errors" generically — if you claim a bug, it is one the green suite does not cover. Point that out.'

const RULES = `
You are reviewing @sistemazero/studio, an embeddable educational IDE for children (Blocks/Bridge/Code modes + sandboxed preview that RUNS UNTRUSTED USER CODE, WebContainer terminal, AI panel, game extensions). Working dir is the repo root; the package lives at ${ROOT}/.

HOW TO WORK:
- READ THE ACTUAL CODE. Open every file in your scope with Read. Use Grep for cross-refs. Run \`git -C ${ROOT} diff HEAD -- <file>\` on changed files.
- READ ${ROOT}/CLAUDE.md first — it documents the architecture and deliberate trade-offs.
- Report ONLY real, specific, defensible issues with an exact file path + line number + a verbatim code quote as evidence. No vague "consider" advice, no style nits already enforced by biome, no findings about accepted trade-offs.
- For each finding give a CONCRETE fix (what to change, where). Set confidence honestly (0-1): 1.0 = certain bug you can prove, 0.5 = plausible but needs runtime confirmation.
- Severity: critical = security hole / data loss / crash reachable by a child's project or host; high = clear bug or real perf/security weakness; medium = correctness edge case or notable inefficiency; low = polish.
- Prefer FEWER, HIGH-CONFIDENCE findings over a long speculative list. Cap at your 8 strongest. If you had to drop real ones, say so in the summary.
- This is a children's product: weigh kid-facing crashes, confusing errors, data loss of a child's saved project, and anything a malicious project could do to the host page very heavily.
`

const FINDINGS_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    area: { type: 'string' },
    summary: { type: 'string', description: 'Overall health of this area + any real findings you had to drop due to the cap' },
    findings: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          id: { type: 'string', description: 'short kebab slug' },
          title: { type: 'string' },
          severity: { type: 'string', enum: ['critical', 'high', 'medium', 'low'] },
          category: { type: 'string', enum: ['security', 'correctness', 'performance', 'quality', 'ux', 'a11y'] },
          file: { type: 'string' },
          line: { type: 'string' },
          evidence: { type: 'string', description: 'verbatim code quote proving the issue' },
          impact: { type: 'string' },
          fix: { type: 'string' },
          confidence: { type: 'number' },
        },
        required: ['id', 'title', 'severity', 'category', 'file', 'line', 'evidence', 'impact', 'fix', 'confidence'],
      },
    },
  },
  required: ['area', 'summary', 'findings'],
}

const VERDICT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    verdict: { type: 'string', enum: ['confirmed', 'false_positive', 'uncertain'] },
    reasoning: { type: 'string' },
    adjusted_severity: { type: 'string', enum: ['critical', 'high', 'medium', 'low'] },
    refined_fix: { type: 'string' },
  },
  required: ['verdict', 'reasoning', 'adjusted_severity', 'refined_fix'],
}

// --- the 18 review areas ----------------------------------------------------

const AREAS = [
  { key: 'sec-preview-core', lens: 'SECURITY', scope: 'preview/index.ts, preview/bootstrap.ts, preview/csp.ts, preview/transpile.ts, preview/interceptors.ts, preview/types.ts',
    focus: 'iframe sandbox attributes, srcdoc/importmap construction, CSP build & escaping, sucrase transpile, message origin/source handling, any way untrusted student code escapes the sandbox or reaches the host page.' },
  { key: 'sec-preview-bridges', lens: 'SECURITY', scope: 'preview/assetsBridge.ts, preview/inputBridge.ts, preview/storageBridge.ts, preview/loopGuard.ts, preview/modalGuard.ts (NEW), preview/permissionGuard.ts',
    focus: 'postMessage targetOrigin & ev.source auth, string-purity of injected bridges, prototype pollution on snapshot load, loop/modal/permission guard bypass, network blocking correctness, lock immutability of __szLoopTick.' },
  { key: 'sec-export', lens: 'SECURITY', scope: 'export/sanitize.ts, export/productionHtml.ts, export/deployTemplates.ts, export/fileMap.ts, export/minify.ts, export/exportProject.ts, export/zip.ts, export/download.ts, export/index.ts',
    focus: 'XSS in exported HTML, path traversal / zip-slip in file paths & zip entries, template injection in deploy templates, filename sanitization, minifier injection contract, data loss on export.' },
  { key: 'sec-generators', lens: 'SECURITY', scope: 'generators/escape.ts, generators/html.ts, generators/js.ts, generators/css.ts, generators/expr.ts, generators/identifier.ts, generators/project.ts, generators/sourceMap.ts, generators/index.ts',
    focus: 'HTML/attribute/JS-string/CSS escaping correctness & completeness, identifier sanitization (reserved words, collisions, injection), expression generation injection, generator depth guard, any path where IR content breaks out of its context in generated code.' },
  { key: 'sec-ai', lens: 'SECURITY', scope: 'ai/providers/openRouterProvider.ts, ai/prompts.ts, ai/streaming.ts, ai/contracts.ts, ai/mockProvider.ts, ai/index.ts, state/aiAdapter.ts, components/ai/AIPanel.tsx, components/ai/aiMessages.ts',
    focus: 'API key handling & leakage (logs/errors/storage), prompt injection from project content, trust of AI output that becomes blocks/code, streaming abort/cleanup, error handling, cost/runaway requests, rendering AI output safely.' },
  { key: 'sec-terminal', lens: 'SECURITY', scope: 'components/terminal/webContainerClient.ts, components/terminal/Terminal.tsx, components/terminal/terminalProjectFiles.ts, modes/pro/ProWebContainerProvider.tsx, modes/pro/useWebContainerSync.ts, modes/pro/fsDiff.ts, modes/pro/ProPreview.tsx',
    focus: 'WebContainer token handling, COOP/COEP assumptions, cross-origin message handling from the dev-server iframe, fsDiff correctness (file<->dir conflict, ordering), command/path injection, resource cleanup, singleton lifecycle.' },
  { key: 'sec-persistence', lens: 'SECURITY+CORRECTNESS', scope: 'state/persistence.ts, state/gameStorage.ts, persistence/service.ts, persistence/local.ts, persistence/types.ts, state/settingsStore.ts',
    focus: 'IndexedDB quota/clamp, prototype pollution on hydrate, FIFO write serialization & delete fence correctness (no orphan resurrection), autosave debounce/flush, multi-instance service registry, no-IndexedDB fallback, data loss races.' },
  { key: 'sec-state-sanitize', lens: 'SECURITY+CORRECTNESS', scope: 'state/blocksStateSanitize.test.ts (infer impl), state/proSanitize.test.ts, state/blockAllowlist.test.ts, state/extraStateAllowlist.test.ts, state/extensionImportConsent.test.ts (NEW), state/errorGloss.ts (NEW), state/projectStore.ts (sanitize/hydrate paths), state/convertToPro.ts',
    focus: 'sanitization of untrusted project/state on import & hydrate, block allowlist enforcement, extension import consent gating, prototype pollution, errorGloss correctness, projectStore import/rename limits.' },
  { key: 'corr-ir', lens: 'CORRECTNESS', scope: 'ir/schema.ts, ir/helpers.ts, ir/ids.ts, blockly/buildIR.ts, blockly/workspaceState.ts',
    focus: 'IR schema (zod) validation gaps, id generation collisions/determinism, buildIR mapping correctness vs blocks, workspace serialization roundtrip, version/migration handling.' },
  { key: 'corr-parsers', lens: 'CORRECTNESS', scope: 'parsers/html.ts, parsers/css.ts, parsers/js.ts, parsers/project.ts, modes/bridgeReverseParse.ts, modes/bridgeReverseParseWorker.ts, modes/bridgeStaleGuard.test.ts',
    focus: 'parse fidelity & roundtrip (code->IR->code), error recovery, worker staleness/race (stale result overwriting newer edits), span/source-map mapping, edge cases that lose user code in Bridge mode.' },
  { key: 'corr-blocks', lens: 'CORRECTNESS', scope: 'blockly/blocks/* (all), blockly/toolbox.ts, blockly/setup.ts, blockly/organize.ts, blockly/searchCategory.ts, blockly/paramsFlyout.ts, blockly/loadFence.ts, blockly/fields/*',
    focus: 'block definitions & mutators correctness, generator wiring per block, toolbox level gating, field validators (sprite/colour/asset pickers), the canvas/values blocks recently changed, search registration multi-instance.' },
  { key: 'corr-state-logic', lens: 'CORRECTNESS', scope: 'state/projectStore.ts, state/checksStore.ts, state/logsStore.ts, state/highlightStore.ts, state/uiStore.ts, state/sourcemapStore.ts, state/canonicalSourceMap.ts, state/proTree.ts, state/extensionsAdapter.ts, state/studioStores.ts, state/storesContext.ts',
    focus: 'store action correctness, per-instance vs default-store contract, source map store, pro tree, extensions adapter sync, log buffer limits, highlight cross-ref logic.' },
  { key: 'corr-games', lens: 'CORRECTNESS+PERF', scope: 'official-extensions/game-2d/* (runtime, engine, blocks, examples, ai, manifest), official-extensions/game-3d/* (runtime, blocks, examples, ai, manifest)',
    focus: 'runtime correctness (collision, sprite groups, spawner, scenes), memory/handler limits, per-frame allocation, example correctness, AI helper output, game-3d runtime recently changed, leaks across runs.' },
  { key: 'corr-activity', lens: 'CORRECTNESS+SECURITY', scope: 'activity/structure.ts, activity/harness.ts, activity/sandbox.ts, activity/grade.ts, activity/run.ts, activity/useActivityRunner.ts, studio/activity.ts, components/layout/ActivityPanel.tsx, cover/coverCapture.ts',
    focus: 'grading correctness, sandbox iframe ev.source auth, anti-cheat (server recompute of structure), harness string-purity & CSP compatibility, cover capture canvas read, result leakage between projects.' },
  { key: 'perf-components', lens: 'PERFORMANCE+UX', scope: 'components/ai/AIPanel.tsx, components/console/ConsolePanel.tsx, components/preview/PreviewIframe.tsx, components/preview/previewBudget.ts, components/blocks/BlocklyPanel.tsx, components/assets/AssetsPanel.tsx, components/assets/imageProcessing.ts, components/extensions/ExtensionsPanel.tsx, components/settings/SettingsDrawer.tsx',
    focus: 'unnecessary re-renders, missing memo/useCallback on hot paths, effect dependency bugs & missing cleanup (listeners/timers/observers), list keys, large-list virtualization, image processing on main thread, preview budget logic.' },
  { key: 'perf-layout', lens: 'PERFORMANCE+UX', scope: 'components/layout/* (Shell, NarrowLayout, NarrowPanels, BottomPanel, TabStrip, ModeArea, bottomTabs, lazyPanels, layoutBreakpoints, Topbar, ErrorViews), studio/StudioCore.tsx, studio/layoutContext.tsx, modes/BlocksMode.tsx, modes/BridgeMode.tsx, modes/lazyModes.ts',
    focus: 'layout measurement gate, mount/unmount thrash on wide<->narrow, keeping panels mounted via hidden, ResizeObserver cleanup, lazy mode loading, StudioCore config memoization correctness, re-render storms from context.' },
  { key: 'qual-monaco', lens: 'QUALITY+PERF', scope: 'monaco/index.ts, monaco/languages.ts, monaco/modelPaths.ts, monaco/workers.ts, monaco/workers/*, monaco/MonacoTabs.tsx, components/code/LazyMonacoTabs.tsx, components/code/FileExplorer.tsx, components/code/ProFileTree.tsx, components/code/proTreeView.ts, components/code/pro-templates/index.ts',
    focus: 'Monaco model lifecycle & disposal (leaks), worker wiring cross-bundler, model path collisions, lazy loading, editor recreation on prop change, file tree correctness.' },
  { key: 'qual-arch', lens: 'ARCHITECTURE+QUALITY', scope: 'WHOLE PACKAGE (src/index.ts public API, core/*, ui-internal/*, hooks/*, extensions/*, i18n). Use Grep broadly.',
    focus: 'dead code, duplicated logic across modules, leaky public API (internals exported), unsafe `as any`/non-null casts hiding bugs, inconsistent error handling, missing i18n strings (hardcoded pt text outside pt-BR.ts), TODO/FIXME, hooks correctness (useDebounced/useMeasuredWidth/useCrossHighlight).' },
]

// --- run --------------------------------------------------------------------

phase('Review')
log(`Reviewing @sistemazero/studio across ${AREAS.length} areas — baseline is green (1221 tests, typecheck, biome).`)

function finderPrompt(a) {
  return `${RULES}\n\nYOUR AREA: ${a.key} — primary lens: ${a.lens}\nFILES IN SCOPE: ${a.scope}\nFOCUS: ${a.focus}\n\n${ACCEPTED}\n${CHANGED}\n${BASELINE}\n\nReview your scope exhaustively and return your findings via the StructuredOutput tool. area="${a.key}".`
}

function verifierPrompt(f, area) {
  return `You are an adversarial verifier. Your job is to REFUTE the finding below, not to agree with it. Default to false_positive when uncertain or when the "issue" is a documented/accepted trade-off.\n\nWorking dir = repo root; package at ${ROOT}. READ ${ROOT}/CLAUDE.md and OPEN the cited file at the cited line yourself — do not trust the quote blindly. Check surrounding code for an existing guard/mitigation. Run \`git -C ${ROOT} diff HEAD -- <file>\` if it is a changed file.\n\n${ACCEPTED}\n\nFINDING (area ${area}):\n- title: ${f.title}\n- severity(claimed): ${f.severity}  category: ${f.category}  confidence(claimed): ${f.confidence}\n- file: ${f.file}:${f.line}\n- evidence: ${f.evidence}\n- impact: ${f.impact}\n- proposed fix: ${f.fix}\n\nVerdict rules: "confirmed" = you reproduced/proved it from the real code and it is NOT an accepted trade-off; "false_positive" = the code actually handles it, the quote is wrong/out of context, or it is a documented trade-off; "uncertain" = plausible but needs runtime/browser confirmation. Give adjusted_severity (your honest severity) and a refined_fix. Return via StructuredOutput.`
}

const reviewed = await pipeline(
  AREAS,
  (a) => agent(finderPrompt(a), { label: `find:${a.key}`, phase: 'Review', schema: FINDINGS_SCHEMA }),
  (result, a) => {
    if (!result || !result.findings || result.findings.length === 0) {
      return { area: a.key, summary: result ? result.summary : '(finder returned nothing)', verified: [] }
    }
    return parallel(
      result.findings.map((f) => () =>
        agent(verifierPrompt(f, a.key), { label: `verify:${a.key}:${f.id}`, phase: 'Verify', schema: VERDICT_SCHEMA, effort: 'high' })
          .then((v) => (v ? { ...f, area: a.key, verdict: v.verdict, verifier_reasoning: v.reasoning, severity: v.adjusted_severity || f.severity, fix: v.refined_fix || f.fix } : null))
      )
    ).then((verified) => ({ area: a.key, summary: result.summary, verified: verified.filter(Boolean) }))
  }
)

const areaResults = reviewed.filter(Boolean)
const allVerified = areaResults.flatMap((r) => r.verified || [])
const confirmed = allVerified.filter((f) => f.verdict === 'confirmed')
const uncertain = allVerified.filter((f) => f.verdict === 'uncertain')

log(`Verification done: ${confirmed.length} confirmed, ${uncertain.length} uncertain, ${allVerified.length - confirmed.length - uncertain.length} rejected (of ${allVerified.length} raw findings across ${areaResults.length} areas).`)

phase('Synthesize')

const forSynth = [...confirmed, ...uncertain].map((f) => ({
  area: f.area, title: f.title, severity: f.severity, category: f.category,
  file: f.file, line: f.line, impact: f.impact, fix: f.fix, verdict: f.verdict,
  evidence: f.evidence, reasoning: f.verifier_reasoning,
}))

const SYNTH_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    executive_summary: { type: 'string', description: 'professional assessment of studio overall health for a children-facing product' },
    items: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          rank: { type: 'number' },
          title: { type: 'string' },
          severity: { type: 'string', enum: ['critical', 'high', 'medium', 'low'] },
          category: { type: 'string' },
          area: { type: 'string' },
          location: { type: 'string', description: 'file:line' },
          problem: { type: 'string' },
          fix: { type: 'string' },
          verdict: { type: 'string' },
        },
        required: ['rank', 'title', 'severity', 'category', 'area', 'location', 'problem', 'fix', 'verdict'],
      },
    },
    fix_order: { type: 'array', items: { type: 'string' }, description: 'recommended order to fix, by title' },
    areas_clean: { type: 'array', items: { type: 'string' }, description: 'areas with no confirmed issues' },
  },
  required: ['executive_summary', 'items', 'fix_order', 'areas_clean'],
}

const areaSummaries = areaResults.map((r) => `- ${r.area}: ${r.summary}`).join('\n')

const synthesis = await agent(
  `You are the lead reviewer synthesizing a full review of @sistemazero/studio (an embeddable educational IDE for children that runs untrusted user code in a sandboxed preview). Below are all VERIFIED findings (confirmed + uncertain) plus each area reviewer's health summary.\n\nDEDUPLICATE findings that point at the same root cause/location. Drop anything that is actually an accepted trade-off. PRIORITIZE by real-world risk to a children's product: sandbox escape / host-page compromise > data loss of a child's project > kid-facing crash/confusing error > correctness edge case > perf > polish. Be honest and professional — if the package is in good shape, say so plainly.\n\nVERIFIED FINDINGS (JSON):\n${JSON.stringify(forSynth, null, 2)}\n\nAREA HEALTH SUMMARIES:\n${areaSummaries}\n\nReturn the prioritized, deduped report via StructuredOutput.`,
  { label: 'synthesize', phase: 'Synthesize', schema: SYNTH_SCHEMA, effort: 'high' }
)

return {
  stats: {
    areas: areaResults.length,
    raw_findings: allVerified.length,
    confirmed: confirmed.length,
    uncertain: uncertain.length,
    rejected: allVerified.length - confirmed.length - uncertain.length,
  },
  synthesis,
  confirmed_detail: confirmed,
}
