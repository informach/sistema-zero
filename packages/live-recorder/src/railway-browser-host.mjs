import { createInterface } from 'node:readline'
import { chromium } from 'playwright'
import { validBrowserLease } from './browser-lease.ts'

// Runs inside an ephemeral VM as UID 1001. No app, SFU or storage credentials.
if (process.getuid?.() === 0) throw new Error('Browser must run without root privileges')
let leaseEndsAt = Number(process.env.LIVE_BROWSER_LEASE_ENDS_AT)
const hardEndsAt = Number(process.env.LIVE_BROWSER_HARD_ENDS_AT)
if (!validBrowserLease(leaseEndsAt, hardEndsAt)) throw new Error('Browser lease invalid')
const server = await chromium.launchServer({
  host: '::',
  port: 9222,
  chromiumSandbox: true,
  headless: true,
  args: ['--autoplay-policy=no-user-gesture-required'],
})
let closing
async function close() {
  if (closing) return closing
  closing = Promise.resolve().then(async () => {
    clearInterval(timer)
    input.close()
    // Only this ACK proves the browser process and its receivers have stopped.
    await server.close()
    process.stdout.write(`${JSON.stringify({ closed: true })}\n`, () => process.exit(0))
  })
  const fatal = setTimeout(() => {
    void server.kill().then(
      () => process.exit(1),
      () => process.exit(1),
    )
  }, 8000)
  fatal.unref()
  return closing
}
const input = createInterface({ input: process.stdin, crlfDelay: Infinity })
const timer = setInterval(() => {
  if (Date.now() >= Math.min(leaseEndsAt, hardEndsAt)) void close()
}, 250)
input.on('line', (line) => {
  try {
    if (line.length > 1024) throw new Error('Oversized control message')
    const command = JSON.parse(line)
    if (command.type === 'close') void close()
    else if (command.type === 'renew' && validBrowserLease(command.leaseEndsAt, hardEndsAt))
      leaseEndsAt = command.leaseEndsAt
    else void close()
  } catch {
    void close()
  }
})
input.on('close', () => {
  void close()
})
process.on('SIGTERM', () => {
  void close()
})
process.on('SIGINT', () => {
  void close()
})
process.stdout.write(`${JSON.stringify({ endpoint: server.wsEndpoint() })}\n`)
