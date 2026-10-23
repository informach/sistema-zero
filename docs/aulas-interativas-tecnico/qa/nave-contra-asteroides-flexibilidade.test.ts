import { expect, test } from 'bun:test'
import { evaluateStudioSectionProject } from '../../../packages/studio/src/blockly/projectCheckAuthoring'
import { aulasNave } from './gerar-nave-contra-asteroides'
import { etapasNave } from './nave-contra-asteroides-etapas'
import { fixtureBlock, fixtureBlocks, setFixtureLiteral } from './project-block-test-helpers'

const stages = etapasNave()
for (const [index, lesson] of aulasNave.entries()) {
  test(`${lesson.slug}: aceita valores e textos próprios conservando sentido e vínculos`, () => {
    const project = structuredClone(stages[index + 1]!)
    for (const block of fixtureBlocks(project)) {
      switch (block.type) {
        case 'sz_g2d_create_ship':
          for (const [name, value] of Object.entries({ X: 300, Y: 430, W: 60, H: 70 }))
            setFixtureLiteral(block, name, value)
          break
        case 'sz_g2d_arrows_x':
        case 'sz_g2d_starfield':
          setFixtureLiteral(block, 'SPEED', 2)
          break
        case 'sz_g2d_spawn_bullet':
          setFixtureLiteral(block, 'R', 7)
          setFixtureLiteral(block, 'VY', -6)
          break
        case 'sz_g2d_spawn_asteroid':
          for (const [name, value] of Object.entries({ Y: -40, SIZE: 48, VY: 4 }))
            setFixtureLiteral(block, name, value)
          break
        case 'sz_g2d_every_frames':
          setFixtureLiteral(block, 'N', 60)
          break
        case 'sz_g2d_draw_score':
          block.fields = { ...block.fields, LABEL: 'Acertos:' }
          setFixtureLiteral(block, 'X', 20)
          setFixtureLiteral(block, 'Y', 32)
          setFixtureLiteral(block, 'SIZE', 22)
          break
        case 'sz_g2d_draw_sprite_health':
          setFixtureLiteral(block, 'X', 20)
          setFixtureLiteral(block, 'Y', 55)
          setFixtureLiteral(block, 'SIZE', 25)
          break
        case 'sz_g2d_damage_sprite':
          setFixtureLiteral(block, 'FRAMES', 60)
          break
        case 'sz_g2d_play_fx':
          block.fields = { ...block.fields, FX: 'jump' }
          break
        case 'sz_g2d_show_screen':
          setFixtureLiteral(block, 'HINT', 'Use Enter para continuar.')
          break
        case 'sz_js_const_create':
          if (block.fields?.NAME === 'alvo') setFixtureLiteral(block, 'VALUE', 12)
          break
      }
    }
    for (const section of lesson.sections) {
      expect(
        evaluateStudioSectionProject(section.checks ?? [], project).filter((row) => !row.passed),
        section.key,
      ).toEqual([])
    }
  })
}

test.each([
  [1, 'criar-nave', 'nave', 'sz_g2d_create_ship', 'W', 0],
  [2, 'setas', 'setas', 'sz_g2d_arrows_x', 'SPEED', 0],
  [2, 'setas', 'setas', 'sz_g2d_arrows_x', 'SPEED', -3],
  [3, 'criar-tiro', 'disparo', 'sz_g2d_spawn_bullet', 'VY', 3],
  [4, 'asteroide', 'asteroide', 'sz_g2d_spawn_asteroid', 'VY', -1],
  [4, 'relogio', 'relogio', 'sz_g2d_every_frames', 'N', 0],
  [7, 'batida', 'dano-protegido', 'sz_g2d_damage_sprite', 'AMOUNT', 2],
  [9, 'finais', 'alvo', 'sz_js_const_create', 'VALUE', 0],
] as const)('etapa %s/%s mantém a intenção de %s (%s/%s=%s)', (stage, section, id, type, name, value) => {
  const project = structuredClone(stages[stage]!)
  setFixtureLiteral(fixtureBlock(project, type), name, value)
  const check = aulasNave[stage - 1]!.sections.find((item) => item.key === section)?.checks?.find(
    (item) => item.id === id,
  )
  if (!check) throw new Error(`Authored ${section}/${id} check missing`)
  expect(evaluateStudioSectionProject([check], project)[0]?.passed).toBe(false)
})

test('o placar pode ter palavras próprias, mas não um rótulo em branco', () => {
  const project = structuredClone(stages[6]!)
  const score = fixtureBlock(project, 'sz_g2d_draw_score')
  score.fields = { ...score.fields, LABEL: '  ' }
  const check = aulasNave[5]!.sections
    .find((item) => item.key === 'placar')
    ?.checks?.find((item) => item.id === 'placar')
  if (!check) throw new Error('Authored scoreboard check missing')
  expect(evaluateStudioSectionProject([check], project)[0]?.passed).toBe(false)
})

for (const [stage, section, id, type, axis, value] of [
  [1, 'criar-nave', 'nave', 'sz_g2d_create_ship', 'X', 1_000_000],
  [1, 'criar-nave', 'nave', 'sz_g2d_create_ship', 'Y', -1_000_000],
  [1, 'criar-nave', 'nave', 'sz_g2d_create_ship', 'X', 800],
  [1, 'criar-nave', 'nave', 'sz_g2d_create_ship', 'Y', 480],
  [6, 'placar', 'placar', 'sz_g2d_draw_score', 'X', 1_000_000],
  [6, 'placar', 'placar', 'sz_g2d_draw_score', 'Y', -1_000_000],
  [7, 'vidas', 'coracoes', 'sz_g2d_draw_sprite_health', 'X', 1_000_000],
  [7, 'vidas', 'coracoes', 'sz_g2d_draw_sprite_health', 'Y', -1_000_000],
  [1, 'montar-areas-e-tela', 'tela', 'sz_g2d_setup_stage', 'W', 960],
] as const) {
  test(`${section}/${id}: conserva o mundo do curso e recusa ${axis}=${value}`, () => {
    const project = structuredClone(stages[stage]!)
    setFixtureLiteral(fixtureBlock(project, type), axis, value)
    const check = aulasNave[stage - 1]!.sections.find((s) => s.key === section)?.checks?.find(
      (c) => c.id === id,
    )
    if (!check) throw new Error('Authored spatial check missing')
    expect(evaluateStudioSectionProject([check], project)[0]?.passed).toBe(false)
  })
}
