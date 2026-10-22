import { writeFile } from 'node:fs/promises'
import { expect, test } from '@playwright/test'
import type {} from '../../../experiments/studio-python-runtime/host'
import type {} from './fixtures/publicAuthor'
import { tracePythonFrameLayout } from './layout-diagnostic'

/**
 * Payload do player Python (desempenho §"Payload do player Python"): nenhum editor/analisador
 * Python, Blockly, modos de edição do Estúdio nem a seleção/sincronização de imagens do Pinta.
 * Cada termo corresponde a um chunk real do build deste fixture (`vite build` com rolldown
 * nomeia pelo módulo: blockly-*.js, BlocksMode-*.js, PintaImageSelection-*.js...). Não inclui
 * `pintaImageAsset`, a conferência dos bytes publicados, que pertence ao player.
 */
const EDITOR_PAYLOAD =
  /monaco|webcontainer|analysis-worker|python-language|ruff|blockly|BlocksMode|BridgeMode|BridgeCodeEditor|PythonSourceEditor|PythonClassicMode|PythonCodeMode|StudioEditor|AssetsPanel|PintaImageSelection|pintaImageTarget|pintaImageSync/i

test('isolated product Turtle frame has visible layout after a real CPython draw', async ({
  page,
}) => {
  await page.goto('http://127.0.0.1:5297/supervisor?distribution=1')
  await page.waitForFunction(() => !!globalThis.supervisorProbe)
  await page.evaluate(() => supervisorProbe.prepare('turtleCapture'))
  await page.waitForFunction(() =>
    supervisorProbe.events.some((event) => event.type === 'prepared'),
  )
  await page.evaluate(() => supervisorProbe.send({ type: 'run' }))
  await page.waitForFunction(() =>
    supervisorProbe.events.some(
      (event) =>
        event.type === 'event' &&
        event.event.type === 'console' &&
        event.event.text.includes('capture-ready'),
    ),
  )
  await expect(page.frameLocator('iframe').locator('canvas')).toBeVisible()
  await page.evaluate(() => supervisorProbe.destroy())
})

for (const kind of ['classic', 'pro'] as const)
  test(`published Python ${kind} runs anonymously and supports update, rollback and disable`, async ({
    page,
    browser,
  }, testInfo) => {
    test.setTimeout(120_000)
    await page.goto('/')
    await page.waitForFunction(() => !!globalThis.studioPublicAuthorProbe)
    await page.evaluate((kind) => studioPublicAuthorProbe.create(kind), kind)
    const first =
      'print("Pensei num número.")\nn = input("Seu palpite")\nprint("Você ganhou!", n)\n'
    await page.evaluate((source) => studioPublicAuthorProbe.source(source), first)
    await page.getByRole('button', { name: 'Usar a capa da aventura' }).click()
    await page.getByRole('button', { name: 'Publicar', exact: true }).click()
    await expect(page.getByRole('button', { name: 'Copiar link', exact: true })).toBeVisible()
    const playId = await page.evaluate(() => studioPublicAuthorProbe.playId())
    expect(playId).toBeTruthy()
    const anonymous = await browser.newContext()
    try {
      const player = await anonymous.newPage()
      const requests: string[] = []
      player.on('request', (request) => requests.push(request.url()))
      const began = Date.now()
      await player.goto(`http://127.0.0.1:5298/public.html?playId=${playId}`)
      await expect(player.getByRole('log', { name: 'Saída do jogo' })).toContainText(
        'Pensei num número.',
        { timeout: 30_000 },
      )
      await testInfo.attach('public-first-output-ms', {
        body: JSON.stringify({
          milliseconds: Date.now() - began,
          qualification: 'functional-only',
        }),
        contentType: 'application/json',
      })

      await expect(player.getByRole('log')).toContainText('Seu palpite')
      await player.getByRole('textbox', { name: 'Sua resposta' }).fill('42')
      await player.getByRole('button', { name: 'Enviar', exact: true }).click()
      await expect(player.getByRole('log')).toContainText('Você ganhou! 42')
      expect(await anonymous.cookies()).toEqual([])
      expect(requests.filter((url) => EDITOR_PAYLOAD.test(url))).toEqual([])
      // R09: the page names the published profile from the document it already downloaded.
      await expect(player.locator('[data-runtime-profile]')).toContainText(
        kind === 'pro' ? 'Python Pro' : 'Python Clássico',
      )
      const second = 'print("Versão nova")\n'
      await page.evaluate((source) => studioPublicAuthorProbe.source(source), second)
      await player.reload()
      await expect(player.getByRole('log')).toContainText('Pensei num número.', { timeout: 30_000 })
      await page.getByRole('button', { name: 'Fechar', exact: true }).click()
      await page.getByRole('button', { name: 'Compartilhar meu projeto' }).click()
      await page.getByRole('button', { name: 'Publicar versão atual neste link' }).click()
      await expect(page.getByText(/Versão 2/)).toBeVisible()
      await player.reload()
      await expect(player.getByRole('log')).toHaveText('Versão nova\n', { timeout: 30_000 })
      await page.getByRole('button', { name: 'Restaurar no link' }).click()
      await expect(page.getByText(/Versão 1.*atual/)).toBeVisible()
      await player.reload()
      await expect(player.getByRole('log')).toContainText('Pensei num número.', { timeout: 30_000 })
      await page.getByRole('button', { name: 'Desativar link' }).click()
      await expect(page.getByText('Link desativado', { exact: true })).toBeVisible()
      await player.reload()
      await expect(player.getByText('Não encontramos este jogo.', { exact: true })).toBeVisible()
      await expect(player.locator('iframe')).toHaveCount(0)
      expect(await page.evaluate(() => studioPublicAuthorProbe.project())).toMatchObject({
        programmingLanguage: 'python',
        kind,
      })
    } finally {
      await anonymous.close()
    }
  })

for (const kind of ['classic', 'pro'] as const)
  test(`published Turtle ${kind} preserves a Pinta PNG and responds to keyboard, public controls and screenshots`, async ({
    page,
    browser,
    request,
  }, testInfo) => {
    test.setTimeout(90_000)
    await page.goto('/')
    await page.waitForFunction(() => !!globalThis.studioPublicAuthorProbe)
    await page.evaluate((kind) => studioPublicAuthorProbe.create(kind, true), kind)
    const path = await page.evaluate(() => studioPublicAuthorProbe.pintaAsset())
    expect(path).toBe('assets/heroi.png')
    const source = `import turtle\ns = turtle.Screen()\ns.setup(400, 300)\ns.tracer(0)\ns.bgcolor("white")\ns.register_shape("${path}")\nt = turtle.Turtle()\nt.shape("${path}")\nt.stamp()\nt.shape("square")\nt.color("red")\nt.penup()\ndef move():\n    t.forward(10)\n    s.update()\n    print("move", t.xcor())\ns.onkeypress(move, "Right")\ns.listen()\ns.update()\nprint("pinta-ready")\ns.mainloop()\n`
    await page.evaluate((source) => studioPublicAuthorProbe.source(source), source)
    await page.getByRole('button', { name: 'Usar a capa da aventura' }).click()
    await page.getByRole('button', { name: 'Publicar', exact: true }).click()
    await expect(page.getByRole('button', { name: 'Copiar link', exact: true })).toBeVisible()
    const playId = await page.evaluate(() => studioPublicAuthorProbe.playId())
    const snapshot = await (await request.get(`/api/studio/play/${playId}`)).json()
    expect(snapshot.assets).toHaveLength(1)
    expect(snapshot.assets[0].dataUrl).toContain('data:image/png;base64,')
    expect(snapshot.assets[0].proPath).toBe(path)
    expect(snapshot.assets[0]).not.toHaveProperty('libId')
    expect(snapshot.assets[0]).not.toHaveProperty('libOrigin')
    const anonymous = await browser.newContext()
    // A real digest can finish after the newly mounted frame's initial document loads.
    // Exercise that ordering without changing the digest or the product's runtime policy.
    await anonymous.addInitScript(() => {
      if (window !== top) return
      const digest = crypto.subtle.digest.bind(crypto.subtle)
      let delayed = false
      crypto.subtle.digest = async (algorithm, data) => {
        const result = digest(algorithm, data)
        if (!delayed && document.querySelector('iframe')) {
          delayed = true
          await new Promise<void>((resolve) => setTimeout(resolve, 100))
          document.documentElement.dataset.runtimePreparationDelayed = 'yes'
        }
        return result
      }
    })
    let finishTrace = async () => {}
    try {
      const player = await anonymous.newPage()
      const requests: string[] = []
      player.on('request', (request) => requests.push(request.url()))
      finishTrace = await tracePythonFrameLayout(player, testInfo)
      await player.goto(`http://127.0.0.1:5298/public.html?playId=${playId}`)
      await expect(player.getByRole('log')).toContainText('pinta-ready', { timeout: 30_000 })
      await expect(player.locator('html')).toHaveAttribute(
        'data-runtime-preparation-delayed',
        'yes',
      )
      const game = player.frameLocator('iframe')
      try {
        await expect(game.locator('canvas')).toBeVisible()
      } finally {
        const host = await player.locator('iframe').evaluate((frame) => {
          const ancestors = []
          for (let element: Element | null = frame; element; element = element.parentElement) {
            const style = getComputedStyle(element)
            ancestors.push({
              tag: element.tagName,
              class: element.className,
              width: element.clientWidth,
              height: element.clientHeight,
              bounds: element.getBoundingClientRect().toJSON(),
              cssHeight: style.height,
              display: style.display,
              flex: style.flex,
              connected: element.isConnected,
              contentVisibility: style.contentVisibility,
              aspectRatio: style.aspectRatio,
            })
          }
          return ancestors
        })
        const runtime = await game.locator('canvas').evaluate((canvas) => {
          const ancestors = []
          for (let element: Element | null = canvas; element; element = element.parentElement) {
            const style = getComputedStyle(element)
            ancestors.push({
              tag: element.tagName,
              width: element.clientWidth,
              height: element.clientHeight,
              bounds: element.getBoundingClientRect().toJSON(),
              cssText: element.getAttribute('style'),
              cssWidth: style.width,
              cssHeight: style.height,
              maxWidth: style.maxWidth,
              maxHeight: style.maxHeight,
              display: style.display,
              visibility: style.visibility,
              contentVisibility: style.contentVisibility,
              namespace: element.namespaceURI,
              flex: style.flex,
            })
          }
          return {
            viewport: [innerWidth, innerHeight],
            ancestors,
            document: {
              readyState: document.readyState,
              visibility: document.visibilityState,
              focused: document.hasFocus(),
              canvasInDocument: document.documentElement.contains(canvas),
              sameDocument: canvas.ownerDocument === document,
              bodyIsParent: canvas.parentElement === document.body,
              rootBounds: document.documentElement.getBoundingClientRect().toJSON(),
              contentType: document.contentType,
              url: document.URL,
              defaultViewCurrent: document.defaultView?.document === document,
              prerendering: 'prerendering' in document ? document.prerendering : null,
              fonts: document.fonts.status,
              root: document.documentElement.outerHTML.slice(0, 4000),
            },
          }
        })
        const geometry = JSON.stringify({ host, runtime })
        const path = testInfo.outputPath('public-stage-geometry.json')
        await writeFile(path, geometry)
        await testInfo.attach('public-stage-geometry', { contentType: 'application/json', path })
        if (runtime.ancestors[0]?.bounds.width === 0) {
          const child = player.frames().find((frame) => frame.parentFrame() === player.mainFrame())
          if (child) {
            const diagnostic = await player.context().newCDPSession(child)
            try {
              const frameTree = await diagnostic.send('Page.getFrameTree')
              const metrics = await diagnostic.send('Page.getLayoutMetrics')
              const layout = await diagnostic.send('DOMSnapshot.captureSnapshot', {
                computedStyles: ['display', 'visibility', 'content-visibility'],
                includeDOMRects: true,
                includePaintOrder: true,
              })
              const path = testInfo.outputPath('public-stage-layout.json')
              await writeFile(path, JSON.stringify({ layout, frameTree, metrics }))
              await testInfo.attach('public-stage-layout', {
                contentType: 'application/json',
                path,
              })
              await player.bringToFront()
              const afterFocus = await game
                .locator('canvas')
                .evaluate((canvas) => canvas.getBoundingClientRect().toJSON())
              await player.screenshot({ path: testInfo.outputPath('public-stage-failed.png') })
              const afterScreenshot = await game
                .locator('canvas')
                .evaluate((canvas) => canvas.getBoundingClientRect().toJSON())
              await writeFile(
                testInfo.outputPath('public-stage-after-diagnostic.json'),
                JSON.stringify({ afterFocus, afterScreenshot }),
              )
            } finally {
              await diagnostic.detach()
            }
          }
        }
      }
      await game.locator('canvas').click({ position: { x: 100, y: 80 } })
      await player.keyboard.press('ArrowRight')
      await expect(player.getByRole('log')).toContainText('move 10')
      await player.getByRole('button', { name: 'Mostrar controles', exact: true }).click()
      const directional = player.getByRole('group', { name: 'Direcional', exact: true })
      const bounds = await directional.boundingBox()
      if (!bounds) throw new Error('Public directional controls are not visible')
      // Pointer input belongs to the whole pad; its child buttons provide keyboard access.
      await directional.click({ position: { x: bounds.width - 10, y: bounds.height / 2 } })
      await expect(player.getByRole('log')).toContainText('move 20')
      const image = await player.evaluate(
        () =>
          new Promise<string>((resolve, reject) => {
            const frame = document.querySelector('iframe')!
            const timer = setTimeout(() => {
              window.removeEventListener('message', receive)
              reject(new Error('Screenshot timed out'))
            }, 10_000)
            function receive(event: MessageEvent) {
              if (
                event.source !== frame.contentWindow ||
                event.data?.type !== 'sz:screenshot:result'
              )
                return
              clearTimeout(timer)
              window.removeEventListener('message', receive)
              resolve(event.data.dataUrl)
            }
            window.addEventListener('message', receive)
            frame.contentWindow!.postMessage({ type: 'sz:screenshot' }, '*')
          }),
      )
      expect(image).toMatch(/^data:image\/png;base64,/)
      expect(requests.filter((url) => EDITOR_PAYLOAD.test(url))).toEqual([])
      await request.post(`/public-probe/hide?playId=${playId}`)
      await player.reload()
      await expect(player.getByText('Não encontramos este jogo.', { exact: true })).toBeVisible()
      await expect(player.locator('iframe')).toHaveCount(0)
    } finally {
      await finishTrace()
      await anonymous.close()
    }
  })
