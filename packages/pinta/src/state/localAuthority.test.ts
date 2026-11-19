import { beforeEach, expect, test } from 'bun:test'
import {
  createTilemapAsset,
  createTilesetAsset,
  createVectorBackgroundAsset,
  PINTA_MAX_SCHEMA,
  withPintaSchemaStamp,
} from '../core/project'
import { galleryBackupByteLength, MAX_BACKUP_FILE_BYTES } from '../export/projectJson'
import { clearIdbMock, idbMockDb, setIdbWriteGuard } from '../testing/idbMock'
import { MAX_IMAGE_SRC_CHARS, type VectorShape } from '../vector/model'

const { createPintaPersistence, PintaLocalConflictError, capturePintaAssetForImage } = await import(
  './persistence'
)
const { LOCAL_ASSET_PREFIX } = await import('./localAssetAuthority')

beforeEach(clearIdbMock)

test('026: escrita legada preserva a autoridade5 e recupera RAM4 como cópia', async () => {
  const base = createTilemapAsset({ name: 'vila', tilesetId: 'tiles', cols: 2, rows: 2, now: 1 })
  const precise = withPintaSchemaStamp({
    ...base,
    layers: base.layers.map((l) => ({ ...l, offsetX: 2.5 })),
    updatedAt: 2,
  })
  const a = createPintaPersistence({ namespace: 'local026' })
  await a.persistAsset(precise)
  idbMockDb('sistema-zero-pinta-local026').set(`pinta:asset:${base.id}`, {
    ...base,
    name: 'edição antiga',
    updatedAt: 3,
  })
  const reopened = createPintaPersistence({ namespace: 'local026' })
  expect(await reopened.loadAssetById(base.id)).toEqual(precise)
  const assets = await reopened.listAllAssets()
  expect(assets).toHaveLength(2)
  expect(assets.find((asset) => asset.id !== base.id)?.name).toContain('copia')
})

const map = () => createTilemapAsset({ name: 'vila', tilesetId: 'tiles', cols: 2, rows: 2, now: 1 })
const precise = () => {
  const m = map()
  return withPintaSchemaStamp({
    ...m,
    updatedAt: 2,
    layers: m.layers.map((l) => ({ ...l, offsetX: 2.5 })),
  })
}
const client = () => createPintaPersistence({ namespace: 'cases026' })
const db = () => idbMockDb('sistema-zero-pinta-cases026')

test('a capacidade mínima conserva clientes 5 em documentos compatíveis e protege conteúdo 6', async () => {
  const local = client(),
    base = map()
  await local.persistAsset(base)
  expect(db().get(LOCAL_ASSET_PREFIX + base.id)).toMatchObject({ capability: 5 })
  const current = await local.loadAssetById(base.id)
  if (current?.kind !== 'tilemap') throw new Error('Mapa esperado')
  const version = createTilesetAsset({ name: 'pecas-guardadas', tileSize: 16 })
  await local.persistAsset({
    ...current,
    resources: [{ sourceId: 'original', capturedAt: 1, asset: version }],
  })
  expect(db().get(LOCAL_ASSET_PREFIX + base.id)).toMatchObject({
    capability: 6,
    asset: { schema: 6 },
  })
  await local.deleteAsset(base.id)
  expect(db().get(LOCAL_ASSET_PREFIX + base.id)).toMatchObject({ capability: 5, asset: null })
})

test('026: uma aba anterior não retira colisões do documento 7 e sua edição é recuperada offline', async () => {
  const local = client(),
    base = map()
  await local.persistAsset(base)
  const stale = await client().loadAssetById(base.id)
  if (!stale) throw new Error('Mapa ausente')
  const physical = withPintaSchemaStamp({
    ...base,
    physics: 'precise' as const,
    layers: [
      ...base.layers,
      {
        id: 'walls',
        kind: 'objects' as const,
        name: 'Paredes',
        visible: true,
        objects: [
          {
            id: 'ellipse',
            name: 'Lago',
            type: '',
            x: 1,
            y: 1,
            width: 10,
            height: 8,
            shape: 'ellipse' as const,
            collision: true as const,
            properties: {},
          },
        ],
      },
    ],
  })
  await local.persistAsset(physical)
  expect(db().get(LOCAL_ASSET_PREFIX + base.id)).toMatchObject({
    capability: 7,
    asset: { schema: 7 },
  })
  // A pre-authority tab writes only its legacy mirror, with a later timestamp.
  db().set(`pinta:asset:${base.id}`, {
    ...stale,
    name: 'minha-edicao-antiga',
    updatedAt: Date.now(),
  })
  const reopened = client()
  expect(await reopened.loadAssetById(base.id)).toEqual(physical)
  const recovered = await reopened.listAllAssets()
  expect(recovered).toHaveLength(2)
  expect(recovered.find((asset) => asset.id !== base.id)?.name).toContain('copia')
  expect(recovered.find((asset) => asset.id === base.id)).toEqual(physical)
})

test('rebaixamento deliberado na instância que observou5 continua permitido', async () => {
  const a = client(),
    m = precise()
  await a.persistAsset(m)
  await a.persistAsset({ ...m, layers: m.layers.map(({ offsetX, ...l }) => l), updatedAt: 3 })
  const loaded = await client().loadAssetById(m.id)
  expect(loaded?.kind).toBe('tilemap')
  if (loaded?.kind !== 'tilemap') throw new Error('mapa ausente')
  expect(loaded.layers[0]?.offsetX).toBeUndefined()
  expect(await client().listAllAssets()).toHaveLength(1)
})

test('duas instâncias atuais não substituem a revisão que outra confirmou', async () => {
  const a = client(),
    b = client(),
    m = precise()
  await a.persistAsset(m)
  const old = await b.loadAssetById(m.id)
  if (!old) throw new Error('mapa ausente')
  await a.persistAsset({ ...m, name: 'ganhou', updatedAt: 3 })
  let failure: unknown
  try {
    await b.persistAsset({ ...old, name: 'minha-edicao', updatedAt: 4 })
  } catch (error) {
    failure = error
  }
  expect(failure).toBeInstanceOf(PintaLocalConflictError)
  if (!(failure instanceof PintaLocalConflictError)) throw new Error('conflito ausente')
  expect(failure.forks.get(m.id)?.name).toContain('copia')
  expect((await client().loadAssetById(m.id))?.name).toBe('ganhou')
  expect(await client().listAllAssets()).toHaveLength(2)
})

test('relógios iguais não confundem edição antiga com confirmação atual', async () => {
  const a = client(),
    m = precise()
  await a.persistAsset(m)
  db().set(`pinta:asset:${m.id}`, { ...m, name: 'outra', layers: map().layers })
  const r = client()
  expect((await r.loadAssetById(m.id))?.name).toBe('vila')
  expect(await r.listAllAssets()).toHaveLength(2)
  expect(await r.listAllAssets()).toHaveLength(2)
})

test('lápide impede ressurreição por gravador antigo, preservando sua edição', async () => {
  const a = client(),
    m = precise()
  await a.persistAsset(m)
  await a.deleteAsset(m.id)
  db().set(`pinta:asset:${m.id}`, m)
  const r = client()
  expect(await r.loadAssetById(m.id)).toBeNull()
  const assets = await r.listAllAssets()
  expect(assets).toHaveLength(1)
  expect(assets[0]?.id).not.toBe(m.id)
  expect(db().has(`pinta:asset:${m.id}`)).toBe(false)
})

test('restaurar deliberadamente depois da própria exclusão respeita a revisão', async () => {
  const a = client(),
    m = precise()
  await a.persistAsset(m)
  await a.deleteAsset(m.id)
  // Explicit restore from a backup, not delayed RAM carrying a pre-deletion lineage.
  await a.persistAsset(structuredClone(m))
  expect(structuredClone(await client().loadAssetById(m.id))).toEqual(structuredClone(m))
})

test('exclusão antiga por ID não apaga uma autoridade já promovida', async () => {
  const a = client(),
    m = precise()
  await a.persistAsset(m)
  db().delete(`pinta:asset:${m.id}`)
  expect(await client().loadAssetById(m.id)).toEqual(m)
})

for (const target of ['pinta:asset:', 'pinta:local:'])
  test(`falha de put ${target} aborta autoridade e espelho`, async () => {
    const a = client(),
      m = precise()
    await a.persistAsset(m)
    const before = structuredClone(db())
    setIdbWriteGuard((key) => {
      if (String(key).startsWith(target)) throw new DOMException('quota', 'QuotaExceededError')
    })
    await expect(a.persistAsset({ ...m, name: 'nao-confirmou', updatedAt: 3 })).rejects.toThrow(
      'quota',
    )
    expect(db()).toEqual(before)
    setIdbWriteGuard(null)
    await a.persistAsset({ ...m, name: 'confirmou', updatedAt: 3 })
    expect((await client().loadAssetById(m.id))?.name).toBe('confirmou')
  })

test('falha durante recuperação mantém tanto o checkpoint5 como o espelho antigo', async () => {
  const a = client(),
    m = precise()
  await a.persistAsset(m)
  db().set(`pinta:asset:${m.id}`, { ...map(), id: m.id, name: 'antiga' })
  const before = structuredClone(db())
  setIdbWriteGuard(() => {
    throw new Error('disco cheio')
  })
  await expect(client().loadAssetById(m.id)).rejects.toThrow('disco cheio')
  expect(db()).toEqual(before)
  setIdbWriteGuard(null)
  expect(await client().loadAssetById(m.id)).toEqual(m)
})

for (const future of [{ version: 2 }, { capability: PINTA_MAX_SCHEMA + 1 }])
  test(`envelope futuro ${JSON.stringify(future)} permanece intocado`, async () => {
    const a = client(),
      m = precise()
    await a.persistAsset(m)
    const key = LOCAL_ASSET_PREFIX + m.id,
      raw = db().get(key)
    if (!raw || typeof raw !== 'object') throw new Error('checkpoint ausente')
    db().set(key, { ...raw, ...future })
    const before = structuredClone(db())
    const r = client()
    expect(await r.loadAssetById(m.id)).toBeNull()
    expect(r.getReadIssues?.()).toHaveLength(1)
    await expect(r.persistAsset(m)).rejects.toThrow('Atualize')
    await expect(r.deleteAsset(m.id)).rejects.toThrow('Atualize')
    expect(db()).toEqual(before)
  })

test('checkpoint inválido não é trocado silenciosamente pelo espelho', async () => {
  const a = client(),
    m = precise()
  await a.persistAsset(m)
  db().set(LOCAL_ASSET_PREFIX + m.id, { version: 1, capability: 5, asset: structuredClone(m) })
  const before = structuredClone(db())
  await expect(client().loadAssetById(m.id)).rejects.toThrow('conferir')
  expect(db()).toEqual(before)
})

test('captura usa a autoridade e suas dependências, sem preferir o espelho legado', async () => {
  const a = client(),
    m = precise(),
    ts = createTilesetAsset({ name: 'tiles', tileSize: 16, now: 1 })
  ts.id = m.tilesetId
  await a.persistAssets([ts, m])
  db().set(`pinta:asset:${m.id}`, { ...map(), id: m.id, name: 'antiga' })
  const captured = await capturePintaAssetForImage(m.id, { namespace: 'cases026' })
  expect(captured.ok).toBe(true)
  if (captured.ok) {
    expect(captured.source).toEqual(m)
    expect(captured.tileset?.id).toBe(ts.id)
  }
})

test('outra instância/perfil não recebe documentos nem recuperação deste banco', async () => {
  const m = precise()
  await client().persistAsset(m)
  const other = createPintaPersistence({ namespace: 'outro026' })
  expect(await other.loadAssetById(m.id)).toBeNull()
  expect(await other.listAllAssets()).toEqual([])
})

test('primeira leitura protege o legado antes de receber uma edição de outra aba', async () => {
  const initial = map(),
    a = client()
  db().set(`pinta:asset:${initial.id}`, initial)
  const ram = await a.loadAssetById(initial.id)
  if (ram?.kind !== 'tilemap') throw new Error('Mapa ausente')
  db().set(`pinta:asset:${initial.id}`, { ...initial, name: 'legado-depois-da-leitura' })
  await a.persistAsset({
    ...ram,
    name: 'moderno-promovido',
    layers: ram.layers.map((l) => ({ ...l, offsetX: 2.5 })),
  })
  const assets = await client().listAllAssets()
  expect(assets).toHaveLength(2)
  expect(assets.find((a) => a.id === initial.id)?.name).toBe('moderno-promovido')
  expect(assets.some((a) => a.name === 'legado-depois-da-leitura-copia')).toBe(true)
})

test('releitura parcial conserva avisos de outros documentos futuros', async () => {
  const a = client(),
    m = map()
  await a.persistAsset(m)
  db().set(`${LOCAL_ASSET_PREFIX}futuro`, {
    version: 2,
    capability: PINTA_MAX_SCHEMA + 1,
    revision: 'future',
    asset: null,
  })
  await a.listAllAssets()
  await a.loadAssetById(m.id)
  expect(a.getReadIssues?.().map((i) => i.id)).toEqual(['futuro'])
})

test('listagem não autentica RAM antiga de mapas ligados a outro editor', async () => {
  const a = client(),
    b = client(),
    m = map()
  const ts = createTilesetAsset({ name: 'tiles', tileSize: 16, now: 1 })
  m.tilesetId = ts.id
  await a.persistAssets([ts, m])
  const old = await a.loadAssetById(m.id)
  const other = await b.loadAssetById(m.id)
  if (!old || !other) throw new Error('Mapa ausente')
  await b.persistAsset({ ...other, name: 'outra-aba' })
  await a.listAllAssets()
  await expect(
    a.persistAssets([
      { ...ts, name: 'pecas-editadas' },
      { ...old, name: 'mapa-ligado-antigo' },
    ]),
  ).rejects.toBeInstanceOf(PintaLocalConflictError)
  const all = await a.listAllAssets(),
    recovered = all.find((a) => a.name === 'mapa-ligado-antigo-copia')
  expect(all.find((a) => a.id === m.id)?.name).toBe('outra-aba')
  const copiedTileset = all.find((a) => a.name === 'pecas-editadas-copia')
  expect(copiedTileset).toBeDefined()
  if (!copiedTileset) throw new Error('Peças copiadas ausentes')
  expect(recovered?.kind === 'tilemap' ? recovered.tilesetId : null).toEqual(copiedTileset.id)
  // A fresh read is a new editing lineage, rather than the stale linked snapshot.
  const fresh = await a.loadAssetById(m.id)
  if (!fresh) throw new Error('Mapa ausente')
  await a.persistAsset({ ...fresh, name: 'edicao-da-versao-atual' })
  expect((await a.loadAssetById(m.id))?.name).toBe('edicao-da-versao-atual')
})

test('cada autosave avança apenas a linhagem que gravou; desfazer próprio continua possível', async () => {
  const a = client(),
    m = map()
  await a.persistAsset(m)
  const ram = await a.loadAssetById(m.id)
  if (!ram) throw new Error('Mapa ausente')
  const undo = { ...ram }
  await a.persistAsset({ ...ram, name: 'primeira' })
  await a.persistAsset({ ...ram, name: 'segunda' })
  await a.persistAsset(undo)
  expect(await a.listAllAssets()).toHaveLength(1)
  expect((await a.loadAssetById(m.id))?.name).toBe(m.name)
  expect(JSON.stringify(undo)).not.toContain('localOrigin')
})

test('reinício observa lápide e pode restaurar deliberadamente a sua revisão', async () => {
  const a = client(),
    m = map()
  await a.persistAsset(m)
  await a.deleteAsset(m.id)
  const restarted = client()
  expect(await restarted.loadAssetById(m.id)).toBeNull()
  await restarted.persistAsset({ ...structuredClone(m), name: 'restaurado' })
  expect((await client().loadAssetById(m.id))?.name).toBe('restaurado')
  expect(await client().listAllAssets()).toHaveLength(1)
})

test('lote com formato futuro aborta todos os outros membros', async () => {
  const a = client(),
    m = map(),
    second = map()
  await a.persistAssets([m, second])
  const raw = db().get(LOCAL_ASSET_PREFIX + second.id) as Record<string, unknown>
  db().set(LOCAL_ASSET_PREFIX + second.id, { ...raw, capability: PINTA_MAX_SCHEMA + 1 })
  const before = structuredClone(db())
  await expect(a.persistAssets([{ ...m, name: 'nao-confirma' }, second])).rejects.toThrow(
    'Atualize',
  )
  expect(db()).toEqual(before)
})

test('cópias contam nos32MiB; recusa conserva ambas e apagar libera espaço atomicamente', async () => {
  const a = client(),
    m = precise()
  const large = createVectorBackgroundAsset({ name: 'figuras', width: 16, height: 16 })
  const prefix = 'data:image/png;base64,'
  const src = prefix + 'A'.repeat(MAX_IMAGE_SRC_CHARS - prefix.length)
  const shapes: VectorShape[] = Array.from({ length: 112 }, (_, i) => ({
    id: `figura-${i}`,
    type: 'image',
    x: 0,
    y: 0,
    w: 16,
    h: 16,
    src,
    fill: 'none',
    stroke: null,
    opacity: 1,
    rotation: 0,
  }))
  large.shapes = shapes
  const excess = galleryBackupByteLength([large, m]) - MAX_BACKUP_FILE_BYTES + 64
  const last = shapes.at(-1)
  if (last?.type !== 'image' || excess < 0 || excess >= src.length - prefix.length)
    throw new Error('Fixture de fronteira inválida')
  last.src = last.src.slice(0, last.src.length - Math.ceil(excess / 4) * 4)
  await a.persistAssets([large, m])
  db().set(`pinta:asset:${m.id}`, structuredClone({ ...m, name: 'legado-no-teto' }))
  const before = structuredClone(db())
  await expect(client().listAllAssets()).rejects.toThrow('32 MiB')
  expect(db()).toEqual(before)
  // Recovery is budgeted after the intended reduction, so the user can free space.
  await a.deleteAsset(large.id, large)
  const all = await client().listAllAssets()
  expect(all).toHaveLength(2)
  const canonical = all.find((a) => a.id === m.id)
  expect(canonical?.kind === 'tilemap' ? canonical.schema : null).toBe(5)
  expect(all.some((a) => a.name === 'legado-no-teto-copia')).toBe(true)
})

test('ler lápide em outra instância não autentica RAM com origem anterior à exclusão', async () => {
  const a = client(),
    b = client(),
    m = precise()
  await a.persistAsset(m)
  const old = await a.loadAssetById(m.id)
  await b.loadAssetById(m.id)
  await b.deleteAsset(m.id)
  const restarted = client()
  expect(await restarted.loadAssetById(m.id)).toBeNull()
  if (!old) throw new Error('RAM ausente')
  await expect(restarted.persistAsset({ ...old, name: 'ram-atrasada' })).rejects.toBeInstanceOf(
    PintaLocalConflictError,
  )
  expect(await client().loadAssetById(m.id)).toBeNull()
  expect((await client().listAllAssets()).some((a) => a.name === 'ram-atrasada-copia')).toBe(true)
})
