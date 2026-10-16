import { chromium } from 'playwright-core'

const browser = await chromium.launch({ chromiumSandbox: true, headless: true, timeout: 15000 })
try {
  const page = await browser.newPage()
  await page.setContent('<h1>Fixture</h1>')
  console.log(await page.title(), await page.locator('h1').innerText())
} finally {
  await browser.close()
}
