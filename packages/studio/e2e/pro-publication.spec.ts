import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { expect, test } from '@playwright/test'
import { isStudioProPublication, studioProPublicationUrl } from '@sistemazero/core/studio'
import { build, type PreviewServer, preview } from 'vite'
import { artifactPrefix } from '../../studio-runtime/src/artifacts'
import { publicationCommand, servePublishedArtifact } from '../../studio-runtime/src/publications'
import { materializeTestTemplate } from '../../studio-runtime/tests/template-files'
import { createTestProArtifact } from './helpers/proArtifact'

let directory: string, server: PreviewServer, origin: string
test.beforeAll(async () => {
  test.setTimeout(120000)
  directory = await mkdtemp(join(tmpdir(), 'studio-publication-browser-'))
  const root = fileURLToPath(new URL('./fixtures/pro-publication', import.meta.url)),
    configFile = fileURLToPath(new URL('../playground/vite.config.ts', import.meta.url))
  await build({
    configFile,
    root,
    logLevel: 'warn',
    build: { outDir: directory, emptyOutDir: true, target: 'esnext' },
  })
  server = await preview({
    configFile,
    root,
    logLevel: 'warn',
    build: { outDir: directory },
    preview: { host: '127.0.0.1', port: 0 },
  })
  const address = server.httpServer.address()
  if (!address || typeof address === 'string') throw new Error('Fixture server unavailable')
  origin = `http://127.0.0.1:${address.port}`
})
test.afterAll(async () => {
  if (server)
    await new Promise<void>((done, reject) =>
      server.httpServer.close((error) => (error ? reject(error) : done())),
    )
  if (
    directory &&
    resolve(directory).startsWith(resolve(tmpdir()) + sep) &&
    resolve(directory).includes('studio-publication-browser-')
  )
    await rm(directory, { recursive: true, force: true })
})

test('permanent Pro player preserves published progress across revisions, isolates editor storage and honors host controls', async ({
  page,
}, info) => {
  test.setTimeout(90000)
  const { allFiles } = await materializeTestTemplate('canvas-survival')
  allFiles['src/main.ts'] += `
const read = document.createElement('output'); read.id = 'saved-proof'; document.body.append(read)
const save = document.createElement('button'); save.textContent = 'Guardar progresso de teste'; save.onclick = async () => { await window.szGameStorage!.set('score', 'published'); read.textContent = await window.szGameStorage!.get('score') }; document.body.append(save)
window.szGameStorage!.get('score').then(value => { read.textContent = value ?? 'empty' })
`
  await page.route('**/fixture-publication', (route) => route.fulfill({ json: null }))
  // This fixture asserts promotion/player/storage behavior. Runtime validation
  // identity is a test double; real Docker validation is exercised separately.
  const compiled = await createTestProArtifact(page, allFiles, 'canvas-survival', {
    bridge: true,
    mount: false,
    parentUrl: origin,
    validation: { profileVersion: 1, runtimeFingerprint: '1'.repeat(64) },
  })
  try {
    const playId = crypto.randomUUID(),
      owner = 'a'.repeat(64)
    const input = {
      operation: 'promote',
      playId,
      owner,
      projectId: 'editor-project',
      requestId: crypto.randomUUID(),
      expectedVersion: 0,
      parentOrigin: origin,
      source: '{}',
      artifactId: compiled.artifact.id,
      artifactHash: compiled.artifact.sha256,
    }
    let publication = await publicationCommand(compiled.bucket, input)
    if (!isStudioProPublication(publication)) throw new Error('Fixture publication failed')
    const firstRevision = publication.activeRevision
    publication = await publicationCommand(compiled.bucket, {
      ...input,
      expectedVersion: 1,
      requestId: crypto.randomUUID(),
    })
    if (!isStudioProPublication(publication)) throw new Error('Fixture update failed')
    let visible = true
    await page.route('https://runtime.test/v1/published/**', async (route) => {
      const response = await servePublishedArtifact(
        new Request(route.request().url()),
        compiled.bucket,
        async () => visible,
      )
      await route.fulfill({
        status: response.status,
        headers: Object.fromEntries(response.headers),
        body: Buffer.from(await response.arrayBuffer()),
      })
    })
    await page.unroute('**/fixture-publication')
    await page.route('**/fixture-publication', (route) => {
      if (!isStudioProPublication(publication)) throw new Error('Fixture state invalid')
      return route.fulfill({
        json: {
          project: { id: 'editor-project', name: 'Survival', kind: 'pro' },
          published: {
            playId,
            revision: publication.activeRevision,
            url: studioProPublicationUrl(
              'https://runtime.test',
              playId,
              publication.activeRevision,
            ),
          },
        },
      })
    })
    await compiled.bucket.delete(
      (
        await compiled.bucket.list({ prefix: artifactPrefix(compiled.artifact.id), limit: 1000 })
      ).objects.map((file) => file.key),
    )
    await page.reload()
    await expect(page.getByLabel('Player status')).toHaveText('ready')
    const game = page.frameLocator('iframe')
    await expect(game.locator('#saved-proof')).toHaveText('empty')
    await page.getByRole('button', { name: 'Preparar progresso do editor' }).click()
    await expect(page.locator('#editor-save')).toHaveText('editor')
    await game.getByRole('button', { name: 'Guardar progresso de teste' }).click()
    await expect(game.locator('#saved-proof')).toHaveText('published')
    await page.getByRole('button', { name: 'Começar pelo player' }).click()
    await expect(game.locator('#status')).toContainText('andamento')
    await page.getByRole('button', { name: 'Silenciar pelo player' }).click()
    await expect(game.locator('#sound')).toHaveText('Som: silenciado pelo player')
    await expect(game.locator('#sound')).toBeDisabled()
    await page.getByRole('button', { name: 'Restaurar som pelo player' }).click()
    await expect(game.locator('#sound')).toBeEnabled()
    await expect(game.locator('#sound')).toHaveText('Som: desligado')
    publication = await publicationCommand(compiled.bucket, {
      operation: 'activate',
      playId,
      owner,
      expectedVersion: 2,
      requestId: crypto.randomUUID(),
      revision: firstRevision,
      disabled: false,
    })
    await page.reload()
    await expect(page.getByLabel('Player status')).toHaveText('ready')
    await expect(game.locator('#saved-proof')).toHaveText('published')
    await page.getByRole('button', { name: 'Consultar progresso do editor' }).click()
    await expect(page.locator('#editor-save')).toHaveText('editor')
    await page.setViewportSize({ width: 360, height: 740 })
    await page.screenshot({ path: info.outputPath('published-mobile.png'), fullPage: true })
    visible = false
    await page.reload()
    await expect(page.getByLabel('Player status')).toHaveText('error', { timeout: 15000 })
    await expect(page.locator('iframe')).not.toHaveAttribute('src', /published/)
  } finally {
    await compiled.dispose()
  }
})
