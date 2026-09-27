# Challenge Source-First Recording Scripts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restore the original Challenge Days 1–5 explanations and useful analogies in the interactive lessons, adapted to the present Studio and the approved pedagogy.

**Architecture:** Treat each original script as a narrative source, not a technical specification. Revise each current recording script at the first introduction of a concept; synchronize its lesson analysis and manifest only when the recording direction or learner-facing content changes. Keep the pre-existing scene-engine migration and challenge sequence intact.

**Tech Stack:** Markdown, manifest v5 JSON, Bun editorial validator and tests, Biome.

**Spec:** `docs/plans/2026-09-24-desafio-roteiros-fonte-design.md`

## Global Constraints

- Only Challenge Days 1–5. Do not change introduction or certificate.
- Original scripts in `C:\Users\tocha\Documents\fluxo-criativo\meus-produtos\desafio-primeiro-jogo\entregas\videos` supply narrative essence and analogies, not current palette paths, block defaults, or game behavior.
- Each section has at most one video and one brief Zappy bridge. A concept video explains; the experience instruction lets the learner test without giving away its outcome.
- The Day 1 pilot's project state and the Days 2–5 migrated manifests remain the baseline. Section order and Studio checks may change when later user feedback explicitly approves it; changes to shared scene code require observed evidence and regression tests.
- Preserve concurrent edits; no push or deploy.

---

### Task 1: Map original narrative to current sections

**Files:**
- Read: five `roteiro-aula-diaN-desafio-primeiro-jogo.md` files in the external source directory
- Read: `docs/aulas-interativas/aulas/desafio-dia-{1,2,3,4,5}.roteiro.md`
- Read: matching analyses and manifests

**Interfaces:** Produces a per-day comparison of first-use context, analogy, Studio action and any old statement that must be corrected.

- [x] **Step 1:** For each original `## Parte`, identify the question it answers and its concrete example. Map it to the current `## Seção`; include the first mention of every new term.
- [x] **Step 2:** Flag source details contradicted by current Studio labels, palette location, game simulation, or a prior approved lesson decision; keep their educational intent without reproducing the error.
- [x] **Step 3:** Check that the video alone prepares a child who has just completed the preceding section; do not count later sections or Zappy text as prerequisite explanation.

### Task 2: Repair Day 1's first-contact explanations

**Files:**
- Modify: `docs/aulas-interativas/aulas/desafio-dia-1.roteiro.md`
- Modify if needed: `docs/aulas-interativas/aulas/desafio-dia-1.md`
- Modify if needed: `docs/aulas-interativas/aulas/desafio-dia-1.manifesto.json`

**Interfaces:** Produces a Section 2 that names and locates the Studio's two project areas before demonstrating a one-time action versus a repeated action.

- [x] **Step 1:** Show the empty Studio and its **Áreas do projeto** category first; narrate that these large areas hold instructions. Use the original paper-and-pencils preparation and running fan as brief concrete comparisons before the timeline demonstration.
- [x] **Step 2:** Preserve the existing experiment's same-chip comparison without narrating its control sequence or outcome as if the child had already tried it. Make the on-screen direction match the revised narration.
- [x] **Step 3:** Audit the later first introductions of coordinates, sprite, frame, clearing and draw order against the original analogies; repair any missing context or misleading analogy.
- [x] **Step 4:** Update word/time estimates and analysis/manifest description if the clip direction changes. Run `bun docs/aulas-interativas/qa/validar-manifestos.ts desafio-dia-1` and compare script video keys with manifest keys.

### Task 3: Restore Days 2–3's narrative foundations

**Files:**
- Modify: `docs/aulas-interativas/aulas/desafio-dia-{2,3}.roteiro.md`
- Modify if needed: matching `.md` and `.manifesto.json`

**Interfaces:** Day 2 introduces one nave versus many tiros before group, then event/position/velocity/cleanup; Day 3 reuses group before clock, random spawning and pair-specific collision.

- [x] **Step 1:** In Day 2, put the original one-nave/many-tiros problem and “saquinho” comparison before the group gesture; explain why the event area waits for Space before naming the area. Retain the current distinction between written numbers and live position.
- [x] **Step 2:** In Day 3, explicitly recall Day 2's group before creating asteroids, connect the interval block to a slower “relógio da chuva,” and explain random x as a draw from possible places, not a guarantee of a new place on each birth.
- [x] **Step 3:** Ground collision aliases in the original concrete pair of one shot and one asteroid; preserve the observation of the missed shot before the fix. Check instructions against scene goals, especially wait duration and leaving the screen.
- [x] **Step 4:** Synchronize recording estimates, analysis and manifest copy wherever changed. Validate each manifest and check all video keys against script clip keys.

### Task 4: Restore Days 4–5's narrative foundations

**Files:**
- Modify: `docs/aulas-interativas/aulas/desafio-dia-{4,5}.roteiro.md`
- Modify if needed: matching `.md` and `.manifesto.json`

**Interfaces:** Day 4 distinguishes storing, incrementing and showing, then hearts/protection. Day 5 distinguishes fixed target, four screens, playable state, end states and restart.

- [x] **Step 1:** In Day 4, use a concrete point-keeping example before “variável”; retain the original progression from stored score to visible scoreboard. Explain the later-rock protection accurately and make three lives relate to familiar game hearts without claiming the removed rock hits twice.
- [x] **Step 2:** In Day 5, preserve the fixed-target “caixinha lacrada,” introduce the four game moments with a concrete playthrough, and let the conditional question arise from why the game must stop moving outside `jogando`.
- [x] **Step 3:** Match Enter/restart and final delivery to current behavior; remove any inherited claim of automatic publication or jumping straight into the active game.
- [x] **Step 4:** Synchronize recording estimates, analysis and manifest copy wherever changed. Validate each manifest and check script/manifest video keys.

### Task 5: Cross-day pedagogical and technical review

**Files:**
- Review: all changed Challenge Days 1–5 recording scripts, analyses, manifests and any touched scene tests
- Review: `docs/aulas-interativas/BRIEFING.md`

**Interfaces:** Produces a local, reviewed `staging` state with no introduction/certificate changes.

- [x] **Step 1:** Read the ending of each day immediately before the beginning of the next; verify no term, screen or game behavior is assumed before introduction.
- [x] **Step 2:** Audit the scripts for “repara/veja/confere” before an observable action, factual spoilers in experience instructions, stale labels/values, duplicate Zappy direction and analogy repetition.
- [x] **Step 3:** Run `bun docs/aulas-interativas/qa/validar-manifestos.ts`, relevant core scene/learning tests, `bun run typecheck` in `packages/core`, repository formatting checks for modified files, `git diff --check`, and inspect `git diff --stat` plus `git status --short`.
- [x] **Step 4:** Resolve failures, review the final diff and commit only scoped files locally. Do not push or deploy.

### Task 6: Follow-up pedagogical and experience feedback

**Files:** Challenge Days 1–5 scripts, analyses and manifests; shared scene controls only where a duplicated instruction or timing model is proven.

- [x] **Step 1:** Keep the concept video on explanation and analogy. Remove any replay of the exact experience setup, control sequence or observed results. Keep the practical Studio videos step-by-step.
- [x] **Step 2:** Shorten the Zappy instruction inside each experience to an exploratory comparison. Put precise controls, counts and fallback sequence in optional hints; verify all required goals remain reachable.
- [x] **Step 3:** Preserve the separate Zappy bridge below the video, tying its words to that video's narrative. Remove redundant visible control instructions inside the experience, while preserving accessible control names and help.
- [x] **Step 4:** Rework the shared Once versus Always run control around starting and pausing the simulation rather than repeated manual frame steps; verify the pilot, the event variant and the lives variant. In the pilot's repeated-movement test, pause when the ship leaves the scene; bound the other variants by short, finite runs.
- [x] **Step 5:** Revalidate scripts, manifests, scene goals, UI tests, formatting and final diff before local commit. Do not push or deploy.

### Task 7: Make the Day 1 trail visible before adding scenery

**Decision approved by the user:** Ship on a plain background, move it to expose a trail, clear the old drawing, and add the starfield only after the comparison. The starfield paints over the whole canvas and could conceal the missing clear action. Later feedback also required showing every observable problem before its fix: after clearing the trail, test the ship leaving the screen before adding the border block.

- [x] **Step 1:** Split the Day 1 Studio progression into motor-and-ship, arrows-and-trail, clear-and-retest, border-test-and-fix, and starfield-finish sections, with one practical video each.
- [x] **Step 2:** Synchronize script, lesson analysis, manifesto order, Zappy bridges and Studio completion checks. Keep the quiz dedicated and the final delivery after the layers experience.
- [x] **Step 3:** Add a manifest regression test for section order and the critical block-order checks; verify that the final video checks block order because the stars mask visual proof of clearing.
- [x] **Step 4:** Re-run manifest validation, relevant tests, typechecks, formatting and final diff review; commit locally without push or deploy.

### Task 8: Full session-by-session audit of Challenge Days 1–5

**Decision approved by the user:** Continue applying the established pedagogy to every section and activity, not just the examples reported during review. Keep introduction and certificate untouched.

- [x] **Step 1:** Read each script section in learner order. Check that its opening connects to the preceding section, every new word is explained before use, and observations occur after a visible action.
- [x] **Step 2:** Compare each concept video with its experience: the video builds an understanding without narrating the controls, answer or outcome; the Zappy bridge ties to the video; the in-experience instruction is concise and exploratory, with exact help in hints.
- [x] **Step 3:** Compare each practical Studio clip with current block names, palette paths, defaults, warnings and cumulative project state. Show the problem before the fix, and repeat the full steps where a child needs them.
- [x] **Step 4:** Synchronize scripts, analyses and manifests for every correction; re-run editorial validation, relevant automated checks and final diff review before a local commit. Do not push or deploy.
