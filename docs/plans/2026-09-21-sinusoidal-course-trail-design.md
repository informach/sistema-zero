# Sinusoidal Course Trail Design

## Goal

Make the Kids lesson trail feel organic and playful by arranging lesson and chest nodes along a smooth visual wave instead of repeated straight diagonals.

## Design

The trail keeps its current row-based layout and its existing horizontal amplitude of two columns. Only the sequence of horizontal offsets changes.

Each global trail position uses a sampled sine wave with amplitude `2` and a 12-step period:

`0, 1, 1.73, 2, 1.73, 1, 0, -1, -1.73, -2, -1.73, -1, ...`

Offsets are rounded to two decimal places so inline styles remain stable and readable. Lesson nodes and unit chests continue to advance the same global index, including across module boundaries, so the curve never restarts abruptly at a banner.

## Responsive behavior

The existing `--trail-step` values continue to control the physical horizontal distance. The amplitude remains `-2..2`, so the new curve does not push nodes or lesson names closer to the viewport edges than the current layout.

No connector dots, SVG paths, canvas drawing, animation, or extra DOM elements are introduced.

## Verification

- Assert the exact first period and the beginning of the repeated period.
- Assert that lessons and chests share one continuous global sequence across modules.
- Preserve the existing empty-module, state, and theme tests.
- Run the trail component tests, Community Kids typecheck, formatting check, and package test suite.
