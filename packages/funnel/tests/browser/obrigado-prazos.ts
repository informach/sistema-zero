/**
 * Depois do build: FUNNEL_RECEIPT_TEST_DATABASE_URL aponta exclusivamente para Postgres local
 * descartável. Nenhum serviço externo é chamado. Confere o SSR real com compras antigas e novas.
 */
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { createServer } from 'node:http'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { drizzle } from 'drizzle-orm/postgres-js'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import { chromium } from 'playwright'
import postgres from 'postgres'
import { createFunnelRepo } from '../../src/db/repo'
import { schema } from '../../src/db/schema'
import type { PurchasedOfferSnapshotV1 } from '../../src/server/purchased-offer-snapshot'

const url = process.env.FUNNEL_RECEIPT_TEST_DATABASE_URL
assert.ok(url, 'Forneça um banco descartável explicitamente')
assert.ok(['127.0.0.1', 'localhost'].includes(new URL(url).hostname), 'Somente banco local')
const cwd = fileURLToPath(new URL('../../', import.meta.url))
const sql = postgres(url, { max: 1 })
const db = drizzle(sql, { schema, casing: 'snake_case' })
const repo = createFunnelRepo(db)
await migrate(db, {
  migrationsFolder: resolve(cwd, 'src/db/migrations'),
  migrationsTable: 'funil_migrations',
})
const gateway = createServer((_req, res) => {
  res.writeHead(200, { 'content-type': 'application/json' })
  res.end(JSON.stringify({ items: [] }))
})
await new Promise<void>((done) => gateway.listen(0, '127.0.0.1', done))
const gatewayAddress = gateway.address()
assert.ok(gatewayAddress && typeof gatewayAddress !== 'string')
const app = spawn('node', ['dist/server/entry.mjs'], {
  cwd,
  windowsHide: true,
  stdio: ['ignore', 'pipe', 'pipe'],
  env: {
    ...process.env,
    NODE_ENV: 'development',
    HOST: '127.0.0.1',
    PORT: '0',
    DATABASE_URL: url,
    GATEWAY_URL: `http://127.0.0.1:${gatewayAddress.port}`,
    FUNNEL_HMAC_SECRET: 'local-receipt',
    FUNNEL_INTERNAL_TOKEN: 'local-receipt',
    SENTRY_DSN: '',
    TRUST_PROXY: 'false',
  },
})
let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined
try {
  const origin = await new Promise<string>((done, fail) => {
    let log = ''
    const timer = setTimeout(() => fail(new Error(`Servidor não iniciou: ${log}`)), 20000)
    const started = (chunk: Buffer) => {
      log = (log + chunk.toString()).slice(-4000)
      const listening = log.match(/Server listening on (http:\/\/127\.0\.0\.1:\d+)/)?.[1]
      if (listening) {
        clearTimeout(timer)
        done(listening)
      }
    }
    app.stdout.on('data', started)
    app.stderr.on('data', started)
    app.once('exit', (code) => {
      clearTimeout(timer)
      fail(new Error(`Servidor terminou: ${code}: ${log}`))
    })
  })
  browser = await chromium.launch()
  const cases = [
    { key: 'kids/vilao-em-aliado', value: 12, unit: 'months', date: '27/11/2027' },
    { key: 'kids/vilao-em-aliado', value: 6, unit: 'months', date: '27/05/2027' },
    { key: 'kids/cade-todo-mundo', value: 12, unit: 'months', date: '27/11/2027' },
    { key: 'pro/cade-todo-mundo', value: 12, unit: 'months', date: '27/11/2027' },
    { key: 'kids/desafio-primeiro-jogo', value: 30, unit: 'days', date: '27/12/2026' },
    { key: 'pro/desafio-primeiro-jogo', value: 30, unit: 'days', date: '27/12/2026' },
    { key: 'kids/desafio-primeiro-jogo', value: 6, unit: 'months', date: '27/05/2027' },
    {
      key: 'kids/como-ajudar-seu-filho-autista-nas-frustracoes',
      value: 12,
      unit: 'months',
      date: '27/11/2027',
    },
    { key: 'kids/desafio-primeiro-jogo', value: 30, unit: 'days', date: null },
  ] as const
  for (const item of cases) {
    const { id } = await repo.createLead(item.key)
    const paymentId = crypto.randomUUID()
    const snapshot: PurchasedOfferSnapshotV1 = {
      version: 1,
      offerId: crypto.randomUUID(),
      offerSlug: 'oferta-local',
      pricingMode: 'one_time',
      billingIntervalMonths: null,
      accessMode: 'fixed',
      accessDurationValue: item.value,
      accessDurationUnit: item.unit,
      listPriceCents: 6700,
      couponCode: null,
      discountCents: 0,
      chargedPriceCents: 6700,
      currency: 'BRL',
      guaranteeDays: 7,
      termsVersion: 'contratada-originalmente',
    }
    await repo.setPayment(id, paymentId, null, {
      offerRef: snapshot.offerSlug,
      offerSnapshot: snapshot,
    })
    if (item.date)
      await sql`update funil.leads set paid_at='2026-11-27T15:00:00Z' where id=${id}::uuid`
    const context = await browser.newContext()
    try {
      await context.addCookies([
        { name: 'funil_lead', value: id, url: origin },
        { name: 'sz_metrics', value: 'rejected', url: origin },
      ])
      const page = await context.newPage()
      await page.route(`${origin}/api/{events,analytics/**,leads}`, (route) =>
        route.fulfill({ status: 204 }),
      )
      const response = await page.goto(`${origin}/${item.key}/obrigado`)
      assert.equal(response?.status(), 200)
      const body = await page.locator('main').innerText()
      if (item.date) {
        assert.match(body, new RegExp(`Seu acesso vai até\\s+${item.date}`))
        assert.match(body, /12:00/)
      } else assert.match(body, /Seu prazo de acesso ainda não começou/)
      assert.doesNotMatch(
        body,
        /6 meses/,
        'Confirmação não pode reinterpretar a compra pela oferta de hoje',
      )
      console.log(`OK ${item.key}: ${item.value} ${item.unit}, ${item.date ?? 'pendente'}`)
    } finally {
      await context.close()
    }
  }
  console.log(`${cases.length} confirmações conferidas sem tráfego externo`)
} finally {
  await browser?.close()
  app.kill()
  await new Promise<void>((done) => gateway.close(() => done()))
  await sql.end()
}
