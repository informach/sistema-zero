import { expect, test } from '@playwright/test'
import {
  configurePreviewInputDiagnostics,
  pendingPreviewInputs,
  pressObservedPreviewKey,
} from './helpers/previewInputDiagnostics'

configurePreviewInputDiagnostics()
test.use({ channel: 'chromium' })

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
