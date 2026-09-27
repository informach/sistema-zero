import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFileSync, statSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { gzipSync } from 'node:zlib'

// Inspect the SAME compiler/scanner versions shipped by the installed Vite plugin.
// This is a development check, never an application import or runtime dependency.
const require = createRequire(import.meta.resolve('@tailwindcss/vite'))
const { compile, optimize } = require('@tailwindcss/node')
const { Scanner } = require('@tailwindcss/oxide')
const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const playground = resolve(packageRoot, 'playground')
const entry = resolve(playground, 'styles.css')
const css = readFileSync(entry, 'utf8')
const sha = (value) => createHash('sha256').update(value).digest('hex')
const pathOf = (file) => relative(packageRoot, file).replaceAll('\\', '/')

async function compiler() {
  return compile(css, { base: playground, onDependency() {} })
}
function sourcesOf(compiled) {
  // Mirrors the plugin's documented compiler-root fallback to Vite's root.
  return [
    ...(compiled.root === 'none'
      ? []
      : [{ ...(compiled.root ?? { base: playground, pattern: '**/*' }), negated: false }]),
    ...compiled.sources,
  ]
}
const productionSources = [
  { base: playground, pattern: '**/*', negated: false },
  { base: resolve(packageRoot, 'src/components'), pattern: '**/*', negated: false },
  { base: resolve(packageRoot, 'src/components'), pattern: '**/*.test.{ts,tsx}', negated: true },
]

async function measure() {
  const start = performance.now(),
    compiled = await compiler(),
    setup = performance.now(),
    scanner = new Scanner({ sources: sourcesOf(compiled) }),
    candidates = scanner.scan(),
    scanned = performance.now(),
    generated = compiled.build(candidates),
    built = performance.now(),
    output = optimize(generated, { minify: true }).code,
    end = performance.now()
  return {
    timings: {
      setup: setup - start,
      scan: scanned - setup,
      build: built - scanned,
      optimize: end - built,
      total: end - start,
    },
    files: scanner.files.map(pathOf).sort(),
    sourceBytes: scanner.files.reduce((sum, file) => sum + statSync(file).size, 0),
    candidates: candidates.length,
    cssBytes: Buffer.byteLength(output),
    gzipBytes: gzipSync(output).byteLength,
    rssBytes: process.memoryUsage().rss,
    outputSha256: sha(output),
  }
}

async function proof() {
  const compiled = await compiler(),
    actual = new Scanner({ sources: sourcesOf(compiled) }),
    production = new Scanner({ sources: productionSources }),
    actualCandidates = new Set(actual.scan()),
    productionCandidates = production.scan(),
    missing = productionCandidates.filter((candidate) => !actualCandidates.has(candidate))
  assert.deepEqual(missing, [], 'Missing production candidates')
  const golden = optimize((await compiler()).build(productionCandidates), { minify: true }).code
  // A fresh compiler is important: build() accumulates candidates between calls.
  const candidateGolden = optimize(
    (await compiler()).build(
      [...actualCandidates].filter((candidate) => productionCandidates.includes(candidate)),
    ),
    { minify: true },
  ).code
  assert.equal(candidateGolden, golden, 'Retained production CSS changed')
  return {
    productionFiles: production.files.map(pathOf).sort(),
    productionCandidates: productionCandidates.length,
    productionCssSha256: sha(golden),
    productionFileListSha256: sha(production.files.map(pathOf).sort().join('\n')),
    nonProductionFiles: actual.files
      .map(pathOf)
      .filter((file) => !production.files.some((path) => pathOf(path) === file))
      .sort(),
  }
}

function summarizeProof(result) {
  if (process.argv[3])
    assert.equal(
      result.productionCssSha256,
      process.argv[3],
      'Baseline production CSS hash changed',
    )
  return {
    ...result,
    productionFiles: result.productionFiles.length,
    nonProductionFileCount: result.nonProductionFiles.length,
    nonProductionFiles: result.nonProductionFiles.slice(0, 15),
  }
}

const mode = process.argv[2] ?? 'verify'
if (mode === 'bench') {
  for (let i = 0; i < 3; i++) await measure()
  const runs = []
  for (let i = 0; i < 10; i++) runs.push(await measure())
  const metric = (key) => {
    const values = runs.map((run) => run.timings[key]).sort((a, b) => a - b)
    const percentile = (q) => values[Math.ceil(q * values.length) - 1]
    return { p50: percentile(0.5), p95: percentile(0.95), p99: percentile(0.99) }
  }
  const last = runs.at(-1)
  console.log(
    JSON.stringify(
      {
        mode,
        warmups: 3,
        runs: 10,
        timingMs: Object.fromEntries(Object.keys(last.timings).map((key) => [key, metric(key)])),
        sampledRssBytes: Math.max(...runs.map((run) => run.rssBytes)),
        files: last.files.length,
        sourceBytes: last.sourceBytes,
        candidates: last.candidates,
        cssBytes: last.cssBytes,
        gzipBytes: last.gzipBytes,
        outputSha256: last.outputSha256,
        proof: summarizeProof(await proof()),
      },
      null,
      2,
    ),
  )
} else if (mode === 'verify') {
  const result = await proof()
  assert.deepEqual(result.nonProductionFiles, [], 'CSS scanner reads outside production UI sources')
  const host = readFileSync(resolve(packageRoot, '../community-kids/src/app/globals.css'), 'utf8')
  assert.doesNotMatch(host, /@source\s+["'][^"']*molda\/src["']/)
  const compiledHost = await compile(host, {
    base: resolve(packageRoot, '../community-kids/src/app'),
    onDependency() {},
  })
  const hostSources = compiledHost.sources.filter((source) =>
    source.base.replaceAll('\\', '/').includes('/molda/'),
  )
  assert.ok(
    hostSources.some((source) => !source.negated && source.pattern.includes('components')),
    'Host needs library UI sources',
  )
  assert.ok(
    hostSources.some((source) => source.negated && source.pattern.includes('.test.')),
    'Host needs test exclusion',
  )
  console.log(
    JSON.stringify({ status: 'verified', ...summarizeProof(result), hostSources }, null, 2),
  )
} else {
  throw new Error('Use verify or bench')
}
