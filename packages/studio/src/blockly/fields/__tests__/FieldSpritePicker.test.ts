import * as Blockly from 'blockly/core'
import 'blockly/blocks'
import { beforeAll, describe, expect, it } from 'bun:test'
import { gameTwoDBlocks } from '../../../official-extensions/game-2d/blocks'
import { registerExtensionBlocks } from '../../blocks'
import { ensureBlocklyInitialized } from '../../setup'
import { collectSprites } from '../FieldSpritePicker'

describe('FieldSpritePicker.collectSprites — reconhece sprites de QUALQUER criador', () => {
  beforeAll(() => {
    ensureBlocklyInitialized()
    registerExtensionBlocks(gameTwoDBlocks)
  })

  function nameWith(type: string, name: string, ws: Blockly.Workspace): void {
    const b = ws.newBlock(type)
    b.setFieldValue(name, 'NAME')
  }

  it('lista sprites criados por Criar sprite, Criar nave, Criar dinossauro e Pôr o gorila', () => {
    const ws = new Blockly.Workspace()
    nameWith('sz_g2d_create_sprite', 'jogador', ws)
    nameWith('sz_g2d_create_ship', 'nave', ws)
    nameWith('sz_g2d_create_dino', 'dino', ws)
    nameWith('sz_g2d_place_thrower', 'gorila1', ws)

    expect(collectSprites(ws).map((s) => s.name)).toEqual(['jogador', 'nave', 'dino', 'gorila1'])
  })

  it('a miniatura usa a cor do criador (nave = cor do corpo BODY)', () => {
    const ws = new Blockly.Workspace()
    const nave = ws.newBlock('sz_g2d_create_ship')
    nave.setFieldValue('nave', 'NAME')
    nave.setFieldValue('#112233', 'BODY')

    const [sprite] = collectSprites(ws)
    expect(sprite).toMatchObject({ name: 'nave', color: '#112233' })
  })

  it('não repete o mesmo nome e ignora blocos que não criam sprite', () => {
    const ws = new Blockly.Workspace()
    nameWith('sz_g2d_create_sprite', 'jogador', ws)
    nameWith('sz_g2d_create_sprite', 'jogador', ws) // duplicado
    ws.newBlock('sz_g2d_draw_sprite') // usa sprite, não cria

    expect(collectSprites(ws).map((s) => s.name)).toEqual(['jogador'])
  })
})
