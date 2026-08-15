# Architectural analysis — search flyout implementation review

**Date:** 2026-08-15  
**Scope:** the two changed files plus their direct layout, CSS, metrics, and E2E dependencies  
**Project files analyzed:** 6  
**Third-party contracts inspected:** Blockly search category, flyout separator, and label APIs

## Executive summary

The vertical-layout calculation is coherent and verified: it includes the 8 px inset, the 5 px focus halo, and an 8 px content gap. Desktop and tablet produce a real painted gap of 10.1 px, and the custom metrics still make the last result reachable.

The compact-layout finding is resolved. Below 440 px, the Studio now uses an orientation-aware horizontal flyout that reserves the search header on Y and includes it in the flyout height. The E2E covers desktop and 375×812 and explicitly verifies autofocus before measuring the focus halo.

## Findings

### P1 — Horizontal flyout reserves the search gap on the wrong axis — RESOLVED

- **Files:** `packages/studio/src/blockly/searchCategory.ts:379`, `packages/studio/src/components/blocks/BlocklyPanel.tsx:957`
- **Confidence:** high
- **Evidence:** 375 and 439 px produce a painted gap of `-41.2 px`; 440 and 441 px produce `10.1 px`.
- **Impact:** every compact user sees the initial/no-result labels and the top of search-result blocks behind the focused input.
- **Recommendation:** branch on the real flyout orientation and reserve a cross-axis band in horizontal mode. Do not attempt another scalar increase to the separator gap.
- **Resolution:** `SearchAwareHorizontalFlyout` uses the protected Blockly inflater/layout/reflow extension points; a no-DOM marker shifts content on Y and increases flyout height only for search content.

### P2 — The regression test cannot detect the compact failure — RESOLVED

- **File:** `packages/studio/e2e/smoke.spec.ts:111`
- **Confidence:** high
- **Evidence:** smoke passes 16/16 while the same public flow fails at 375 px. The test also reads the focus outline without asserting `toBeFocused()`.
- **Impact:** the claimed regression protection is incomplete and can become weaker if autofocusing regresses.
- **Recommendation:** run the geometry contract at both sides of the 440 px breakpoint and assert focus before measuring painted bounds.
- **Resolution:** the smoke suite now runs the contract on desktop and 375×812, asserts `toBeFocused()`, and checks the initial instruction and first search result.

## Structural review

- **Dead code:** none introduced; every new constant is referenced.
- **Duplication:** no actionable duplicate implementation introduced. The 5 px focus contract mirrors CSS intentionally and is protected by browser geometry, but it remains a cross-file maintenance contract.
- **Layering/cycles:** the new flyout adapter stays in the Blockly integration layer; no cycle or public package API change.
- **Type safety:** no new assertions, `any`, suppressions, or unchecked casts.
- **Test quality:** the E2E uses real Blockly DOM and browser layout without mocks and now covers both orientations plus the focus precondition.
- **Performance:** the custom flyout preserves the native linear layout/reflow complexity; it adds no listener, render loop, or timing dependency.

## Quantified impact

- **Previously affected range:** container width `< 440 px`
- **Previously affected states:** initial instruction, no matches, grouped results, and every horizontally scrolled result column
- **Verified after resolution:** vertical desktop and horizontal 375×812
- **Cleanup potential:** none; the orientation-aware layout is the minimal root correction.

## Verification

- Biome: 1,214 files, pass
- TypeScript: pass
- Unit tests: 7,764 pass, 0 fail
- Smoke E2E: 17 pass
- Programming/accessibility E2E: 5 pass
- Focused responsive search E2E: desktop and 375×812 pass

Full QA evidence: `.audits/search-flyout-implementation-review/qa/verification-report.md`.
