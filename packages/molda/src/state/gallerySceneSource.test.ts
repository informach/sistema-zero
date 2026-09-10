import { expect, test } from 'bun:test'
import { migrateLegacyModel } from '../scene/migrateLegacy'
import { makeModel } from '../testing/fixtures'
import { nativeDatabase } from '../testing/nativeDatabase'
import { createGallerySceneSource } from './gallerySceneSource'
import { createGalleryStore } from './galleryStore'
import { createMemoryPersistence } from './memoryPersistence'
import { createScenePersistence } from './scenePersistence'

async function seeded() {
  const db = await nativeDatabase()
  const persistence = createScenePersistence(db.store)
  const document = migrateLegacyModel({ ...makeModel(), name: 'nave' }).document
  await persistence.save(document, null)
  return { db, persistence, document }
}

test('a galeria lista as duas gerações numa lista só, marcando a geração de cada criação', async () => {
  const { db, document } = await seeded()
  try {
    const legacy = { ...makeModel(), id: 'antigo', name: 'carro', updatedAt: 1 }
    const store = createGalleryStore(createMemoryPersistence([legacy]), {
      scene: createGallerySceneSource(db.store),
    })
    await store.getState().load()
    const assets = store.getState().assets
    expect(assets.map((asset) => asset.id)).toEqual([document.id, 'antigo'])
    expect(assets.map((asset) => asset.formatVersion)).toEqual([2, undefined])
    expect(assets[0]?.name).toBe('nave')
    // A criação da geração seguinte é uma criação como as outras, não um problema de leitura.
    expect(assets[0]?.kind).toBe('model')
  } finally {
    db.close()
  }
})

test('renomear, duplicar e apagar vão para a persistência dona da criação', async () => {
  const { db, persistence, document } = await seeded()
  try {
    const legacy = { ...makeModel(), id: 'antigo', name: 'carro', updatedAt: 1 }
    const memory = createMemoryPersistence([legacy])
    const store = createGalleryStore(memory, { scene: createGallerySceneSource(db.store) })
    await store.getState().load()

    expect(await store.getState().rename(document.id, 'foguete')).toBe('ok')
    const renamed = await persistence.read(document.id)
    expect(renamed.status === 'active' && renamed.document.name).toBe('foguete')
    // A revisão avançou no disco: renomear é uma gravação de verdade, não só estado de tela.
    expect(renamed.status === 'active' && renamed.summary.revision).toBe(2)
    expect(store.getState().getById(document.id)?.name).toBe('foguete')
    // O nome único é conferido nas DUAS gerações.
    expect(await store.getState().rename(document.id, 'carro')).toBe('taken')

    const copy = await store.getState().duplicate(document.id)
    // `thumbDataUrl` só existe no resumo: é o que distingue a cópia da geração seguinte.
    if (!copy || !('thumbDataUrl' in copy)) throw new Error('cópia da geração seguinte esperada')
    expect(copy.name).toBe('foguete-2')
    expect(copy.formatVersion).toBe(2)
    expect(copy.id).not.toBe(document.id)
    expect((await persistence.read(copy.id)).status).toBe('active')

    expect(await store.getState().remove(document.id)).toEqual({ ok: true })
    expect((await persistence.read(document.id)).status).toBe('deleted')
    expect(store.getState().assets.map((asset) => asset.id)).toEqual([copy.id, 'antigo'])
    // A criação antiga continua respondendo pela persistência v1, sem passar pela cena.
    expect(await store.getState().remove('antigo')).toEqual({ ok: true })
    expect(await memory.loadAll()).toEqual([])
  } finally {
    db.close()
  }
})

test('sem a oficina seguinte a galeria não enxerga a geração nova, e nada quebra', async () => {
  const { db } = await seeded()
  try {
    const legacy = { ...makeModel(), id: 'antigo', name: 'carro' }
    const store = createGalleryStore(createMemoryPersistence([legacy]))
    await store.getState().load()
    expect(store.getState().assets.map((asset) => asset.id)).toEqual(['antigo'])
    expect(store.getState().assets[0]?.formatVersion).toBeUndefined()
  } finally {
    db.close()
  }
})

test('a galeria relê quando a oficina seguinte grava, sem ninguém avisar pela persistência v1', async () => {
  const { db, persistence, document } = await seeded()
  try {
    const store = createGalleryStore(createMemoryPersistence([]), {
      scene: createGallerySceneSource(db.store),
    })
    await store.getState().load()
    const detach = store.getState().attachPersistence()
    expect(store.getState().assets[0]?.name).toBe('nave')
    const read = await persistence.read(document.id)
    if (read.status !== 'active') throw new Error('criação ausente')
    await persistence.save({ ...read.document, name: 'nave-nova' }, read.summary.revision)
    await new Promise((resolve) => setTimeout(resolve, 400))
    expect(store.getState().assets[0]?.name).toBe('nave-nova')
    detach()
  } finally {
    db.close()
  }
})
