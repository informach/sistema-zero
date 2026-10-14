import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { createInterface } from 'node:readline'

async function check(mode) {
  const child = spawn(process.execPath, ['./src/railway-browser-host.mjs'], {
    env: {
      ...process.env,
      LIVE_BROWSER_LEASE_ENDS_AT: String(Date.now() + 10_000),
      LIVE_BROWSER_HARD_ENDS_AT: String(Date.now() + 30_000),
    },
    stdio: ['pipe', 'pipe', 'pipe'],
  })
  let ready = false,
    closed = false,
    errors = ''
  child.stderr.on('data', (chunk) => {
    errors += chunk
  })
  const timeout = setTimeout(() => child.kill(), 13_000)
  const input = createInterface({ input: child.stdout })
  input.on('line', (line) => {
    const message = JSON.parse(line)
    if (message.endpoint) {
      ready = true
      if (mode === 'expired')
        child.stdin.write(`${JSON.stringify({ type: 'renew', leaseEndsAt: Date.now() + 1200 })}\n`)
      else if (mode === 'invalid')
        child.stdin.write(
          `${JSON.stringify({ type: 'renew', leaseEndsAt: Date.now() + 90_000 })}\n`,
        )
      else child.stdin.end()
    }
    if (message.closed) closed = true
  })
  const code = await new Promise((resolve) => child.once('exit', resolve))
  clearTimeout(timeout)
  assert.equal(code, 0, errors)
  assert.ok(ready, 'Browser did not start')
  assert.ok(closed, 'Host did not confirm capture termination')
}
for (const mode of ['expired', 'invalid', 'stdin-closed']) await check(mode)
