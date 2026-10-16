// Snapshot and documentation checks only; no product writes, network or credentials.
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFile, writeFile, stat } from 'node:fs/promises'
import { resolve, dirname, relative } from 'node:path'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const baseline = [
  '.audits/studio-pro-proposta-v2-2026-10-15.md',
  '.audits/studio-pro-lote8-review-2026-10-15.md',
  '.audits/studio-pro-canvas-implementacao-2026-10-15.md',
  'docs/superpowers/plans/2026-10-15-studio-pro-implementacao.md',
  'docs/superpowers/plans/2026-10-15-studio-pro-lote8.md',
  'docs/superpowers/plans/2026-10-15-studio-canvas-coordenacao.md',
]
const sources = [
  'packages/core/src/studio/pro-artifact.ts',
  'packages/core/src/studio/pro-build.ts',
  'packages/core/src/studio/pro-builder.ts',
  'packages/core/src/studio/pro-game-knowledge.ts',
  'packages/core/src/studio/pro-templates.ts',
  'packages/core/src/studio/pro-runtime-capabilities.ts',
  'packages/studio/src/components/tutor/ProBuilderPanel.tsx',
  'packages/studio/src/components/tutor/ZappyPanel.tsx',
  'packages/studio/src/core/projectDocument.ts',
  'packages/studio/src/state/proTree.ts',
  'packages/studio/src/state/proRevision.ts',
  'packages/studio/src/state/projectOperations.ts',
  'packages/studio/src/state/projectValidation.ts',
  'packages/studio/src/state/projectStorageRecords.ts',
  'packages/studio/src/state/projectStorageRuntime.ts',
  'packages/studio/src/state/persistence.ts',
  'packages/studio/src/studio/types.ts',
  'packages/studio/src/studio/taskSessionSave.ts',
  'packages/studio/src/modes/pro/RemoteProPreview.tsx',
  'packages/studio/playground/App.tsx',
  'packages/community-kids/src/components/kids/studio-pro-client.tsx',
  'packages/member-shell/src/lib/studio-zappy-adapter.ts',
  'packages/member-shell/src/routes/studio-builder.ts',
  'packages/member-shell/src/routes/studio-zappy.ts',
  'packages/member-shell/src/server/studio-builder.ts',
  'packages/member-shell/src/server/studio-builder-tools.ts',
  'packages/member-shell/src/server/studio-pro-runtime.ts',
  'packages/member-shell/src/server/zappy-ai.ts',
  'packages/members/src/infrastructure/persistence/drizzle/studio-builder.repository.ts',
  'packages/studio-runtime/src/artifacts.ts',
]
const suites = [
  { cwd: 'packages/studio', command: 'bun test src/state/proTree.test.ts src/state/projectOperations.test.ts src/state/persistence.test.ts src/studio/TaskGuidePanel.test.tsx', log: '.audits/studio-adendo-review3-studio-tests-2026-10-15.txt', passed: 118, assertions: 394, files: ['src/state/proTree.test.ts', 'src/state/projectOperations.test.ts', 'src/state/persistence.test.ts', 'src/studio/TaskGuidePanel.test.tsx'] },
  { cwd: 'packages/member-shell', command: 'bun test tests/studio-builder-route.test.ts tests/studio-pro-runtime.test.ts tests/studio-game-knowledge.test.ts', log: '.audits/studio-adendo-review3-server-final-2026-10-15.txt', passed: 14, assertions: 108, files: ['tests/studio-builder-route.test.ts', 'tests/studio-pro-runtime.test.ts', 'tests/studio-game-knowledge.test.ts'] },
  { cwd: 'packages/core', command: 'bun test src/studio/pro-build.test.ts', log: '.audits/studio-adendo-review3-core-tests-2026-10-15.txt', passed: 3, assertions: 5, files: ['src/studio/pro-build.test.ts'] },
  { cwd: 'packages/studio-runtime', command: 'bun test tests/capabilities.test.ts', log: '.audits/studio-adendo-review3-runtime-tests-2026-10-15.txt', passed: 2, assertions: 8, files: ['tests/capabilities.test.ts'] },
]
const docs = [
  '.audits/studio-pro-sandbox-adendo-2026-10-15.md',
  '.audits/studio-pro-sandbox-adendo-review-2026-10-15.md',
  '.audits/architectural-analysis-studio-pro-sandbox-2026-10-15.md',
]
const output = '.audits/studio-adendo-review3-evidence-2026-10-15.json'
const probesPath = '.audits/studio-adendo-review3-probes-2026-10-15.json'
const probe = JSON.parse(await readFile(resolve(root, probesPath), 'utf8'))
assert.equal(probe.results.length, 4)
assert(probe.results.every(result => result.confirmed))
for (const suite of suites) {
  const text = await readFile(resolve(root, suite.log), 'utf8')
  assert.match(text, new RegExp(`\\b${suite.passed} pass\\b`))
  assert.match(text, /\b0 fail\b/)
  assert.match(text, new RegExp(`\\b${suite.assertions} expect\\(\\) calls`))
  suite.failed = 0
  suite.exitCodeObserved = 0
  suite.logModifiedAt = (await stat(resolve(root, suite.log))).mtime.toISOString()
}
let checkedLinks = 0
for (const path of docs) {
  const text = await readFile(resolve(root, path), 'utf8')
  assert(!/\uFFFD/.test(text), `Encoding replacement in ${path}`)
  assert(!/[^\S\r\n]+$/m.test(text), `Trailing whitespace in ${path}`)
  for (const match of text.matchAll(/\[[^\]\n]+\]\(([^)]+)\)/g)) {
    const target = match[1]
    if (/^(https?:|#)/.test(target)) continue
    const absolute = resolve(root, dirname(path), target.split('#')[0])
    if (relative(root, absolute).replaceAll('\\', '/') !== output) await stat(absolute)
    checkedLinks++
  }
}
const paths = [...new Set([
  ...baseline, ...sources, ...docs,
  ...suites.flatMap(suite => [suite.log, ...suite.files.map(path => `${suite.cwd}/${path}`)]),
  '.audits/studio-adendo-review3-server-tests-2026-10-15.txt',
  '.audits/studio-adendo-review3-server-recheck-2026-10-15.txt',
  '.audits/review-studio-adendo-integracao-2026-10-15.mjs',
  '.audits/review-studio-adendo-evidence-2026-10-15.mjs', probesPath,
])]
const hashes = await Promise.all(paths.map(async path => {
  const bytes = await readFile(resolve(root, path))
  return { path, bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex'), modifiedAt: (await stat(resolve(root, path))).mtime.toISOString() }
}))
const report = {
  capturedAt: new Date().toISOString(), workspace: root,
  branch: execFileSync('git', ['branch', '--show-current'], { cwd: root, encoding: 'utf8' }).trim(),
  head: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim(),
  scope: 'Documentation review, selected existing tests and isolated probes; no product mutation.',
  snapshotLimit: 'Files captured after the recorded test runs, while another session is actively implementing. Not an atomic Git snapshot or proof that all changed source files were exercised by these selected tests.',
  baseline, sources, documents: docs, hashes,
  tests: { passedAcrossLatestSuiteRuns: suites.reduce((sum, suite) => sum + suite.passed, 0), failed: 0, assertions: suites.reduce((sum, suite) => sum + suite.assertions, 0), suites, supersededMemberShellRuns: ['.audits/studio-adendo-review3-server-tests-2026-10-15.txt', '.audits/studio-adendo-review3-server-recheck-2026-10-15.txt'], countsNotAddedToPriorReviews: true },
  probes: { command: 'bun .audits/review-studio-adendo-integracao-2026-10-15.mjs', report: probesPath, confirmed: probe.results.length },
  documentChecks: { relativeLinks: checkedLinks, brokenLinks: 0, trailingWhitespace: false, encodingReplacement: false },
  limitations: ['No paid model calls', 'No Sandbox app execution', 'No production credentials, migrations or deploy', 'No global typecheck or new browser/physical-device verification', 'No proof of future addendum functionality', 'Other session test evidence is referenced, not claimed as executed here'],
}
await writeFile(resolve(root, output), JSON.stringify(report, null, 2) + '\n')
console.log(JSON.stringify({ filesHashed: hashes.length, relativeLinks: checkedLinks, tests: report.tests.passedAcrossLatestSuiteRuns, probes: probe.results.length, branch: report.branch }))
