import * as Blockly from 'blockly/core'
import 'blockly/blocks'
import { beforeAll, describe, expect, it } from 'bun:test'
import { gameTwoDBlocks } from '../../../official-extensions/game-2d/blocks'
import { registerExtensionBlocks } from '../../blocks'
import { ensureBlocklyInitialized } from '../../setup'
import { collectScopedSpriteNames, collectSprites } from '../FieldSpritePicker'

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

describe('collectScopedSpriteNames — sprites LOCAIS do laço-pai em escopo', () => {
  beforeAll(() => {
    ensureBlocklyInitialized()
    registerExtensionBlocks(gameTwoDBlocks)
  })

  /** Encaixa `child` no corpo (BODY) de `parent`. */
  function nestInBody(parent: Blockly.Block, child: Blockly.Block): void {
    parent.getInput('BODY')?.connection?.connect(child.previousConnection as Blockly.Connection)
  }

  it('vê o nome "chamado" do laço-pai (on_sprite_group_overlap → ANAME)', () => {
    const ws = new Blockly.Workspace()
    const loop = ws.newBlock('sz_g2d_on_sprite_group_overlap')
    loop.setFieldValue('asteroide', 'ANAME')
    const inner = ws.newBlock('sz_g2d_remove_from_group')
    nestInBody(loop, inner)

    expect(collectScopedSpriteNames(inner)).toEqual(['asteroide'])
  })

  it('vê os DOIS nomes do overlap de grupos (ANAME + BNAME) e junta laços aninhados', () => {
    const ws = new Blockly.Workspace()
    const outer = ws.newBlock('sz_g2d_on_group_overlap')
    outer.setFieldValue('tiro', 'ANAME')
    outer.setFieldValue('alvo', 'BNAME')
    const inner = ws.newBlock('sz_g2d_for_each_in_group')
    inner.setFieldValue('cada', 'ITEM')
    nestInBody(outer, inner)
    const leaf = ws.newBlock('sz_g2d_remove_from_group')
    nestInBody(inner, leaf)

    expect(collectScopedSpriteNames(leaf)).toEqual(['cada', 'tiro', 'alvo'])
  })

  it.each([
    ['sz_g2d_on_enemy_defeated', 'inimigoDerrotado'],
    ['sz_g2d_on_enemy_shot_hit', 'tiroInimigo'],
  ])('vê o sprite local declarado pelo callback %s', (type, localName) => {
    const ws = new Blockly.Workspace()
    const callback = ws.newBlock(type)
    callback.setFieldValue(localName, 'ANAME')
    const body = ws.newBlock('sz_g2d_remove_from_group')
    nestInBody(callback, body)

    expect(collectScopedSpriteNames(body)).toEqual([localName])
  })

  it('fora de qualquer laço → nenhum sprite local', () => {
    const ws = new Blockly.Workspace()
    const solto = ws.newBlock('sz_g2d_remove_from_group')
    expect(collectScopedSpriteNames(solto)).toEqual([])
    expect(collectScopedSpriteNames(null)).toEqual([])
  })
})
