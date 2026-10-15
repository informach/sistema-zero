// Diagnostic harness only. Runs reviewed tools.ts with in-memory adapters, no SDK/network.
// Usage: bun .audits/repro-sandbox-tui-2026-10-15.ts <path-to-clone-at-ac18750>
import assert from 'node:assert/strict'
import { readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'

const root = process.argv[2]
if (!root) throw new Error('Provide the path to the sandbox repository clone.')
const sha = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim()
assert.equal(sha, 'ac18750e06d7678ca8a215fc61cb91e1e5709b50')
const source = readFileSync(path.join(root, 'lib/games/tools.ts'), 'utf8')
const code = new Bun.Transpiler({ loader: 'ts' }).transformSync(
  source.replace(/^import .*\r?\n/gm, '').replace(/^export /gm, ''),
)
const schema: any = new Proxy(() => schema, { get: () => schema })
const events: { level: string; attributes: unknown }[] = []
const logger = {
  fmt: (strings: TemplateStringsArray, ...values: unknown[]) =>
    strings.reduce((s, part, i) => s + part + (values[i] ?? ''), ''),
  info: (_message: string, attributes: unknown) => events.push({ level: 'info', attributes }),
  warn: (_message: string, attributes: unknown) => events.push({ level: 'warn', attributes }),
  error: (_message: string, attributes: unknown) => events.push({ level: 'error', attributes }),
}
let content = 'A B'
let statError: Error | undefined
let writes = 0
let deletes = 0
const box = {
  fs: {
    getFileDetails: async () => {
      if (statError) throw statError
      return { isDir: false, size: Buffer.byteLength(content) }
    },
    downloadFile: async () => Buffer.from(content),
    uploadFile: async (value: Buffer) => { content = value.toString(); writes++ },
    deleteFile: async () => { deletes++ },
    listFiles: async () => [],
  },
  process: { executeCommand: async () => ({ exitCode: 0, result: '' }) },
}
const factory = new Function('path', 'tool', 'z', 'GAME_DIR', 'getGameSandbox', 'logger', 'describeError', 'elapsed',
  code + '\nreturn {createGameTools, resolveGamePath};')
const api = factory(path, (value: unknown) => value, schema, '/home/daytona/game',
  async () => ({ sandbox: box }), logger, (e: Error) => ({ message: e.message }), () => 0)
const tools = api.createGameTools('diagnostic-only')
const results: Record<string, unknown> = {}

content = 'A'
const expansion = await tools.replace_text.execute({ path: 'main.js', find: 'A', replace: 'x'.repeat(128001) })
assert.equal(Buffer.byteLength(content), 128001)
const laterRead = await tools.read_file.execute({ path: 'main.js' })
assert.match(laterRead, /over the 128000 byte read limit/)
results.expansion = { result: expansion, bytes: Buffer.byteLength(content), laterRead }

statError = new Error('ECONNRESET: simulated sandbox transport outage')
const missing = await tools.read_file.execute({ path: 'main.js' })
assert.equal(missing, 'No file at main.js.')
assert.equal(events.at(-1)?.level, 'info')
results.statFailure = { result: missing, logLevel: events.at(-1)?.level }
statError = undefined

content = 'A B'
const parallel = await Promise.all([
  tools.replace_text.execute({ path: 'main.js', find: 'A', replace: 'AA' }),
  tools.replace_text.execute({ path: 'main.js', find: 'B', replace: 'BB' }),
])
assert.notEqual(content, 'AA BB')
results.concurrentReplace = { results: parallel, actual: content, desired: 'AA BB', limitation: 'In-memory adapter; proves missing concurrency control in caller, not Daytona implementation.' }

await tools.delete_file.execute({ path: 'report.js' })
await tools.delete_file.execute({ path: 'engine/index.js' })
assert.equal(deletes, 2)
results.promptOnlyProtection = { acceptedDeletes: deletes, paths: ['report.js', 'engine/index.js'] }

const stop = new AbortController()
stop.abort()
const before = writes
await tools.write_file.execute({ path: 'main.js', content: 'after stop' }, { abortSignal: stop.signal })
assert.equal(writes, before + 1)
results.abortedTool = { writesAfterAlreadyAbortedInvocation: writes - before, limitation: 'Isolated execute call; SDK may prevent scheduling a new call. In-flight cancellation remains unverified.' }

assert.throws(() => api.resolveGamePath('../../outside'))
assert.throws(() => api.resolveGamePath('/etc/passwd'))
assert.equal(api.resolveGamePath('link/file.txt'), '/home/daytona/game/link/file.txt')
results.paths = { lexicalTraversalRejected: true, linkNameAccepted: true, symlinkEscapeDemonstrated: false }

const previewSource = readFileSync(path.join(root, 'components/chat-preview.tsx'), 'utf8')
const redactFunction = previewSource.match(/function withoutQuery\(value: string\) \{[\s\S]*?\n\}/)?.[0]
assert.ok(redactFunction)
const redact = new Function(new Bun.Transpiler({ loader: 'ts' }).transformSync(redactFunction) + '\nreturn withoutQuery;')()
const syntheticUrl = 'https://3000-SYNTHETIC_TOKEN.proxy.example/main.js?cache=1'
const sanitized = redact(syntheticUrl)
assert.ok(sanitized.includes('SYNTHETIC_TOKEN'))
results.previewRedaction = { input: syntheticUrl, output: sanitized, syntheticHostnameTokenRetained: true, liveCredentialUsed: false }

const threadSource = readFileSync(path.join(root, 'components/chat-thread.tsx'), 'utf8')
const statusFunction = threadSource.match(/function toolCallStatus\([\s\S]*?\n\}/)?.[0]
assert.ok(statusFunction)
const status = new Function(new Bun.Transpiler({ loader: 'ts' }).transformSync(statusFunction) + '\nreturn toolCallStatus;')()
assert.equal(status('output-available'), 'done')
results.toolUiStatus = { missingFileResult: missing, sdkResultState: 'output-available', renderedStatus: status('output-available') }

const output = { commit: sha, scope: 'Reviewed original tools.ts; in-memory fs adapter; no remote services or model calls', results }
writeFileSync(path.join(import.meta.dir, 'sandbox-tui-repro-evidence-2026-10-15.json'), JSON.stringify(output, null, 2) + '\n')
console.log(JSON.stringify(output, null, 2))
