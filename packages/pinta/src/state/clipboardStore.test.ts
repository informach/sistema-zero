import { describe, expect, it } from 'bun:test'
import { newId } from '../core/id'
import { bmp, rows } from '../testing/fixtures'
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
