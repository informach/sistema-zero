import { expect, test } from '@playwright/test'
import {
  configurePreviewInputDiagnostics,
  pendingPreviewInputs,
  pressObservedPreviewKey,
} from './helpers/previewInputDiagnostics'

configurePreviewInputDiagnostics()
test.use({ channel: 'chromium' })

test('document observer records a bounded source transition without changing it', async ({
  page,
}) => {
  test.skip(process.env.STUDIO_INPUT_DIAGNOSTICS !== '1', 'Opt-in diagnostic control')
  await page.route('http://127.0.0.1:19992/', (route) =>
    route.fulfill({
      contentType: 'text/html; charset=utf-8',
      body: '<iframe title="Pré-visualização" srcdoc="prefix-initial-suffix"></iframe>',
    }),
  )
  await page.goto('http://127.0.0.1:19992/')
  const frame = page.locator('iframe')
  const replacement = `prefix-${'x'.repeat(2000)}-suffix`
  await frame.evaluate((node, source) => {
    if (!(node instanceof HTMLIFrameElement)) throw new Error('Expected the preview iframe')
    node.srcdoc = source
  }, replacement)
  await expect
    .poll(() =>
      page.evaluate(() => {
        const records = Reflect.get(window, 'sz-e2e-preview-input') as Array<
          Record<string, unknown>
        >
        return records.filter((record) => record.type === 'preview-document').length
      }),
    )
    .toBe(2)
  const events = (await page.evaluate(() => Reflect.get(window, 'sz-e2e-preview-input'))) as Array<
    Record<string, unknown>
  >
  expect(events.filter((record) => record.type === 'preview-document').at(-1)).toMatchObject({
    previousBytes: 'prefix-initial-suffix'.length,
    bytes: replacement.length,
    start: 7,
    removed: 'initial',
    inserted: 'x'.repeat(1024),
  })
  await expect(frame).toHaveAttribute('srcdoc', replacement)
})

test('input observer records a native key waiting on synchronous game work', async ({ page }) => {
  test.skip(
    process.env.STUDIO_INPUT_DIAGNOSTICS !== '1',
    'Opt-in diagnostic control, not game qualification',
  )
  const child = `<button>Foco do jogo</button><script>
  addEventListener('keydown', event => {
    if (event.key !== 'a') return;
    const values = Array.from({length:300000}, (_, i) => (i * 7919) % 10007);
    const end = performance.now() + 8000;
    while (performance.now() < end) values.slice().sort((a,b) => a-b);
    document.body.dataset.finished = 'yes';
  });
  </script>`
  const shell = `<body><script>
    const frame=document.createElement('iframe');
    frame.title='Trabalho síncrono';
    frame.sandbox='allow-scripts';
    frame.srcdoc=${JSON.stringify(child).replaceAll('<', '\\u003c')};
    document.body.append(frame);
  </script>`
  const headers = {
    'Cross-Origin-Opener-Policy': 'same-origin',
    'Cross-Origin-Embedder-Policy': 'credentialless',
    'Cross-Origin-Resource-Policy': 'cross-origin',
  }
  await page.route('http://localhost:19991/shell', (route) =>
    route.fulfill({ contentType: 'text/html', body: shell, headers }),
  )
  await page.route('http://127.0.0.1:19991/', (route) =>
    route.fulfill({
      contentType: 'text/html',
      body: '<body><p>Editor de controle</p><iframe title="Casca" src="http://localhost:19991/shell"></iframe>',
      headers,
    }),
  )
  await page.goto('http://127.0.0.1:19991/')
  const frame = page.frameLocator('iframe[title="Casca"]').frameLocator('iframe')
  await frame.getByRole('button', { name: 'Foco do jogo' }).click()
  await pressObservedPreviewKey(page, 'a')
  await expect(frame.locator('body')).toHaveAttribute('data-finished', 'yes')
  const probes = pendingPreviewInputs(page)
  expect(probes).toHaveLength(1)
  const frames = probes.flatMap((probe) => probe.frames)
  expect(frames.find((target) => target.url === 'http://127.0.0.1:19991/')?.state).toMatchObject({
    ready: 'complete',
    isolated: true,
  })
  expect(frames.find((target) => target.url === 'about:srcdoc')?.error).toBe(
    'Document did not answer',
  )
})

test('document observer distinguishes program text from its changed CSP hash', async ({ page }) => {
  test.skip(process.env.STUDIO_INPUT_DIAGNOSTICS !== '1', 'Opt-in diagnostic control')
  const program = (value: number) =>
    Buffer.from(`const value = ${value}; // ação`).toString('base64')
  const initial = `<meta http-equiv="Content-Security-Policy" content="script-src 'none'"><script src="data:text/javascript;base64,${program(1)}"></script>`
  const replacement = `<meta http-equiv="Content-Security-Policy" content="script-src 'none'; img-src 'none'"><script src="data:text/javascript;base64,${program(2)}"></script>`
  await page.route('http://127.0.0.1:19993/', (route) =>
    route.fulfill({
      contentType: 'text/html; charset=utf-8',
      body: `<iframe title="Pré-visualização" srcdoc="${initial.replaceAll('&', '&amp;').replaceAll('"', '&quot;')}"></iframe>`,
    }),
  )
  await page.goto('http://127.0.0.1:19993/')
  await page.locator('iframe').evaluate((node, source) => {
    if (!(node instanceof HTMLIFrameElement)) throw new Error('Expected the preview iframe')
    node.srcdoc = source
  }, replacement)
  await expect
    .poll(() =>
      page.evaluate(() => {
        const records = Reflect.get(window, 'sz-e2e-preview-input') as Array<
          Record<string, unknown>
        >
        return records.filter((record) => record.type === 'preview-document').at(-1)?.sourceChange
      }),
    )
    .toMatchObject({ removed: '1', inserted: '2' })
  await expect(page.locator('iframe')).toHaveAttribute('srcdoc', replacement)
})
