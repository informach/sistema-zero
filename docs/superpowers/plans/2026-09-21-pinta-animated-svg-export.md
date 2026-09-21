# Pinta Animated SVG Export Implementation Plan

> ⚠️ **Consumidor removido em 21/09/2026.** A trilha Kids passou a usar **Rive
> (`.riv`)** por módulo, e o `validateModuleIllustrationSvg` do Admin — junto com o
> upload de SVG e o teste integrado citado abaixo — deixou de existir. O exportador
> de SVG animado do Pinta **continua valendo** para download e compartilhamento; o
> que caiu foi a promessa de que o arquivo vira arte de módulo. Este documento fica
> como registro do desenho original.


> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Export the selected vector animation as a module-compatible SVG that safely combines static shapes, smooth motion, and frame-by-frame fallbacks.

**Architecture:** Add an optional stable `motionId` to vector shapes, preserving it across frame duplication while renewing it for independent copies. A pure exporter compacts equal frames, classifies each z-slot as static, safely interpolated, or discrete, and emits a standalone SVG with a reduced-motion first-frame fallback. A focused React panel previews the generated Blob and downloads it from the existing export dialog.

**Tech Stack:** TypeScript, React 19, SVG/CSS/SMIL, Bun test, Testing Library, Admin SVG allowlist.

**Spec:** `docs/plans/2026-09-21-pinta-animated-svg-export-design.md`

## Global Constraints

- Preserve the current frame-by-frame editor; do not add a keyframe timeline.
- Smooth only rect, ellipse, and line geometry plus rotation and opacity when `motionId`, z-order, type, and non-animated style match in every compacted pose.
- Fall back to discrete poses whenever identity or compatibility is uncertain.
- Export only the selected vector animation.
- Preserve `frameDurationsMs`, `loop`, the first pose under `prefers-reduced-motion`, and the last pose when `loop` is false.
- Reject visible text and embedded image shapes for the module-compatible export.
- Reject output larger than 2 MiB.
- Keep old assets valid when `motionId` is absent.
- Do not add dependencies.
- The user requested one final commit after implementation and review; do not create per-task commits.

---

### Task 1: Stable motion identity

**Files:**
- Modify: `packages/pinta/src/vector/model.ts`
- Modify: `packages/pinta/src/vector/shapes.ts`
- Modify: `packages/pinta/src/animation/frames.ts`
- Modify: `packages/pinta/src/vector/insertAsset.ts`
- Modify: `packages/pinta/src/components/editor/vector/vectorTools.ts`
- Modify: `packages/pinta/src/components/editor/vector/VectorEditorScope.tsx`
- Test: `packages/pinta/src/vector/model.test.ts`
- Test: `packages/pinta/src/animation/framesVector.test.ts`
- Test: `packages/pinta/src/components/editor/vector/vectorTools.test.ts`
- Test: `packages/pinta/src/vector/insertAsset.test.ts`

**Interfaces:**
- Produces: optional `VectorShape.motionId?: string` validated by `isSafeVectorId`.
- Produces: new shapes with distinct `id` and `motionId` values.
- Produces: frame duplication with new `id` and preserved `motionId`; independent shape or animation duplication gets remapped `motionId` values.

- [x] **Step 1: Write failing sanitizer and factory tests.**

```ts
it('preserva motionId seguro e omite valor inválido', () => {
  expect(sanitizeVectorShape({ ...rectRaw, motionId: 'mov-1' })?.motionId).toBe('mov-1')
  expect(sanitizeVectorShape({ ...rectRaw, motionId: 'mov com espaço' })?.motionId).toBeUndefined()
})

it('uma forma nova nasce com identidade de movimento própria', () => {
  const shape = makeRect({ x: 0, y: 0 }, { x: 10, y: 10 }, DEFAULT_STYLE)
  expect(shape.motionId).toBeTruthy()
  expect(shape.motionId).not.toBe(shape.id)
})
```

- [x] **Step 2: Write failing clone semantics tests.**

```ts
it('duplicateFrame troca id e preserva a trilha de movimento', () => {
  const original = out.animations[0]?.frames[0]?.[0]
  const copy = out.animations[0]?.frames[1]?.[0]
  expect(copy?.id).not.toBe(original?.id)
  expect(copy?.motionId).toBe(original?.motionId)
})

it('duplicar forma cria uma trilha independente', () => {
  const [copy] = cloneShapesWithNewIds([shape], 2, 2)
  expect(copy?.motionId).not.toBe(shape.motionId)
})
```

- [x] **Step 3: Run focused tests and confirm failure.**

Run: `cd packages/pinta && bun test src/vector/model.test.ts src/animation/framesVector.test.ts src/components/editor/vector/vectorTools.test.ts src/vector/insertAsset.test.ts`

Expected: FAIL because `motionId` is absent or copied with the wrong semantics.

- [x] **Step 4: Implement the identity field and all creation/clone paths.**

Use `newId()` for the new identity. Preserve it only when a copied frame represents the next pose of the same animation. Remap it when content becomes an independent object or animation. When duplicating an old frame with no `motionId`, assign one to both the source pose and its new duplicate in the returned immutable asset.

- [x] **Step 5: Run the focused tests.**

Run: `cd packages/pinta && bun test src/vector/model.test.ts src/animation/framesVector.test.ts src/components/editor/vector/vectorTools.test.ts src/vector/insertAsset.test.ts`

Expected: PASS.

### Task 2: Pure hybrid SVG exporter

**Files:**
- Create: `packages/pinta/src/export/animatedSvg.ts`
- Create: `packages/pinta/src/export/animatedSvg.test.ts`
- Modify: `packages/pinta/src/vector/svg.ts`

**Interfaces:**
- Produces: `MODULE_ANIMATED_SVG_MAX_BYTES = 2 * 1024 * 1024`.
- Produces: `buildAnimatedVectorSvg(asset, animation, { smooth }): AnimatedVectorSvgResult`.
- Produces on success: `{ ok: true, svg, bytes, smoothedTracks, staticTracks, frameCount }`.
- Produces on failure: `{ ok: false, reason: 'empty' | 'text' | 'image' | 'too-large', bytes? }`.

- [x] **Step 1: Write failing tests for empty and incompatible animations.**

```ts
expect(buildAnimatedVectorSvg(asset, { ...animation, frames: [] }, { smooth: true })).toEqual({
  ok: false,
  reason: 'empty',
})
expect(buildAnimatedVectorSvg(withText, textAnimation, { smooth: true })).toMatchObject({
  ok: false,
  reason: 'text',
})
```

- [x] **Step 2: Write failing tests for static extraction and conservative fallback.**

Create two frames where one rectangle keeps the same export geometry and a path changes. Assert that the rectangle markup appears once, the path versions remain discrete, and the SVG contains the reduced-motion first pose.

- [x] **Step 3: Write failing tests for safe interpolation.**

```ts
const result = buildAnimatedVectorSvg(asset, animation, { smooth: true })
expect(result.ok && result.smoothedTracks).toBe(1)
expect(result.ok && result.svg).toContain('attributeName="x"')
expect(result.ok && result.svg).toContain('attributeName="transform"')
expect(result.ok && result.svg).toContain('calcMode="linear"')
```

Cover rect, ellipse, line, opacity, rotation, mismatched style, missing `motionId`, duplicate `motionId`, and z-order changes.

- [x] **Step 4: Write failing timing tests.**

Assert cumulative `keyTimes` from `frameDurationsMs`, `repeatCount="indefinite"` for loops, one iteration plus `fill="freeze"` for non-loops, and final-pose retention. Add an identical-consecutive-frame case and assert the exporter combines its duration.

- [x] **Step 5: Write failing size and XML-safety tests.**

Assert UTF-8 byte counting, the 2 MiB rejection, escaped values, local-only gradient references, no `<script>`, no external URL, and no embedded font or image data.

- [x] **Step 6: Run the exporter tests and confirm failure.**

Run: `cd packages/pinta && bun test src/export/animatedSvg.test.ts`

Expected: FAIL because the module does not exist.

- [x] **Step 7: Extend `shapeToMarkup` without changing existing bytes.**

Add an optional children parameter used only by animated basic shapes. Existing calls must produce byte-identical strings and keep the current `svg.test.ts` green.

- [x] **Step 8: Implement the exporter.**

Use visible shapes only. Compact consecutive visually identical frames. Walk z-slots, extract visually static shapes, require stable `motionId` for smooth tracks, and wrap the remaining unique slot variants in discrete visibility animations. Place the animated scene in `.pin-motion` and a complete first-frame fallback in `.pin-reduced`; switch them in `@media (prefers-reduced-motion: reduce)`.

- [x] **Step 9: Run exporter and SVG regression tests.**

Run: `cd packages/pinta && bun test src/export/animatedSvg.test.ts src/vector/svg.test.ts src/export/vectorSheet.test.ts`

Expected: PASS.

### Task 3: Admin compatibility contract

**Files:**
- Modify: `packages/admin/tests/module-illustration-svg.test.ts`
- Modify only if the generated safe subset exposes a real allowlist gap: `packages/admin/src/lib/module-illustration-svg.ts`

**Interfaces:**
- Consumes: `buildAnimatedVectorSvg`.
- Proves: the real Admin validator accepts both smoothed and discrete output and still rejects active content.

- [x] **Step 1: Add an integration test that builds a real Pinta vector animation.**

```ts
const result = buildAnimatedVectorSvg(asset, animation, { smooth: true })
if (!result.ok) throw new Error(`export inesperado: ${result.reason}`)
expect(validateModuleIllustrationSvg(result.svg)).toBe(result.svg)
```

- [x] **Step 2: Run the contract test and confirm its result.**

Run: `cd packages/admin && bun test tests/module-illustration-svg.test.ts`

Expected: PASS without broadening the allowlist. If it fails, add only the exact inert attribute required by the generated document and a matching rejection test for unsafe values.

### Task 4: Export dialog panel and real SVG preview

**Files:**
- Create: `packages/pinta/src/components/export/AnimatedSvgExport.tsx`
- Create: `packages/pinta/src/components/export/AnimatedSvgExport.test.tsx`
- Modify: `packages/pinta/src/components/export/ExportDialog.tsx`
- Modify: `packages/pinta/src/core/copy.ts`
- Modify: `packages/pinta/src/components/editor/vectorSpriteUi.test.tsx`

**Interfaces:**
- Consumes: `VectorSpriteAsset`, `PintaVectorAnimation`, `buildAnimatedVectorSvg`, and `triggerDownload`.
- Produces: a self-contained panel with smooth mode on by default, final-document preview, summary, size, blocking messages, and `.svg` download.

- [x] **Step 1: Write failing UI tests for the successful state.**

Assert the selected animation name, checked “Movimento mais suave”, an `<img>` whose source is a created Blob URL, smoothed-track summary, byte size, and download filename `<asset>-<animation>.svg`.

- [x] **Step 2: Write failing UI tests for cleanup and mode switching.**

Mock `URL.createObjectURL` and `URL.revokeObjectURL`. Toggle smooth mode, assert a new Blob is generated, assert the prior URL is revoked, then unmount and assert the last URL is revoked.

- [x] **Step 3: Write failing UI tests for blocked states.**

Cover visible text, visible image, empty animation, and oversize output. The button stays visible but disabled, and each state explains how to fix the drawing.

- [x] **Step 4: Run UI tests and confirm failure.**

Run: `cd packages/pinta && bun test src/components/export/AnimatedSvgExport.test.tsx src/components/editor/vectorSpriteUi.test.tsx`

Expected: FAIL because the panel and copy do not exist.

- [x] **Step 5: Implement the focused panel.**

Keep URL ownership inside one effect. Build the SVG with `useMemo`, create the preview Blob only for successful output, revoke every replaced/unmounted URL, and use the existing `Button`, `PenTool`, `triggerDownload`, and toast conventions.

- [x] **Step 6: Mount the panel only for the selected vector animation.**

Place it beside the GIF action in the vector-sprite section. Do not expose it for pixel sprites, backgrounds, tilesets, or tilemaps.

- [x] **Step 7: Run the UI tests.**

Run: `cd packages/pinta && bun test src/components/export/AnimatedSvgExport.test.tsx src/components/editor/vectorSpriteUi.test.tsx src/components/editor/animationUi.test.tsx`

Expected: PASS.

### Task 5: Package documentation and complete local verification

**Files:**
- Modify: `packages/pinta/CLAUDE.md`
- Modify: `docs/plans/2026-09-21-pinta-animated-svg-export-design.md` only if implementation decisions changed.
- Modify: `docs/superpowers/plans/2026-09-21-pinta-animated-svg-export.md` to check completed steps.

- [x] **Step 1: Document the new export contract.**

Record `motionId` semantics, the safe smoothing subset, reduced-motion fallback, module restrictions, the 2 MiB ceiling, and the integration test that protects the Admin allowlist.

- [x] **Step 2: Run focused package checks.**

Run:

```powershell
cd packages/pinta
bun test src
bun run typecheck
bun run check
cd ../admin
bun test tests/module-illustration-svg.test.ts
bun run typecheck
```

Expected: all commands exit 0.

- [x] **Step 3: Run repository-level checks proportional to the deployment.**

Run from the repository root:

```powershell
bunx biome check packages/pinta/src packages/admin/tests/module-illustration-svg.test.ts docs/plans/2026-09-21-pinta-animated-svg-export-design.md docs/superpowers/plans/2026-09-21-pinta-animated-svg-export.md
bun run --filter @sistemazero/community-kids typecheck
bun run --filter @sistemazero/community typecheck
bun run --filter @sistemazero/members typecheck
git diff --check
```

Expected: all commands exit 0.

### Task 6: Full review, remediation, commit, staging merge, push, and deploy

**Files:** all files changed by Tasks 1–5.

- [x] **Step 1: Review the full diff against the design.**

Inspect correctness, data migration, identity collisions, XML safety, animation timing, z-order, reduced motion, Blob URL lifetime, error copy, test strength, dead code, and package boundaries. Record findings by severity.

- [x] **Step 2: Fix every confirmed finding and rerun affected tests.**

Use root-cause fixes. Add a regression test for each behavioral defect found during review.

- [x] **Step 3: Run fresh final verification.**

Repeat the focused tests, package tests, typechecks, Biome checks, `git diff --check`, and inspect `git status --short` so the commit contains only this feature.

- [x] **Step 4: Create the final feature commit.**

```powershell
git add <scoped files>
git commit -m "feat(pinta): exportar animacoes vetoriais em SVG"
```

- [ ] **Step 5: Merge into the current remote staging tip.**

Fetch `origin/staging`, inspect divergence, update the feature branch safely if staging advanced, switch to local `staging`, fast-forward it to the reviewed feature commit, and verify the resulting tree before push.

- [ ] **Step 6: Push staging and monitor CI/deploy to terminal success.**

```powershell
git push origin staging
```

Use GitHub CLI to locate the workflow for the pushed SHA. Wait until every CI job and `deploy-staging` finish. Confirm Railway terminal success for the affected `members`, `admin`, `community`, and `community-kids` services as reported by the workflow. If CI or deploy fails because of this change, diagnose, fix, re-review, recommit, merge, push, and monitor again.
