import { describe, expect, it } from 'bun:test'
import { compileStatements } from '#generators'
import type { JSStatement } from '#ir'
import { parseJS } from '../../../parsers/js'
import { gameTwoDBlocks } from '../blockCatalog'

describe('codec das primitivas clássicas', () => {
  it('mantém geração e parse em ponto fixo para toda a cadeia nova', () => {
    const statements: JSStatement[] = [
      { type: 'g2d:enableClassicControls', mode: 'auto' },
      {
        type: 'g2d:onActionPressed',
        action: 'pause',
        body: [{ type: 'consoleLog', value: { type: 'str', value: 'pausa' } }],
      },
      { type: 'g2d:createVectorTileset', varName: 'tiles', size: { type: 'num', value: 16 } },
      {
        type: 'g2d:defineVectorTile',
        tilesetVar: 'tiles',
        index: { type: 'num', value: 1 },
        shape: 'bloco',
        role: 'solid',
      },
      { type: 'g2d:createVectorTileMap', varName: 'mapa', tilesetVar: 'tiles', grid: '1 1' },
      {
        type: 'g2d:classicPlatformer',
        spriteVar: 'heroi',
        speed: { type: 'num', value: 2.5 },
        jump: { type: 'num', value: 7 },
      },
      {
        type: 'g2d:forEachTileContact',
        spriteVar: 'heroi',
        mapVar: 'mapa',
        side: 'head',
        contactName: 'contato',
        body: [
          {
            type: 'if',
            cond: {
              type: 'g2d:tileContactIs',
              contactVar: 'contato',
              index: { type: 'num', value: 1 },
            },
            then: [{ type: 'consoleLog', value: { type: 'str', value: 'premio' } }],
          },
          {
            type: 'g2d:setTileAtContact',
            contactVar: 'contato',
            index: { type: 'num', value: -1 },
          },
        ],
      },
      { type: 'g2d:setEnemyStompMode', typeVar: 'tartarugas', mode: 'shell' },
      { type: 'g2d:updateEnemyShells', typeVar: 'tartarugas', worldVar: 'mundo' },
      {
        type: 'g2d:drawPixelText',
        ctxVar: 'ctx',
        text: 'REINO ZERO',
        x: { type: 'num', value: 8 },
        y: { type: 'num', value: 8 },
        size: { type: 'num', value: 2 },
        color: '#ffffff',
        align: 'left',
      },
      {
        type: 'g2d:drawFade',
        ctxVar: 'ctx',
        percent: { type: 'num', value: 50 },
        color: '#000000',
      },
      {
        type: 'if',
        cond: { type: 'g2d:actionPressed', action: 'jump' },
        then: [{ type: 'consoleLog', value: { type: 'str', value: 'pulo' } }],
      },
    ]

    const code = compileStatements(statements, 0)
    expect(code).not.toContain('undefined')
    expect(parseJS(code)).toEqual(statements)
  })

  it('oferece todos os blocos novos sem alterar tipos antigos', () => {
    const types = new Set(gameTwoDBlocks.map((block) => block.type))
    for (const type of [
      'sz_g2d_enable_classic_controls',
      'sz_g2d_action_down',
      'sz_g2d_action_pressed',
      'sz_g2d_on_action_pressed',
      'sz_g2d_classic_platformer',
      'sz_g2d_create_vector_tileset',
      'sz_g2d_define_vector_tile',
      'sz_g2d_create_vector_tilemap',
      'sz_g2d_for_each_tile_contact',
      'sz_g2d_tile_contact_is',
      'sz_g2d_set_tile_at_contact',
      'sz_g2d_set_enemy_stomp_mode',
      'sz_g2d_update_enemy_shells',
      'sz_g2d_draw_pixel_text',
      'sz_g2d_draw_fade',
    ]) {
      expect(types.has(type)).toBe(true)
    }
  })

  it('usa o mesmo identificador normalizado no parâmetro e nos repórteres de contato', () => {
    const statements: JSStatement[] = [
      {
        type: 'g2d:forEachTileContact',
        spriteVar: 'heroi',
        mapVar: 'mapa',
        side: 'feet',
        contactName: 'meu bloco',
        body: [
          {
            type: 'if',
            cond: {
              type: 'g2d:tileContactIs',
              contactVar: 'meu bloco',
              index: { type: 'num', value: 1 },
            },
            then: [],
          },
        ],
      },
    ]

    const code = compileStatements(statements, 0)
    expect(code).toContain('function (meu_bloco)')
    expect(code).toContain('SZGame2D.tileContactIs(meu_bloco, 1)')
    expect(() => new Function(code)).not.toThrow()
  })

  it('mantém chamadas manuais com opções inválidas fora da IR tipada', () => {
    const parsed = parseJS(`
SZGame2D.enableClassicControls('banana');
SZGame2D.defineVectorTile(tiles, 1, 'bloco', 'banana');
SZGame2D.forEachTileContact(heroi, mapa, 'banana', function (contato) {});
SZGame2D.setEnemyStompMode(tartarugas, 'banana');
SZGame2D.drawPixelText(ctx, 'X', 1, 2, 3, '#fff', 'banana');
`)

    expect(parsed.map((statement) => statement.type)).toEqual([
      'memberCall',
      'memberCall',
      'rawJS',
      'memberCall',
      'memberCall',
    ])
    expect(parsed[2]).toMatchObject({
      type: 'rawJS',
      code: expect.stringContaining("forEachTileContact(heroi, mapa, 'banana'"),
    })
  })
})
