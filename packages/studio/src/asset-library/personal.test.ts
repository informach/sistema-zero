import { beforeEach, describe, expect, it, mock } from 'bun:test'

// Mock FUNCIONAL (Map por DB) do idb-keyval — o IndexedDB não existe no
// happy-dom. Como nos demais arquivos da suíte, o mock NÃO é restaurado (o
// registry de module mocks é global; um Map vazio se comporta como o no-op
// para quem vier depois). `update` precisa existir p/ o settingsStore.
type KV = Map<IDBValidKey, unknown>
const dbs = new Map<string, KV>()
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
  setPersonalAssetsNamespace('')
})

describe('savePersonalAsset / listPersonalAssets', () => {
  it('salva, normaliza o nome e lista', async () => {
    const result = await savePersonalAsset({ id: 'a1', name: 'Meu Herói', dataUrl: PNG, width: 8 })
    expect(result).toEqual({ ok: true, name: 'meu-heroi' })
    const listed = await listPersonalAssets()
    expect(listed).toHaveLength(1)
    expect(listed[0]?.name).toBe('meu-heroi')
    expect(listed[0]?.kind).toBe('image')
  })

  it('reenviar o MESMO id é upsert (atualiza, não duplica) e mantém o nome', async () => {
    await savePersonalAsset({ id: 'a1', name: 'heroi', dataUrl: PNG })
    const again = await savePersonalAsset({ id: 'a1', name: 'heroi', dataUrl: `${PNG}BB` })
    expect(again).toEqual({ ok: true, name: 'heroi' })
    const listed = await listPersonalAssets()
    expect(listed).toHaveLength(1)
    expect(listed[0]?.dataUrl).toBe(`${PNG}BB`)
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

describe('removePersonalAsset + namespace', () => {
  it('remove é best-effort e some da lista', async () => {
    await savePersonalAsset({ id: 'a1', name: 'heroi', dataUrl: PNG })
    await removePersonalAsset('a1')
    expect(await listPersonalAssets()).toHaveLength(0)
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
