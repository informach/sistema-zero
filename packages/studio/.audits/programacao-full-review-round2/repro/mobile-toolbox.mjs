import { chromium } from '@playwright/test'

const baseURL = process.env.STUDIO_AUDIT_URL ?? 'http://127.0.0.1:5197'
const browser = await chromium.launch({ headless: true })
const page = await browser.newPage({ viewport: { width: 375, height: 812 } })

try {
  await page.goto(baseURL)
  await page.getByRole('button', { name: '+ Novo projeto' }).first().click()
  await page.getByRole('button', { name: 'Criar e abrir' }).click()
  await page.getByRole('treeitem', { name: 'Programação', exact: true }).click()
  await page.getByRole('treeitem', { name: '⚡ Eventos', exact: true }).click()
  await page.waitForTimeout(1_000)

  const metrics = await page.evaluate(() => {
    const dimensions = (element) => {
      if (!element) return null
      const rect = element.getBoundingClientRect()
      return {
        x: rect.x,
        y: rect.y,
        width: rect.width,
        height: rect.height,
        clientHeight: element.clientHeight,
        scrollHeight: element.scrollHeight,
        overflow: getComputedStyle(element).overflow,
      }
    }

    const flyout = document.querySelector('.blocklyToolboxFlyout')
    return {
      viewport: { width: innerWidth, height: innerHeight },
      injection: dimensions(document.querySelector('.injectionDiv')),
      toolbox: dimensions(document.querySelector('.blocklyToolbox')),
      flyout: dimensions(flyout),
      blocks: flyout?.querySelectorAll('.blocklyDraggable').length ?? 0,
    }
  })

  console.log(JSON.stringify(metrics, null, 2))
} finally {
  await browser.close()
}
