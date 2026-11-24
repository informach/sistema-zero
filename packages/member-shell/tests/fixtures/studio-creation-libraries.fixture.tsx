import { afterEach, beforeEach, expect, mock, test } from 'bun:test'
import { GlobalRegistrator } from '@happy-dom/global-registrator'
import type { PintaImageDerivation } from '@sistemazero/core/studio/pinta-image'
import { digestDoDocumentoDeCenario } from '@sistemazero/molda-cenarios-core/compilar'
import { criarDocumentoVazio } from '@sistemazero/molda-cenarios-core/v2'
import type { StudioMoldaLibraryAdapter, StudioPintaLibraryAdapter } from '@sistemazero/studio'

GlobalRegistrator.register({ settings: { disableIframePageLoading: true } })
;(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true
const { act, StrictMode } = await import('react')
const { createRoot } = await import('react-dom/client')
const asset = {
  id: 'drawing',
  name: 'desenho',
  dataUrl: 'data:image/png;base64,AAAA',
  width: 16,
  height: 16,
}
const derivation: PintaImageDerivation = {
  recipe: {
    version: 1,
    algorithm: 'pinta-image-1',
    drawingId: 'drawing',
    selection: { kind: 'frame', animationId: 'andar', frameIndex: 1 },
    scale: 1,
  },
  provenance: { sourceSha256: 'a'.repeat(64), dependencies: [] },
  output: { mime: 'image/png', width: 1, height: 1, bytes: 3, sha256: 'b'.repeat(64) },
}
const image = { dataUrl: 'data:image/png;base64,BBBB', derivation }
const imageRequest = () => ({
  recipe: structuredClone(derivation.recipe),
  limits: {
    dimension: 4096,
    imagePixels: 4194304,
    totalImagePixels: 16777216,
    imageBytes: 16777216,
    dataUrlChars: 800000,
  },
})
let exportGate: Promise<void> = Promise.resolve()
let saveGate: Promise<void> = Promise.resolve()
let entered = Promise.withResolvers<void>()
let saving = Promise.withResolvers<void>()
const exports: Array<
  | {
      namespace?: string
      signal?: AbortSignal
      expectedProvenance?: PintaImageDerivation['provenance']
    }
  | undefined
> = []
const inspections: Array<{
  id: string
  namespace?: string
  signal?: AbortSignal
  selection?: string
}> = []
const lists: Array<
  { namespace?: string; signal?: AbortSignal; includeImageSelection?: boolean } | undefined
> = []
const saves: Array<{ namespace: string; name: string }> = []
const savedValues: Array<typeof asset> = []
const imageRequests: unknown[] = []
const drawingImports: Array<{ json: string; ids: string[]; namespace?: string; origin?: string }> =
  []
let globalNamespaceWrites = 0
const PESSOA_A = '11111111-1111-4111-8111-111111111111',
  PESSOA_B = '22222222-2222-4222-8222-222222222222',
  ESPACO = '33333333-3333-4333-8333-333333333333',
  JOGO = '44444444-4444-4444-8444-444444444444',
  CENA = '55555555-5555-4555-8555-555555555555',
  documento = criarDocumentoVazio(CENA, 'Praça'),
  digestCenario = await digestDoDocumentoDeCenario(documento)
let acessoCenarios: unknown = { aberto: true }
const pedidosCenarios: Array<{ url: string; pessoa: string | null; signal?: AbortSignal | null }> =
    [],
  moldaLists: Array<{ namespace?: string; signal?: AbortSignal }> = [],
  moldaExports: Array<{ namespace?: string; signal?: AbortSignal }> = []
mock.module('../../src/lib/session-fetch', () => ({
  sessionFetch: async (url: string, init?: RequestInit) => {
    const pessoa = new Headers(init?.headers).get('x-sz-viewer')
    pedidosCenarios.push({ url, pessoa, signal: init?.signal })
    init?.signal?.throwIfAborted()
    if (pessoa !== PESSOA_A && pessoa !== PESSOA_B)
      return Response.json({ error: { message: 'Pessoa incorreta' } }, { status: 401 })
    if (url.endsWith('/acesso')) return Response.json(acessoCenarios)
    if (url.endsWith('/exportacao')) {
      entered.resolve()
      await exportGate
      init?.signal?.throwIfAborted()
      return Response.json({
        documento,
        fonte: { cenario: CENA, revisao: 0 },
        digest: digestCenario,
        espacoId: ESPACO,
        contexto: { equipe: true, bibliotecas: [] },
      })
    }
    if (url.endsWith('/espacos'))
      return Response.json([{ id: ESPACO, tipo: 'equipe', usadoBytes: 0, limiteBytes: 1000000 }])
    if (url.endsWith('/mundos'))
      return Response.json([
        {
          id: JOGO,
          espacoId: ESPACO,
          nome: 'Arquipélago',
          cenarios: 1,
          bibliotecas: [],
          capa: null,
          atualizadoEm: '2026-11-19T00:00:00Z',
        },
      ])
    if (url.endsWith('/cenarios'))
      return Response.json([
        {
          id: CENA,
          mundoId: JOGO,
          nome: 'Praça',
          revisao: 0,
          capa: null,
          atualizadoEm: '2026-11-19T00:00:00Z',
        },
      ])
    return Response.json({ error: { message: 'Rota de ensaio não existe' } }, { status: 404 })
  },
}))
mock.module('@sistemazero/molda/studio-library', () => ({
  setMoldaStorageNamespace: () => {
    globalNamespaceWrites++
  },
  listGalleryForStudio: async (options: { namespace?: string; signal?: AbortSignal }) => {
    moldaLists.push(options)
    return []
  },
  exportAssetForStudio: async (
    _id: string,
    options: { namespace?: string; signal?: AbortSignal },
  ) => {
    moldaExports.push(options)
    entered.resolve()
    await exportGate
    return { ok: true, asset: { ...asset, kind: 'image', originalFileName: 'desenho.png' } }
  },
}))
mock.module('@sistemazero/pinta/studio-library', () => ({
  setPintaStorageNamespace: () => {
    globalNamespaceWrites++
  },
  importDrawingsForStudio: async (
    json: string,
    ids: string[],
    options?: { namespace?: string; signal?: AbortSignal; origin?: string },
  ) => {
    drawingImports.push({
      json,
      ids: [...ids],
      namespace: options?.namespace,
      origin: options?.origin,
    })
    if (ids.includes('sumiu'))
      return { ok: false, reason: 'not-found', message: 'Este desenho não está entre os do jogo.' }
    return {
      ok: true,
      drawings: ids.map((sourceId) => ({
        sourceId,
        id: `novo-${sourceId}`,
        name: sourceId,
        imageSelection: { kind: 'background', width: 4, height: 4 },
      })),
    }
  },
  listGalleryForStudio: async (options?: {
    namespace?: string
    signal?: AbortSignal
    includeImageSelection?: boolean
  }) => {
    lists.push(options)
    return []
  },
  inspectImageForStudio: async (
    id: string,
    options?: { namespace?: string; signal?: AbortSignal; selection?: string },
  ) => {
    inspections.push({ id, ...options })
    entered.resolve()
    await exportGate
    return structuredClone(derivation.provenance)
  },
  exportAssetForStudio: async (
    _id: string,
    options?: { namespace?: string; signal?: AbortSignal },
  ) => {
    exports.push(options)
    entered.resolve()
    await exportGate
    return { ok: true, asset }
  },
  exportImageAndSourceForStudio: async (
    recipe: unknown,
    limits: unknown,
    options?: { namespace?: string; signal?: AbortSignal },
  ) => {
    imageRequests.push(structuredClone({ recipe, limits }))
    exports.push(options)
    entered.resolve()
    await exportGate
    return { ok: true, asset, image }
  },
  exportImageForStudio: async (
    recipe: unknown,
    limits: unknown,
    options?: { namespace?: string; signal?: AbortSignal },
  ) => {
    imageRequests.push(structuredClone({ recipe, limits }))
    exports.push(options)
    entered.resolve()
    await exportGate
    return image
  },
}))
mock.module('@sistemazero/studio/personal-assets', () => ({
  savePersonalAsset: async (value: typeof asset, options: { namespace: string }) => {
    saves.push({ namespace: options.namespace, name: value.name })
    savedValues.push(structuredClone(value))
    return { ok: true, name: value.name, updatedAt: 7 }
  },
  savePersonalAssetBundle: async (values: (typeof asset)[], options: { namespace: string }) => {
    for (const value of values) {
      saves.push({ namespace: options.namespace, name: value.name })
      savedValues.push(structuredClone(value))
    }
    saving.resolve()
    await saveGate
    return {
      ok: true,
      assets: values.map((value) => ({ ...value, name: 'desenho-2', updatedAt: 7 })),
    }
  },
}))
const { useStudioCreationLibraries } = await import(
  '../../src/components/creator/use-studio-creation-libraries'
)
const cleanups: Array<() => void> = []
beforeEach(() => {
  exportGate = saveGate = Promise.resolve()
  entered = Promise.withResolvers<void>()
  saving = Promise.withResolvers<void>()
  exports.length = lists.length = saves.length = inspections.length = globalNamespaceWrites = 0
  savedValues.length = imageRequests.length = drawingImports.length = 0
  pedidosCenarios.length = moldaLists.length = moldaExports.length = 0
  acessoCenarios = { aberto: true }
})
afterEach(async () => {
  await act(async () => {
    for (const cleanup of cleanups.splice(0)) cleanup()
  })
})

async function harness() {
  const element = document.createElement('div')
  document.body.append(element)
  const root = createRoot(element)
  let current: StudioPintaLibraryAdapter | undefined
  function Host({ viewer, owned }: { viewer: string; owned: boolean }) {
    current = useStudioCreationLibraries(viewer, owned, false).pintaLibrary
    return null
  }
  let mounted = true
  const unmount = () => {
    if (mounted) {
      mounted = false
      root.unmount()
      element.remove()
    }
  }
  cleanups.push(unmount)
  const render = async (viewer: string, owned = true) => {
    await act(async () => {
      root.render(
        <StrictMode>
          <Host viewer={viewer} owned={owned} />
        </StrictMode>,
      )
    })
  }
  await render('profile-a')
  return { render, unmount, adapter: () => current! }
}

for (const derived of [false, true]) {
  for (const change of ['profile', 'profile-aba', 'possession', 'unmount', 'cancel'] as const) {
    test(`host refuses a pending ${derived ? 'derived' : 'canonical'} import after ${change} without saving into another profile`, async () => {
      const release = Promise.withResolvers<void>()
      exportGate = release.promise
      const h = await harness()
      const controller = new AbortController()
      const pending = h
        .adapter()
        .import('drawing', {
          signal: controller.signal,
          ...(derived ? { image: imageRequest() } : {}),
        })
        .then(
          () => null,
          (error: unknown) => error,
        )
      await entered.promise
      if (change === 'profile' || change === 'profile-aba') {
        await h.render('profile-b')
        if (change === 'profile-aba') await h.render('profile-a')
      } else if (change === 'possession') await h.render('profile-a', false)
      else if (change === 'unmount') await act(async () => h.unmount())
      else controller.abort()
      release.resolve()
      expect(await pending).toBeInstanceOf(DOMException)
      expect(saves).toEqual([])
    })
  }
}

test('host captures the explicit namespace and preserves canonical personal-library output in StrictMode', async () => {
  const h = await harness()
  await h.adapter().list()
  const result = await h.adapter().import('drawing')
  expect(lists[0]?.namespace).toBe('profile-a')
  expect(exports[0]?.namespace).toBe('profile-a')
  expect(globalNamespaceWrites).toBe(0)
  expect(saves).toEqual([{ namespace: 'profile-a', name: 'desenho' }])
  expect(result).toEqual({ ok: true, asset: { ...asset, name: 'desenho-2', libRevision: 7 } })
})

test('preview captures its input and namespace without saving or importing a canonical asset', async () => {
  const release = Promise.withResolvers<void>()
  exportGate = release.promise
  const h = await harness(),
    request = imageRequest(),
    before = structuredClone(request)
  const preview = h.adapter().previewImage
  expect(preview).toBeFunction()
  if (!preview) throw new Error('Portable image preview is required')
  const pending = preview(request.recipe, request.limits)
  await entered.promise
  request.recipe.scale = 2
  release.resolve()
  expect(await pending).toEqual(image)
  expect(imageRequests).toEqual([before])
  expect(exports[0]?.namespace).toBe('profile-a')
  expect(saves).toEqual([])
  expect(savedValues).toEqual([])
})

test('selection facts are opt-in and do not materialize in historical gallery requests', async () => {
  const h = await harness()
  await h.adapter().list()
  await h.adapter().list({ includeImageSelection: true })
  expect(lists[0]).not.toHaveProperty('includeImageSelection')
  expect(lists[1]?.includeImageSelection).toBe(true)
  expect(saves).toEqual([])
})

test('sync inspection captures the profile and never exports or saves', async () => {
  const h = await harness()
  const inspect = h.adapter().inspectImage
  if (!inspect) throw new Error('Portable image inspection is required')
  expect(await inspect('drawing')).toEqual(derivation.provenance)
  expect(inspections.map(({ id, namespace }) => ({ id, namespace }))).toEqual([
    { id: 'drawing', namespace: 'profile-a' },
  ])
  expect(exports).toEqual([])
  expect(saves).toEqual([])
  expect(globalNamespaceWrites).toBe(0)
})

test('sync inspection forwards the selection kind (a map depends on every tileset)', async () => {
  const h = await harness()
  const inspect = h.adapter().inspectImage
  if (!inspect) throw new Error('Portable image inspection is required')
  await inspect('drawing', { selection: 'map' })
  await inspect('drawing')
  expect(inspections[0]?.selection).toBe('map')
  // Without a kind the historical call shape is kept.
  expect(inspections[1]).not.toHaveProperty('selection')
  expect(exports).toEqual([])
})

test('importing example drawings captures the profile and maps the Pinta result', async () => {
  const h = await harness()
  const importDrawings = h.adapter().importDrawings
  if (!importDrawings) throw new Error('Example drawing import is required')
  expect(await importDrawings({ json: '{}', ids: ['jogo-ceu'] })).toEqual({
    ok: true,
    drawings: [
      {
        sourceId: 'jogo-ceu',
        id: 'novo-jogo-ceu',
        name: 'jogo-ceu',
        imageSelection: { kind: 'background', width: 4, height: 4 },
      },
    ],
  })
  await importDrawings({ json: '{}', ids: ['jogo-ceu'], origin: 'example-pygame:jogo' })
  expect(drawingImports.at(-1)?.origin).toBe('example-pygame:jogo')
  drawingImports.pop()
  expect(await importDrawings({ json: '{}', ids: ['sumiu'] })).toEqual({
    ok: false,
    error: 'Este desenho não está entre os do jogo.',
  })
  expect(drawingImports.map(({ ids, namespace }) => ({ ids, namespace }))).toEqual([
    { ids: ['jogo-ceu'], namespace: 'profile-a' },
    { ids: ['sumiu'], namespace: 'profile-a' },
  ])
  // Importing drawings never exports an image nor writes the personal library by itself.
  expect(exports).toEqual([])
  expect(saves).toEqual([])
  expect(globalNamespaceWrites).toBe(0)
})

test('sync preview captures expected provenance before its first await', async () => {
  const h = await harness(),
    request = imageRequest(),
    expected = structuredClone(derivation.provenance)
  const preview = h.adapter().previewImage
  if (!preview) throw new Error('Portable image preview is required')
  const pending = preview(request.recipe, request.limits, { expectedProvenance: expected })
  expected.sourceSha256 = 'c'.repeat(64)
  expect(await pending).toEqual(image)
  expect(exports[0]?.expectedProvenance).toEqual(derivation.provenance)
  expect(saves).toEqual([])
})

for (const change of ['profile', 'profile-aba', 'possession', 'unmount', 'cancel'] as const) {
  test(`read-only inspection refuses a late result after ${change}`, async () => {
    const release = Promise.withResolvers<void>()
    exportGate = release.promise
    const h = await harness(),
      controller = new AbortController()
    const inspect = h.adapter().inspectImage
    if (!inspect) throw new Error('Portable image inspection is required')
    const pending = inspect('drawing', { signal: controller.signal }).then(
      () => null,
      (error: unknown) => error,
    )
    await entered.promise
    if (change === 'profile' || change === 'profile-aba') {
      await h.render('profile-b')
      if (change === 'profile-aba') await h.render('profile-a')
    } else if (change === 'possession') await h.render('profile-a', false)
    else if (change === 'unmount') await act(async () => h.unmount())
    else controller.abort()
    release.resolve()
    expect(await pending).toBeInstanceOf(DOMException)
    expect(inspections[0]?.namespace).toBe('profile-a')
    expect(exports).toEqual([])
    expect(saves).toEqual([])
  })
}

for (const change of ['profile', 'profile-aba', 'possession', 'unmount', 'cancel'] as const) {
  test(`read-only preview refuses a late result after ${change}`, async () => {
    const release = Promise.withResolvers<void>()
    exportGate = release.promise
    const h = await harness(),
      request = imageRequest(),
      controller = new AbortController()
    const preview = h.adapter().previewImage
    expect(preview).toBeFunction()
    if (!preview) throw new Error('Portable image preview is required')
    const pending = preview(request.recipe, request.limits, { signal: controller.signal }).then(
      () => null,
      (error: unknown) => error,
    )
    await entered.promise
    if (change === 'profile' || change === 'profile-aba') {
      await h.render('profile-b')
      if (change === 'profile-aba') await h.render('profile-a')
    } else if (change === 'possession') await h.render('profile-a', false)
    else if (change === 'unmount') await act(async () => h.unmount())
    else controller.abort()
    release.resolve()
    expect(await pending).toBeInstanceOf(DOMException)
    expect(saves).toEqual([])
  })
}

for (const derived of [false, true]) {
  test(`an already requested canonical save stays in its captured profile, but its late ${derived ? 'derived' : 'canonical'} result is revoked`, async () => {
    const release = Promise.withResolvers<void>()
    saveGate = release.promise
    const h = await harness()
    const pending = h
      .adapter()
      .import('drawing', derived ? { image: imageRequest() } : undefined)
      .then(
        () => null,
        (error: unknown) => error,
      )
    await saving.promise
    await h.render('profile-b')
    release.resolve()
    expect(await pending).toBeInstanceOf(DOMException)
    expect(saves).toEqual([{ namespace: 'profile-a', name: 'desenho' }])
    expect(savedValues).toEqual([asset])
  })
}

test('image selection is captured before awaiting; library keeps canonical bytes and caller receives only the PNG', async () => {
  const release = Promise.withResolvers<void>()
  exportGate = release.promise
  const h = await harness(),
    request = imageRequest(),
    before = structuredClone(request)
  const pending = h.adapter().import('drawing', { image: request })
  await entered.promise
  request.recipe.scale = 2
  request.limits.imageBytes = 1
  release.resolve()
  const result = await pending
  expect(imageRequests).toEqual([before])
  expect(exports[0]?.namespace).toBe('profile-a')
  expect(savedValues).toEqual([asset])
  expect(result).toEqual({
    ok: true,
    asset: {
      id: 'drawing',
      name: 'desenho-2',
      dataUrl: image.dataUrl,
      width: 1,
      height: 1,
      pintaImage: derivation,
      libRevision: 7,
    },
  })
})

test('selection for a different drawing is refused before export or any personal save', async () => {
  const h = await harness(),
    request = imageRequest()
  request.recipe.drawingId = 'another'
  const error = await h
    .adapter()
    .import('drawing', { image: request })
    .then(
      () => null,
      (error: unknown) => error,
    )
  expect(error).toBeInstanceOf(Error)
  expect(exports).toEqual([])
  expect(savedValues).toEqual([])
})

async function harnessMolda() {
  const element = document.createElement('div')
  document.body.append(element)
  const root = createRoot(element)
  let current: StudioMoldaLibraryAdapter | undefined,
    mounted = true
  function Host({ pessoa, owned }: { pessoa: string; owned: boolean }) {
    current = useStudioCreationLibraries(`adult:${pessoa}`, false, owned, pessoa).moldaLibrary
    return null
  }
  const unmount = () => {
    if (mounted) {
      mounted = false
      root.unmount()
      element.remove()
    }
  }
  cleanups.push(unmount)
  const render = async (pessoa: string, owned = true) => {
    await act(async () => {
      root.render(
        <StrictMode>
          <Host pessoa={pessoa} owned={owned} />
        </StrictMode>,
      )
    })
  }
  await render(PESSOA_A)
  return {
    render,
    unmount,
    adapter: () => {
      if (!current) throw Error('Adapter ausente no ensaio')
      return current
    },
  }
}

test('Molda legado usa o namespace explícito e nenhum setter global', async () => {
  const h = await harnessMolda()
  await h.adapter().list()
  expect((await h.adapter().import('drawing')).ok).toBe(true)
  expect(moldaLists[0]?.namespace).toBe(`adult:${PESSOA_A}`)
  expect(moldaExports[0]?.namespace).toBe(`adult:${PESSOA_A}`)
  expect(saves[0]?.namespace).toBe(`adult:${PESSOA_A}`)
  expect(globalNamespaceWrites).toBe(0)
})

test('cenários usam o ID da pessoa no HTTP, compilam de verdade e não gravam personal-assets', async () => {
  const h = await harnessMolda(),
    fonte = h.adapter().cenarios!
  expect(await fonte.disponivel({ signal: new AbortController().signal })).toBe(true)
  const lista = await fonte.listar({ signal: new AbortController().signal })
  expect(lista[0]?.jogo.nome).toBe('Arquipélago')
  const resultado = await fonte.preparar(CENA, 0, {
    signal: new AbortController().signal,
    juntar: false,
  })
  expect(resultado.pacote.cena.fonte.digest).toBe(digestCenario)
  expect(resultado.pacote.arquivos.size).toBeGreaterThan(0)
  expect(pedidosCenarios.every((p) => p.pessoa === PESSOA_A)).toBe(true)
  expect(pedidosCenarios.filter((p) => p.url.endsWith('/exportacao'))).toHaveLength(2)
  expect(saves).toEqual([])
  expect(globalNamespaceWrites).toBe(0)
})

test('disponibilidade exige booleano confirmado pelo servidor e aceita uma recusa normal', async () => {
  const h = await harnessMolda(),
    fonte = h.adapter().cenarios!
  acessoCenarios = { aberto: 'sim' }
  await expect(fonte.disponivel({ signal: new AbortController().signal })).rejects.toThrow(
    'não confirmou',
  )
  acessoCenarios = { aberto: false }
  expect(await fonte.disponivel({ signal: new AbortController().signal })).toBe(false)
})

for (const change of ['profile', 'profile-aba', 'possession', 'unmount', 'cancel'] as const) {
  test(`preparo de cenário do host é cancelado após ${change}, antes de entregar qualquer pacote`, async () => {
    const h = await harnessMolda(),
      release = Promise.withResolvers<void>(),
      controller = new AbortController()
    exportGate = release.promise
    const pending = h
      .adapter()
      .cenarios!.preparar(CENA, 0, { signal: controller.signal, juntar: false })
      .then(
        () => null,
        (e: unknown) => e,
      )
    await entered.promise
    if (change === 'profile' || change === 'profile-aba') {
      await h.render(PESSOA_B)
      if (change === 'profile-aba') await h.render(PESSOA_A)
    } else if (change === 'possession') await h.render(PESSOA_A, false)
    else if (change === 'unmount') await act(async () => h.unmount())
    else controller.abort()
    release.resolve()
    expect(await pending).toBeInstanceOf(DOMException)
    expect(saves).toEqual([])
    expect(pedidosCenarios.every((p) => p.pessoa === PESSOA_A)).toBe(true)
    expect(pedidosCenarios[0]?.signal?.aborted).toBe(true)
  })
}
