import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { createInterface } from 'node:readline'

// Test the actual Bun client -> Node BrowserServer handshake. Node-only media tests
// do not catch Bun's WebSocket compatibility failures (reproduced on 1.3.11).
const host = spawn(process.execPath, ['./src/railway-browser-host.mjs'], {
  env: {
    ...process.env,
    LIVE_BROWSER_LEASE_ENDS_AT: String(Date.now() + 29_000),
    LIVE_BROWSER_HARD_ENDS_AT: String(Date.now() + 60_000),
  },
  stdio: ['pipe', 'pipe', 'pipe'],
})
let errors = '',
  acknowledged = false
host.stderr.on('data', (chunk) => {
  errors += chunk
})
const exited = new Promise((resolve) => host.once('exit', resolve))
const timeout = setTimeout(() => host.kill(), 30_000)
const output = createInterface({ input: host.stdout })
try {
  const endpoint = await new Promise((resolve, reject) => {
    output.on('line', (line) => {
      const message = JSON.parse(line)
      if (message.endpoint) resolve(message.endpoint)
      if (message.closed) acknowledged = true
    })
    host.once('error', reject)
    void exited.then(() => reject(new Error(`Browser host exited: ${errors}`)))
  })
  const address = new URL(endpoint)
  address.hostname = '127.0.0.1'
  const client = spawn(process.env.LIVE_RECORDER_BUN ?? 'bun', ['-'], {
    stdio: ['pipe', 'inherit', 'pipe'],
  })
  client.stderr.on('data', (chunk) => {
    errors += chunk
  })
  const result = new Promise((resolve, reject) => {
    client.once('exit', resolve)
    client.once('error', reject)
  })
  client.stdin.end(`
    import { chromium } from 'playwright';
    const browser = await chromium.connect(${JSON.stringify(address.toString())}, { timeout: 7000 });
    try {
      const page = await browser.newPage();
      if (await page.evaluate(() => typeof MediaRecorder) !== 'function') throw new Error('MediaRecorder unavailable');
      console.log(JSON.stringify({runtime: Bun.version, browserTransport: 'passed'}));
    } finally { await browser.close(); }
  `)
  assert.equal(await result, 0, errors)
} finally {
  host.stdin.end()
  const code = await exited
  clearTimeout(timeout)
  assert.equal(code, 0, errors)
  assert.ok(acknowledged, 'Browser process termination was not acknowledged')
}
