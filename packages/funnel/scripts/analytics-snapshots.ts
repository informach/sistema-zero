/** Run after deployment and periodically in a separate worker with Chromium installed. */
import { createHash } from 'node:crypto'
import { sql } from 'drizzle-orm'
import { chromium } from 'playwright'
import { analyticsPage } from '../src/analytics/page-context'
import { closeDb, getDb } from '../src/db/client'
import { analyticsSnapshots } from '../src/db/schema'
import { FUNNELS } from '../src/funnels/registry'

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
const browser = await chromium.launch(
  process.env.ANALYTICS_BROWSER_CHANNEL ? { channel: process.env.ANALYTICS_BROWSER_CHANNEL } : {},
)
try {
  // Only the latest observed revision per width can still be captured from the live site.
  const rows =
    await db.execute(sql`with latest as (select distinct on (page,viewport) page,viewport,revision,received_at from funil.analytics_events
    where received_at > now() - interval '7 days' and viewport between 240 and 3840
      and session_id in (select id from funil.analytics_sessions where environment=${process.env.NODE_ENV === 'production' ? 'production' : 'development'})
    order by page,viewport,received_at desc)
    select l.* from latest l where not exists(select 1 from funil.analytics_snapshots s where s.page=l.page and s.revision=l.revision and s.viewport=l.viewport)
    order by l.received_at desc limit 80`)
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
  for (const job of jobs.values()) {
    const context = await browser.newContext({
      viewport: { width: job.width, height: 850 },
      deviceScaleFactor: 1,
      reducedMotion: 'reduce',
    })
    try {
      // Fresh browser: no visitor/admin cookies, no submitted forms, no tracking or lead creation.
      await context.route('**/api/**', (route) =>
        route.request().method() === 'GET' ? route.continue() : route.abort(),
      )
      const page = await context.newPage()
      const response = await page.goto(new URL(job.page, base).href, {
        waitUntil: 'networkidle',
        timeout: 30000,
      })
      if (
        !response?.ok() ||
        new URL(page.url()).origin !== base.origin ||
        !analyticsPage(new URL(page.url()).pathname)?.publicText
      ) {
        console.log(`Capture unavailable: ${job.page} HTTP ${response?.status() ?? 'unknown'}`)
        continue
      }
      await page.waitForFunction(
        () => typeof window.__szAnalyticsSnapshot === 'function',
        undefined,
        { timeout: 10000 },
      )
      await page.evaluate(async () => {
        await document.fonts.ready
        for (const img of Array.from(document.images)) img.loading = 'eager'
        await Promise.all(Array.from(document.images).map((img) => img.decode().catch(() => {})))
      })
      const before = await page.evaluate(() => window.__szAnalyticsSnapshot!())
      if (before.height > 40000) {
        console.log(`Skipped oversized page: ${job.page}`)
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
          mask: [page.locator('input,textarea,select,[contenteditable]')],
        })
        if (image.length <= 1500000) break
      }
      const after = await page.evaluate(() => window.__szAnalyticsSnapshot!())
      if (
        image.length > 1500000 ||
        before.revision !== after.revision ||
        before.height !== after.height
      ) {
        console.log(`Skipped unstable/oversized capture: ${job.page}`)
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
      console.error(`Capture failed: ${job.page}`, error instanceof Error ? error.name : 'error')
    } finally {
      await context.close()
    }
  }
  console.log(`Snapshots saved: ${captured}`)
} finally {
  await browser.close()
  await closeDb()
}
