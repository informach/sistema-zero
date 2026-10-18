# Estúdio Python — L0 Implementation Plan

> **For agentic workers:** use the installed `executing-plans` skill task by task, with a recorded review after each lot. User authorized implementation, reviews, fixes, commits and eventual local merge into staging; do not wait for approval between passing lots.

**Goal:** qualify the execution architecture before changing production document contracts, then implement L1–L8 from the approved specification.

**Architecture:** keep L0 experiments outside product packages. Serve a fixed Pyodide distribution locally under the proposed isolated iframe/worker topology. Measure actual engine behavior and preserve unsuccessful probes as evidence. Product integration remains gated by L0 acceptance.

**Tech Stack:** Bun 1.3.11, Playwright 1.60.0, candidate Pyodide 314.0.7 / CPython 3.14.2, TypeScript and Python.

**Spec:** [approved revision 3](../../plans/2026-10-16-estudio-javascript-python-turtle-proposta.md), [acceptance matrix](../../plans/2026-10-16-estudio-python-validacao-entregas.md), [performance](../../plans/2026-10-16-estudio-python-desempenho.md).

## Global constraints

- JavaScript stays the default and all existing JS functionality is preserved.
- Python Programação works without Turtle; Turtle is an optional project extension.
- No Tkinter server, generic PyPI installer, implicit JS/Python conversion or prototype patch to hide an incompatible runtime.
- No L1 production contract changes before L0 qualifies the direction.
- A failed or unavailable qualification is recorded as such, never replaced by a mocked passing test.
- User clarified on 2026-10-16: programming is a desktop workflow. Mobile consultation remains responsive; physical Android/iOS qualification is deferred and does not block this delivery. Python mobile gameplay is not advertised as qualified without device evidence. Reference desktop/video performance remains a qualification requirement.
- Only local Git integration is authorized; no push or deployment.
- User clarified subsequently on 2026-10-16: the second Windows computer is tested **after implementation and complete validation on this development computer**. Reference-machine/video evidence is therefore deferred to the final qualification stage, not an L0/L1 gate. Continue local implementation/reviews; do not advertise the reference performance targets as proven before that evidence exists.

## Execution state

- Base: `ac5b7e08c`, local `staging`.
- Worktree: `C:/Users/tocha/projects/sistema-zero-python`.
- Branch: `feat/studio-python-turtle`.
- Current lot: L0, in progress. L1–L8 remain pending.

## Task 1: fixed runtime and browser capability evidence

Files: create `experiments/studio-python-l0/package.json`, `prepare.ts`, `server.ts`, `probe.ts`, `web/worker.mjs`, `web/frame.mjs` and `runtime-manifest.json`. Downloaded vendor files and raw browser artifacts stay in `.cache/studio-python-l0/`.

Interfaces: `prepare.ts` stores the exact five upstream boot files and SHA-256 records; `server.ts` serves only enumerated experiment/runtime files on loopback; `probe.ts` records browser versions, feature detection, topology result, Python version, JSPI suspension and run/stop evidence as JSON.

- [x] Fetch the versioned distribution described by the official deployment docs; reject failed HTTP responses and verify recorded hashes on subsequent runs.
- [x] Run Chromium, Firefox and WebKit against an opaque sandbox iframe. Test a direct HTTP worker and a blob module worker separately; record failures rather than allowing same-origin as a fallback.
- [x] Execute `print(6 * 7)` and synchronous Python `run_sync` inside `runPythonAsync`; assert output and elapsed ordering.
- [x] Verify terminating the worker stops an infinite Python loop and a subsequent clean worker still executes.
- [x] Review the experiment and correct defects before further qualification.

## Task 2: Turtle, input, events and desktop reference

Files: experiment-only Python/renderer sources and fixtures under `experiments/studio-python-l0/`; results in `.cache/studio-python-l0/`.

- [ ] Implement the minimum actual graphics path needed to test movement, tracer/update, timers and callbacks during running Python; use Python-owned state and batched drawing.
- [ ] Exercise a square, repeated timer, keyboard during movement, explicit update, input before graphics and stop during wait.
- [ ] Run identical portable fixtures with the pinned desktop CPython/Tk patch; record version and behavior comparisons.
- [ ] Validate output boundaries, network policy, child-worker behavior and recovery without weakening the intended sandbox.
- [ ] Review and correct findings; distinguish a feasibility slice from the full contracted Turtle catalog.

## Task 3: remaining L0 gates and lot review

- [ ] Capture baseline JS and qualified local Python startup/latency/memory; preserve the spec's target workload and sampling rules.
- [ ] Prove actual Pyright isolation and cancellation; qualify Pinta image materialization.
- [ ] Prepare reference-machine/video tests for after the full local implementation and validation, as requested by the user. Running them is deferred to final qualification and does not block L1. Mobile physical-device execution qualification is deferred; responsive consultation remains in L8.
- [ ] Write a requirements-based L0 review and fix all implementation findings in the experimental work.
- [ ] Record pass/fail/pending for every L0 requirement. Only a passing L0 opens L1.

## Following lots and integration

The authoritative decomposition is L1 contracts/migrations → L2 JS preservation → L3 runtime → L4 Programação/Turtle/Ponte → L5 Pro → L5A Pinta → L6 admin/lessons/live → L7 publication/export/Zappy/Pensa → L8 integrated qualification. Each lot receives its own concrete implementation checklist from the approved contracts and a review before the next dependent lot.

After L8 passes R01–R22 (including the user's Pac-Man and Space Arena corpus), review the complete branch against the base, fix findings, rerun affected checks, commit and merge into local `staging`. Do not label an experimental L0-only branch as the completed feature or merge it as though the implementation were accepted.
