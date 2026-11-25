import { readFile, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'

const [workerPath, reportPath] = process.argv.slice(2)
const require = createRequire(import.meta.url)
const { Miniflare, convertV4MiniflareOptions } = createRequire(
  require.resolve('wrangler/package.json'),
)('miniflare')
const mf = new Miniflare(
  convertV4MiniflareOptions({
    modules: true,
    script: await readFile(workerPath, 'utf8'),
    compatibilityDate: '2026-07-01',
    compatibilityFlags: ['nodejs_compat'],
    r2Buckets: ['QA_BUCKET'],
  }),
)
const report = { status: null, value: null, cleanupConfirmed: false }
try {
  const response = await mf.dispatchFetch('http://native-r2.test')
  report.status = response.status
  report.value = await response.json()
} finally {
  await mf.dispose()
  report.cleanupConfirmed = true
  await writeFile(reportPath, JSON.stringify(report))
}
