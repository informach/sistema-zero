import { expect, type Page, test } from '@playwright/test'
import { createEmptyProject } from '../src/core/project'

function historicalProject() {
  return {
    ...createEmptyProject('antigo', 'Som da aventura'),
    formatVersion: 1,
    ir: null,
    installedExtensions: [{ id: 'game-2d', version: '0.39.0', installedAt: 1 }],
    blocksState: {
      szBehaviorAreasVersion: 7,
      blocks: {
        languageVersion: 0,
        blocks: [
          {
            type: 'sz_frame_start',
            id: 'inicio-antigo',
            x: 30,
            y: 30,
            inputs: { CHILDREN: { block: { type: 'sz_g2d_play_jump', id: 'som-antigo' } } },
          },
        ],
      },
    },
  }
}

async function importProject(page: Page, project: unknown) {
  await page.locator('input[name="project-import-file"]').setInputFiles({
    name: 'aventura.szproject.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(project)),
  })
}

async function records(page: Page) {
  return page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const req = indexedDB.open('sistema-zero-studio')
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => reject(req.error)
    })
    const tx = db.transaction('kv', 'readonly'),
      store = tx.objectStore('kv')
    const read = <T>(req: IDBRequest<T>) =>
      new Promise<T>((resolve, reject) => {
        req.onsuccess = () => resolve(req.result)
        req.onerror = () => reject(req.error)
      })
    const [keys, values] = await Promise.all([read(store.getAllKeys()), read(store.getAll())])
    db.close()
    return Object.fromEntries(keys.map((key, i) => [String(key), values[i]]))
  })
}

test('importa som histórico, salva atual e conserva a ferramenta após apagar e recarregar', async ({
  page,
}) => {
  await page.goto('/')
  await importProject(page, historicalProject())
  await expect(page).toHaveURL(/\/editor\//)
  const sound = page.locator('.blocklyBlockCanvas [data-id="som-antigo"]').first()
  await expect(sound).toBeVisible()
  await expect(sound).toContainText('pulo')
  const id = decodeURIComponent(new URL(page.url()).pathname.split('/').at(-1)!)
  expect(id).not.toBe('antigo')
  await sound.click()
  await page.keyboard.press('Delete')
  await expect(sound).toHaveCount(0)
  await expect(page.getByText('Salvo', { exact: true })).toBeVisible({ timeout: 15_000 })
  await page.reload()
  await expect(page.getByText('Blocos deste jogo', { exact: false })).toBeVisible()
  await page.getByRole('treeitem', { name: '🧰 Blocos deste jogo', exact: true }).click()
  await expect(page.locator('.blocklyToolboxFlyout')).toContainText('efeito')
  const saved = await records(page)
  expect(saved[`sz:v2:project-meta:${id}`].formatVersion).toBe(2)
  expect(saved[`sz:v2:project-meta:${id}`].projectTools).toContain('sz_g2d_play_fx')
  expect(JSON.stringify(saved[`sz:v2:project-blocks:${id}`])).not.toContain('sz_g2d_play_jump')
})

test('importação desconhecida preserva a lista sem criar uma cópia incompleta', async ({
  page,
}) => {
  await page.goto('/')
  const broken = historicalProject()
  broken.blocksState.blocks.blocks[0]!.inputs.CHILDREN.block.type = 'sz_inexistente'
  await importProject(page, broken)
  await expect(page.getByRole('dialog')).toContainText('Importação')
  await expect(page).toHaveURL('/')
  expect(
    Object.keys(await records(page)).filter((key) => key.startsWith('sz:v2:project-meta:')),
  ).toEqual([])
})

test('original local incompleto aparece preservado sem bloquear os demais projetos', async ({
  page,
}) => {
  await page.goto('/')
  await page.evaluate(async (project) => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const req = indexedDB.open('sistema-zero-studio', 1)
      req.onupgradeneeded = () => req.result.createObjectStore('kv')
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => reject(req.error)
    })
    const tx = db.transaction('kv', 'readwrite'),
      store = tx.objectStore('kv')
    store.put(project, 'sz:project:antigo')
    store.put({ assets: [] }, 'sz:project-assets:incompleto')
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
    db.close()
  }, historicalProject())
  await page.reload()
  await expect(page.getByText('Preservado — peça ajuda para abrir')).toBeVisible()
  await expect(
    page.getByRole('button', { name: 'Abrir projeto Som da aventura', exact: true }),
  ).toBeVisible()
  const saved = await records(page)
  expect(saved['sz:project-assets:incompleto']).toEqual({ assets: [] })
  expect(saved['sz:v2:project-meta:antigo'].formatVersion).toBe(2)
  expect(Object.keys(saved).some((key) => key.startsWith('sz:project-backup:antigo:'))).toBe(true)
})
