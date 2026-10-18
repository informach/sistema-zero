# Python desktop source metadata implementation plan

> **For agentic workers:** Use executing-plans to implement these steps with review checkpoints. Execution and the final local commit/merge are already authorized by the user.

**Goal:** Export a self-describing Python source snapshot without changing authored programs or claiming desktop execution that was not observed.

**Architecture:** Keep `buildPythonSourceFiles` responsible for capture, validation and materialization. A focused metadata builder consumes that validated snapshot and the existing asset manifest, then adds collision-safe documentation and metadata; the existing ZIP implementation remains unchanged. This slice closes package metadata and empty-directory preservation; AST portability diagnostics, Pinta derivation selection and native game qualification remain separate required batches.

**Tech Stack:** TypeScript, existing SHA-256/canonical JSON helpers, Bun tests, fflate ZIP, existing Python document and portable-path contracts.

**Spec:** `docs/plans/2026-10-16-turtle-api-portabilidade.md`, section 6; `docs/plans/2026-10-16-estudio-javascript-python-turtle-proposta.md`, L7.

## Global Constraints

- JavaScript remains the default; this code is reached only through the lazy Python source exporter.
- Python reference version comes from the captured dependency lock; the lock target remains explicitly `browser`.
- Never export browser Turtle implementation, Pyodide, browser wheels, private runtime files or a fabricated desktop lock.
- Preserve authored source/configuration/media bytes, actual entrypoint and empty directories.
- Generated paths must respect portable tree conflicts including case, ancestor files and authored directories.
- Turtle is Python stdlib: no PyPI `turtle` dependency.
- Export is not an installer; native execution status remains `not-observed` for every arbitrary learner project.
- No push/deployment. Commit follows full review and validation, then local staging merge as requested.

## File map and interfaces

- Create `packages/studio/src/export/pythonSourceMetadata.ts`: consume `{project: PythonProjectDocument, sourceFiles: Record<string,string>, directories: string[], assets: PythonAssetBundle['manifest'], occupiedFiles: string[]}`; produce `{files: ExportFileMap, warnings: string[]}` through `buildPythonSourceMetadata`.
- Modify `packages/studio/src/export/pythonSource.ts`: retain material bytes, call metadata builder, emit each explicit directory as an empty trailing-slash ZIP entry.
- Extend `packages/studio/src/export/__tests__/pythonSource.test.ts`: verify actual exported ZIP independently, snapshot hashes, licenses, collision handling and preservation of authored configuration.

## Task 1: Snapshot manifest, safe configuration and directory preservation

- [x] Add regression tests before implementation. An exported Pro fixture with `rascunhos/`, a PNG/GIF asset and CC-BY metadata must contain source hashes matching `crypto.subtle.digest`, exact source/media bytes, licenses, entrypoint and `desktopExecution: 'not-observed'` in the generated JSON. Require a generated stdlib-only `pyproject.toml` without a Turtle package.

```ts
expect(manifest.entrypoint).toBe(project.python.entrypoint)
expect(manifest.desktopExecution).toBe('not-observed')
expect(manifest.browserDependencyLock.target).toBe('browser')
expect(unzipped['rascunhos/']).toEqual(new Uint8Array())
expect(files['pyproject.toml']).toContain('dependencies = []')
expect(files['pyproject.toml']).not.toContain('"turtle"')
```

- [x] Run `bun test ./src/export/__tests__/pythonSource.test.ts` from `packages/studio`; confirm failure from absent metadata/directory entries.
- [x] Implement metadata generation. Sort source paths and directories; SHA-256 exact UTF-8 source bytes, record byte count, and hash canonical `{files,directories}`. Store existing runtime reference, installed extensions, exact browser lock and complete existing asset manifest. Mark source export separately from any native qualification; state dynamic imports/native dependencies are not certified by export.

```ts
const source = { files: sourceEntries, directories: [...directories].sort() }
const sourceSha256 = await sha256Hex(canonicalJson(source))
const desktopExecution = 'not-observed' as const
```

- [x] Allocate manifest under `.sistemazero/export-manifest.json`, then `.sistemazero-2/…` as needed, and instructions under the existing readable filename with numeric suffixes. Test every candidate with `studioPortableFileConflict([...occupiedFiles, candidate], directories)`; never rename authored paths.
- [x] Generate root `pyproject.toml` only when there is no conflicting file/directory, requirements are empty/absent, the captured requirements SHA matches those bytes and the browser lock has no packages. Use stdlib-only `[project]`, fixed safe package name/version, `requires-python = ">=3.14.2,<3.15"` derived from captured version and empty dependencies. Preserve any authored/case-conflicting config and emit a warning that it was not overwritten or validated. Unresolved/edited requirements or browser packages receive a native-dependency-review warning instead of a fabricated zero-dependency config.
- [x] Preserve explicit directories as zero-byte `path/` entries after manifest generation. Add warnings to generated instructions and the returned export result; no warning may say the arbitrary project was executed successfully.
- [x] Verify collisions with an authored `.sistemazero` file, authored instructions directory, `PYPROJECT.TOML` and edited requirements. Verify manifests and generated instructions cannot overwrite those nodes. Repeat actual ZIP extraction and existing JS source-export regression tests.
- [x] Run Biome for changed files and Studio TypeScript. Review through cy-review-round; resolve new findings with fresh evidence and retain all previously recorded negative results.

## Acceptance boundary

This batch records preservation and provenance, not a complete Python portability analyzer. The remaining L7 batches must add parser-based diagnostics (web imports, unresolved dependencies, stdlib shadowing, absolute paths), native CPython/Tk game scenarios and VS Code verification. Pinta recipes are carried once introduced by the import batch; this exporter does not invent or infer them from a thumbnail.

## Verification — 18/10/2026

- Causal test run `l7-desktop-metadata-before-2.log`: 3 passed/3 failed from absent manifest/directories/warnings. An earlier invalid fixture used source `pinta` instead of the canonical `library`; corrected before the causal run.
- Review113 found root `REQUIREMENTS.TXT` ignored by the native-dependency decision. Permanent regression failed before the fix (`l7-desktop-metadata-review113-before-1.log`, 6 pass/1 fail). Root case-insensitive lookup now preserves the actual name/bytes and uses that name in instructions.
- Fresh combined tests `l7-desktop-metadata-review113-after-1.log`: **16 pass/106 assertions**, including existing JavaScript source export and independent reviewer probes. Biome three files clean. Studio TypeScript `l7-desktop-metadata-typecheck-2.log`: **exit0**; previous run caught an expected-value type mistake in the test, fixed with an explicit expected license value without a cast.
- Review113 closed **1/1/0**, independent unit/provenance/hash validation and metadata readback in `.compozy/tasks/estudio-python-l4/reviews-113/`.
- Actual exported Pro ZIP `desktop-metadata-native-2/source.zip` executed from its extracted root using CPython **3.14.2**, Tcl/Tk **8.6.15**, native official Turtle, `src/main.py`, helper import, PNG/GIF registration and two independent turtles. ZIP SHA-256 `5018d06ba4dd760cc35d3d5fd47d654e3944d2aa532dcb60e5e42a94bbbaf451`; source/media bytes, directories, metadata and TOML independently checked. Evidence: `.cache/studio-python-l0/desktop-metadata-native-2/native-result.json` and `l7-desktop-metadata-native-2.log`.
- First native harness run preserved a verifier failure: raw upstream source hash differs on Windows solely because its official installation uses CRLF. Raw `8ba9c0ad…`; LF-normalized reference `6074e63c…` matches the pinned upstream contract. Only this verifier comparison normalizes the installed upstream library; **authored exported source remains byte-exact**.
- This native observation covers one controlled Pro project on this Windows machine. It does not verify VS Code UI, all games, arbitrary portability, Linux/macOS or performance. The exported manifest correctly stays `desktopExecution: not-observed`: later external test evidence is separate and never fabricated by export itself.
