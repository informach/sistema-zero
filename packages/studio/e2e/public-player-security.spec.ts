import { expect, type Page, test } from '@playwright/test'
import { createEmptyProject } from '../src/core/project'
import { renderProjectToPreviewDocAsync } from '../src/preview/renderProject'
import { createPassiveImageServer } from './helpers/passiveImageServer'

// Only the generated loopback fixture certificate is self-signed.
test.use({ ignoreHTTPSErrors: true })

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
  const server = await createPassiveImageServer()
  try {
    await page.goto('/')

    project.files['index.html'] = `<img alt="" src="${server.origin}/strict">`
    const strict = await renderProjectToPreviewDocAsync(project, { securityProfile: 'strict' })
    await mountPlayerDocument(page, strict)
    const image = page.getByTestId('public-player').contentFrame().locator('img')
    await expect(image).toHaveJSProperty('complete', true)
    await expect(image).toHaveJSProperty('naturalWidth', 0)
    expect(server.requests).toEqual([])

    project.files['index.html'] = `<img alt="" src="${server.origin}/creative">`
    const creative = await renderProjectToPreviewDocAsync(project, { securityProfile: 'creative' })
    await mountPlayerDocument(page, creative)
    await expect(image).toHaveJSProperty('naturalWidth', 1)
    expect(server.requests).toEqual(['/creative'])
  } finally {
    await server.dispose()
  }
})
