import { execFile } from 'node:child_process'
import { mkdir, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { expect, test } from '@playwright/test'
import { STUDIO_PRO_ARTIFACT_LIMITS } from '@sistemazero/core/studio'
import { serveArtifact, storeArtifact } from '../../studio-runtime/src/artifacts'
import { trustedViteConfig } from '../../studio-runtime/src/contracts'
import { memoryArtifactBucket } from '../../studio-runtime/tests/artifact-bucket'
import { createEmptyProject } from '../src/core/project'
import { buildProFileMap } from '../src/export/fileMap'
import { convertClassicToProTree } from '../src/state/convertToPro'

const runtime = fileURLToPath(new URL('../../studio-runtime/runtime/', import.meta.url))
const run = (args: string[], cwd: string) =>
  new Promise<void>((resolve, reject) => {
    execFile('node', args, { cwd, timeout: 30_000 }, (error, stdout, stderr) =>
      error ? reject(new Error(stdout + stderr)) : resolve(),
    )
  })

for (const three of [false, true]) {
  test(`conversion preserves global functions, script order and HTML events${three ? ' after Three bootstrap' : ''}`, async ({
    page,
  }) => {
    const root = await mkdtemp(join(tmpdir(), 'studio-conversion-browser-'))
    const errors: string[] = []
    page.on('pageerror', (error) => errors.push(error.message))
    try {
      const source = createEmptyProject('source', 'Global')
      source.files['index.html'] =
        `<!doctype html><html><head><script>window.order = ['head']</script></head><body>
        <button id="action" onclick="increment()">Somar</button><output id="value">0</output>
        <script src="script.js"></script><script>window.order.push('inline')</script>
      </body></html>`
      source.files['script.js'] = `var counter = 0;
        function increment() { document.getElementById('value').textContent = String(++counter); }
        window.order.push('game'); window.globalThisMatches = this === window;
        document.body.dataset.script = document.currentScript.getAttribute('src');
        ${three ? 'document.body.dataset.three = typeof window.SZGame3D;' : ''}`
      if (three) source.installedExtensions = [{ id: 'game-3d', version: '1.0.0', installedAt: 0 }]
      const tree = await convertClassicToProTree(source)
      const { files } = await buildProFileMap({ ...source, kind: 'pro', mode: 'code', tree })
      for (const [path, content] of Object.entries(files)) {
        await mkdir(dirname(join(root, path)), { recursive: true })
        await writeFile(join(root, path), content)
      }
      await symlink(join(runtime, 'node_modules'), join(root, 'node_modules'), 'junction')
      await writeFile(join(root, 'vite.config.mjs'), trustedViteConfig('vanilla-vite'))
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
      await writeFile(join(root, 'artifact-options.json'), '{"consoleBridge":""}')
      await run(
        [
          join(runtime, 'pack-artifact.mjs'),
          String(STUDIO_PRO_ARTIFACT_LIMITS.maxBytes),
          String(STUDIO_PRO_ARTIFACT_LIMITS.maxFiles),
        ],
        root,
      )
      await page.goto('/')
      const { bucket } = memoryArtifactBucket()
      const artifact = await storeArtifact({
        bucket,
        origin: 'https://runtime.test',
        parentOrigin: new URL(page.url()).origin,
        manifest: JSON.parse(await readFile(join(root, 'artifact-manifest.json'), 'utf8')),
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
      await page.evaluate((url) => {
        document.body.replaceChildren()
        const frame = document.createElement('iframe')
        frame.id = 'converted'
        frame.setAttribute('sandbox', 'allow-scripts')
        frame.src = url
        document.body.append(frame)
      }, artifact.url)
      const frame = page.frameLocator('#converted')
      await frame.locator('#action').click()
      await expect(frame.locator('#value')).toHaveText('1')
      const state = await frame.locator('body').evaluate(() => {
        const globals = window as unknown as {
          order: string[]
          counter: number
          globalThisMatches: boolean
        }
        return {
          order: globals.order,
          counter: globals.counter,
          globalThisMatches: globals.globalThisMatches,
        }
      })
      expect(state).toEqual({
        order: three ? ['head', 'inline', 'game'] : ['head', 'game', 'inline'],
        counter: 1,
        globalThisMatches: true,
      })
      if (three) await expect(frame.locator('body')).toHaveAttribute('data-three', 'object')
      await expect(frame.locator('body')).toHaveAttribute('data-script', './script.js')
      expect(errors).toEqual([])
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  })
}
