import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { pythonWebTemplates } from '../../pythonWebTemplates'

const directory = resolve(
  import.meta.dirname,
  '../../../../../../.cache/studio-python-l0',
  `web-server-${crypto.randomUUID()}`,
  'deep-export-directory-to-verify-portable-files-on-windows-without-changing-system-settings',
)
const hash = 'a'.repeat(64)
const files = pythonWebTemplates(hash)
files[`runtime/${hash}/frame.html`] = '<!doctype html><title>frame</title>'
files[`runtime/${hash}/frame.mjs`] = 'export const verified = true'
files[`runtime/${hash}/test.wasm`] = new Uint8Array([0, 97, 115, 109])
files['project/main.py'] = 'raise RuntimeError("This source must never execute on the server")'
const longSourcePath = `project/${'portable-'.repeat(25)}main.py`
files[longSourcePath] =
  '# A portable source path remains accessible under a deep Windows directory.'
files['payload.json'] = '{}'
files['runtime-deployment.json'] = JSON.stringify({ runtimeMetadata: hash })
for (const [path, content] of Object.entries(files)) {
  const target = resolve(directory, path)
  await mkdir(resolve(target, '..'), { recursive: true })
  await writeFile(target, content)
}
const child = Bun.spawn([process.env.PYTHON ?? 'python', 'serve.py', '--port', '0'], {
  cwd: directory,
  stdout: 'pipe',
  stderr: 'pipe',
  windowsHide: true,
  env: { ...process.env, PYTHONDONTWRITEBYTECODE: '1', PYTHONUTF8: '1' },
})
let ready!: (url: URL) => void
let failed!: (error: Error) => void
const listening = new Promise<URL>((resolve, reject) => {
  ready = resolve
  failed = reject
})
async function drain(stream: ReadableStream<Uint8Array>, startup = false) {
  let tail = ''
  const decoder = new TextDecoder()
  const reader = stream.getReader()
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) return tail + decoder.decode()
      tail = (tail + decoder.decode(value, { stream: true })).slice(-16_000)
      const match = startup && tail.match(/http:\/\/127\.0\.0\.1:\d+\//)
      if (match) ready(new URL(match[0]))
    }
  } finally {
    reader.releaseLock()
  }
}
const stdout = drain(child.stdout, true),
  stderr = drain(child.stderr)
void child.exited.then((exit) =>
  failed(new Error(`Static server exited before readiness: ${exit}`)),
)
const deadline = setTimeout(() => {
  child.kill()
  failed(new Error('Static server readiness timeout'))
}, 8000)
try {
  const origin = await listening
  const request = (path: string, init: RequestInit = {}) =>
    fetch(new URL(path, origin), { ...init, redirect: 'error', signal: AbortSignal.timeout(2000) })
  const page = await request('')
  assert.equal(page.status, 200)
  assert.match(page.headers.get('content-security-policy') ?? '', /frame-src 'self'/)
  assert.match(await page.text(), /id="stage"/)
  const deployment = await request('runtime-deployment.json')
  assert.equal(deployment.status, 200)
  assert.equal(deployment.headers.get('content-type'), 'application/json')
  assert.equal(await deployment.text(), files['runtime-deployment.json'])
  const frame = await request(`runtime/${hash}/frame.html`)
  assert.equal(frame.status, 200)
  assert.equal(frame.headers.get('access-control-allow-origin'), '*')
  assert.equal(frame.headers.get('cross-origin-resource-policy'), 'cross-origin')
  const policy = frame.headers.get('content-security-policy') ?? ''
  assert.match(policy, /sandbox allow-scripts allow-pointer-lock/)
  assert.ok(!policy.includes('allow-same-origin'))
  assert.ok(policy.includes(`${origin.href}runtime/${hash}/`))
  const module = await request(`runtime/${hash}/frame.mjs`, { method: 'HEAD' })
  assert.equal(module.headers.get('content-type'), 'text/javascript')
  assert.equal(
    module.headers.get('content-length'),
    String(new TextEncoder().encode(String(files[`runtime/${hash}/frame.mjs`])).byteLength),
  )
  assert.equal(await module.text(), '')
  const wasm = await request(`runtime/${hash}/test.wasm`)
  assert.equal(wasm.headers.get('content-type'), 'application/wasm')
  assert.deepEqual(new Uint8Array(await wasm.arrayBuffer()), new Uint8Array([0, 97, 115, 109]))
  const source = await request('project/main.py')
  assert.equal(await source.text(), files['project/main.py'])
  assert.ok(resolve(directory, longSourcePath).length > 260)
  const longSource = await request(longSourcePath)
  assert.equal(longSource.status, 200)
  assert.equal(await longSource.text(), files[longSourcePath])
  for (const path of [
    'serve.py',
    'project/',
    'project/%2e%2e/%2e%2e/serve.py',
    'project/%5c..%5cserve.py',
    `runtime/${hash}/../other/frame.mjs`,
  ])
    assert.equal((await request(path)).status, 404, path)
  assert.equal((await request('', { headers: { host: 'attacker.test' } })).status, 400)
  console.log(JSON.stringify({ verified: true, directory }))
} finally {
  clearTimeout(deadline)
  if (child.exitCode === null) child.kill()
  await Promise.all([child.exited, stdout, stderr])
}
