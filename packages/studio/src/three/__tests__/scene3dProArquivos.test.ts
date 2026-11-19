import { expect, spyOn, test } from 'bun:test'
import { Scene } from 'three'
import { buildProAssetBundle } from '../../core/proAssets'
import { criarTransporteDeEnsaio } from '../../testing/scene3dTransportFixture'
import { type ArquivoDeCenaPro, criarFonteDeCenasPro } from '../scene3dProArquivos'
import { criarSDKPro } from '../scene3dProBootstrap'

function interceptarFetch(handler: (...args: Parameters<typeof fetch>) => Promise<Response>) {
  return spyOn(globalThis, 'fetch').mockImplementation(
    Object.assign(handler, { preconnect: globalThis.fetch.preconnect }),
  )
}

async function fixture() {
  const { assets } = await criarTransporteDeEnsaio()
  const model = assets.find((a) => a.kind === 'model3d')!
  const all = [...assets, { ...model, id: 'nao-usado', name: 'nao_usado' }]
  const bundle = await buildProAssetBundle(all),
    entries = new Map(bundle.manifest.assets.map((e) => [e.id, e]))
  const files: ArquivoDeCenaPro[] = all.map((a) => {
    const e = entries.get(a.id)!
    return {
      id: a.id,
      name: a.name,
      kind: a.kind,
      source: a.source,
      originalFileName: a.originalFileName,
      dado3d: a.dado3d,
      url: e.url,
      mime: e.mime,
      bytes: e.bytes,
      sha256: e.sha256,
    }
  })
  const byURL = new Map(
    bundle.manifest.assets.map((e) => [
      new URL(e.url, 'http://localhost:5414/').href,
      bundle.files.get(e.path)!,
    ]),
  )
  return { files, byURL, id: assets.find((a) => a.kind === 'scene3d')!.id }
}

test('Pro busca só dependências do cenário, confere bytes/hash e reutiliza o cache sem trocar o SDK global', async () => {
  const f = await fixture(),
    calls: string[] = [],
    original = window.SZScene3D
  const fetcher = interceptarFetch(async (url) => {
    calls.push(String(url))
    const bytes = f.byURL.get(String(url))
    if (!bytes) throw Error('URL inesperada')
    return new Response(new Uint8Array(bytes))
  })
  const sdk = criarSDKPro(f.files, 'http://localhost:5414/'),
    scene = new Scene()
  try {
    const first = await sdk.instalar(f.id, scene, new AbortController().signal)
    expect(first.fisica.active()).toBe(true)
    expect(calls.some((url) => url.endsWith(f.files.find((a) => a.id === 'nao-usado')!.url))).toBe(
      false,
    )
    const count = calls.length
    const second = await sdk.instalar(f.id, scene, new AbortController().signal)
    expect(calls.length).toBe(count)
    expect(first.fisica.active()).toBe(false)
    expect(second.fisica.active()).toBe(true)
    expect(window.SZScene3D).toBe(original)
  } finally {
    sdk.encerrar()
    fetcher.mockRestore()
  }
})

test('bytes adulterados não entram no cache e uma repetição válida usa o carregador canônico', async () => {
  const f = await fixture(),
    life = new AbortController(),
    source = criarFonteDeCenasPro(f.files, 'http://localhost:5414/', life.signal)
  let invalid = true
  const fetcher = interceptarFetch(async (url) => {
    const bytes = new Uint8Array(f.byURL.get(String(url))!)
    expect(bytes.byteLength).toBeGreaterThan(0)
    if (invalid) bytes[0] = bytes[0]! ^ 1
    return new Response(bytes)
  })
  try {
    await expect(source.carregar(f.id, new AbortController().signal)).rejects.toThrow('integridade')
    invalid = false
    expect(
      (await source.carregar(f.id, new AbortController().signal)).some((a) => a.id === f.id),
    ).toBe(true)
    life.abort()
    await expect(source.carregar(f.id, new AbortController().signal)).rejects.toHaveProperty(
      'name',
      'AbortError',
    )
  } finally {
    source.limpar()
    fetcher.mockRestore()
  }
})

test('o fluxo acima do tamanho declarado é cancelado antes de copiar bytes fora do orçamento', async () => {
  const f = await fixture(),
    life = new AbortController(),
    source = criarFonteDeCenasPro(f.files, 'http://localhost:5414/', life.signal)
  let cancelled = false
  const fetcher = interceptarFetch(
    async () =>
      new Response(
        new ReadableStream({
          start(controller) {
            controller.enqueue(new Uint8Array(f.files.find((a) => a.id === f.id)!.bytes + 1))
          },
          cancel() {
            cancelled = true
          },
        }),
      ),
  )
  try {
    await expect(source.carregar(f.id, new AbortController().signal)).rejects.toThrow('tamanho')
    expect(cancelled).toBe(true)
  } finally {
    source.limpar()
    fetcher.mockRestore()
  }
})

test('cancelar durante a leitura encerra o fluxo e não deixa dados parciais no cache', async () => {
  const f = await fixture(),
    vida = new AbortController(),
    controle = new AbortController()
  const fonte = criarFonteDeCenasPro(f.files, 'http://localhost:5414/', vida.signal)
  let cancelou = false
  const fetcher = interceptarFetch(
    async () =>
      new Response(
        new ReadableStream({
          start(controller) {
            controller.enqueue(new Uint8Array([1, 2, 3]))
            queueMicrotask(() => controle.abort())
          },
          cancel() {
            cancelou = true
          },
        }),
      ),
  )
  try {
    await expect(fonte.carregar(f.id, controle.signal)).rejects.toHaveProperty('name', 'AbortError')
    expect(cancelou).toBe(true)
  } finally {
    fonte.limpar()
    fetcher.mockRestore()
  }
})
