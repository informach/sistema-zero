import { expect, type Page, test } from '@playwright/test'

/**
 * Lote 1.1 (19/11/2026): a v4 entrou na staging sem chave de desligamento, e a migração apaga
 * os registros de dados v3. Esta prova mostra o que acontece se um build v3 voltar a rodar
 * depois da migração: ele não enxerga os projetos migrados (o defeito conhecido, registrado),
 * mas NÃO apaga nem altera nenhum byte do v4 nem o journal de saída; o que ele gravar reaparece
 * quando a v4 volta; e o backup da migração devolve o projeto de antes.
 */
type StorageProof = typeof import('../src/state/persistence') &
  typeof import('../src/project-migrations/localBackups') & {
    PROJECT_STORAGE_VERSION: number
    prepareEditableStudioProject: typeof import('../src/state/editableProjectValidation').prepareEditableStudioProject
    advanceLocalRevision: typeof import('../src/state/projectStorageRevision').advanceLocalRevision
    createEmptyProject: typeof import('../src/core/project').createEmptyProject
    encodeProjectJsonGraph: (value: unknown) => string
  }
declare global {
  interface Window {
    storageProof: StorageProof
  }
}

async function open(page: Page, version: 'current' | 'old', namespace: string) {
  await page.goto(`/${version}.html`)
  await page.waitForFunction(() => !!window.storageProof)
  await page.evaluate((ns) => window.storageProof.setStorageNamespace(ns), namespace)
  return page.evaluate(() => window.storageProof.PROJECT_STORAGE_VERSION)
}

/** Bytes de tudo o que começa com `prefix` no banco do perfil e do journal de saída. */
async function dump(page: Page, namespace: string, prefix: string) {
  return page.evaluate(
    async ({ namespace, prefix }) => {
      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open(`sistema-zero-studio-${namespace}`)
        request.onsuccess = () => resolve(request.result)
        request.onerror = () => reject(request.error)
      })
      const entries = await new Promise<Array<[string, unknown]>>((resolve, reject) => {
        const store = db.transaction('kv', 'readonly').objectStore('kv')
        const keys = store.getAllKeys()
        const values = store.getAll()
        values.onsuccess = () =>
          resolve(
            (keys.result as IDBValidKey[]).map((key, index) => [String(key), values.result[index]]),
          )
        values.onerror = () => reject(values.error)
      })
      db.close()
      const selected = entries
        .filter(([key]) => key.startsWith(prefix))
        .sort(([a], [b]) => (a < b ? -1 : 1))
      const journal = Object.keys(localStorage)
        .filter((key) => key.startsWith('sz:studio-exit:'))
        .sort()
        .map((key) => [key, localStorage.getItem(key)])
      return {
        keys: selected.map(([key]) => key),
        encoded: window.storageProof.encodeProjectJsonGraph(selected),
        journal,
      }
    },
    { namespace, prefix },
  )
}

test('um cliente v3 depois da migração não apaga nem altera o v4; a v4 recupera o que ele gravou', async ({
  page,
}) => {
  const namespace = `downgrade-${Date.now()}`
  expect(await open(page, 'old', namespace)).toBe(3)
  const legacyId = await page.evaluate(async () => {
    const api = window.storageProof
    const project = await api.prepareEditableStudioProject(
      api.createEmptyProject('jogo-de-antes', 'Jogo de antes'),
    )
    if (!project) throw new Error('fixture inválida')
    await api.persistProject(project)
    return project.id
  })

  expect(await open(page, 'current', namespace)).toBe(4)
  const created = await page.evaluate(async (legacyId) => {
    const api = window.storageProof
    const listed = (await api.listAllProjects()).map((summary) => summary.id)
    const current = await api.prepareEditableStudioProject(await api.loadProjectById(legacyId))
    if (!current) throw new Error('a v4 não abriu o projeto migrado')
    const edited = api.advanceLocalRevision(current, {
      ...current,
      name: 'Editado no v4',
      files: { ...current.files, 'script.js': 'console.log("v4")' },
    } as typeof current)
    await api.persistProject(edited)
    const fresh = await api.prepareEditableStudioProject(
      api.createEmptyProject('nasceu-no-v4', 'Nasceu no v4'),
    )
    if (!fresh) throw new Error('fixture inválida')
    await api.persistProject(fresh)
    return { listed, freshId: fresh.id }
  }, legacyId)
  expect(created.listed).toContain(legacyId)
  const before = await dump(page, namespace, 'sz:v4:')
  expect(before.keys).toContain(`sz:v4:project-meta:${legacyId}`)
  expect(before.keys.some((key) => key.startsWith(`sz:v4:project-backup:${legacyId}:`))).toBe(true)

  // O build antigo volta (reversão de deploy): lê, lista e grava um projeto novo.
  expect(await open(page, 'old', namespace)).toBe(3)
  const old = await page.evaluate(
    async ({ legacyId, freshId }) => {
      const api = window.storageProof
      const listed = (await api.listAllProjects()).map((summary) => summary.id)
      const loadedLegacy = await api.loadProjectById(legacyId).catch((error: Error) => error.name)
      const loadedFresh = await api.loadProjectById(freshId).catch((error: Error) => error.name)
      const project = await api.prepareEditableStudioProject(
        api.createEmptyProject('feito-no-v3-depois', 'Feito no v3 depois'),
      )
      if (!project) throw new Error('fixture inválida')
      await api.persistProject(project)
      return {
        listed,
        legacyVisible: loadedLegacy !== null && typeof loadedLegacy === 'object',
        freshVisible: loadedFresh !== null && typeof loadedFresh === 'object',
        newId: project.id,
      }
    },
    { legacyId, freshId: created.freshId },
  )
  // O defeito conhecido da reversão: o v3 não enxerga o que já é v4.
  expect(old.listed).not.toContain(created.freshId)
  expect(old.freshVisible).toBe(false)
  test.info().annotations.push({
    type: 'reversão',
    description: `v3 depois da migração: lista=${JSON.stringify(old.listed)} legado visível=${old.legacyVisible}`,
  })
  // O essencial: nenhum byte do v4 nem do journal de saída mudou.
  const afterOld = await dump(page, namespace, 'sz:v4:')
  expect(afterOld.keys).toEqual(before.keys)
  expect(afterOld.encoded).toBe(before.encoded)
  expect(afterOld.journal).toEqual(before.journal)

  // A v4 volta: tudo o que ela tinha continua, e o que o v3 gravou aparece.
  expect(await open(page, 'current', namespace)).toBe(4)
  const back = await page.evaluate(
    async ({ legacyId, freshId, newId }) => {
      const api = window.storageProof
      const summaries = await api.listAllProjects()
      const legacy = await api.loadProjectById(legacyId)
      const fresh = await api.loadProjectById(freshId)
      const madeByOld = summaries.find(
        (summary) => summary.id === newId || summary.name.startsWith('Feito no v3 depois'),
      )
      const [backup] = await api.listLocalProjectBackups(legacyId)
      const restored = backup ? await api.readLocalProjectBackup(backup) : null
      return {
        legacyName: legacy?.name,
        legacyScript: (legacy?.files as Record<string, string> | undefined)?.['script.js'],
        freshName: fresh?.name,
        madeByOld: madeByOld?.name,
        backupKind: backup?.kind,
        restoredName: restored?.name,
      }
    },
    { legacyId, freshId: created.freshId, newId: old.newId },
  )
  expect(back).toEqual({
    legacyName: 'Editado no v4',
    legacyScript: 'console.log("v4")',
    freshName: 'Nasceu no v4',
    madeByOld: 'Feito no v3 depois',
    backupKind: 'v3',
    restoredName: 'Jogo de antes',
  })
})
