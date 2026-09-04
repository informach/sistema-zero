import { afterEach, beforeEach, describe, expect, it, mock } from 'bun:test'

// Mock FUNCIONAL (Map por DB) do idb-keyval — o IndexedDB não existe no
// happy-dom. Como nos demais arquivos da suíte, o mock NÃO é restaurado (o
// registry de module mocks é global; um Map vazio se comporta como o no-op
// para quem vier depois). `update` precisa existir p/ o settingsStore.
type KV = Map<IDBValidKey, unknown>
const dbs = new Map<string, KV>()
let failDeletes = false
const kvOf = (store?: { name?: string }): KV => {
  const key = store?.name ?? ''
  let kv = dbs.get(key)
  if (!kv) {
    kv = new Map()
    dbs.set(key, kv)
  }
  return kv
}

mock.module('idb-keyval', () => ({
  createStore: (dbName: string) => ({ name: dbName }),
  get: async (key: IDBValidKey, store?: { name?: string }) => kvOf(store).get(key),
  getMany: async (keys: IDBValidKey[], store?: { name?: string }) =>
    keys.map((key) => kvOf(store).get(key)),
  set: async (key: IDBValidKey, value: unknown, store?: { name?: string }) => {
    kvOf(store).set(key, value)
  },
  setMany: async (pairs: Array<[IDBValidKey, unknown]>, store?: { name?: string }) => {
    for (const [key, value] of pairs) kvOf(store).set(key, value)
  },
  del: async (key: IDBValidKey, store?: { name?: string }) => {
    if (failDeletes) throw new Error('IndexedDB indisponível')
    kvOf(store).delete(key)
  },
  delMany: async (keys: IDBValidKey[], store?: { name?: string }) => {
    for (const key of keys) kvOf(store).delete(key)
  },
  keys: async (store?: { name?: string }) => [...kvOf(store).keys()],
  update: async (
    key: IDBValidKey,
    updater: (old: unknown) => unknown,
    store?: { name?: string },
  ) => {
    const kv = kvOf(store)
    kv.set(key, updater(kv.get(key)))
  },
}))

const {
  listPersonalAssets,
  PERSONAL_ASSET_LIMITS,
  removePersonalAsset,
  savePersonalAsset,
  setPersonalAssetsNamespace,
} = await import('./personal')

const PNG = 'data:image/png;base64,AAAA'

beforeEach(() => {
  dbs.clear()
  failDeletes = false
  setPersonalAssetsNamespace('')
})

afterEach(() => {
  setPersonalAssetsNamespace('')
})

describe('savePersonalAsset / listPersonalAssets', () => {
  it('salva, normaliza o nome e lista', async () => {
    const result = await savePersonalAsset({ id: 'a1', name: 'Meu Herói', dataUrl: PNG, width: 8 })
    expect(result).toEqual({ ok: true, name: 'meu-heroi', updatedAt: expect.any(Number) })
    const listed = await listPersonalAssets()
    expect(listed).toHaveLength(1)
    expect(listed[0]?.name).toBe('meu-heroi')
    expect(listed[0]?.kind).toBe('image')
    expect(listed[0]?.updatedAt).toBe(result.updatedAt)
  })

  it('reenviar o MESMO id é upsert (atualiza, não duplica) e mantém o nome', async () => {
    const first = await savePersonalAsset({ id: 'a1', name: 'heroi', dataUrl: PNG })
    const again = await savePersonalAsset({ id: 'a1', name: 'heroi', dataUrl: `${PNG}BB` })
    expect(first).toEqual({ ok: true, name: 'heroi', updatedAt: expect.any(Number) })
    expect(again).toEqual({ ok: true, name: 'heroi', updatedAt: expect.any(Number) })
    if (first.updatedAt === undefined || again.updatedAt === undefined) {
      throw new Error('O salvamento bem-sucedido precisa devolver a revisão persistida.')
    }
    expect(again.updatedAt).toBeGreaterThan(first.updatedAt)
    const listed = await listPersonalAssets()
    expect(listed).toHaveLength(1)
    expect(listed[0]?.dataUrl).toBe(`${PNG}BB`)
  })

  it('guarda e devolve os metadados do Pinta (animações/tiles), saneados', async () => {
    await savePersonalAsset({
      id: 'a1',
      name: 'heroi',
      dataUrl: PNG,
      sprite: {
        frameW: 16,
        frameH: 16,
        animations: [
          { name: 'andar', from: 0, to: 3, fps: 8, loop: true },
          { name: 'ruim', from: 5, to: 2, fps: 8, loop: false }, // to<from → descartada
        ],
      },
      tileset: { tileSize: 0, solid: [1] }, // tileSize inválido → metadado descartado
    })
    const [asset] = await listPersonalAssets()
    expect(asset?.sprite?.animations.map((a) => a.name)).toEqual(['andar'])
    expect(asset?.tileset).toBeUndefined() // inválido some, mas o desenho fica
  })

  it('guarda e devolve o metadado de MAPA (tilemap) saneado — round-trip', async () => {
    await savePersonalAsset({
      id: 'm1',
      name: 'meu-mapa',
      dataUrl: PNG,
      tilemap: {
        tileSize: 16,
        cols: 2,
        rows: 2,
        grid: '0 1;. 2',
        solid: [2, 1],
        tileset: { dataUrl: PNG, width: 32, height: 16 },
      },
    })
    const [asset] = await listPersonalAssets()
    expect(asset?.tilemap?.grid).toBe('0 1;. 2')
    expect(asset?.tilemap?.solid).toEqual([1, 2])
    expect(asset?.tilemap?.tileset.dataUrl).toBe(PNG)
    // mapa quebrado (sem folha) não derruba o desenho
    await savePersonalAsset({
      id: 'm2',
      name: 'mapa-quebrado',
      dataUrl: PNG,
      tilemap: { tileSize: 16, cols: 2, rows: 2, grid: '0 1' },
    })
    const all = await listPersonalAssets()
    const broken = all.find((a) => a.id === 'm2')
    expect(broken).toBeTruthy()
    expect(broken?.tilemap).toBeUndefined()
  })

  it('colisão de nome com OUTRO desenho ganha sufixo', async () => {
    await savePersonalAsset({ id: 'a1', name: 'heroi', dataUrl: PNG })
    const second = await savePersonalAsset({ id: 'a2', name: 'heroi', dataUrl: PNG })
    expect(second.ok).toBe(true)
    expect(second.name).toBe('heroi-2')
  })

  it('dataUrl que não é imagem → fail-soft {ok:false}', async () => {
    const result = await savePersonalAsset({
      id: 'a1',
      name: 'x',
      dataUrl: 'data:text/html,<script>1</script>',
    })
    expect(result.ok).toBe(false)
    expect(await listPersonalAssets()).toHaveLength(0)
  })

  it('nome inválido e id com ":" são recusados', async () => {
    expect((await savePersonalAsset({ id: 'a1', name: '!!!', dataUrl: PNG })).ok).toBe(false)
    expect((await savePersonalAsset({ id: 'a:b', name: 'ok', dataUrl: PNG })).ok).toBe(false)
  })

  it('teto de contagem barra desenho NOVO mas deixa upsert passar', async () => {
    for (let i = 0; i < PERSONAL_ASSET_LIMITS.maxCount; i += 1) {
      await savePersonalAsset({ id: `d-${i}`, name: `d-${i}`, dataUrl: PNG })
    }
    expect((await savePersonalAsset({ id: 'novo', name: 'novo', dataUrl: PNG })).ok).toBe(false)
    expect((await savePersonalAsset({ id: 'd-0', name: 'd-0', dataUrl: `${PNG}CC` })).ok).toBe(true)
  })

  it('registro corrompido no disco é descartado em silêncio', async () => {
    await savePersonalAsset({ id: 'bom', name: 'bom', dataUrl: PNG })
    kvOf({ name: 'sistema-zero-personal-assets' }).set('asset:podre', { id: 'podre' })
    const listed = await listPersonalAssets()
    expect(listed).toHaveLength(1)
    expect(listed[0]?.id).toBe('bom')
  })
})

describe('binários 3D do Molda na biblioteca (09/2026)', () => {
  const base64DataUrl = (mime: string, bytes: number[]) =>
    `data:${mime};base64,${btoa(String.fromCharCode(...bytes))}`
  const GLB_OK = base64DataUrl(
    'model/gltf-binary',
    [0x67, 0x6c, 0x54, 0x46, 0x02, 0x00, 0x00, 0x00, 0x0c, 0x00, 0x00, 0x00],
  )
  const HDR_OK = base64DataUrl(
    'image/vnd.radiance',
    Array.from(new TextEncoder().encode('#?RADIANCE\nFORMAT=32-bit_rle_rgbe\n')),
  )

  it('modelo .glb e céu .hdr entram com o kind e o nome do arquivo, sem metadados de desenho', async () => {
    const model = await savePersonalAsset({
      id: 'm1',
      name: 'nave',
      kind: 'model3d',
      dataUrl: GLB_OK,
      originalFileName: 'nave.glb',
      // Metadado de DESENHO num binário é ignorado (não existe animação num .glb).
      sprite: { frameW: 8, frameH: 8, animations: [] },
    })
    expect(model.ok).toBe(true)
    const sky = await savePersonalAsset({
      id: 's1',
      name: 'ceu',
      kind: 'environment3d',
      dataUrl: HDR_OK,
      originalFileName: 'ceu.hdr',
    })
    expect(sky.ok).toBe(true)
    const list = await listPersonalAssets()
    const nave = list.find((a) => a.id === 'm1')
    expect(nave?.kind).toBe('model3d')
    expect(nave?.originalFileName).toBe('nave.glb')
    expect(nave?.sprite).toBeUndefined()
    expect(list.find((a) => a.id === 's1')?.kind).toBe('environment3d')
  })

  it('binário com a extensão errada ou sem nome de arquivo é recusado (fail-soft), e um .glb com bytes de HDR também', async () => {
    expect(
      (await savePersonalAsset({ id: 'x1', name: 'x', kind: 'model3d', dataUrl: GLB_OK })).ok,
    ).toBe(false)
    expect(
      (
        await savePersonalAsset({
          id: 'x2',
          name: 'x',
          kind: 'model3d',
          dataUrl: GLB_OK,
          originalFileName: 'x.hdr',
        })
      ).ok,
    ).toBe(false)
    expect(
      (
        await savePersonalAsset({
          id: 'x3',
          name: 'x',
          kind: 'model3d',
          dataUrl: HDR_OK,
          originalFileName: 'x.glb',
        })
      ).ok,
    ).toBe(false)
    expect(await listPersonalAssets()).toEqual([])
  })

  it('a origem `molda` sobrevive ao round-trip (textura do Molda não é desenho do Pinta)', async () => {
    await savePersonalAsset({
      id: 't1',
      name: 'grama',
      kind: 'image',
      origin: 'molda',
      dataUrl: PNG,
    })
    await savePersonalAsset({ id: 'd1', name: 'heroi', dataUrl: PNG })
    const list = await listPersonalAssets()
    expect(list.find((a) => a.id === 't1')?.origin).toBe('molda')
    expect(list.find((a) => a.id === 'd1')?.origin).toBeUndefined()
  })

  it('registro legado sem kind é imagem; kind desconhecido também', async () => {
    await savePersonalAsset({ id: 'd1', name: 'desenho', dataUrl: PNG })
    const list = await listPersonalAssets()
    expect(list[0]?.kind).toBe('image')
    const saved = await savePersonalAsset({
      id: 'd2',
      name: 'outro',
      kind: 'audio' as unknown as 'image',
      dataUrl: PNG,
    })
    expect(saved.ok).toBe(true)
    expect((await listPersonalAssets()).find((a) => a.id === 'd2')?.kind).toBe('image')
  })
})

describe('removePersonalAsset + namespace', () => {
  it('remove é best-effort e some da lista', async () => {
    await savePersonalAsset({ id: 'a1', name: 'heroi', dataUrl: PNG })
    expect(await removePersonalAsset('a1')).toEqual({ ok: true })
    expect(await listPersonalAssets()).toHaveLength(0)
  })

  it('informa a falha e mantém o desenho quando o IndexedDB não remove', async () => {
    await savePersonalAsset({ id: 'a1', name: 'heroi', dataUrl: PNG })
    failDeletes = true

    expect(await removePersonalAsset('a1')).toEqual({
      ok: false,
      error: 'Não consegui excluir agora. Tente de novo daqui a pouco.',
    })
    failDeletes = false
    expect(await listPersonalAssets()).toHaveLength(1)
  })

  it('perfis diferentes não se enxergam', async () => {
    setPersonalAssetsNamespace('perfil-a')
    await savePersonalAsset({ id: 'a1', name: 'do-a', dataUrl: PNG })

    setPersonalAssetsNamespace('perfil-b')
    expect(await listPersonalAssets()).toHaveLength(0)

    setPersonalAssetsNamespace('perfil-a')
    expect(await listPersonalAssets()).toHaveLength(1)
  })
})
