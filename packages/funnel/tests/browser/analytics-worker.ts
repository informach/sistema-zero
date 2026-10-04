/** Local operational regression: a stalled image must fail boundedly, with no snapshot saved. */
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { createServer } from 'node:http'

const server = createServer((req, res) => {
  if (req.url === '/stalled.png') return
  res.setHeader('content-type', 'text/html')
  res.end(
    '<html><body><main><h1>Worker timeout fixture</h1><img src="/stalled.png"></main><script>window.__szAnalyticsSnapshot = async () => ({revision: "' +
      'f'.repeat(64) +
      '", viewport: 390, height: 850, elements: {}})</script></body></html>',
  )
})
await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
const address = server.address()
assert.ok(address && typeof address !== 'string')
assert.ok(['localhost', '127.0.0.1'].includes(new URL(process.env.DATABASE_URL!).hostname))
try {
  const started = Date.now()
  const child = spawn(
    process.execPath,
    [
      '--env-file-if-exists=.env',
      '--import',
      'tsx',
      'scripts/analytics-snapshots.ts',
      '--page=/',
      '--width=390',
      '--refresh',
    ],
    {
      env: { ...process.env, ANALYTICS_CAPTURE_URL: `http://127.0.0.1:${address.port}` },
      stdio: ['ignore', 'pipe', 'pipe'],
    },
  )
  let output = ''
  child.stdout.on('data', (chunk) => {
    output += chunk
  })
  child.stderr.on('data', (chunk) => {
    output += chunk
  })
  const timer = setTimeout(() => child.kill(), 60000)
  const code = await new Promise<number | null>((resolve) => child.on('exit', resolve))
  clearTimeout(timer)
  assert.equal(code, 1, output)
  assert.match(output, /Snapshots saved: 0; failed: 1/)
  assert.ok(Date.now() - started < 55000, output)
  console.log(`Stalled capture failed safely after ${Date.now() - started}ms`)
} finally {
  server.closeAllConnections()
  server.close()
}
