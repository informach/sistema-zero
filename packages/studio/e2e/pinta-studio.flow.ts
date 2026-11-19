import { execFileSync } from 'node:child_process'
import { resolve } from 'node:path'
import { expect, type Page, test } from '@playwright/test'
import { QA_PROFILE } from '../playground/pinta-integration/profile'
import type { PersonalAsset } from '../src/asset-library/personal'
import type { Project } from '../src/core/project'
import type { PythonClassicProjectDocument } from '../src/core/pythonProject'

const root = resolve(import.meta.dirname, '../../..')
const fixture = resolve(root, '.tmp/pinta-scenes-e2e/vila-e-floresta.pinta.json')
const closedFixture = resolve(root, '.tmp/pinta-resources-e2e/resources-frozen.pinta.json')
const worldFixture = resolve(root, '.tmp/pinta-scenes-e2e/vila-porta-sem-destino.pinta.json')
test.beforeAll(() => {
  execFileSync(
    'bun',
    [
      resolve(root, 'packages/pinta/scripts/homologacao/worldUpdate.ts'),
      resolve(worldFixture, '..'),
    ],
    { cwd: root },
  )
  execFileSync(
    'bun',
    [resolve(root, 'packages/pinta/scripts/homologacao/generate.ts'), resolve(fixture, '..')],
    { cwd: root },
  )
  execFileSync(
    'bun',
    [
      resolve(root, 'packages/pinta/scripts/homologacao/resources.ts'),
      resolve(closedFixture, '..'),
    ],
    { cwd: root },
  )
})
const snapshot = async (page: Page): Promise<Project> =>
  JSON.parse((await page.getByTestId('qa-project').textContent()) ?? 'null')

test.beforeEach(async ({ context }) => {
  await context.route('**/api/**', (route) => route.abort('internetdisconnected'))
})

test('o catálogo com leitor anterior recusa os dados avançados e permite escolher a imagem simples', async ({
  page,
}, info) => {
  test.setTimeout(120000)
  await page.goto('/pinta')
  await page.locator('input[type=file]').first().setInputFiles(fixture)
  await expect(
    page.getByRole('button', { name: 'Abrir vila-e-floresta (Mapa)', exact: true }),
  ).toBeVisible()
  await page.goto('/estudio?novo=1&python=1&leitor=antigo')
  await page.getByRole('button', { name: 'Mais opções', exact: true }).click()
  await page.getByRole('menuitem', { name: 'Imagens', exact: true }).click()
  await page.getByRole('button', { name: '🎨 Trazer do Pinta', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: 'Trazer do Pinta', exact: true })
  const card = dialog
    .getByRole('listitem')
    .filter({ has: page.getByText('vila-e-floresta', { exact: true }) })
  const before = JSON.parse(
    (await page.getByTestId('qa-project').textContent())!,
  ) as PythonClassicProjectDocument
  await card.getByRole('button', { name: 'Escolher imagem', exact: true }).click()
  await expect(dialog.getByLabel('O que trazer', { exact: true })).toHaveValue('map')
  await expect(
    dialog.getByText(
      'Atualize o ambiente deste projeto para receber este cenário. Você também pode escolher a imagem simples.',
      { exact: true },
    ),
  ).toBeVisible()
  await expect(dialog.getByRole('button', { name: 'Adicionar imagem', exact: true })).toBeDisabled()
  await page.screenshot({ path: info.outputPath('leitor-anterior-recusa.png') })
  await dialog.getByLabel('O que trazer', { exact: true }).selectOption('tilemap')
  await expect(dialog.getByRole('button', { name: 'Adicionar imagem', exact: true })).toBeEnabled()
  await dialog.getByRole('button', { name: 'Adicionar imagem', exact: true }).click()
  await expect
    .poll(
      async () => JSON.parse((await page.getByTestId('qa-project').textContent())!).assets?.length,
    )
    .toBe(1)
  const after = JSON.parse(
    (await page.getByTestId('qa-project').textContent())!,
  ) as PythonClassicProjectDocument
  expect(after.assets![0]!.pintaImage?.recipe.selection.kind).toBe('tilemap')
  expect(after.assets![0]!.pintaImage?.output.dataVersion).toBeUndefined()
  expect(after.files).toEqual(before.files)
})

test('Python traz o mundo pela interface e atualiza só o destino conservando o programa', async ({
  page,
  context,
}, info) => {
  test.setTimeout(120000)
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  const pythonSnapshot = async (): Promise<PythonClassicProjectDocument> =>
    JSON.parse((await page.getByTestId('qa-project').textContent()) ?? 'null')
  await page.goto('/pinta')
  await page.locator('input[type=file]').first().setInputFiles(fixture)
  await expect(
    page.getByRole('button', { name: 'Abrir vila-e-floresta (Mapa)', exact: true }),
  ).toBeVisible()
  await page.goto('/estudio?novo=1&python=1')
  await page.getByRole('button', { name: 'Mais opções', exact: true }).click()
  await page.getByRole('menuitem', { name: 'Imagens', exact: true }).click()
  await page.getByRole('button', { name: '🎨 Trazer do Pinta', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: 'Trazer do Pinta', exact: true })
  const card = dialog
    .getByRole('listitem')
    .filter({ has: page.getByText('vila-e-floresta', { exact: true }) })
  await card.getByRole('button', { name: 'Escolher imagem', exact: true }).click()
  await expect(dialog.getByLabel('O que trazer', { exact: true })).toHaveValue('map-world')
  await expect(dialog.getByRole('button', { name: 'Adicionar imagem', exact: true })).toBeEnabled()
  const before = await pythonSnapshot()
  await info.attach('python-world-selection', {
    body: await page.screenshot(),
    contentType: 'image/png',
  })
  await dialog.getByRole('button', { name: 'Adicionar imagem', exact: true }).click()
  await expect.poll(async () => (await pythonSnapshot()).assets?.length).toBe(1)
  const first = await pythonSnapshot(),
    asset = first.assets![0]!
  expect(asset.pintaImage?.recipe).toMatchObject({
    version: 2,
    selection: { kind: 'map-world' },
    scale: 2,
  })
  expect(first.files).toEqual(before.files)
  const edit = await context.newPage()
  await edit.goto('/pinta')
  await edit.getByRole('button', { name: 'Abrir cabana (Mapa)', exact: true }).click()
  await expect(edit.getByRole('button', { name: 'Chão', exact: true })).toBeVisible()
  const tip = edit.getByRole('button', { name: 'Entendi!', exact: true })
  if (await tip.isVisible()) await tip.click()
  await edit.getByRole('button', { name: 'Chão', exact: true }).click()
  await edit.getByRole('button', { name: 'Borracha', exact: true }).click()
  const canvas = edit.getByRole('img', { name: 'Grade do mapa', exact: true })
  await canvas.evaluate((el) => el.scrollIntoView({ block: 'start', inline: 'start' }))
  await canvas.click({ position: { x: 8, y: 8 } })
  await expect(edit.getByText('Atualizado no Estúdio', { exact: true })).toBeVisible({
    timeout: 15000,
  })
  await page.bringToFront()
  await page.evaluate(() => window.dispatchEvent(new FocusEvent('focus')))
  await expect
    .poll(async () => (await pythonSnapshot()).assets?.[0]?.pintaImage?.output.sha256, {
      timeout: 15000,
    })
    .not.toBe(asset.pintaImage!.output.sha256)
  const after = await pythonSnapshot()
  expect(after.assets![0]!.id).toBe(asset.id)
  expect(after.assets![0]!.proPath).toBe(asset.proPath)
  expect(after.assets![0]!.pintaImage!.provenance.sourceSha256).toBe(
    asset.pintaImage!.provenance.sourceSha256,
  )
  expect(after.files).toEqual(before.files)
  expect(after.blocksState).toEqual(first.blocksState)
  expect(errors).toEqual([])
})

test('uma porta configurada depois acrescenta seu mapa ao jogo existente sem mudar o programa', async ({
  page,
  context,
}, info) => {
  test.setTimeout(120000)
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto('/pinta')
  await page.locator('input[type=file]').first().setInputFiles(worldFixture)
  await page.getByRole('button', { name: 'Abrir vila-e-floresta (Mapa)', exact: true }).click()
  const tip = page.getByRole('button', { name: 'Entendi!', exact: true })
  if (await tip.isVisible()) await tip.click()
  await page.getByRole('button', { name: 'Jogar meu mapa', exact: true }).click()
  await expect(page).toHaveURL(/\/estudio/)
  await expect
    .poll(async () => (await snapshot(page))?.assets?.filter((asset) => asset.scene).length)
    .toBe(1)
  await page.getByRole('button', { name: 'Ponte', exact: true }).click()
  await page.getByRole('button', { name: 'Programa · script.js', exact: true }).click()
  const input = page.locator('.monaco-editor textarea.inputarea').first()
  await input.focus()
  await page.keyboard.press('ControlOrMeta+End')
  await page.keyboard.insertText('\nconst minhaNovaPorta = 47;\n')
  await expect
    .poll(async () => JSON.stringify((await snapshot(page)).ir))
    .toContain('minhaNovaPorta')
  await expect.poll(async () => Boolean((await snapshot(page)).bridgeCodeAhead)).toBe(false)
  const initial = await snapshot(page)
  const map = initial.assets!.find((asset) => asset.scene)!
  const edit = await context.newPage()
  edit.on('pageerror', (error) => errors.push(error.message))
  await edit.goto(`/pinta?desenho=${encodeURIComponent(map.libId!.slice('personal:'.length))}`)
  const editTip = edit.getByRole('button', { name: 'Entendi!', exact: true })
  if (await editTip.isVisible()) await editTip.click()
  await edit.getByLabel('Nível das ferramentas', { exact: true }).selectOption('advanced')
  await edit
    .getByRole('button')
    .filter({ has: edit.getByText('Lugares', { exact: true }) })
    .click()
  await edit.getByRole('button', { name: 'Escolher o objeto Porta da cabana', exact: true }).click()
  const before = await snapshot(page)
  const destination = edit.getByLabel('Valor: destino', { exact: true })
  await destination.fill('cabana')
  await destination.press('Enter')
  await expect(edit.getByText('Atualizado no Estúdio', { exact: true })).toBeVisible({
    timeout: 15000,
  })
  await page.bringToFront()
  await page.evaluate(() => window.dispatchEvent(new FocusEvent('focus')))
  await expect
    .poll(async () => (await snapshot(page)).assets?.filter((asset) => asset.scene).length, {
      timeout: 15000,
    })
    .toBe(2)
  const after = await snapshot(page)
  expect(after.assets!.find((asset) => asset.id === map.id)?.name).toBe(map.name)
  expect(after.assets!.some((asset) => asset.scene?.name === 'cabana')).toBe(true)
  expect(after.files).toEqual(before.files)
  expect(after.ir).toEqual(before.ir)
  expect(after.blocksState).toEqual(before.blocksState)
  expect(errors).toEqual([])
  await info.attach('porta-adicionada-ao-jogo', {
    body: await page.screenshot(),
    contentType: 'image/png',
  })
})

test('Pinta real cria jogo estruturado; atualização do cenário conserva a programação', async ({
  page,
  context,
}, info) => {
  test.setTimeout(120000)
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  await page.goto('/pinta')
  await page.locator('input[type=file]').first().setInputFiles(fixture)
  await page.getByRole('button', { name: 'Abrir vila-e-floresta (Mapa)', exact: true }).click()
  const tip = page.getByRole('button', { name: 'Entendi!', exact: true })
  if (await tip.isVisible()) await tip.click()
  await page.getByRole('button', { name: 'Jogar meu mapa', exact: true }).click()
  await expect(page).toHaveURL(/\/estudio/)
  await expect
    .poll(async () => (await snapshot(page))?.assets?.find((a) => a.scene)?.scene?.layers.length)
    .toBe(18)
  await expect(page.locator('.blocklySvg').first()).toBeVisible()
  await page.getByRole('button', { name: 'Ponte', exact: true }).click()
  await page.getByRole('button', { name: 'Programa · script.js', exact: true }).click()
  const input = page.locator('.monaco-editor textarea.inputarea').first()
  await expect(input).toBeVisible()
  await input.focus()
  await page.keyboard.press('ControlOrMeta+End')
  await page.keyboard.insertText('\nconst marcoPinta = 23;\n')
  await expect.poll(async () => (await snapshot(page)).files['script.js']).toContain('marcoPinta')
  // Wait for the real bridge parser to incorporate the edit before comparing snapshots.
  // It normalizes code/HTML and reconstructs blocks independently of any art update.
  await expect
    .poll(async () => JSON.stringify((await snapshot(page)).ir), { timeout: 15000 })
    .toContain('marcoPinta')
  await expect.poll(async () => Boolean((await snapshot(page)).bridgeCodeAhead)).toBe(false)
  const initial = await snapshot(page)
  const map = initial.assets!.find((a) => a.scene?.layers.length === 18)!
  const drawing = map.libId!.replace(/^personal:/, '')
  const edit = await context.newPage()
  await edit.goto(`/pinta?desenho=${encodeURIComponent(drawing)}`)
  await expect(edit.getByRole('button', { name: 'Chão', exact: true })).toBeVisible()
  const editTip = edit.getByRole('button', { name: 'Entendi!', exact: true })
  if (await editTip.isVisible()) await editTip.click()
  await edit.getByRole('button', { name: 'Chão', exact: true }).click()
  await edit.getByRole('button', { name: 'Borracha', exact: true }).click()
  const canvas = edit.getByRole('img', { name: 'Grade do mapa', exact: true })
  await canvas.evaluate((el) => el.scrollIntoView({ block: 'start', inline: 'start' }))
  // Compare immediately around the art mutation, after opening both real editors.
  const before = await snapshot(page)
  await canvas.click({ position: { x: 8, y: 8 } })
  await expect(edit.getByText('Atualizado no Estúdio', { exact: true })).toBeVisible({
    timeout: 15000,
  })
  const canonical = await edit.evaluate(
    ({ profile, id }) =>
      new Promise<PersonalAsset>((resolve, reject) => {
        const request = indexedDB.open(`sistema-zero-personal-assets-${profile}`)
        request.onerror = () => reject(request.error)
        request.onsuccess = () => {
          const db = request.result,
            tx = db.transaction('kv', 'readonly'),
            read = tx.objectStore('kv').get(`asset:${id}`)
          tx.oncomplete = () => {
            db.close()
            resolve(read.result)
          }
          tx.onerror = () => {
            db.close()
            reject(tx.error)
          }
        }
      }),
    { profile: QA_PROFILE, id: drawing },
  )
  const canonicalFloor = canonical.scene?.layers.find(
    (l) => l.kind === 'tiles' && l.name === 'Chão',
  )
  await info.attach('bridge-checkpoint', {
    body: JSON.stringify({
      id: drawing,
      projectRevision: map.libRevision,
      personalRevision: canonical.updatedAt,
      firstCells: canonicalFloor?.kind === 'tiles' ? canonicalFloor.cells.slice(0, 8) : null,
    }),
    contentType: 'application/json',
  })
  expect(canonicalFloor?.kind === 'tiles' ? canonicalFloor.cells[0] : null).toBe(-1)
  await page.bringToFront()
  // Headless Chromium keeps every page focused/visible. Reproduce the user's return event;
  // storage, the production watcher, reconciliation and the editor remain real.
  await page.evaluate(() => window.dispatchEvent(new FocusEvent('focus')))
  await expect
    .poll(
      async () => {
        const current = (await snapshot(page)).assets?.find((a) => a.id === map.id)?.scene
        const floor = current?.layers.find((l) => l.kind === 'tiles' && l.name === 'Chão')
        return floor?.kind === 'tiles' ? floor.cells[0] : null
      },
      { timeout: 10000 },
    )
    .toBe(-1)
  const after = await snapshot(page)
  expect(after.files).toEqual(before.files)
  expect(after.ir).toEqual(before.ir)
  expect(after.blocksState).toEqual(before.blocksState)
  expect(errors).toEqual([])
  await info.attach('studio-updated', { body: await page.screenshot(), contentType: 'image/png' })
})

test('editar as peças atualiza os mapas vinculados sem abrir ou editar o mapa', async ({
  page,
  context,
}, info) => {
  test.setTimeout(90000)
  await page.goto('/pinta')
  await page.locator('input[type=file]').first().setInputFiles(fixture)
  await page.getByRole('button', { name: 'Abrir vila-e-floresta (Mapa)', exact: true }).click()
  const tip = page.getByRole('button', { name: 'Entendi!', exact: true })
  if (await tip.isVisible()) await tip.click()
  await page.getByRole('button', { name: 'Jogar meu mapa', exact: true }).click()
  await expect(page).toHaveURL(/\/estudio/)
  await expect.poll(async () => Boolean((await snapshot(page))?.blocksState)).toBe(true)
  const before = await snapshot(page)
  const map = before.assets!.find((a) => a.scene?.layers.length === 18)!
  const tileset = map.scene!.tilesets.find((t) => t.name === 'terra-e-madeira')!
  expect(tileset.solid).not.toContain(0)
  const edit = await context.newPage()
  await edit.goto(`/pinta?desenho=${encodeURIComponent(tileset.id)}`)
  await edit.getByRole('button', { name: /^Mudar a colisão da peça/ }).click()
  await expect(edit.getByText('Atualizado no Estúdio', { exact: true })).toBeVisible({
    timeout: 15000,
  })
  await page.bringToFront()
  await page.evaluate(() => window.dispatchEvent(new FocusEvent('focus')))
  await expect
    .poll(
      async () =>
        (await snapshot(page)).assets
          ?.find((a) => a.id === map.id)
          ?.scene?.tilesets.find((t) => t.id === tileset.id)
          ?.solid.includes(0),
      { timeout: 10000 },
    )
    .toBe(true)
  const after = await snapshot(page)
  expect(after.files).toEqual(before.files)
  expect(after.ir).toEqual(before.ir)
  expect(after.blocksState).toEqual(before.blocksState)
  await info.attach('linked-resource-updated', {
    body: await page.screenshot(),
    contentType: 'image/png',
  })
})

test('Trazer do Pinta importa a Vila e o destino da porta juntos, sem mudar o programa', async ({
  page,
}, info) => {
  test.setTimeout(90000)
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto('/pinta')
  await page.locator('input[type=file]').first().setInputFiles(fixture)
  await expect(
    page.getByRole('button', { name: 'Abrir vila-e-floresta (Mapa)', exact: true }),
  ).toBeVisible()
  await page.goto('/estudio?novo=1')
  await expect(page.locator('.blocklySvg').first()).toBeVisible()
  await page.getByRole('button', { name: 'Ponte', exact: true }).click()
  await page.getByRole('button', { name: 'Programa · script.js', exact: true }).click()
  const input = page.locator('.monaco-editor textarea.inputarea').first()
  await input.focus()
  await page.keyboard.press('ControlOrMeta+End')
  await page.keyboard.insertText('\nconst programaAntesDosMapas = 41;\n')
  await expect
    .poll(async () => JSON.stringify((await snapshot(page)).ir))
    .toContain('programaAntesDosMapas')
  await expect.poll(async () => Boolean((await snapshot(page)).bridgeCodeAhead)).toBe(false)
  await page.getByRole('button', { name: 'Mais opções', exact: true }).click()
  await page.getByRole('menuitem', { name: 'Imagens', exact: true }).click()
  await page.getByRole('button', { name: '🎨 Trazer do Pinta', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: 'Trazer do Pinta', exact: true })
  const card = dialog
    .getByRole('listitem')
    .filter({ has: page.getByText('vila-e-floresta', { exact: true }) })
  await expect(
    card.getByRole('button', { name: 'Adicionar ao projeto', exact: true }),
  ).toBeVisible()
  const before = await snapshot(page)
  await card.getByRole('button', { name: 'Adicionar ao projeto', exact: true }).click()
  await expect.poll(async () => (await snapshot(page))?.assets?.length).toBe(2)
  const after = await snapshot(page)
  expect(after.assets?.map((asset) => asset.scene?.name).sort()).toEqual([
    'cabana',
    'vila-e-floresta',
  ])
  expect(
    after.assets?.find((asset) => asset.scene?.name === 'vila-e-floresta')?.scene?.layers,
  ).toHaveLength(18)
  expect(after.files).toEqual(before.files)
  expect(after.ir).toEqual(before.ir)
  expect(after.blocksState).toEqual(before.blocksState)
  await expect(card.getByText('✓ no projeto', { exact: true })).toBeVisible()
  expect(errors).toEqual([])
  await info.attach('pull-world', { body: await page.screenshot(), contentType: 'image/png' })
})

test('Trazer do Pinta conserva o mapa nativo 6 autocontido e sua animação sem os originais', async ({
  page,
}, info) => {
  await page.goto('/pinta')
  await page.locator('input[type=file]').first().setInputFiles(closedFixture)
  await expect(
    page.getByRole('button', { name: 'Abrir recursos-qa (Mapa)', exact: true }),
  ).toBeVisible()
  await page.goto('/estudio?novo=1')
  await page.getByRole('button', { name: 'Mais opções', exact: true }).click()
  await page.getByRole('menuitem', { name: 'Imagens', exact: true }).click()
  await page.getByRole('button', { name: '🎨 Trazer do Pinta', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: 'Trazer do Pinta', exact: true })
  await expect(dialog.getByRole('listitem')).toHaveCount(1)
  await dialog.getByRole('button', { name: 'Adicionar ao projeto', exact: true }).click()
  await expect.poll(async () => (await snapshot(page))?.assets?.length).toBe(1)
  const scene = (await snapshot(page)).assets?.[0]?.scene
  expect(scene?.version).toBe(2)
  expect(scene?.tileSize).toBe(48)
  expect(scene?.resources).toHaveLength(2)
  expect(
    scene?.art?.find((a) => a.sprite)?.sprite?.animations.find((a) => a.id === 'qa-wind')?.frames,
  ).toHaveLength(3)
  await info.attach('pull-closed-native6', {
    body: await page.screenshot(),
    contentType: 'image/png',
  })
})

test('falha síncrona no segundo put não deixa metade da Vila na biblioteca nem no projeto', async ({
  page,
}) => {
  await page.goto('/pinta')
  await page.locator('input[type=file]').first().setInputFiles(fixture)
  await expect(
    page.getByRole('button', { name: 'Abrir vila-e-floresta (Mapa)', exact: true }),
  ).toBeVisible()
  await page.goto('/estudio?novo=1')
  await page.evaluate((profile) => {
    const original = IDBObjectStore.prototype.put
    let puts = 0
    IDBObjectStore.prototype.put = function (value, key) {
      if (
        this.transaction.db.name === `sistema-zero-personal-assets-${profile}` &&
        typeof key === 'string' &&
        key.startsWith('asset:')
      ) {
        document.documentElement.dataset.qaBundlePuts = String(++puts)
        if (puts === 2) throw new DOMException('Falha de quota simulada', 'QuotaExceededError')
      }
      return original.call(this, value, key)
    }
  }, QA_PROFILE)
  await page.getByRole('button', { name: 'Mais opções', exact: true }).click()
  await page.getByRole('menuitem', { name: 'Imagens', exact: true }).click()
  await page.getByRole('button', { name: '🎨 Trazer do Pinta', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: 'Trazer do Pinta', exact: true })
  await dialog
    .getByRole('listitem')
    .filter({ has: page.getByText('vila-e-floresta', { exact: true }) })
    .getByRole('button', { name: 'Adicionar ao projeto', exact: true })
    .click()
  await expect(
    dialog.getByText('Não consegui salvar os mapas agora. Tente de novo daqui a pouco.', {
      exact: true,
    }),
  ).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.dataset.qaBundlePuts)).toBe('2')
  expect((await snapshot(page)).assets ?? []).toEqual([])
  const keys = await page.evaluate(
    (profile) =>
      new Promise<IDBValidKey[]>((resolve, reject) => {
        const request = indexedDB.open(`sistema-zero-personal-assets-${profile}`)
        request.onerror = () => reject(request.error)
        request.onsuccess = () => {
          const db = request.result,
            tx = db.transaction('kv', 'readonly'),
            read = tx.objectStore('kv').getAllKeys()
          tx.oncomplete = () => {
            db.close()
            resolve(read.result)
          }
          tx.onabort = () => {
            db.close()
            reject(tx.error)
          }
        }
      }),
    QA_PROFILE,
  )
  expect(keys.filter((key) => typeof key === 'string' && key.startsWith('asset:'))).toEqual([])
  expect(
    await page.evaluate(
      (profile) => localStorage.getItem(`sz:desenhos-alterados:${profile}`),
      QA_PROFILE,
    ),
  ).toBeNull()
})
