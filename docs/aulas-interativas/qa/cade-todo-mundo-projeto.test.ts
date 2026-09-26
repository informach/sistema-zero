import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  JARDIM_ASSETS,
  JARDIM_BASE_ESCONDERIJOS,
  JARDIM_BASE_PERSONAGENS,
  JARDIM_PARES,
  jardimSpriteRect,
  jardimSvg,
} from '../../../packages/studio/src/arte/jardim-assets'
import { sanitizeProjectAssets } from '../../../packages/studio/src/core/project'
import { exampleHarness } from '../../../packages/studio/src/official-extensions/game-2d/__tests__/examplePlaythroughHarness'
import { IR_CADE_TODO_MUNDO, montarProjetoCadeTodoMundo } from './cade-todo-mundo-projeto'

function blockTypes(node: unknown): string[] {
  if (!node || typeof node !== 'object') return []
  const obj = node as Record<string, unknown>
  return [
    ...(typeof obj.type === 'string' ? [obj.type] : []),
    ...Object.values(obj).flatMap(blockTypes),
  ]
}

describe('projeto inicial Cadê Todo Mundo?', () => {
  test('os seis SVGs embutidos correspondem aos quadros da folha do Pinta', () => {
    const sheet = readFileSync(
      resolve(import.meta.dir, '../../../packages/studio/src/arte/jardim-spritesheet.svg'),
      'utf8',
    )
    const frames = [
      ...sheet.matchAll(
        /<svg x="\d+" y="0" width="64" height="64" viewBox="0 0 64 64">([\s\S]*?)<\/svg>/g,
      ),
    ]
    const names = ['coruja', 'pedras', 'arbusto', 'flores', 'raposa', 'coelho'] as const
    expect(frames).toHaveLength(names.length)
    for (const [index, name] of names.entries()) {
      expect(JARDIM_ASSETS[name].body).toBe(frames[index]?.[1]?.trim())
      expect(jardimSvg(name)).toContain(`viewBox="${JARDIM_ASSETS[name].viewBox}"`)
    }
  })

  test('leva arte própria embutida, sem Pinta ou rede', () => {
    const p = montarProjetoCadeTodoMundo()
    expect(p.installedExtensions.map((e) => e.id)).toEqual(['game-2d'])
    expect(sanitizeProjectAssets(p.assets)).toHaveLength(7)
    expect(p.assets.every((a) => a.dataUrl.startsWith('data:image/svg+xml;base64,'))).toBe(true)
    const jardim = p.assets.find((a) => a.name === 'jardim')
    const coelho = p.assets.find((a) => a.name === 'coelho')
    const arbusto = p.assets.find((a) => a.name === 'arbusto')
    for (const [asset, name] of [
      [jardim, 'jardim'],
      [coelho, 'coelho'],
      [arbusto, 'arbusto'],
    ] as const) {
      expect(asset).toBeDefined()
      expect(Buffer.from(asset?.dataUrl.split(',')[1] ?? '', 'base64').toString()).toBe(
        jardimSvg(name),
      )
    }
    expect(p.ir).toEqual(IR_CADE_TODO_MUNDO)
  })

  test('personagens e esconderijos usam as dimensões e posições da arte nova', () => {
    const sprites = IR_CADE_TODO_MUNDO.behavior.start.filter(
      (statement) => statement.type === 'g2d:createImageSprite',
    )
    for (const { personagem, esconderijo, centroX } of JARDIM_PARES) {
      for (const [name, baseY] of [
        [personagem, JARDIM_BASE_PERSONAGENS],
        [esconderijo, JARDIM_BASE_ESCONDERIJOS],
      ] as const) {
        expect(
          sprites.find(
            (sprite) => sprite.type === 'g2d:createImageSprite' && sprite.varName === name,
          ),
        ).toMatchObject({
          ...jardimSpriteRect(name, centroX, baseY),
          image: name,
        })
      }
    }
  })

  test('prepara o jardim e deixa a regra do toque vazia para a criança', () => {
    const p = montarProjetoCadeTodoMundo()
    const blocks = blockTypes(p.blocksState)
    expect(blocks.filter((t) => t === 'sz_g2d_create_image_sprite')).toHaveLength(6)
    expect(blocks).toContain('sz_g2d_on_group_click')
    expect(blocks).toContain('sz_g2d_draw_group')
    expect(blocks).toContain('sz_g2d_draw_score')
    expect(blocks).not.toContain('sz_g2d_set_opacity')
    expect(p.files['script.js']).toContain('onGroupClick')
    expect(p.files['script.js']).toContain('drawBackdrop')
  })

  test('a segunda aula retoma o primeiro achado se não houver projeto salvo', () => {
    const p = montarProjetoCadeTodoMundo(true)
    expect(blockTypes(p.blocksState)).toContain('sz_g2d_set_opacity')
    expect(p.files['script.js']).toContain('setOpacity(escolhido, 0)')
    expect(blockTypes(montarProjetoCadeTodoMundo().blocksState)).not.toContain('sz_g2d_set_opacity')
  })

  test('um esconderijo tocado conta uma só vez e a vitória aparece no terceiro', () => {
    const ir = structuredClone(IR_CADE_TODO_MUNDO)
    const event = ir.behavior.events[0]
    if (event?.type !== 'g2d:onGroupClick') throw new Error('Evento preparado ausente')
    event.body.push(
      { type: 'g2d:setOpacity', spriteVar: 'escolhido', percent: 0 },
      {
        type: 'assign',
        name: 'achados',
        value: {
          type: 'binop',
          op: '+',
          left: { type: 'var', name: 'achados' },
          right: { type: 'num', value: 1 },
        },
      },
    )
    const game = exampleHarness({ name: 'Cadê Todo Mundo?', experience: 'game', ir }, () => 0.5, {
      contarCtx: true,
    })
    game.nextFrame()
    expect(game.scores['Achados:']).toBe(0)
    const touch = (x: number) => {
      game.firePointer('pointerdown', x, 215)
      game.firePointer('pointerup', x, 215)
      game.nextFrame()
    }
    touch(145)
    expect(game.scores['Achados:']).toBe(1)
    touch(145)
    expect(game.scores['Achados:']).toBe(1)
    touch(315)
    expect(game.scores['Achados:']).toBe(2)
    game.zerarCtxOps()
    game.nextFrame()
    const textosAntesDaVitoria = game.contarCtxOps('fillText')
    touch(485)
    expect(game.scores['Achados:']).toBe(3)
    game.zerarCtxOps()
    game.nextFrame()
    expect(game.contarCtxOps('fillText')).toBeGreaterThan(textosAntesDaVitoria)
    expect(game.errors).toEqual([])
  })
})
