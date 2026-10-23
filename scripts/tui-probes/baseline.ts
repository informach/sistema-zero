import { Database } from 'bun:sqlite'
import assert from 'node:assert/strict'
import { mkdir, mkdtemp, writeFile } from 'node:fs/promises'
import { createConnection, createServer } from 'node:net'
import { cpus, platform, release, tmpdir, totalmem } from 'node:os'
import { join } from 'node:path'

const directory = await mkdtemp(join(tmpdir(), 'sistemazero-tui-proof-'))
const database = new Database(join(directory, 'proof.sqlite'), { strict: true })
database.run('PRAGMA journal_mode=WAL')
database.run('PRAGMA synchronous=FULL')
database.run('CREATE TABLE events (id INTEGER PRIMARY KEY, payload TEXT NOT NULL)')
const insert = database.prepare('INSERT INTO events(payload) VALUES (?)')
const samples: number[] = []
for (let i = 0; i < 100; i++) {
  const start = performance.now()
  database.transaction(() => insert.run(JSON.stringify({ sequence: i })))()
  samples.push(performance.now() - start)
}
database.close()
const reopened = new Database(join(directory, 'proof.sqlite'), { readonly: true })
assert.equal(
  reopened.query<{ count: number }, []>('SELECT count(*) AS count FROM events').get()?.count,
  100,
)
reopened.close()
const endpoint =
  platform() === 'win32'
    ? `\\\\.\\pipe\\sistemazero-proof-${crypto.randomUUID()}`
    : join(directory, 'ipc.sock')
const server = createServer((socket) => socket.pipe(socket))
await new Promise<void>((resolve, reject) => {
  server.once('error', reject)
  server.listen(endpoint, resolve)
})
const start = performance.now()
await new Promise<void>((resolve, reject) => {
  const socket = createConnection(endpoint)
  let bytes = 0
  socket.setTimeout(5000, () => socket.destroy(new Error('IPC timeout')))
  socket.on('error', reject)
  socket.on('connect', () => {
    socket.write('first')
    socket.write('second')
  })
  socket.on('data', (data) => {
    bytes += data.length
    if (bytes === 11) socket.end()
  })
  socket.on('close', (hadError) => {
    if (!hadError) {
      assert.equal(bytes, 11)
      resolve()
    }
  })
})
const ipcRoundTrip = performance.now() - start
await new Promise<void>((resolve, reject) =>
  server.close((error) => (error ? reject(error) : resolve())),
)
const name = `proof-${crypto.randomUUID()}`
await Bun.secrets.set({ service: 'sistemazero.tui.proof', name, value: 'synthetic-only' })
try {
  assert.equal(await Bun.secrets.get({ service: 'sistemazero.tui.proof', name }), 'synthetic-only')
} finally {
  await Bun.secrets.delete({ service: 'sistemazero.tui.proof', name })
}
async function version(command: string[]) {
  try {
    const proc = Bun.spawn(command, {
      stdout: 'pipe',
      stderr: 'pipe',
      timeout: 5000,
      windowsHide: true,
    })
    const [stdout, stderr, exit] = await Promise.all([
      new Response(proc.stdout).text(),
      new Response(proc.stderr).text(),
      proc.exited,
    ])
    return { available: exit === 0, version: (stdout || stderr).trim().slice(0, 200) }
  } catch (error) {
    return { available: false, reason: String(error) }
  }
}
samples.sort((a, b) => a - b)
const report = {
  date: new Date().toISOString(),
  bun: Bun.version,
  platform: platform(),
  os: release(),
  cpu: cpus()[0]?.model,
  memoryBytes: totalmem(),
  sqlite: {
    reopen: true,
    transactions: samples.length,
    p50Ms: samples[49],
    p95Ms: samples[94],
    durability: 'WAL/FULL',
  },
  ipc: {
    roundTripMs: ipcRoundTrip,
    transport: platform() === 'win32' ? 'named-pipe' : 'unix-socket',
    authentication: 'tested separately by runtime contract suite',
  },
  vault: true,
  codex: await version(['codex', '--version']),
  docker: await version(['docker', 'version', '--format', '{{.Server.Version}}']),
  modelSmoke: 'unverified: no billable request in primitive baseline',
  limitations: [
    'Primitive measurements, not full application performance.',
    'UI, process-tree, container, native protocols and load fixtures are gates of their producing lots.',
  ],
}
const out = join(import.meta.dir, '../../.audits/tui-implementation')
await mkdir(out, { recursive: true })
await writeFile(join(out, 'B00-baseline.json'), `${JSON.stringify(report, null, 2)}\n`)
console.log(JSON.stringify(report, null, 2))
