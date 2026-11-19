import { describe, expect, it } from 'bun:test'
import * as Blockly from 'blockly/core'
import {
  drawerShortcutDepthForTests,
  installDrawerOriginShortcut,
  OPENING_FONTS_MAX_WAIT_MS,
  waitForOpeningFonts,
} from './openingRender'

installDrawerOriginShortcut()

/** Um bloco sem workspace: a posição de verdade lança (não há gerente de camadas). */
function detachedBlock(): Blockly.BlockSvg {
  const block = Object.create(Blockly.BlockSvg.prototype) as Blockly.BlockSvg
  Object.defineProperty(block, 'workspace', {
    value: { getLayerManager: () => null },
  })
  return block
}

const info = {
  getRenderer: () => ({ getConstants: () => ({}) }),
} as unknown

describe('desenho sem a subida inútil pelo DOM', () => {
  it('o Drawer nasce sem pedir a posição de verdade, e o valor guardado é a origem', () => {
    const renderer = new Blockly.zelos.Renderer('teste')
    const block = detachedBlock()
    expect(() => block.getRelativeToSurfaceXY()).toThrow()
    const drawer = (
      renderer as unknown as { makeDrawer_: (b: unknown, i: unknown) => { topLeft_: unknown } }
    ).makeDrawer_(block, info)
    expect(drawer.topLeft_).toEqual(new Blockly.utils.Coordinate(0, 0))
    expect(drawerShortcutDepthForTests()).toBe(0)
    // Fora da criação do Drawer, a função de sempre.
    expect(() => block.getRelativeToSurfaceXY()).toThrow()
  })

  it('o atalho termina mesmo quando o Drawer lança', () => {
    const renderer = new Blockly.zelos.Renderer('teste')
    expect(() =>
      (renderer as unknown as { makeDrawer_: (b: unknown, i: unknown) => unknown }).makeDrawer_(
        detachedBlock(),
        { getRenderer: () => null },
      ),
    ).toThrow()
    expect(drawerShortcutDepthForTests()).toBe(0)
  })

  it('instalar duas vezes não empilha embrulhos', () => {
    const before = Blockly.BlockSvg.prototype.getRelativeToSurfaceXY
    installDrawerOriginShortcut()
    expect(Blockly.BlockSvg.prototype.getRelativeToSurfaceXY).toBe(before)
  })
})

describe('espera pela fonte antes de abrir', () => {
  const docWith = (fonts: unknown) => ({ fonts }) as unknown as Document

  it('sem fonte carregando, resolve na hora', async () => {
    let resolved = false
    void waitForOpeningFonts(docWith({ status: 'loaded', ready: new Promise(() => {}) })).then(
      () => {
        resolved = true
      },
    )
    await Promise.resolve()
    expect(resolved).toBe(true)
    await waitForOpeningFonts(docWith(undefined))
  })

  it('com fonte carregando, espera o fim dela', async () => {
    let finish!: () => void
    const ready = new Promise<void>((resolve) => {
      finish = resolve
    })
    let resolved = false
    const waiting = waitForOpeningFonts(docWith({ status: 'loading', ready }), 5_000).then(() => {
      resolved = true
    })
    await new Promise((resolve) => setTimeout(resolve, 5))
    expect(resolved).toBe(false)
    finish()
    await waiting
    expect(resolved).toBe(true)
  })

  it('a fonte que nunca chega não segura a abertura além do prazo', async () => {
    const started = performance.now()
    await waitForOpeningFonts(docWith({ status: 'loading', ready: new Promise(() => {}) }), 20)
    expect(performance.now() - started).toBeLessThan(1_000)
    expect(OPENING_FONTS_MAX_WAIT_MS).toBeLessThanOrEqual(1_500)
  })
})
