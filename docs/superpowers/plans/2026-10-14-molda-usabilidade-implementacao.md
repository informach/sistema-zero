# Molda usability implementation plan

> **For agentic workers:** Use `executing-plans` to implement this plan task by task in the current session. Track the checkboxes and preserve unrelated workspace changes.

**Goal:** Implement the approved revision 4 for children aged 9–12 creating, painting and animating on a computer.

**Architecture:** Keep the existing scene document, commands, access families, persistence and workers. Move activity/tool/transition ownership into the workshop; use existing commands from a consistent rail/stage/inspector/timeline shell. Add explicit domain operations for placement, compound animation drafts and whole-model animation rather than hiding incompatible behavior behind labels.

**Tech stack:** React 19, TypeScript, Zustand, Three.js, Tailwind, Bun tests and Playwright.

**Spec:** [Proposal](../../plans/2026-10-14-molda-usabilidade-proposta.md), [flows](../../plans/2026-10-14-molda-usabilidade-fluxos.md), [review](../../plans/2026-10-14-molda-usabilidade-revisao.md).

**Final implementation review:** [Findings, corrections and verification](../../plans/2026-10-14-molda-usabilidade-full-review.md). The workshop is the default for every model; no V2 rollout flag, adapter switch or environment variable is required.

## Global constraints

- Preserve all 23 access families, all 45 registered commands and advanced documents.
- Use the screenshots' regions: left tools, central creation, right pieces/properties/colors, timeline beneath the central stage in Animar.
- Keep one active tool and one selection; selecting another piece never transforms or paints it on the same gesture.
- A confirmed gesture is one undo; a manual pose draft has local undo and a single final commit.
- Do not equate local saving with account synchronization. Preserve revision-owned imports/exports and host review.
- Initial manual clip: 2 seconds, loop off; brush medium; mirror, autokey and previous-pose ghost off.
- Do not implement deferred arbitrary-surface snapping, destructive capped cutting, automatic walking or video export.
- Baseline worktree has unrelated changes. Only edit Molda, necessary host integration and this task's evidence/docs.

## 1. Baseline and modeling domain

Files: `packages/molda/src/scene/placement.ts`, `placement.test.ts`, `commands.ts`; `SceneCreateMenu.tsx`, `useSceneWorkshop.ts`.

Interfaces: commands consume `MoldaSceneDocument` and return a new validated document. Placement exports `sceneInsertionParent(document, ids)`, `addScenePrimitiveNear(document, kind, name, ids, nextId?)`, `duplicateSceneNodesNearby(document, ids, nextId?)`, `placeSceneNodesOnSupport(document, ids, supportId)` and `placeSceneNodesOnGround(document, ids)`.

- [x] Record fresh typecheck/test baseline in `.audits/molda-usabilidade-2026-10-14/`.
- [x] Add domain tests: visible non-overlapping insertion, placement under transformed group, independence of duplicate, valid planar support, invalid curved/tilted support, lock rejection, unchanged original on failure.
- [x] Implement placement with indexed world bounds, parent inverse and existing command validation; insertion must not mutate existing node IDs or animation tracks.
- [x] Integrate creation/duplication and support preview, selection retention and cancellation into the workshop.
- [x] Run `bun test src/scene/placement.test.ts` from `packages/molda`.

## 2. Common shell, tools and navigation

Files: `SceneWorkshop.tsx`, `useSceneWorkshop.ts`, `SceneCanvas.tsx`, `SceneWorkshopBar.tsx`, `SceneModelColumn.tsx`, `SceneNodeProperties.tsx`, `SceneHierarchy.tsx`, `SceneTile.tsx`, `styles/molda.css`, viewport gesture modules.

Interfaces: workshop owns `tool`/`setTool`; canvas receives controlled tool and camera intent; inspector renders the same tool. Stage slots preserve a single viewport instance. Group operations use the same selection as the hierarchy.

- [x] Put activity tabs in the project header, move appearance/palette to the right, and constrain timeline to the central column.
- [x] Keep useful relative click actions visible; precise values and advanced context operations remain named disclosures under their existing gates.
- [x] Implement visible Olhar, return on tool/activity choice, frame-all/selected, zoom clicks and first-selection-only pointer behavior.
- [x] Expose visible tree visibility/lock controls and recoverable isolation; preserve names and focus.
- [x] Run shell/tool-access/viewport tests and typecheck; review actual layout in 1440×900, 1366×768 and 1024×600.

## 3. Painting

Files: `useScenePaint.ts`, `useSceneWorkshop.ts`, `ScenePaintKid.tsx`, `ScenePaintPalette.tsx`, `ScenePaintToolbox.tsx`, `scene/composite.ts`, `scene/paintSurface.ts`, paint viewport routes.

Interfaces: remembered ink represents visual RGBA, resolving a valid indexed color only for the target; picker samples composed color including base; `fillScope` separates area fill from piece base color using `patchScenePieceAppearance`.

- [x] Add behavior tests for target changes without accidental paint, preserved visual ink across image encodings, composite picker on empty layer and base fill preserving drawings/other pieces.
- [x] Place brush/fill/eraser/picker and sizes on the rail; selected ink/palette and tree on the right; preserve advanced contexts.
- [x] Keep surface preparation reversible until the first confirmed gesture. Explain incompatible material/layer preparation and never queue clicks.
- [x] Keep eraser scoped to the active layer and show its name for layered documents.
- [x] Run painting domain, hook, shell and access tests.

## 4. Animation draft and transition coordination

Files: `state/SceneAnimationPoseGesture.ts`, `scene/animationPoseTransform.ts`, their tests, `useSceneWorkshop.ts`, `SceneAnimationPoseControls.tsx`, `SceneExitControl.tsx`.

Interfaces: the draft owner is document/revision/clip/time; selection belongs to each gesture. Draft state exposes local `undo`/`redo`, changed targets and explicit mark/discard. A workshop transition resumes its original action only after resolution.

- [x] Add tests for A then B at the same time, local undo/redo, group then child, existing-key edits, initial anchors and exact preview/commit agreement.
- [x] Compose draft changes without double-transforming descendants; marking records changed channels together and retains the draft on error.
- [x] Resolve time/clip/activity/play/files/exit transitions through one Mark/Discard/Continue decision. Camera and same-time selection do not prompt.
- [x] Persist a separate revision-owned recoverable draft without labeling it a saved pose; invalidate incompatible recovery safely.
- [x] Run draft, animation transform and transition integration tests.

## 5. Animation creation and timeline

Files: `SceneAnimationClips.tsx`, `SceneAnimationPresets.tsx`, `SceneAnimationTimeline.tsx`, `SceneAnimationInspector.tsx`, `scene/animationCommands.ts`, `scene/animationPresets.ts`, `state/SceneAnimationPlayer.ts`.

Interfaces: whole-model preparation returns a candidate group/document and target IDs; accepting commits group+clip once; cancellation restores the source. Timeline navigation never creates keys; adding time changes duration by 2 seconds without rescaling keys.

- [x] Implement Esta peça/Modelo inteiro for preset and manual creation with common-group validation and one confirmation transaction.
- [x] Start manual clips at 2 s with loop off; preserve existing clip settings and remembered time across activities.
- [x] Render one aggregated timeline row per animated/selected piece, expandable channels, compact transport and advanced tools in disclosures.
- [x] Implement next-pose/end navigation, Mais tempo, replay from the end and click alternatives to timeline dragging.
- [x] Run clip/preset/player/timeline tests including cancel, incompatible grouping and adding a part after a whole-model animation.

## 6. Advanced contexts and remaining screens

Files: model precision/pivot/component/cut panels, paint layers/UV/material/flipbook panels, `TextureEditor.tsx`, `SkyEditor.tsx`, gallery/new-asset components.

- [x] Check each T01–T45 and each mapped family against the implementation, retaining all authoring operations in contextual destinations.
- [x] Implement pivot presets/preview with preservation checks and cut plane preview with accurate division semantics; cancellation preserves original content.
- [x] Give specialized contexts a named target, explicit return and consistent apply/cancel behavior without resetting viewport state on disclosure changes.
- [x] Make new-model entry direct with a valid automatic name and selected initial cube; existing models open with Escolher.
- [x] Align texture/sky/galleries with the shared language, history, saving and failure behavior without adding irrelevant activity tabs.

## 7. Saving, files and host

Files: `SceneWorkshopBar.tsx`, `SceneExitControl.tsx`, import/export panels, gallery storage, `components/hostChrome.tsx`; host integration only if required.

- [x] Group saving/export destinations in the header and label actual local/cloud guarantees.
- [x] Preserve source revision acceptance, replacement import wording, restore validation, PNG preview and actual HTML presentation output.
- [x] Make clean exit direct; pending pose/save/host review has recovery and resumes the requested destination exactly once.
- [x] Run persistence, import/export, host-conformance and exit tests.

## 8. Final verification and evidence

- [x] Run `bun run typecheck`, all tests covered by `bun run test` and package lint on changed files; fix regressions introduced by the refactor. Use sequential batches when the shared workstation cannot hold an entire partition in memory, preserving every test file.
- [x] Run Playwright workflows for create/stack/paint/erase/animate/continue/undo/save/reopen and responsive layouts, including mouse and touchpad-style navigation.
- [x] Capture the implemented three activities and advanced representative states; compare with the supplied screenshots.
- [x] Record actual results and remaining empirical usability limitations. Automated tests do not substitute sessions with children.

## Execution record

Implementation started after explicit user approval on 14/10/2026. No product changes existed in `packages/molda` at task start.

Baseline: TypeScript passed; 3,065 tests passed in the three configured partitions. Final results and reproducible evidence are recorded in [the delivery report](../../plans/2026-10-14-molda-usabilidade-entrega.md) and `.audits/molda-usabilidade-2026-10-14/`.

Implemented: common shell and controlled tools; fixed-plane body drag with selection-only first gesture; nearby insertion and planar support placement; paint rail/palette, visual ink, composite picker and isolated base fill; compound pose drafts with local history, initial anchors, transition decisions and local recovery; target-aware manual/preset creation; compact timeline and pose click controls; direct model entry and project rename; responsive inspector sections; pivot/cut visual previews; explicit decisions before leaving a model/preset preview; texture tool alignment; save/exit integration and preservation of the existing advanced families. The delivery report maps T01–T45 to domain, integration and browser evidence.

All four isolated Playwright scripts passed with no page errors, including actual painting/erasing/picking, camera drag/wheel, stacking, whole-model/manual animation, compound poses, mark/continue, +2s, reload recovery, direct saved exit, pivot/cut/preset preview cancellation and atomic application, texture/sky history and keyboard navigation. Central animation stage sizes: 974×410 at 1366×768, 1016×502 at 1440×900, 680×230 at 1024×600 (the development host adds 38px). Reflow at 683×384 and 512×300 retained usable canvas dimensions and reachable controls without page overflow. Final captures were taken after viewport readiness. Integrated browser was unavailable (`agent.browsers.list() = []`); the fallback used the project's isolated Playwright browser. Physical touchpads, native browser zoom, production account integration and observed child usability remain empirical validation rather than claims of this implementation.

Final verification: all 3,090 tests passed across 413 files using sequential batches; TypeScript, lint/format for 86 changed files, production playground build and all four browser workflows passed. See the delivery report for logs, captures and empirical limits.
