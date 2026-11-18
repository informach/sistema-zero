import { expect, type Page, test } from '@playwright/test'
import { createEmptyProject } from '../src/core/project'
import { renderProjectToPreviewDocAsync } from '../src/preview/renderProject'

async function mountPlayerDocument(page: Page, html: string): Promise<void> {
  await page.evaluate((srcdoc) => {
    document.querySelectorAll('iframe[data-testid="public-player"]').forEach((old) => {
      old.remove()
    })
    const frame = document.createElement('iframe')
    frame.dataset.testid = 'public-player'
    frame.setAttribute('sandbox', 'allow-scripts')
    frame.style.cssText = 'position:fixed;inset:0;width:640px;height:480px;z-index:1000'
    frame.srcdoc = srcdoc
    document.body.appendChild(frame)
  }, html)
}

test('player público estrito bloqueia GET passivo; perfil criativo é opt-in real', async ({
  page,
}) => {
  const project = createEmptyProject('security-profile', 'Segurança')
  let requests = 0
  await page.route('https://evil.test/**', async (route) => {
    requests++
    await route.fulfill({
      status: 200,
      contentType: 'image/gif',
      body: Buffer.from('R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==', 'base64'),
    })
  })
  await page.goto('/')

  project.files['index.html'] = '<img alt="" src="https://evil.test/strict">'
  const strict = await renderProjectToPreviewDocAsync(project, { securityProfile: 'strict' })
  await mountPlayerDocument(page, strict)
  await page.waitForTimeout(400)
  expect(requests).toBe(0)

  project.files['index.html'] = '<img alt="" src="https://evil.test/creative">'
  const creative = await renderProjectToPreviewDocAsync(project, { securityProfile: 'creative' })
  await mountPlayerDocument(page, creative)
  await expect.poll(() => requests).toBe(1)
})
