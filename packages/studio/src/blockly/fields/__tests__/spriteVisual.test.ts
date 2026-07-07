import * as Blockly from 'blockly/core'
import 'blockly/blocks'
import { beforeAll, describe, expect, it } from 'bun:test'
import { gameTwoDBlocks } from '../../../official-extensions/game-2d/blocks'
import { registerExtensionBlocks } from '../../blocks'
import { ensureBlocklyInitialized } from '../../setup'
import { isSpriteDeclEvent, refreshSpriteThumbs, resolveSpriteVisual } from '../FieldSpritePicker'

/** Injeta o acessor de assets POR INSTÂNCIA (o que o BlocklyPanel faz no inject). */
function withAssets(ws: Blockly.Workspace, assets: unknown[]): void {
  ;(ws as unknown as { __szAssets?: () => unknown[] }).__szAssets = () => assets
}

const HERO_DATA_URL = 'data:image/png;base64,aGVyb2k='

describe('resolveSpriteVisual — visual da miniatura no bloco', () => {
  beforeAll(() => {
    ensureBlocklyInitialized()
    registerExtensionBlocks(gameTwoDBlocks)
  })

  it('sprite de COR → swatch da cor escolhida', () => {
    const ws = new Blockly.Workspace()
    const b = ws.newBlock('sz_g2d_create_sprite')
    b.setFieldValue('jogador', 'NAME')
    b.setFieldValue('#112233', 'COLOR')

    expect(resolveSpriteVisual('jogador', ws)).toEqual({ color: '#112233' })
  })

  it('sprite de IMAGEM → dataUrl do asset resolvida via __szAssets', () => {
    const ws = new Blockly.Workspace()
    withAssets(ws, [{ id: '1', name: 'heroi', kind: 'image', dataUrl: HERO_DATA_URL }])
    const b = ws.newBlock('sz_g2d_create_image_sprite')
    b.setFieldValue('jogador', 'NAME')
    b.setFieldValue('heroi', 'IMAGE')

    expect(resolveSpriteVisual('jogador', ws)).toEqual({ image: HERO_DATA_URL })
  })

  it('asset apagado/renomeado sem cor → null (campo volta a ser só texto)', () => {
    const ws = new Blockly.Workspace()
    withAssets(ws, [])
    const b = ws.newBlock('sz_g2d_create_image_sprite')
    b.setFieldValue('jogador', 'NAME')
    b.setFieldValue('sumiu', 'IMAGE')

    expect(resolveSpriteVisual('jogador', ws)).toBeNull()
  })

  it('sprite de KIT (nave) → cor do corpo BODY', () => {
    const ws = new Blockly.Workspace()
    const b = ws.newBlock('sz_g2d_create_ship')
    b.setFieldValue('nave', 'NAME')
    b.setFieldValue('#445566', 'BODY')

    expect(resolveSpriteVisual('nave', ws)).toEqual({ color: '#445566' })
  })

  it('nome desconhecido (local de laço / digitado livre) → null', () => {
    const ws = new Blockly.Workspace()
    expect(resolveSpriteVisual('asteroide', ws)).toBeNull()
    expect(resolveSpriteVisual('', ws)).toBeNull()
    expect(resolveSpriteVisual(null, ws)).toBeNull()
    expect(resolveSpriteVisual('x', null)).toBeNull()
  })

  it('o cache invalida via refreshSpriteThumbs (mudança de cor re-resolve)', () => {
    const ws = new Blockly.Workspace()
    const b = ws.newBlock('sz_g2d_create_sprite')
    b.setFieldValue('jogador', 'NAME')
    b.setFieldValue('#112233', 'COLOR')
    expect(resolveSpriteVisual('jogador', ws)).toEqual({ color: '#112233' })

    b.setFieldValue('#aabbcc', 'COLOR')
    // Sem refresh, o cache ainda serve o visual antigo…
    expect(resolveSpriteVisual('jogador', ws)).toEqual({ color: '#112233' })
    // …e o refresh (o que o watcher agenda) invalida e re-resolve.
    refreshSpriteThumbs(ws)
    expect(resolveSpriteVisual('jogador', ws)).toEqual({ color: '#aabbcc' })
  })
})

describe('isSpriteDeclEvent — filtro dos eventos que mexem nas miniaturas', () => {
  beforeAll(() => {
    ensureBlocklyInitialized()
    registerExtensionBlocks(gameTwoDBlocks)
  })

  const typeOf =
    (map: Record<string, string>) =>
    (id: string): string | undefined =>
      map[id]

  it('FINISHED_LOADING sempre refresca (consumidores renderizam antes dos declaradores)', () => {
    expect(isSpriteDeclEvent({ type: Blockly.Events.FINISHED_LOADING }, typeOf({}))).toBe(true)
  })

  it('BLOCK_CHANGE de campo visual (COLOR/IMAGE/NAME/BODY) num DECLARADOR → true', () => {
    for (const name of ['NAME', 'COLOR', 'IMAGE', 'BODY']) {
      const e = { type: Blockly.Events.BLOCK_CHANGE, element: 'field', name, blockId: 'b1' }
      expect(isSpriteDeclEvent(e, typeOf({ b1: 'sz_g2d_create_sprite' }))).toBe(true)
    }
  })

  it('BLOCK_CHANGE num CONSUMIDOR, noutro campo, ou sem element field → false', () => {
    const decl = typeOf({ b1: 'sz_g2d_draw_sprite' })
    expect(
      isSpriteDeclEvent(
        { type: Blockly.Events.BLOCK_CHANGE, element: 'field', name: 'COLOR', blockId: 'b1' },
        decl,
      ),
    ).toBe(false)
    expect(
      isSpriteDeclEvent(
        { type: Blockly.Events.BLOCK_CHANGE, element: 'field', name: 'X', blockId: 'b1' },
        typeOf({ b1: 'sz_g2d_create_sprite' }),
      ),
    ).toBe(false)
    expect(
      isSpriteDeclEvent(
        { type: Blockly.Events.BLOCK_CHANGE, element: 'collapsed', blockId: 'b1' },
        typeOf({ b1: 'sz_g2d_create_sprite' }),
      ),
    ).toBe(false)
  })

  it('BLOCK_CREATE/DELETE com declarador no JSON (inclusive ANINHADO) → true', () => {
    expect(
      isSpriteDeclEvent(
        { type: Blockly.Events.BLOCK_CREATE, json: { type: 'sz_g2d_create_sprite' } },
        typeOf({}),
      ),
    ).toBe(true)
    // Undo de um delete restaura a PILHA inteira — o declarador pode vir aninhado.
    expect(
      isSpriteDeclEvent(
        {
          type: Blockly.Events.BLOCK_CREATE,
          json: {
            type: 'sz_g2d_on_start',
            next: { block: { type: 'sz_g2d_create_sprite' } },
          },
        },
        typeOf({}),
      ),
    ).toBe(true)
    expect(
      isSpriteDeclEvent(
        { type: Blockly.Events.BLOCK_DELETE, oldJson: { type: 'sz_g2d_create_ship' } },
        typeOf({}),
      ),
    ).toBe(true)
    expect(
      isSpriteDeclEvent(
        { type: Blockly.Events.BLOCK_CREATE, json: { type: 'sz_g2d_draw_sprite' } },
        typeOf({}),
      ),
    ).toBe(false)
  })
})
