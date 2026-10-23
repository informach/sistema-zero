// Read-only source audit; writes only its own evidence beside this file.
// Run: bun .audits/analyze-studio-sandbox-2026-10-15.mjs <sandbox-directory>
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const auditDir = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(process.argv[2])
const require = createRequire(path.join(auditDir, '../packages/studio/package.json'))
const ts = require('typescript')
const THREE = require('three')
const sha = (text) => createHash('sha256').update(text).digest('hex')
const read = (file) => readFileSync(path.join(root, file), 'utf8')
const excluded = new Set(['.git', 'node_modules', '.agents', '.claude', 'reference'])
function walk(dir = '') {
  return readdirSync(path.join(root, dir), { withFileTypes: true }).flatMap((entry) => {
    if (excluded.has(entry.name)) return []
    const relative = path.posix.join(dir, entry.name)
    return entry.isDirectory() ? walk(relative) : [relative]
  })
}
const files = walk().sort()
const sources = files.filter((file) => /\.(?:tsx?|jsx?|mjs|cjs)$/.test(file))
const rows = sources.map((file) => {
  const source = read(file)
  const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true)
  const imports = [], exports = []
  for (const statement of ast.statements) {
    if ((ts.isImportDeclaration(statement) || ts.isExportDeclaration(statement)) && statement.moduleSpecifier) imports.push(statement.moduleSpecifier.text)
    if (statement.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword)) {
      if (statement.name) exports.push(statement.name.text)
      if (ts.isVariableStatement(statement)) exports.push(...statement.declarationList.declarations.map((declaration) => declaration.name.getText(ast)))
    }
    if (ts.isExportDeclaration(statement) && statement.exportClause) exports.push(statement.exportClause.getText(ast))
  }
  return { file, lines: source.split('\n').length, bytes: Buffer.byteLength(source), sha256: sha(source), normalizedSha256: sha(source.replaceAll('\r\n', '\n')), imports, exports }
})
const prior = JSON.parse(readFileSync(path.join(auditDir, 'sandbox-tui-structure-evidence-2026-10-15.json'), 'utf8'))
const matches = rows.filter((row) => {
  const old = prior.rows.find((candidate) => candidate.file === row.file)
  const source = read(row.file).replaceAll('\r\n', '\n')
  return old && [sha(source), sha(source.replaceAll('\n', '\r\n'))].includes(old.sha256)
})
const inventory = {
  root, generatedAt: new Date().toISOString(), excluded: [...excluded],
  includedFiles: files.length, sourceFiles: rows.length, sourceLines: rows.reduce((sum, row) => sum + row.lines, 0),
  tests: files.filter((file) => /(?:^|\/)(?:tests?|__tests__)(?:\/|$)|\.(?:test|spec)\./i.test(file)),
  licenseFiles: files.filter((file) => /(?:^|\/)(?:LICENSE|LICENCE|COPYING|NOTICE)(?:\.|$)/i.test(file)),
  priorAudit: { commit: prior.commit, comparedSourceFiles: rows.length, matchingIgnoringLineEndings: matches.length },
  studioSnapshot: {
    branch: execFileSync('git', ['branch', '--show-current'], { cwd: path.join(auditDir, '..'), encoding: 'utf8' }).trim(),
    head: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: path.join(auditDir, '..'), encoding: 'utf8' }).trim(),
    note: 'The shared worktree has concurrent uncommitted work. These hashes identify the comparison, not a released version.',
    files: [
      'packages/core/src/studio/pro-builder.ts', 'packages/core/src/studio/pro-game-knowledge.ts',
      'packages/member-shell/src/server/studio-builder.ts', 'packages/member-shell/src/server/studio-builder-tools.ts',
      'packages/member-shell/src/routes/studio-builder.ts', 'packages/members/src/infrastructure/persistence/drizzle/studio-builder.repository.ts',
      'packages/studio/src/components/tutor/ProBuilderPanel.tsx', 'packages/studio-runtime/runtime/playtest.mjs',
      'packages/studio-runtime/runtime/gameplay.mjs', 'packages/studio/pro-kits/canvas-survival/studio-kit.json',
    ].map((file) => ({ file, sha256: sha(readFileSync(path.join(auditDir, '..', file))) })),
  }, rows,
}
writeFileSync(path.join(auditDir, 'studio-sandbox-inventory-2026-10-15.json'), JSON.stringify(inventory, null, 2) + '\n')

function functionSource(file, name) {
  const source = read(file), ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true)
  const declaration = ast.statements.find((statement) => ts.isFunctionDeclaration(statement) && statement.name?.text === name)
  assert.ok(declaration, `${file}: ${name}`)
  return new Bun.Transpiler({ loader: 'ts' }).transformSync(declaration.getText(ast).replace(/^export /, ''))
}
function makeFunction(file, name, dependencies = {}) {
  return new Function(...Object.keys(dependencies), functionSource(file, name) + `\nreturn ${name};`)(...Object.values(dependencies))
}
const results = {}
// Original tools with an in-memory I/O adapter. No SDK, network, model, or credentials.
let content = 'A', statFailure = null, writes = 0
const deleted = []
const box = { fs: {
  getFileDetails: async () => { if (statFailure) throw statFailure; return { isDir: false, size: Buffer.byteLength(content) } },
  downloadFile: async () => Buffer.from(content),
  uploadFile: async (value) => { content = value.toString(); writes++ },
  deleteFile: async (target) => { deleted.push(target) },
  listFiles: async () => [],
}, process: { executeCommand: async () => ({ exitCode: 0 }) } }
const levels = []
const logger = { fmt: (strings, ...values) => strings.reduce((text, part, index) => text + part + (values[index] ?? ''), '') }
for (const level of ['info', 'warn', 'error']) logger[level] = () => levels.push(level)
const schema = new Proxy(() => schema, { get: () => schema })
const code = new Bun.Transpiler({ loader: 'ts' }).transformSync(read('lib/games/tools.ts').replace(/^import .*\r?\n/gm, '').replace(/^export /gm, ''))
const tools = new Function('path', 'tool', 'z', 'GAME_DIR', 'getGameSandbox', 'logger', 'describeError', 'elapsed', code + '\nreturn createGameTools("audit");')(
  path, (value) => value, schema, '/home/daytona/game', async () => ({ sandbox: box }), logger, (error) => ({ name: error.name }), () => 0,
)
await tools.replace_text.execute({ path: 'main.js', find: 'A', replace: 'x'.repeat(128001) })
assert.equal(content.length, 128001)
results.expansion = { bytes: content.length, subsequentRead: await tools.read_file.execute({ path: 'main.js' }) }
statFailure = new Error('Synthetic transport outage')
results.statFailure = { output: await tools.read_file.execute({ path: 'main.js' }), logLevel: levels.at(-1) }
assert.equal(results.statFailure.output, 'No file at main.js.')
statFailure = null
await tools.delete_file.execute({ path: 'report.js' })
await tools.delete_file.execute({ path: 'engine/index.js' })
results.promptOnlyProtection = { acceptedDeletes: deleted }
content = 'A B'
await Promise.all([
  tools.replace_text.execute({ path: 'main.js', find: 'A', replace: 'AA' }),
  tools.replace_text.execute({ path: 'main.js', find: 'B', replace: 'BB' }),
])
assert.notEqual(content, 'AA BB')
results.concurrentReplacement = { actual: content, expected: 'AA BB', scope: 'In-memory I/O scheduling; not a Daytona integration test.' }
const stripUrl = makeFunction('components/chat-preview.tsx', 'withoutQuery')
results.previewUrl = { sanitized: stripUrl('https://3000-SYNTHETIC_TOKEN.proxy.example/main.js?cache=1') }
assert.ok(results.previewUrl.sanitized.includes('SYNTHETIC_TOKEN'))

class Events {
  listeners = new Map()
  addEventListener(name, fn) { if (!this.listeners.has(name)) this.listeners.set(name, new Set()); this.listeners.get(name).add(fn) }
  removeEventListener(name, fn) { this.listeners.get(name)?.delete(fn) }
  emit(name, payload = {}) { for (const fn of this.listeners.get(name) ?? []) fn(payload) }
  count() { return [...this.listeners.values()].reduce((sum, entries) => sum + entries.size, 0) }
}
const windowFake = new Events(), element = new Events(), documentFake = new Events()
let pad = { connected: true, index: 0, buttons: [{ pressed: true }], axes: [0, 0, 0, 0] }
const inputSource = new Bun.Transpiler({ loader: 'js' }).transformSync(read('lib/games/runtime/engine/input.js').replace(/^import .*\r?\n/gm, '').replace(/^export /gm, ''))
const createInput = new Function('THREE', 'deadzone', 'window', 'document', 'navigator', 'matchMedia', inputSource + '\nreturn createInput;')(
  THREE, (value) => Math.abs(value) > .15 ? value : 0, windowFake, documentFake, { getGamepads: () => pad ? [pad] : [] }, () => ({ matches: false }),
)
const input = createInput({ target: windowFake, element, touchStick: false })
input.beginFrame()
assert.equal(input.down('jump'), true)
input.endFrame()
pad = null
input.beginFrame()
assert.equal(input.down('jump'), true)
results.gamepadDisconnect = { jumpHeldAfterDisconnect: input.down('jump') }
input.dispose()
pad = { connected: true, index: 0, buttons: [{ pressed: true }], axes: [0, 0, 0, 0] }
const secondInput = createInput({ target: windowFake, element, touchStick: false })
windowFake.emit('keydown', { code: 'Space', repeat: false, preventDefault() {} })
secondInput.beginFrame(); secondInput.endFrame()
pad.buttons[0].pressed = false
secondInput.beginFrame()
assert.equal(secondInput.down('jump'), false)
results.mixedInput = { keyboardStillPhysicallyHeld: true, actionAfterPadRelease: secondInput.down('jump') }
secondInput.dispose()
const audioWindow = new Events()
const createAudio = makeFunction('lib/games/runtime/engine/sound.js', 'createAudio', { window: audioWindow })
const audio = createAudio()
const beforeDispose = audioWindow.count()
audio.dispose()
assert.equal(audioWindow.count(), 3)
results.audioDisposal = { listenersBeforeDispose: beforeDispose, listenersAfterDispose: audioWindow.count(), scope: 'EventTarget adapter; no real audio device.' }
const createPool = makeFunction('lib/games/runtime/engine/models.js', 'createPool')
let allocated = 0
const pool = createPool(() => ({ id: ++allocated }), { size: 2 })
for (let index = 0; index < 5; index++) pool.take()
assert.equal(pool.count, 5)
results.pool = { configuredSize: 2, live: pool.count, allocated }
const storage = makeFunction('lib/games/runtime/engine/state.js', 'createStorage', { localStorage: { setItem() { throw new Error('QuotaExceededError') } } })
results.storageAcknowledgement = { returnedOnFailedWrite: storage('audit').set('score', 10) }
assert.equal(results.storageAcknowledgement.returnedOnFailedWrite, 10)
const output = { root, generatedAt: new Date().toISOString(), scope: 'Original reviewed functions; isolated adapters; no external services or full-app validation.', threeRevisionUsedForVectors: THREE.REVISION, cases: Object.keys(results).length, results }
writeFileSync(path.join(auditDir, 'studio-sandbox-repro-2026-10-15.json'), JSON.stringify(output, null, 2) + '\n')
console.log(JSON.stringify({ inventory: { includedFiles: inventory.includedFiles, sourceFiles: inventory.sourceFiles, sourceLines: inventory.sourceLines, tests: inventory.tests, licenseFiles: inventory.licenseFiles, priorAudit: inventory.priorAudit }, ...output }, null, 2))
