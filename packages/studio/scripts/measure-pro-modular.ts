/** Language-service baseline only: no Monaco, browser, WebContainer or game execution. */
import { createHash } from 'node:crypto'
import { readdirSync, readFileSync } from 'node:fs'
import { cpus, totalmem } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createProLanguageService } from '../src/monaco/pro/languageService'

const fileCount = Number(process.env.STUDIO_PRO_LANGUAGE_FILES ?? 60)
if (!Number.isSafeInteger(fileCount) || fileCount < 10 || fileCount > 5000)
  throw new Error('STUDIO_PRO_LANGUAGE_FILES must be between 10 and 5000')
const source: Record<string, string> = {
  'tsconfig.json': JSON.stringify({ compilerOptions: { strict: true }, include: ['src'] }),
  'src/state.ts':
    'export interface GameState { score: number; lives: number; x: number; y: number }\n' +
    'export function createState(): GameState { return { score: 0, lives: 3, x: 0, y: 0 } }',
}
const imports = ['import { createState } from "./state";']
const calls: string[] = []
for (let index = 0; index < fileCount - 3; index++) {
  source[`src/systems/system${index}.ts`] = [
    'import type { GameState } from "../state";',
    `export function tick${index}(delta: number, state: GameState): void {`,
    `  state.x += Math.cos(${index}) * delta;`,
    `  state.y += Math.sin(${index}) * delta;`,
    '  if (state.lives <= 0) return;',
    `  state.score += Math.max(0, Math.floor(delta * ${index + 1}));`,
    '}',
  ].join('\n')
  imports.push(`import { tick${index} } from "./systems/system${index}";`)
  calls.push(`tick${index}(delta, state);`)
}
const main = [
  ...imports,
  'const state = createState();',
  'export const initialScore: number = state.score;',
  'export function update(delta: number): void {',
  'state.x += 0;',
  ...calls,
  '}',
].join('\n')
source['src/main.ts'] = main
if (Object.keys(source).length !== fileCount) throw new Error('Invalid modular fixture file count')
const fixtureHash = createHash('sha256').update(JSON.stringify(source)).digest('hex')
const fixtureBytes = Object.values(source).reduce((sum, text) => sum + Buffer.byteLength(text), 0)
const sampleCount = Number(process.env.STUDIO_PRO_LANGUAGE_SAMPLES ?? 30)
if (!Number.isSafeInteger(sampleCount) || sampleCount < 10 || sampleCount > 200)
  throw new Error('STUDIO_PRO_LANGUAGE_SAMPLES must be between 10 and 200')

const librariesStarted = performance.now()
const libraryRoot = dirname(fileURLToPath(import.meta.resolve('typescript')))
const libraries = Object.fromEntries(
  readdirSync(libraryRoot)
    .filter((name) => /^lib\..*\.d\.ts$/.test(name))
    .map((name) => [name, readFileSync(join(libraryRoot, name), 'utf8')]),
)
const libraryLoadMs = performance.now() - librariesStarted
function summary(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b)
  return {
    samples: sorted.length,
    p50: sorted[Math.floor(sorted.length * 0.5)],
    p95: sorted[Math.ceil(sorted.length * 0.95) - 1],
    max: sorted.at(-1),
  }
}
function measure(operation: () => void) {
  for (let index = 0; index < 3; index++) operation()
  const samples: number[] = []
  for (let index = 0; index < sampleCount; index++) {
    const started = performance.now()
    operation()
    samples.push(performance.now() - started)
  }
  return summary(samples)
}

const heapBefore = process.memoryUsage()
const started = performance.now()
const service = createProLanguageService(libraries)
const available: readonly string[] = []
let disposed = false
try {
  service.update(source, available)
  for (const path of Object.keys(source))
    if (service.diagnostics(path).length) throw new Error(`Invalid baseline source: ${path}`)
  const coldAnalysisMs = performance.now() - started
  let revision = 0
  const editToDiagnosticsMs = measure(() => {
    source['src/main.ts'] = main.replace('state.x += 0;', `state.x += ${++revision};`)
    service.update(source, available)
    if (service.diagnostics('src/main.ts').length) throw new Error('Unexpected edit diagnostics')
  })
  const referenceOffset = main.indexOf('tick0')
  const referencesMs = measure(() => {
    const references = service.references('src/main.ts', referenceOffset)
    if (new Set(references.map((item) => item.path)).size < 2)
      throw new Error('Cross-file references were not resolved')
  })
  const renameMs = measure(() => {
    const declaration = source['src/systems/system0.ts']
    if (!declaration) throw new Error('Missing exported declaration')
    const edits = service.renameSymbol(
      'src/systems/system0.ts',
      declaration.indexOf('tick0'),
      'updateScore',
    )
    if (new Set(edits.map((item) => item.path)).size < 2)
      throw new Error('Rename did not include the dependency')
  })
  const symbolsMs = measure(() => {
    if (!service.symbols('src/main.ts').some((item) => item.name === 'update'))
      throw new Error('The entrypoint symbol was lost')
  })
  const originalState = source['src/state.ts']
  if (!originalState) throw new Error('Missing state module')
  source['src/state.ts'] = originalState.replace('score: number', 'score: string')
  service.update(source, available)
  const dependencyErrorDetected = service
    .diagnostics('src/main.ts')
    .some((item) => item.code === 2322)
  if (!dependencyErrorDetected) throw new Error('A dependency edit left stale diagnostics')
  source['src/state.ts'] = originalState
  service.update(source, available)
  if (service.diagnostics('src/main.ts').length)
    throw new Error('Dependency repair was not observed')
  const heapAfterAnalysis = process.memoryUsage()
  service.dispose()
  disposed = true
  const report = {
    environment: {
      platform: process.platform,
      bun: Bun.version,
      typescript: service.version,
      cpu: cpus()[0]?.model,
      logicalCpus: cpus().length,
      memoryBytes: totalmem(),
    },
    method: `Synthetic ${fileCount}-file language-service fixture in this process; function-body edits, 3 warmups per operation. No browser, worker transport, editor input, WebContainer, runtime or Zappy. No tracing, no forced GC. Process memory is not retained-memory or leak proof.`,
    fixture: {
      files: Object.keys(source).length,
      sha256: fixtureHash,
      sourceBytes: fixtureBytes,
    },
    libraryLoadMs,
    coldAnalysisMs,
    milliseconds: { editToDiagnosticsMs, referencesMs, renameMs, symbolsMs },
    checks: {
      dependencyErrorDetected,
      dependencyRepairObserved: true,
      allInitialFilesDiagnosed: true,
    },
    processMemoryBytes: {
      before: heapBefore,
      afterAnalysis: heapAfterAnalysis,
      afterDispose: process.memoryUsage(),
    },
  }
  const json = JSON.stringify(report, null, 2)
  const output = process.argv
    .find((argument) => argument.startsWith('--output='))
    ?.slice('--output='.length)
  if (output) await Bun.write(output, `${json}\n`)
  console.log(json)
} finally {
  if (!disposed) service.dispose()
}
