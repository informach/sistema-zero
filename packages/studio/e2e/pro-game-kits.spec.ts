import { execFile } from 'node:child_process'
import { mkdir, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { expect, test } from '@playwright/test'
import {
  buildProRuntimeBridgeScript,
  STUDIO_PRO_ARTIFACT_LIMITS,
  STUDIO_PRO_TEMPLATES,
} from '@sistemazero/core/studio'
import { serveArtifact, storeArtifact } from '../../studio-runtime/src/artifacts'
import { trustedPackageJson, trustedViteConfig } from '../../studio-runtime/src/contracts'
import { memoryArtifactBucket } from '../../studio-runtime/tests/artifact-bucket'
import { materializeTestTemplate } from '../../studio-runtime/tests/template-files'

const runtime = fileURLToPath(new URL('../../studio-runtime/runtime/', import.meta.url))
const run = (args: string[], cwd: string) =>
  new Promise<void>((resolve, reject) => {
    execFile('node', args, { cwd, timeout: 30_000 }, (error, stdout, stderr) =>
      error ? reject(new Error(stdout + stderr)) : resolve(),
    )
  })

for (const template of STUDIO_PRO_TEMPLATES.filter((value) => value.kitVersion)) {
  test(`${template.id}: isolated game starts, responds, pauses, restarts and resizes`, async ({
    page,
  }, testInfo) => {
    test.setTimeout(90_000)
    const root = await mkdtemp(join(tmpdir(), 'studio-kit-browser-'))
    const { bucket } = memoryArtifactBucket()
    const errors: string[] = []
    page.on('pageerror', (error) => errors.push(error.message))
    await page.addInitScript(() => {
      const state = window as unknown as { kitFrameCount: number }
      state.kitFrameCount = 0
      const request = window.requestAnimationFrame.bind(window)
      window.requestAnimationFrame = (callback) =>
        request((time) => {
          state.kitFrameCount++
          callback(time)
        })
    })
    try {
      const { allFiles } = await materializeTestTemplate(template.id)
      for (const [path, content] of Object.entries(allFiles)) {
        await mkdir(dirname(join(root, path)), { recursive: true })
        await writeFile(join(root, path), content)
      }
      await symlink(join(runtime, 'node_modules'), join(root, 'node_modules'), 'junction')
      await writeFile(join(root, 'package.json'), trustedPackageJson(template.id))
      await writeFile(join(root, 'vite.config.mjs'), trustedViteConfig(template.id))
      await run(
        [
          join(runtime, 'node_modules/vite/bin/vite.js'),
          'build',
          '--config',
          'vite.config.mjs',
          '--configLoader',
          'native',
        ],
        root,
      )
      await page.goto('/')
      const parentOrigin = new URL(page.url()).origin
      await writeFile(
        join(root, 'artifact-options.json'),
        JSON.stringify({ consoleBridge: buildProRuntimeBridgeScript(parentOrigin) }),
      )
      await run(
        [
          join(runtime, 'pack-artifact.mjs'),
          String(STUDIO_PRO_ARTIFACT_LIMITS.maxBytes),
          String(STUDIO_PRO_ARTIFACT_LIMITS.maxFiles),
        ],
        root,
      )
      const manifest = JSON.parse(await readFile(join(root, 'artifact-manifest.json'), 'utf8'))
      const artifact = await storeArtifact({
        bucket,
        origin: 'https://runtime.test',
        parentOrigin,
        manifest,
        read: async (path) => new Uint8Array(await readFile(join(root, 'dist', path))),
      })
      await page.route('https://runtime.test/**', async (route) => {
        const response = await serveArtifact(new Request(route.request().url()), bucket)
        await route.fulfill({
          status: response.status,
          headers: Object.fromEntries(response.headers),
          body: Buffer.from(await response.arrayBuffer()),
        })
      })
      const hostEntry = join(root, 'storage-host.ts')
      const hostBundle = join(root, 'storage-host.js')
      const hostModule = fileURLToPath(
        new URL('../src/modes/pro/proStorageHost.ts', import.meta.url),
      ).replaceAll('\\', '/')
      await writeFile(
        hostEntry,
        `import { connectProStorage } from ${JSON.stringify(hostModule)};
        let data = { ${JSON.stringify(`kit:${template.id}:v1`)}: JSON.stringify({ version: 1, best: 7, wins: 2 }) }, disconnect;
        const backend = { async load() { return structuredClone(data) }, async write(next) { data = structuredClone(next) } };
        window.addEventListener('message', event => {
          const frame = document.getElementById('game');
          const next = connectProStorage(event,{ source: frame?.contentWindow ?? null, origin: 'null', token: 'a'.repeat(32), revision: 1, backend });
          if (next) { disconnect?.(); disconnect = next }
        });`,
      )
      await new Promise<void>((resolve, reject) =>
        execFile(
          'bun',
          ['build', hostEntry, '--target=browser', '--format=esm', '--outfile', hostBundle],
          { cwd: root, timeout: 30_000 },
          (error, stdout, stderr) => (error ? reject(new Error(stdout + stderr)) : resolve()),
        ),
      )
      await page.addScriptTag({ type: 'module', content: await readFile(hostBundle, 'utf8') })
      await page.evaluate((url) => {
        document.body.replaceChildren()
        const iframe = document.createElement('iframe')
        iframe.id = 'game'
        iframe.name = JSON.stringify({ studioStorage: { token: 'a'.repeat(32), revision: 1 } })
        iframe.setAttribute('sandbox', 'allow-scripts allow-pointer-lock')
        iframe.src = url
        iframe.style.cssText = 'width:100%;height:740px;border:0'
        document.body.append(iframe)
      }, artifact.url)
      const frame = page.frameLocator('#game')
      await expect(frame.locator('#start')).toBeEnabled()
      await expect(frame.locator('canvas')).toBeVisible()
      await expect(frame.locator('#record')).toContainText('Recorde: 7 · Vitórias: 2')
      await frame.locator('body').evaluate(async () => {
        const storage = (
          window as unknown as { szGameStorage: { set(key: string, value: string): Promise<void> } }
        ).szGameStorage
        await storage.set('reload-check', '27')
        location.reload()
      })
      await expect(frame.locator('#start')).toBeEnabled()
      await expect(frame.locator('#record')).toContainText('Recorde: 7 · Vitórias: 2')
      expect(
        await frame
          .locator('body')
          .evaluate(async () =>
            (
              window as unknown as { szGameStorage: { get(key: string): Promise<string | null> } }
            ).szGameStorage.get('reload-check'),
          ),
      ).toBe('27')
      await frame.locator('#start').click()
      await expect(frame.locator('#status')).toHaveText('Partida em andamento.')
      await frame.locator('canvas').focus()
      await page.keyboard.down('ArrowRight')
      await page.waitForTimeout(300)
      await page.keyboard.up('ArrowRight')
      if (template.id === 'canvas-puzzle') {
        await page.keyboard.press('Space')
        await expect(frame.locator('#hud')).not.toHaveText('Pontos: 0 · Linhas: 0/8')
      }
      const action = frame.locator('[data-action="right"]')
      await action.dispatchEvent('pointerdown', { pointerId: 1, bubbles: true })
      await action.dispatchEvent('pointercancel', { pointerId: 1, bubbles: true })
      await frame.locator('#pause').click()
      await expect(frame.locator('#status')).toContainText('pausada')
      const pausedHud = await frame.locator('#hud').textContent()
      await frame.getByRole('button', { name: 'Efeitos: completos' }).click()
      await expect(frame.getByRole('button', { name: 'Efeitos: econômicos' })).toHaveAttribute(
        'aria-pressed',
        'true',
      )
      await expect(frame.locator('#status')).toContainText('pausada')
      await page.waitForTimeout(180)
      await expect(frame.locator('#hud')).toHaveText(pausedHud!)
      const pausedFrames = await frame
        .locator('body')
        .evaluate(() => (window as unknown as { kitFrameCount: number }).kitFrameCount)
      await page.waitForTimeout(180)
      const idleFrames = await frame
        .locator('body')
        .evaluate(() => (window as unknown as { kitFrameCount: number }).kitFrameCount)
      expect(idleFrames - pausedFrames).toBeLessThanOrEqual(1)
      await frame.locator('#start').click()
      await frame.locator('#restart').click()
      await expect(frame.locator('#status')).toHaveText('Nova partida.')
      if (template.engine === 'three') {
        await frame.locator('canvas').evaluate(async (canvas) => {
          const extension = (canvas as HTMLCanvasElement)
            .getContext('webgl2')!
            .getExtension('WEBGL_lose_context')!
          const lost = new Promise<void>((resolve) =>
            canvas.addEventListener('webglcontextlost', () => resolve(), { once: true }),
          )
          ;(window as unknown as { restoreTestContext(): void }).restoreTestContext = () =>
            extension.restoreContext()
          extension.loseContext()
          await lost
        })
        await expect(frame.locator('#status')).toContainText('interrompido')
        await frame
          .locator('body')
          .evaluate(() =>
            (window as unknown as { restoreTestContext(): void }).restoreTestContext(),
          )
        await expect(frame.locator('#status')).toContainText('Imagem recuperada')
        await frame.locator('#start').click()
        await expect(frame.locator('#status')).toHaveText('Partida em andamento.')
      }
      await page.setViewportSize({ width: 390, height: 844 })
      await expect(frame.locator('canvas')).toBeVisible()
      const overflow = await frame
        .locator('body')
        .evaluate((body) => body.scrollWidth > body.clientWidth)
      expect(overflow).toBe(false)
      const evidence = fileURLToPath(new URL('../.cache/studio-kit-screenshots/', import.meta.url))
      await mkdir(evidence, { recursive: true })
      await testInfo.attach(template.id, {
        body: await frame
          .locator('#app')
          .screenshot({ path: join(evidence, `${template.id}.png`) }),
        contentType: 'image/png',
      })
      await frame.locator('#pause').click()
      await frame
        .locator('body')
        .evaluate(() =>
          window.dispatchEvent(new PageTransitionEvent('pagehide', { persisted: false })),
        )
      await expect(frame.locator('canvas')).toHaveCount(0)
      const endedFrames = await frame
        .locator('body')
        .evaluate(() => (window as unknown as { kitFrameCount: number }).kitFrameCount)
      await page.waitForTimeout(180)
      expect(
        await frame
          .locator('body')
          .evaluate(() => (window as unknown as { kitFrameCount: number }).kitFrameCount),
      ).toBe(endedFrames)
      expect(errors).toEqual([])
      await testInfo.attach('artifact-size', {
        body: JSON.stringify(manifest),
        contentType: 'application/json',
      })
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  })
}
