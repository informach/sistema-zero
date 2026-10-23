import assert from 'node:assert/strict'
import { spawn, spawnSync } from 'node:child_process'
import { createHash, randomUUID } from 'node:crypto'
import { mkdir, readFile, realpath, writeFile } from 'node:fs/promises'
import { relative, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { deadline } from './checks.ts'
import { hookCanary } from './lsp-hook.ts'
import { materializeSources, sourceLineCount } from './lsp-snapshot.ts'

const createdAt = new Date().toISOString()
const docker = process.argv.includes('--docker')
const cpuLimit = process.env.L0_LSP_CPUS ?? '1'
assert.ok(cpuLimit === '1' || cpuLimit === '2', 'Qualified CPU probes are 1 or 2 cores')
const directory = resolve(import.meta.dirname, '../../.cache/studio-python-l0')
const root = resolve(directory, `lsp-${randomUUID()}`)
const workspace = resolve(root, 'workspace')
const other = resolve(root, 'other-tenant.py')
await mkdir(workspace, { recursive: true })
await writeFile(other, 'TENANT_CANARY = "must-not-be-readable"\n')
const candidates: { path: string; source: string }[] = []
for (let file = 0; file < 50; file++) {
  const lines = [
    'import math',
    'import turtle',
    '',
    `class Scene${file}:`,
    '    def __init__(self):',
    '        self.pen = turtle.Turtle()',
    '',
  ]
  while (lines.length < 399) {
    const n = lines.length
    lines.push(
      `    def value_${n}(self, value: float) -> float:`,
      `        return math.sqrt(abs(value)) + ${n}`,
      '',
      '',
    )
  }
  while (lines.length < 400) lines.push('')
  const hook = file === 48 ? 'sitecustomize' : file === 49 ? 'usercustomize' : undefined
  if (hook) lines.unshift(...hookCanary('/tmp/l0-hook-executed').trimEnd().split('\n'))
  const source = `${lines.slice(0, 400).join('\n')}\n`
  // 400 lines per file. A trailing blank does not change the AST semantics.
  candidates.push({ path: `${hook ?? `scene_${file}`}.py`, source })
}
const restorePath = process.env.L0_LSP_RESTORE
if (restorePath) {
  const restored: unknown = JSON.parse(await readFile(restorePath, 'utf8'))
  assert.ok(
    restored &&
      typeof restored === 'object' &&
      'version' in restored &&
      restored.version === 1 &&
      'files' in restored &&
      Array.isArray(restored.files),
  )
  candidates.length = 0
  for (const item of restored.files) {
    assert.ok(
      item &&
        typeof item === 'object' &&
        typeof item.path === 'string' &&
        typeof item.source === 'string',
    )
    candidates.push({ path: item.path, source: item.source })
  }
}
// These author-controlled names must remain inert. The analysis process has an
// empty PATH and receives only server-generated LSP settings, not project config.
for (const name of ['python', 'python3'])
  candidates.push({ path: name, source: '#!/bin/sh\nprintf unsafe > /tmp/l0-hook-executed\n' })
candidates.push({
  path: '.pnp.cjs',
  source: 'require("node:fs").writeFileSync("/tmp/l0-hook-executed", "unsafe")\n',
})
candidates.push({
  path: 'pyrightconfig.json',
  source: '{"venvPath":"/other-workspace","extraPaths":["/other-workspace"]}',
})
candidates.push({
  path: 'pyproject.toml',
  source: '[tool.pyright]\nextraPaths = ["/other-workspace"]\n',
})
const snapshot = await materializeSources(workspace, candidates)
const files = snapshot.accepted
assert.equal(
  files.reduce((sum, file) => sum + sourceLineCount(file.source), 0),
  20000,
)
const pyrightRoot = await realpath(resolve(import.meta.dirname, 'node_modules/pyright'))
const metricsPath = resolve(import.meta.dirname, 'lsp-metrics.cjs')
const version = JSON.parse(await readFile(resolve(pyrightRoot, 'package.json'), 'utf8')).version
assert.equal(version, '1.1.414')
const evidence: Record<string, unknown> = {
  createdAt,
  version,
  node: process.version,
  files: files.length,
  lines: 20000,
  mode: docker ? 'linux-container' : 'windows-permission-diagnostic-only',
  cpuLimit: docker ? Number(cpuLimit) : 'host',
  linuxNetworkUidCgroupIsolation: docker ? 'in-progress' : 'pending',
  requests: [],
  omittedNonSourceFiles: snapshot.omitted,
  restoredFrom: restorePath ?? null,
}
const output = resolve(directory, `lsp-${createdAt.replaceAll(':', '-')}-${randomUUID()}.json`)
const notifications: Record<string, unknown>[] = []
const metrics: Record<string, unknown>[] = []
const messages: string[] = []
evidence.notifications = notifications
evidence.metrics = metrics
evidence.stderr = messages
let nextId = 0
const pending = new Map<number, (message: RpcMessage) => void>()
interface RpcMessage {
  id?: number
  method?: string
  params?: unknown
  result?: unknown
  error?: unknown
}
function object(value: unknown): Record<string, unknown> {
  assert.ok(
    value !== null && typeof value === 'object' && !Array.isArray(value),
    'Expected LSP object',
  )
  return value as Record<string, unknown>
}
const began = performance.now()
const containerName = `sz-python-l0-${randomUUID()}`
const runtimeWorkspace = docker ? '/workspace' : workspace
const fileUri = (path: string) =>
  docker ? `file:///workspace/${path.split(/[\\/]/).at(-1)}` : pathToFileURL(path).href
const workspaceUri = docker ? 'file:///workspace' : pathToFileURL(workspace).href
let dockerArgs: string[] = []
if (docker) {
  const image = JSON.parse(
    await readFile(resolve(import.meta.dirname, 'docker-manifest.json'), 'utf8'),
  ) as { image: string }
  assert.match(image.image, /^node@sha256:[a-f0-9]{64}$/)
  dockerArgs = [
    'run',
    '-i',
    '--name',
    containerName,
    '--network',
    'none',
    '--user',
    '1000:1000',
    '--read-only',
    '--cap-drop',
    'ALL',
    '--security-opt',
    'no-new-privileges',
    '--memory',
    '256m',
    '--memory-swap',
    '256m',
    '--cpus',
    cpuLimit,
    '--pids-limit',
    '64',
    '--tmpfs',
    '/tmp:rw,noexec,nosuid,nodev,size=16m',
    '--mount',
    `type=bind,source=${pyrightRoot},target=/opt/pyright,readonly`,
    '--mount',
    `type=bind,source=${workspace},target=/workspace,readonly`,
    '--mount',
    `type=bind,source=${metricsPath},target=/opt/lsp-metrics.cjs,readonly`,
    '--workdir',
    runtimeWorkspace,
    '--env',
    'L0_CANARY=/other-tenant.py',
    '--env',
    'L0_LINUX=1',
    '--env',
    'PATH=',
    '--entrypoint',
    // Node's permission mode freezes path.posix.resolve on Linux and is
    // incompatible with Pyright's bundled fslib. OS namespaces, read-only
    // mounts, UID, seccomp and cgroups enforce this process boundary.
    '/usr/local/bin/node',
    image.image,
    '--max-old-space-size=192',
    '--require',
    '/opt/lsp-metrics.cjs',
    '/opt/pyright/dist/pyright-langserver.js',
    '--stdio',
  ]
  evidence.image = image
  evidence.containerName = containerName
}
// Pyright canonicalizes the Windows drive letter; Node's permission matcher
// distinguishes that spelling. Both spellings resolve to the same three roots.
const readPermissions = [pyrightRoot, workspace, metricsPath]
  .flatMap((path) => [path, path.replace(/^[A-Z]:/, (drive) => drive.toLowerCase())])
  .map((path) => `--allow-fs-read=${path}`)
const child = spawn(
  docker ? 'docker' : process.execPath,
  docker
    ? dockerArgs
    : [
        '--permission',
        '--allow-worker',
        ...readPermissions,
        '--max-old-space-size=192',
        '--require',
        metricsPath,
        resolve(pyrightRoot, 'dist/pyright-langserver.js'),
        '--stdio',
      ],
  {
    cwd: workspace,
    windowsHide: true,
    env: docker ? process.env : { SystemRoot: process.env.SystemRoot, PATH: '', L0_CANARY: other },
    stdio: ['pipe', 'pipe', 'pipe'],
  },
)
const closed = new Promise<void>((resolveClose) => child.once('close', () => resolveClose()))
let buffer = Buffer.alloc(0)
let stderr = ''
let transportError: Error | undefined
child.stdin.on('error', (error) => {
  transportError = error
})
const diagnosedFiles = new Set<string>()
const expectedUris = files.map((file) => fileUri(file.path).toLowerCase())
let completeAnalysis: () => void
const allAnalyzed = new Promise<void>((resolve) => {
  completeAnalysis = resolve
})
const settings = {
  pythonVersion: '3.14',
  typeCheckingMode: 'basic',
  diagnosticMode: 'workspace',
  autoSearchPaths: false,
  useLibraryCodeForTypes: false,
  autoImportCompletions: true,
  logLevel: 'Error',
}
function send(message: RpcMessage) {
  const bytes = Buffer.from(JSON.stringify({ jsonrpc: '2.0', ...message }))
  child.stdin.write(`Content-Length: ${bytes.byteLength}\r\n\r\n`)
  child.stdin.write(bytes)
}
function dispatch(message: RpcMessage) {
  if (message.method === 'textDocument/publishDiagnostics') {
    const uri = object(message.params).uri
    if (typeof uri === 'string') diagnosedFiles.add(uri.toLowerCase())
    if (expectedUris.every((expected) => diagnosedFiles.has(expected))) completeAnalysis()
  }
  if (message.method && message.id !== undefined) {
    const result =
      message.method === 'workspace/configuration'
        ? (object(message.params).items as { section?: string }[]).map((item) =>
            item.section === 'python'
              ? { analysis: settings }
              : item.section === 'python.analysis'
                ? settings
                : {},
          )
        : null
    send({ id: message.id, result })
  } else if (message.id !== undefined) {
    pending.get(message.id)?.(message)
    pending.delete(message.id)
  } else if (notifications.length < 200) notifications.push(message as Record<string, unknown>)
}
child.stdout.on('data', (chunk) => {
  try {
    buffer = Buffer.concat([buffer, chunk])
    if (buffer.length > 16 * 1024 * 1024) throw new Error('LSP output exceeds limit')
    while (true) {
      const index = buffer.indexOf('\r\n\r\n')
      if (index < 0) break
      const length = Number(
        /Content-Length:\s*(\d+)/i.exec(buffer.subarray(0, index).toString())?.[1],
      )
      if (!Number.isSafeInteger(length) || length < 0 || length > 16 * 1024 * 1024)
        throw new Error('Invalid LSP header')
      if (buffer.length < index + 4 + length) break
      const message = JSON.parse(buffer.subarray(index + 4, index + 4 + length).toString())
      buffer = buffer.subarray(index + 4 + length)
      dispatch(message)
    }
  } catch (error) {
    transportError = error as Error
    child.kill()
  }
})
child.stderr.on('data', (chunk) => {
  stderr += chunk.toString()
  while (true) {
    const index = stderr.indexOf('\n')
    if (index < 0) break
    const line = stderr.slice(0, index)
    stderr = stderr.slice(index + 1)
    try {
      const value = JSON.parse(line)
      if (value.l0 && metrics.length < 4000) metrics.push(value)
      else recordStderr(line)
    } catch {
      recordStderr(line)
    }
  }
  // Minified upstream sources can appear in an exception. Keep the tail bounded
  // while preserving the actual error and stack that follow it.
  if (stderr.length > 8192) stderr = stderr.slice(-8192)
})
function recordStderr(line: string) {
  messages.push(line.slice(-8192))
  if (messages.length > 30) messages.shift()
}
child.on('error', (error) => {
  transportError = error
})
child.on('exit', (code, signal) => {
  evidence.exit = { code, signal }
  for (const [id, complete] of pending)
    complete({ id, error: { code: -1, message: `Process exited ${code}/${signal}` } })
  pending.clear()
})
function request(method: string, params: unknown) {
  const id = ++nextId
  const start = performance.now()
  const promise = new Promise<RpcMessage>((complete) => {
    pending.set(id, complete)
    send({ id, method, params })
  })
  return {
    id,
    result: deadline(promise, 15000, method).then((response) => {
      ;(evidence.requests as unknown[]).push({
        id,
        method,
        elapsedMs: performance.now() - start,
        response,
      })
      return response
    }),
  }
}
try {
  const initialized = await request('initialize', {
    processId: null,
    rootUri: workspaceUri,
    workspaceFolders: [{ uri: workspaceUri, name: 'authorized-workspace' }],
    capabilities: {
      workspace: { configuration: true },
      textDocument: { completion: { completionItem: { snippetSupport: true } } },
    },
  }).result
  evidence.bootstrapMs = performance.now() - began
  assert.equal(initialized.error, undefined)
  assert.ok(object(object(initialized.result).capabilities).completionProvider)
  send({ method: 'initialized', params: {} })
  send({
    method: 'workspace/didChangeConfiguration',
    params: { settings: { python: { analysis: settings } } },
  })
  const uri = fileUri(files[0]!.path)
  const prefix = files[0]!.source.split('\n').slice(0, 397).join('\n')
  const source = restorePath
    ? files[0]!.source
    : `${prefix}\nscreen = turtle.Screen()\nanswer = 0\nscreen.\n`
  assert.equal(sourceLineCount(source), 400)
  send({
    method: 'textDocument/didOpen',
    params: { textDocument: { uri, languageId: 'python', version: 1, text: source } },
  })
  if (restorePath) {
    const restoredHover = await request('textDocument/hover', {
      textDocument: { uri },
      position: { line: 398, character: 2 },
    }).result
    assert.equal(restoredHover.error, undefined)
    assert.match(JSON.stringify(restoredHover.result), /Literal\[30\]/)
    evidence.restoredSourceSha256 = createHash('sha256').update(source).digest('hex')
    evidence.restoredHover = restoredHover
  }
  const complete = { textDocument: { uri }, position: { line: 399, character: 7 } }
  async function verifiedCompletion() {
    const result = await request('textDocument/completion', complete).result
    assert.equal(result.error, undefined)
    const items = Array.isArray(result.result) ? result.result : object(result.result).items
    assert.ok(Array.isArray(items))
    assert.ok(
      items.some((item: unknown) => object(item).label === 'ontimer'),
      'Real Turtle stubs must provide ontimer',
    )
  }
  const completionMs: number[] = []
  evidence.completionMs = completionMs
  for (let attempt = 0; attempt < 31; attempt++) {
    const began = performance.now()
    await verifiedCompletion()
    completionMs.push(performance.now() - began)
  }
  const warm = completionMs.slice(1).sort((a, b) => a - b)
  evidence.startupCompletionSummary = {
    samples: warm.length,
    coldMs: completionMs[0],
    medianMs: warm[14],
    p95Ms: warm[28],
    maximumMs: warm[29],
    network: 'local Docker transport; reference RTT not applied',
  }
  await deadline(allAnalyzed, 15000, 'All 50 files analyzed before warm phase')
  const warmEditsMs: number[] = []
  let latestSource = source
  evidence.warmEditsMs = warmEditsMs
  for (let edit = 1; edit <= 30; edit++) {
    const text = `${prefix}\nscreen = turtle.Screen()\nanswer = ${edit}\nscreen.\n`
    latestSource = text
    assert.equal(sourceLineCount(text), 400)
    const began = performance.now()
    send({
      method: 'textDocument/didChange',
      params: { textDocument: { uri, version: edit + 1 }, contentChanges: [{ text }] },
    })
    await verifiedCompletion()
    warmEditsMs.push(performance.now() - began)
  }
  const warmSorted = [...warmEditsMs].sort((a, b) => a - b)
  evidence.completionSummary = {
    samples: warmSorted.length,
    medianMs: warmSorted[14],
    p95Ms: warmSorted[28],
    maximumMs: warmSorted[29],
    scope: '30 edits after the initial 50-file analysis; startup samples retained separately',
    network: 'local Docker transport; reference RTT not applied',
  }
  const cancelled = request('workspace/symbol', { query: 'value_' })
  send({ method: '$/cancelRequest', params: { id: cancelled.id } })
  evidence.cancelledResponse = await cancelled.result
  assert.equal(object(object(evidence.cancelledResponse).error).code, -32800)
  const recovered = await request('textDocument/hover', {
    textDocument: { uri },
    position: { line: 397, character: 2 },
  }).result
  assert.equal(recovered.error, undefined)
  assert.ok(recovered.result)
  await deadline(allAnalyzed, 15000, 'All 50 files analyzed')
  evidence.diagnosedWorkspaceFiles = expectedUris.filter((uri) => diagnosedFiles.has(uri)).length
  const boundary = metrics.find((value) => value.l0 === 'boundary')
  assert.equal(boundary?.outsideReadDenied, true)
  if (!docker) assert.equal(boundary?.childProcessDenied, true)
  evidence.sampledPeakRss = Math.max(
    0,
    ...metrics.filter((value) => value.l0 === 'memory').map((value) => Number(value.rss)),
  )
  evidence.memoryTargetPassed = Number(evidence.sampledPeakRss) <= 256 * 1024 * 1024
  assert.ok(Number(evidence.sampledPeakRss) > 0)
  assert.equal(evidence.memoryTargetPassed, true)
  if (docker) {
    const boundary = metrics.find((value) => value.l0 === 'linux-boundary')
    assert.equal(boundary?.uid, 1000)
    assert.equal(boundary?.rootWriteDenied, true)
    assert.equal(boundary?.workspaceWriteDenied, true)
    assert.equal(boundary?.networkDenied, true)
    assert.equal(boundary?.noNewPrivileges, true)
    assert.equal(boundary?.capabilities, '0000000000000000')
    assert.equal(boundary?.seccomp, '2')
    assert.equal(boundary?.memoryMax, '268435456')
    const hooks = spawnSync(
      'docker',
      [
        'exec',
        containerName,
        '/usr/local/bin/node',
        '-e',
        'const fs = require("node:fs"); console.log(JSON.stringify({hookExecuted: fs.existsSync("/tmp/l0-hook-executed"), memoryPeak: fs.readFileSync("/sys/fs/cgroup/memory.peak", "utf8").trim(), memoryEvents: fs.readFileSync("/sys/fs/cgroup/memory.events", "utf8"), cpuMax: fs.readFileSync("/sys/fs/cgroup/cpu.max", "utf8").trim(), cpuStat: fs.readFileSync("/sys/fs/cgroup/cpu.stat", "utf8")}))',
      ],
      { windowsHide: true, encoding: 'utf8', timeout: 5000 },
    )
    assert.equal(hooks.status, 0, hooks.stderr)
    evidence.linuxEndState = JSON.parse(hooks.stdout)
    assert.equal(object(evidence.linuxEndState).hookExecuted, false)
    assert.match(String(object(evidence.linuxEndState).memoryEvents), /^oom_kill 0$/m)
    evidence.linuxNetworkUidCgroupIsolation = 'slice-passed'
  }
  evidence.qualification = docker
    ? 'linux-service-slice-passed'
    : 'local-service-slice-passed-not-linux-isolation'
  const reconnectSnapshot = resolve(root, 'reconnect-snapshot.json')
  await writeFile(
    reconnectSnapshot,
    JSON.stringify({
      version: 1,
      files: files.map((file, index) => ({
        path: relative(workspace, file.path).replaceAll('\\', '/'),
        source: index === 0 ? latestSource : file.source,
      })),
    }),
  )
  evidence.reconnectSnapshot = reconnectSnapshot
} catch (error) {
  evidence.qualification = 'failed'
  evidence.failure = String(transportError ?? error)
  process.exitCode = 1
} finally {
  if (child.exitCode === null && child.signalCode === null) {
    try {
      await request('shutdown', null).result
      send({ method: 'exit' })
    } catch {
      child.kill()
    }
    await deadline(
      new Promise<void>((resolveExit) => {
        if (child.exitCode !== null || child.signalCode !== null) resolveExit()
        else child.once('exit', () => resolveExit())
      }),
      3000,
      'LSP cleanup',
    ).catch(() => child.kill())
  }
  await deadline(closed, 3000, 'LSP streams closed').catch((error) => {
    evidence.cleanupFailure = String(error)
    process.exitCode = 1
    evidence.qualification = 'failed-cleanup'
  })
  if (stderr) recordStderr(stderr)
  if (docker) {
    const inspect = spawnSync('docker', ['inspect', '--format', '{{json .State}}', containerName], {
      windowsHide: true,
      encoding: 'utf8',
      timeout: 10000,
    })
    evidence.containerState =
      inspect.status === 0 ? JSON.parse(inspect.stdout) : { error: inspect.stderr }
    if (
      inspect.status !== 0 ||
      object(evidence.containerState).OOMKilled !== false ||
      object(evidence.containerState).ExitCode !== 0 ||
      object(evidence.containerState).Running !== false
    ) {
      evidence.qualification = 'failed-container-exit'
      process.exitCode = 1
    }
    const removed = spawnSync('docker', ['rm', '-f', containerName], {
      windowsHide: true,
      encoding: 'utf8',
      timeout: 10000,
    })
    evidence.containerCleanup = {
      status: removed.status,
      error: removed.error?.message ?? removed.stderr,
    }
    if (removed.status !== 0) {
      process.exitCode = 1
      evidence.qualification = 'failed-cleanup'
    }
  }
  await writeFile(output, `${JSON.stringify(evidence, null, 2)}\n`)
}
console.log(
  JSON.stringify({
    qualification: evidence.qualification,
    failure: evidence.failure,
    bootstrapMs: evidence.bootstrapMs,
    sampledPeakRss: evidence.sampledPeakRss,
    output,
  }),
)
