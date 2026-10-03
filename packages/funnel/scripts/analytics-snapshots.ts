/** Run after deployment and periodically in a separate worker with Chromium installed. */
import { createHash } from 'node:crypto'
import { sql } from 'drizzle-orm'
import { type Browser, chromium } from 'playwright'
import postgres from 'postgres'
import { analyticsPage } from '../src/analytics/page-context'
import { closeDb, getDb } from '../src/db/client'
import { analyticsSnapshots } from '../src/db/schema'
import { FUNNELS } from '../src/funnels/registry'
import { getEnv } from '../src/lib/env'

const base = new URL(
  process.env.ANALYTICS_CAPTURE_URL || process.env.FUNNEL_PUBLIC_URL || 'http://localhost:4321',
)
if (
  !['http:', 'https:'].includes(base.protocol) ||
  base.username ||
  base.password ||
  base.search ||
  base.hash
)
  throw new Error('Invalid capture base URL')
const db = getDb()
// A dedicated connection owns the lock for the whole run, without holding a transaction open.
const lock = postgres(getEnv().DATABASE_URL, { max: 1, connect_timeout: 10 })
const [claim] = await lock`select pg_try_advisory_lock(47713920114419) as acquired`
if (!claim?.acquired) {
  await lock.end()
  await closeDb()
  console.log('Snapshot worker already running')
  process.exit(0)
}
const deadline = Date.now() + 10 * 60000
let failed = 0
let browser: Browser | undefined
try {
  browser = await chromium.launch(
    process.env.ANALYTICS_BROWSER_CHANNEL ? { channel: process.env.ANALYTICS_BROWSER_CHANNEL } : {},
  )
  // Only the latest observed revision per width can still be captured from the live site.
  const rows =
    await db.execute(sql`with latest as (select distinct on (page,viewport) page,viewport,revision,received_at from funil.analytics_events
    where received_at > now() - interval '7 days' and viewport between 240 and 3840
      and session_id in (select id from funil.analytics_sessions where environment=${process.env.NODE_ENV === 'production' ? 'production' : 'development'})
    order by page,viewport,received_at desc)
    select l.* from latest l where not exists(select 1 from funil.analytics_snapshots s where s.page=l.page and s.revision=l.revision and s.viewport=l.viewport)
    order by l.received_at desc limit 40`)
  const jobs = new Map<string, { page: string; width: number; expected?: string }>()
  for (const row of rows)
    if (analyticsPage(String(row.page))?.publicText)
      jobs.set(`${row.page}:${row.viewport}`, {
        page: String(row.page),
        width: Number(row.viewport),
        expected: String(row.revision),
      })
  for (const path of [
    '/',
    '/como-funciona',
    ...Object.values(FUNNELS).map((f) => `${f.basePath}/oferta`),
  ])
    for (const width of [390, 1280])
      if (!jobs.has(`${path}:${width}`)) jobs.set(`${path}:${width}`, { page: path, width })
  let captured = 0
  const onlyPage = process.argv.find((arg) => arg.startsWith('--page='))?.slice(7)
  const onlyWidth = process.argv.find((arg) => arg.startsWith('--width='))?.slice(8)
  if (onlyPage && !analyticsPage(onlyPage)?.publicText)
    throw new Error('Invalid public capture page')
  if (
    onlyWidth &&
    (!/^\d+$/.test(onlyWidth) || Number(onlyWidth) < 240 || Number(onlyWidth) > 3840)
  )
    throw new Error('Invalid capture width')
  if (onlyPage && onlyWidth)
    jobs.set(`${onlyPage}:${onlyWidth}`, {
      page: analyticsPage(onlyPage)!.path,
      width: Number(onlyWidth),
    })
  for (const job of jobs.values()) {
    if (onlyPage && job.page !== analyticsPage(onlyPage)!.path) continue
    if (onlyWidth && job.width !== Number(onlyWidth)) continue
    if (Date.now() >= deadline) {
      failed++
      console.error('Snapshot run reached its 10 minute budget; remaining jobs will retry next run')
      break
    }
    const context = await browser.newContext({
      viewport: { width: job.width, height: 850 },
      deviceScaleFactor: 1,
      reducedMotion: 'reduce',
      locale: 'pt-BR',
      timezoneId: 'America/Sao_Paulo',
    })
    const watchdog = setTimeout(() => {
      void context.close().catch(() => {})
    }, 45000)
    try {
      // Fresh browser: no visitor/admin cookies, no submitted forms, no tracking or lead creation.
      await context.route('**/api/**', (route) =>
        route.request().method() === 'GET' ? route.continue() : route.abort(),
      )
      const page = await context.newPage()
      const response = await page.goto(new URL(job.page, base).href, {
        waitUntil: 'domcontentloaded',
        timeout: 30000,
      })
      if (
        !response?.ok() ||
        new URL(page.url()).origin !== base.origin ||
        !analyticsPage(new URL(page.url()).pathname)?.publicText
      ) {
        console.log(`Capture unavailable: ${job.page} HTTP ${response?.status() ?? 'unknown'}`)
        failed++
        continue
      }
      await page.waitForFunction(
        () => typeof window.__szAnalyticsSnapshot === 'function',
        undefined,
        { timeout: 10000 },
      )
      await page.evaluate(async () => {
        for (const img of Array.from(document.images)) img.loading = 'eager'
        await Promise.race([
          Promise.all([
            document.fonts.ready,
            ...Array.from(document.images).map((img) => img.decode().catch(() => {})),
          ]),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Capture resources timeout')), 10000),
          ),
        ])
      })
      await page.addStyleTag({
        content:
          '*, *::before, *::after { animation: none !important; transition: none !important; content-visibility:visible!important; contain-intrinsic-size:none!important } #sz-metrics-controls, astro-dev-toolbar { visibility:hidden!important }',
      })
      const before = await page.evaluate(() => window.__szAnalyticsSnapshot!())
      if (before.height > 40000) {
        console.log(`Skipped oversized page: ${job.page}`)
        failed++
        continue
      }
      // Capture the actual published revision; never label a new page with an old requested ID.
      if (job.expected && before.revision !== job.expected)
        console.log(`Historical print unavailable: ${job.page} ${job.expected.slice(0, 8)}`)
      const id = createHash('sha256')
        .update(`${job.page}:${before.revision}:${before.viewport}`)
        .digest('hex')
      const exists = await db.execute(sql`select id from funil.analytics_snapshots where id=${id}`)
      if (exists.length && !process.argv.includes('--refresh')) continue
      let image = Buffer.alloc(0)
      for (const quality of [65, 45, 30]) {
        image = await page.screenshot({
          fullPage: true,
          type: 'jpeg',
          quality,
          animations: 'disabled',
          style: '#sz-metrics-controls, astro-dev-toolbar { visibility:hidden!important }',
          mask: [
            page.locator(
              'form,input,textarea,select,[contenteditable],[data-analytics-private]:not(#sz-metrics-controls),dialog,[role="dialog"]',
            ),
          ],
          timeout: 15000,
        })
        if (image.length <= 1500000) break
      }
      const after = await page.evaluate(() => window.__szAnalyticsSnapshot!())
      if (
        image.length > 1500000 ||
        before.revision !== after.revision ||
        before.height !== after.height ||
        JSON.stringify(before.elements) !== JSON.stringify(after.elements)
      ) {
        console.log(`Skipped unstable/oversized capture: ${job.page}`)
        failed++
        continue
      }
      await db
        .insert(analyticsSnapshots)
        .values({ id, page: job.page, ...after, image: image.toString('base64') })
        .onConflictDoUpdate({
          target: analyticsSnapshots.id,
          set: { image: image.toString('base64'), elements: after.elements, height: after.height },
        })
      captured++
      console.log(
        `Captured ${job.page} ${job.width}px ${after.revision.slice(0, 8)} (${image.length} bytes)`,
      )
    } catch (error) {
      failed++
      console.error(`Capture failed: ${job.page}`, error instanceof Error ? error.name : 'error')
    } finally {
      clearTimeout(watchdog)
      await context.close()
    }
  }
  console.log(`Snapshots saved: ${captured}; failed: ${failed}`)
  if (failed) process.exitCode = 1
} finally {
  await browser?.close()
  await lock.end({ timeout: 5 }) // closing releases the session-level advisory lock
  await closeDb()
}
