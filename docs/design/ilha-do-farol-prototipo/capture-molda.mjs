import { writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

const { chromium } = createRequire(resolve('packages/molda/package.json'))('@playwright/test')
const browser = await chromium.launch({ channel: 'chrome', headless: true })
try {
  const page = await browser.newPage(),
    errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  await page.goto(pathToFileURL(resolve('.cache/ilha-do-farol/capture-molda.html')).href)
  await page.waitForFunction(() => !!window.moldaCapture, {}, { timeout: 10000 })
  if (errors.length) throw new Error(errors.join('\n'))
  await writeFile(
    '.cache/ilha-do-farol/molda-capture.json',
    JSON.stringify(await page.evaluate(() => window.moldaCapture)),
  )
} finally {
  await browser.close()
}
