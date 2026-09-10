import { expect, test } from 'bun:test'
import { migrateLegacyModel } from '../scene/migrateLegacy'
import { makeModel } from '../testing/fixtures'
import { nativeDatabase } from '../testing/nativeDatabase'
import { createMoldaSceneCloudSource } from './sceneCloudSource'
import { createScenePersistence } from './scenePersistence'

async function seeded() {
  const db = await nativeDatabase()
  const persistence = createScenePersistence(db.store)
  const document = migrateLegacyModel({ ...makeModel(), name: 'nave' }).document
  await persistence.save(document, null)
  return { db, persistence, document, source: createMoldaSceneCloudSource(db.store) }
}

test('o que sobe é o documento inteiro, com os pixels, e volta igual pelo leitor', async () => {
  const { db, source, document } = await seeded()
  try {
    const summaries = await source.listSummaries()
    expect(summaries.map((summary) => ({ id: summary.id, v: summary.formatVersion }))).toEqual([
      { id: document.id, v: 2 },
    ])
    const uploaded = await source.read(document.id)
    if (!uploaded) throw new Error('criação ausente')
    expect(uploaded.summary.formatVersion).toBe(2)
    expect(uploaded.summary.name).toBe('nave')
    const raw = JSON.parse(uploaded.json)
    expect(raw.formatVersion).toBe(2)
    expect(raw.id).toBe(document.id)
    // Os pixels viajam em base64: o blob da nuvem não depende do banco de origem.
    expect(typeof raw.images[0].layers[0].pixels).toBe('string')
    expect(await source.read('nao-existe')).toBeNull()
  } finally {
    db.close()
  }
})

test('gravar o que desceu compara o carimbo autoral E a revisão de armazenamento', async () => {
  const { db, source, persistence, document } = await seeded()
  try {
    const uploaded = await source.read(document.id)
    if (!uploaded) throw new Error('criação ausente')
    const other = JSON.stringify({
      ...JSON.parse(uploaded.json),
      name: 'nave-da-nuvem',
      updatedAt: document.updatedAt + 10,
    })
    // Carimbo esperado errado: não grava nada.
    expect(await source.saveIfUnchanged(document.id, other, document.updatedAt + 1)).toBe(false)
    expect((await persistence.read(document.id)).status === 'active').toBe(true)
    expect(await source.saveIfUnchanged(document.id, other, document.updatedAt)).toBe(true)
    const saved = await persistence.read(document.id)
    expect(saved.status === 'active' && saved.document.name).toBe('nave-da-nuvem')
    // Gravar de novo com o carimbo velho não desfaz o que acabou de descer.
    expect(await source.saveIfUnchanged(document.id, uploaded.json, document.updatedAt)).toBe(false)
  } finally {
    db.close()
  }
})

test('JSON quebrado, id trocado ou formato que este cliente não lê nunca viram gravação', async () => {
  const { db, source, persistence, document } = await seeded()
  try {
    const before = await persistence.read(document.id)
    expect(await source.saveIfUnchanged(document.id, '{quebrado', document.updatedAt)).toBe(false)
    const uploaded = await source.read(document.id)
    if (!uploaded) throw new Error('criação ausente')
    const alheio = JSON.stringify({ ...JSON.parse(uploaded.json), id: 'outra-criacao' })
    expect(await source.saveIfUnchanged(document.id, alheio, document.updatedAt)).toBe(false)
    const futuro = JSON.stringify({ ...JSON.parse(uploaded.json), formatVersion: 3 })
    expect(await source.saveIfUnchanged(document.id, futuro, document.updatedAt)).toBe(false)
    const after = await persistence.read(document.id)
    expect(after.status === 'active' && before.status === 'active').toBe(true)
    expect(after.status === 'active' && after.summary.revision).toBe(
      before.status === 'active' ? before.summary.revision : -1,
    )
  } finally {
    db.close()
  }
})

test('apagar exige o carimbo corrente e deixa a lápide da geração seguinte', async () => {
  const { db, source, persistence, document } = await seeded()
  try {
    expect(await source.removeIfUnchanged(document.id, document.updatedAt + 1)).toBe(false)
    expect((await persistence.read(document.id)).status).toBe('active')
    expect(await source.removeIfUnchanged(document.id, document.updatedAt)).toBe(true)
    expect((await persistence.read(document.id)).status).toBe('deleted')
    // Apagar de novo não é sucesso silencioso: não há mais o que comparar.
    expect(await source.removeIfUnchanged(document.id, document.updatedAt)).toBe(false)
    expect(await source.listSummaries()).toEqual([])
  } finally {
    db.close()
  }
})

test('a cópia de conflito nasce com id, nome e carimbo novos, sem tocar a original', async () => {
  const { db, source, persistence, document } = await seeded()
  try {
    const uploaded = await source.read(document.id)
    if (!uploaded) throw new Error('criação ausente')
    const copy = await source.saveCopy(uploaded.json, 'nave-copia', () => 12_345)
    if (!copy) throw new Error('cópia não gravada')
    expect(copy.name).toBe('nave-copia')
    expect(copy.id).not.toBe(document.id)
    expect(copy.updatedAt).toBe(12_345)
    expect(copy.formatVersion).toBe(2)
    const original = await persistence.read(document.id)
    expect(original.status === 'active' && original.document.name).toBe('nave')
    expect((await source.listSummaries()).map((s) => s.name).sort()).toEqual(['nave', 'nave-copia'])
    expect(await source.saveCopy('{quebrado', 'x')).toBeNull()
  } finally {
    db.close()
  }
})

test('gravar o que desceu pode renomear na hora, sem uma segunda gravação', async () => {
  const { db, source, persistence, document } = await seeded()
  try {
    const uploaded = await source.read(document.id)
    if (!uploaded) throw new Error('criação ausente')
    expect(
      await source.saveIfUnchanged(document.id, uploaded.json, document.updatedAt, 'nave-2'),
    ).toBe(true)
    const saved = await persistence.read(document.id)
    expect(saved.status === 'active' && saved.document.name).toBe('nave-2')
    expect(saved.status === 'active' && saved.summary.revision).toBe(2)
  } finally {
    db.close()
  }
})
