import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { once } from 'node:events'
import { resolve } from 'node:path'

// Run after `bun run build`. Exercises the real SSR artifact on loopback only;
// retired routes must return before any database or gateway call.
const cwd = resolve(import.meta.dir, '../..')
const app = spawn('node', ['dist/server/entry.mjs'], {
  cwd,
  windowsHide: true,
  stdio: ['ignore', 'pipe', 'pipe'],
  env: {
    ...process.env,
    NODE_ENV: 'development',
    HOST: '127.0.0.1',
    PORT: '0',
    DATABASE_URL: 'postgres://qa:qa@127.0.0.1:1/qa',
    GATEWAY_URL: 'http://127.0.0.1:1',
    FUNNEL_HMAC_SECRET: 'qa-isolated-local',
    FUNNEL_INTERNAL_TOKEN: 'qa-isolated-local',
    SENTRY_DSN: '',
    TRUST_PROXY: 'false',
    FUNNEL_OFFER_PRO_COMUNIDADE_DOS_CRIADORES: 'comunidade-dos-criadores-adulto-mensal',
    FUNNEL_OFFER_PRO_DESAFIO_PRIMEIRO_JOGO: 'desafio-primeiro-jogo-adulto-30-dias',
    FUNNEL_OFFER_KIDS_DESAFIO_PRIMEIRO_JOGO: 'desafio-primeiro-jogo-30-dias',
    FUNNEL_OFFER_KIDS_COMUNIDADE_DOS_CRIADORES: 'comunidade-dos-criadores-mensal',
  },
})
const result = {
  pid: app.pid,
  startedAt: new Date().toISOString(),
  cases: [] as { path: string; status: number; location?: string | null }[],
  passed: false,
  stopped: false,
  endedAt: null as string | null,
}
const exited = once(app, 'exit')
const terminal = setTimeout(() => app.kill(), 40000)
try {
  const origin = await new Promise<string>((ok, fail) => {
    let output = ''
    const timer = setTimeout(() => fail(Error('Server startup timeout')), 20000)
    const capture = (data: Buffer) => {
      output += data.toString()
      const match = output.match(/http:\/\/127\.0\.0\.1:\d+/)
      if (match) {
        clearTimeout(timer)
        ok(match[0])
      }
    }
    app.stdout.on('data', capture)
    app.stderr.on('data', capture)
    app.once('exit', () => {
      clearTimeout(timer)
      fail(Error('Server exited before readiness'))
    })
    app.once('error', fail)
  })
  for (const path of [
    '/pro/no-comando-da-ia/quiz',
    '/pro/no-comando-da-ia/oferta',
    '/pro/no-comando-da-ia/resultado',
    '/pro/no-comando-da-ia/checkout',
    '/pro/no-comando-da-ia/termos',
  ]) {
    const response = await fetch(origin + path, {
      redirect: 'manual',
      signal: AbortSignal.timeout(5000),
      headers: { cookie: 'sz_metrics=rejected' },
    })
    await response.text()
    assert.equal(response.status, 404, path)
    result.cases.push({ path, status: response.status })
  }
  const entry = await fetch(`${origin}/pro`, {
    redirect: 'manual',
    signal: AbortSignal.timeout(5000),
  })
  assert.equal(entry.status, 302)
  assert.ok(entry.headers.get('location')?.startsWith('/pro/comunidade-dos-criadores/'))
  result.cases.push({ path: '/pro', status: entry.status, location: entry.headers.get('location') })
  await entry.text()
  for (const path of ['/pro/comunidade-dos-criadores/quiz', '/kids/desafio-primeiro-jogo/quiz']) {
    const response = await fetch(origin + path, {
      signal: AbortSignal.timeout(5000),
      headers: { cookie: 'sz_metrics=rejected' },
    })
    const html = await response.text()
    assert.equal(response.status, 200, path)
    assert.ok(!html.includes('/img/no-comando-da-ia/'))
    result.cases.push({ path, status: response.status })
  }
  result.passed = true
} finally {
  if (app.exitCode === null && app.signalCode === null) app.kill()
  await exited
  clearTimeout(terminal)
  result.stopped = true
  result.endedAt = new Date().toISOString()
  console.log(JSON.stringify(result))
}
