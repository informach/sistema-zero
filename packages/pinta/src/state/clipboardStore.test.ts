import { describe, expect, it } from 'bun:test'
import { newId } from '../core/id'
import { createPixelSpriteAsset } from '../core/project'
import { bmp, rows } from '../testing/fixtures'
import { createMapObject } from '../tiles/mapObjects'
import type { VectorShape } from '../vector/model'
import {
  CLIPBOARD_MIRROR_MAX_CHARS,
  CLIPBOARD_STORAGE_KEY,
  type ClipboardMirror,
  createClipboardStore,
  parseClipboardMirror,
} from './clipboardStore'

/** Um `localStorage` de mentira: Map com a mesma API. */
function fakeMirror(): ClipboardMirror & { map: Map<string, string> } {
  const map = new Map<string, string>()
  return {
    map,
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => {
      map.set(key, value)
    },
    removeItem: (key) => {
      map.delete(key)
    },
  }
}

function rect(id = newId()): VectorShape {
  return {
    id,
    type: 'rect',
    x: 1,
    y: 2,
    w: 10,
    h: 20,
    rx: 0,
    fill: '#ff0000',
    stroke: null,
    opacity: 1,
    rotation: 0,
  }
}

describe('clipboardStore (área de transferência do app)', () => {
  it('objetos com versões e animações usam espelho 2 sem perder os bytes das artes', () => {
    const mirror = fakeMirror(),
      source = createPixelSpriteAsset({ name: 'arvore', frameSize: 16 })
    source.animations[0]!.frames[0]![0]!.data[0] = 3
    const object = createMapObject({
      shape: 'art',
      art: { assetId: source.id, animationId: source.animations[0]!.id },
    })
    createClipboardStore({ mirror })
      .getState()
      .set({
        kind: 'objects',
        objects: [object],
        resources: [{ sourceId: 'original-tree', capturedAt: 100, asset: source }],
      })
    const text = mirror.getItem(CLIPBOARD_STORAGE_KEY)!
    const raw = JSON.parse(text)
    expect(raw.v).toBe(2)
    const restored = createClipboardStore({ mirror }).getState().get()
    expect(restored).toEqual({
      kind: 'objects',
      objects: [object],
      resources: [{ sourceId: 'original-tree', capturedAt: 100, asset: source }],
    })
    expect(parseClipboardMirror(JSON.stringify({ ...raw, v: 1 }))).toBeNull()
    raw.resources[0].asset.schema = 99
    expect(parseClipboardMirror(JSON.stringify(raw))).toBeNull()
  })
  it('pixel: o que uma instância guarda, OUTRA instância lê pelo espelho (aba nova)', () => {
    const mirror = fakeMirror()
    const a = createClipboardStore({ mirror })
    a.getState().set({
      kind: 'pixel',
      bitmap: bmp(['12', '.3']),
      colors: ['', '#ffffff', '#ff0000', '#00ff00'],
    })

    const b = createClipboardStore({ mirror })
    const item = b.getState().get()
    expect(item?.kind).toBe('pixel')
    if (item?.kind === 'pixel') {
      expect(rows(item.bitmap)).toEqual(['12', '.3'])
      expect(item.colors).toEqual(['', '#ffffff', '#ff0000', '#00ff00'])
    }
  })

  it('dois perfis na mesma origem não compartilham o clipboard persistente', () => {
    const mirror = fakeMirror()
    const alice = createClipboardStore({ mirror, namespace: 'perfil-alice' })
    alice.getState().set({ kind: 'pixel', bitmap: bmp(['1']), colors: ['', '#ffffff'] })

    const bob = createClipboardStore({ mirror, namespace: 'perfil-bob' })
    expect(bob.getState().get()).toBeNull()
    expect(createClipboardStore({ mirror, namespace: 'perfil-alice' }).getState().get()?.kind).toBe(
      'pixel',
    )
  })

  it('formas: shapes e o tamanho do documento de origem atravessam o espelho saneados', () => {
    const mirror = fakeMirror()
    const a = createClipboardStore({ mirror })
    a.getState().set({ kind: 'shapes', shapes: [rect('abc123')], width: 480, height: 360 })

    const b = createClipboardStore({ mirror })
    const item = b.getState().get()
    expect(item?.kind).toBe('shapes')
    if (item?.kind === 'shapes') {
      expect(item.width).toBe(480)
      expect(item.height).toBe(360)
      expect(item.shapes.map((s) => s.id)).toEqual(['abc123'])
    }
  })

  it('sem espelho (aula) fica SÓ na memória: outra instância não vê nada', () => {
    const a = createClipboardStore({ mirror: null })
    a.getState().set({ kind: 'pixel', bitmap: bmp(['1']), colors: ['', '#ffffff'] })
    expect(a.getState().get()?.kind).toBe('pixel')
    const b = createClipboardStore({ mirror: null })
    expect(b.getState().get()).toBeNull()
  })

  it('entre a memória e o espelho vence o MAIS RECENTE (copiar na aba B, colar na A)', () => {
    const mirror = fakeMirror()
    let clock = 1000
    const now = () => clock
    const a = createClipboardStore({ mirror, now })
    const b = createClipboardStore({ mirror, now })
    a.getState().set({ kind: 'pixel', bitmap: bmp(['1']), colors: ['', '#ffffff'] })
    clock = 2000
    b.getState().set({ kind: 'pixel', bitmap: bmp(['22']), colors: ['', '#ffffff', '#ff0000'] })

    const seen = a.getState().get()
    expect(seen?.kind).toBe('pixel')
    if (seen?.kind === 'pixel') expect(rows(seen.bitmap)).toEqual(['22'])

    // E a memória de A NÃO volta a vencer o espelho num get seguinte.
    const again = a.getState().get()
    if (again?.kind === 'pixel') expect(rows(again.bitmap)).toEqual(['22'])
  })

  it('grande demais para o espelho: fica na memória e o espelho antigo é limpo', () => {
    const mirror = fakeMirror()
    const store = createClipboardStore({ mirror })
    store.getState().set({ kind: 'pixel', bitmap: bmp(['1']), colors: ['', '#ffffff'] })
    expect(mirror.map.has(CLIPBOARD_STORAGE_KEY)).toBe(true)

    // Uma figura vetorial com `src` gigante estoura o teto do espelho.
    const big: VectorShape = {
      id: 'img1',
      type: 'image',
      x: 0,
      y: 0,
      w: 10,
      h: 10,
      src: `data:image/png;base64,${'A'.repeat(CLIPBOARD_MIRROR_MAX_CHARS)}`,
      pixelated: true,
      fill: 'none',
      stroke: null,
      opacity: 1,
      rotation: 0,
    }
    store.getState().set({ kind: 'shapes', shapes: [big], width: 32, height: 32 })
    expect(store.getState().get()?.kind).toBe('shapes')
    expect(mirror.map.has(CLIPBOARD_STORAGE_KEY)).toBe(false)
  })

  it('espelho corrompido ou de outro formato é ignorado (nunca lança)', () => {
    expect(parseClipboardMirror('{lixo')).toBeNull()
    expect(parseClipboardMirror(JSON.stringify({ v: 2, at: 1, kind: 'pixel' }))).toBeNull()
    expect(
      parseClipboardMirror(JSON.stringify({ v: 1, at: 1, kind: 'pixel', bitmap: 'x', colors: [] })),
    ).toBeNull()
    expect(
      parseClipboardMirror(
        JSON.stringify({
          v: 1,
          at: 1,
          kind: 'shapes',
          shapes: [{ id: 'a' }],
          width: 10,
          height: 10,
        }),
      ),
    ).toBeNull()
    const mirror = fakeMirror()
    mirror.setItem(CLIPBOARD_STORAGE_KEY, 'não é json')
    expect(createClipboardStore({ mirror }).getState().get()).toBeNull()
  })

  it('espelho que LANÇA ao ler/gravar não derruba o copiar nem o colar', () => {
    const angry: ClipboardMirror = {
      getItem: () => {
        throw new Error('quota')
      },
      setItem: () => {
        throw new Error('quota')
      },
      removeItem: () => {
        throw new Error('quota')
      },
    }
    const store = createClipboardStore({ mirror: angry })
    store.getState().set({ kind: 'pixel', bitmap: bmp(['1']), colors: ['', '#ffffff'] })
    expect(store.getState().get()?.kind).toBe('pixel')
    store.getState().clear()
    expect(store.getState().get()).toBeNull()
  })

  it('falha ao gravar limpa somente o espelho do perfil atual', () => {
    const mirror = fakeMirror()
    const aliceKey = `${CLIPBOARD_STORAGE_KEY}:alice`
    const bobKey = `${CLIPBOARD_STORAGE_KEY}:bob`
    mirror.map.set(aliceKey, 'alice antigo')
    mirror.map.set(bobKey, 'bob intacto')
    mirror.map.set(CLIPBOARD_STORAGE_KEY, 'legado intacto')
    mirror.setItem = () => {
      throw new Error('quota')
    }

    const alice = createClipboardStore({ mirror, namespace: 'alice' })
    alice.getState().set({ kind: 'pixel', bitmap: bmp(['1']), colors: ['', '#ffffff'] })

    expect(mirror.map.has(aliceKey)).toBe(false)
    expect(mirror.map.get(bobKey)).toBe('bob intacto')
    expect(mirror.map.get(CLIPBOARD_STORAGE_KEY)).toBe('legado intacto')
  })
})

describe('clipboardStore com objetos do mapa (`kind: objects`)', () => {
  const objeto = (extra: Record<string, unknown> = {}) => ({
    id: newId(),
    name: 'porta',
    type: 'porta',
    x: 16,
    y: 32,
    width: 16,
    height: 16,
    properties: {},
    ...extra,
  })

  it('o que uma aba copia, outra cola: forma, giro, papel e propriedade tipada atravessam o espelho', () => {
    const mirror = fakeMirror()
    const a = createClipboardStore({ mirror })
    const copiados = [
      objeto({
        shape: 'polygon',
        points: [
          { x: 0, y: 0 },
          { x: 8, y: 8 },
          { x: 0, y: 8 },
        ],
        rotation: 90,
        flipX: true,
        role: 'door',
        properties: { vida: { type: 'int', value: 3 }, cor: { type: 'color', value: '#ff0000' } },
      }),
      objeto({ shape: 'art', art: { assetId: 'heroi', tile: 2 } }),
    ]
    a.getState().set({ kind: 'objects', objects: copiados as never })

    const item = createClipboardStore({ mirror }).getState().get()
    expect(item?.kind).toBe('objects')
    if (item?.kind !== 'objects') throw new Error('esperava objetos')
    expect(item.objects).toEqual(copiados as never)
  })

  it('o espelho é lido com o rigor do sanitizador: lixo cai, id repetido não passa', () => {
    const texto = (objects: unknown) => JSON.stringify({ v: 1, at: 5, kind: 'objects', objects })
    const bom = objeto()
    const lido = parseClipboardMirror(
      texto([
        bom,
        { ...objeto(), x: 'torto' },
        { ...objeto(), id: '' },
        objeto({ shape: 'inventada', role: 'rei', rotation: Number.NaN }),
        null,
      ]),
    )
    expect(lido?.item.kind).toBe('objects')
    if (lido?.item.kind !== 'objects') throw new Error('esperava objetos')
    // O bom e o de forma/papel inventados (que voltam como objeto simples); os tortos caem.
    expect(lido.item.objects).toHaveLength(2)
    expect(lido.item.objects[0]).toEqual(bom as never)
    for (const chave of ['shape', 'role', 'rotation'])
      expect(chave in (lido.item.objects[1] ?? {})).toBe(false)
    expect(lido.at).toBe(5)
    // Dois objetos com o mesmo id não entram no mesmo mapa com o mesmo id.
    const repetidos = parseClipboardMirror(texto([bom, { ...bom }]))
    if (repetidos?.item.kind !== 'objects') throw new Error('esperava objetos')
    expect(new Set(repetidos.item.objects.map((o) => o.id)).size).toBe(
      repetidos.item.objects.length,
    )
  })

  it('lista vazia, ou que não é lista, conta como área de transferência vazia', () => {
    for (const objects of [[], 'texto', null, [{ nada: true }]])
      expect(
        parseClipboardMirror(JSON.stringify({ v: 1, at: 1, kind: 'objects', objects })),
      ).toBeNull()
  })

  it('entre a memória e o espelho vence o mais recente, também para objetos', () => {
    const mirror = fakeMirror()
    let agora = 100
    const a = createClipboardStore({ mirror, now: () => agora })
    const b = createClipboardStore({ mirror, now: () => agora })
    a.getState().set({ kind: 'objects', objects: [objeto({ name: 'velho' })] as never })
    agora = 200
    b.getState().set({ kind: 'objects', objects: [objeto({ name: 'novo' })] as never })
    const item = a.getState().get()
    expect(item?.kind === 'objects' && item.objects[0]?.name).toBe('novo')
  })

  it('sem espelho (bloco de aula) os objetos ficam só na memória daquela instância', () => {
    const a = createClipboardStore({ mirror: null })
    a.getState().set({ kind: 'objects', objects: [objeto()] as never })
    expect(a.getState().get()?.kind).toBe('objects')
    expect(createClipboardStore({ mirror: null }).getState().get()).toBeNull()
    a.getState().clear()
    expect(a.getState().get()).toBeNull()
  })
})
