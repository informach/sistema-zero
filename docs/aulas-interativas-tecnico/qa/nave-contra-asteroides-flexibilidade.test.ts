import { expect, test } from 'bun:test'
import { isExecutionRule } from '../../../packages/core/src/learning/project-execution'
import { evaluateProjectStructure } from '../../../packages/core/src/learning/project-structure'
import { criterios2D } from './construtor-2d-criterios'
import { projeto2D } from './construtor-2d-projetos'
import { fixtureBlock, fixtureBlocks, setFixtureLiteral } from './project-block-test-helpers'

test('as 81 combinações de aparência conservam os critérios e todos os valores do jogo', () => {
  const original = projeto2D('final')
  const sets = ['nave-', 'cenario-', 'asteroide-', 'laser-'].map((prefix) =>
    original.assets
      .filter((asset: { name: string }) => asset.name.startsWith(prefix))
      .map((asset: { name: string }) => asset.name),
  )
  expect(original.assets).toHaveLength(12)
  for (const choices of sets) expect(choices).toHaveLength(3)
  let combinations = 0
  for (const ship of sets[0]!)
    for (const background of sets[1]!)
      for (const asteroid of sets[2]!)
        for (const laser of sets[3]!) {
          const project = structuredClone(original)
          for (const block of fixtureBlocks(project.blocksState)) {
            if (block.type === 'sz_g2d_create_image_sprite') block.fields!.IMAGE = ship
            if (block.type === 'sz_g2d_set_backdrop') block.fields!.IMAGE = background
            if (block.type === 'sz_g2d_spawn_image_in_group')
              block.fields!.IMAGE = block.fields!.GROUP === 'tiros' ? laser : asteroid
          }
          for (const check of criterios2D('final').filter((check) => !isExecutionRule(check.rule)))
            expect(evaluateProjectStructure(check.rule as never, project), check.id).toBe(true)
          const neutral = (value: unknown) =>
            JSON.stringify(value, (key, item) => (key === 'IMAGE' ? '<aparência>' : item))
          expect(neutral(project.blocksState)).toBe(neutral(original.blocksState))
          combinations++
        }
  expect(combinations).toBe(81)
})

test.each([
  ['inicial', 'nave-preservada', 'sz_g2d_create_image_sprite', 'W', 57],
  ['inicial', 'nave-preservada', 'sz_g2d_create_image_sprite', 'H', 0],
  ['movimento', 'movimento-na-partida', 'sz_g2d_arrows_x', 'SPEED', 0],
  ['voo-tiros', 'evento-protegido', 'sz_g2d_spawn_image_in_group', 'VY', 7],
  ['relogio-asteroides', 'intervalo-asteroides', 'sz_g2d_every_seconds', 'SECS', 1],
  ['dano', 'dano-e-protecao', 'sz_g2d_damage_sprite', 'AMOUNT', 2],
  ['meta', 'nave-preservada', 'sz_js_var_create', 'VALUE', 21],
] as const)('%s: %s não é cumprido com %s/%s=%s', (stage, id, type, field, value) => {
  const project = projeto2D(stage)
  const block =
    type === 'sz_js_var_create'
      ? fixtureBlocks(project.blocksState).find(
          (block) => block.type === type && block.fields?.NAME === 'meta',
        )!
      : fixtureBlock(project.blocksState, type)
  setFixtureLiteral(block, field, value)
  const check = criterios2D(stage).find((check) => check.id === id)!
  expect(evaluateProjectStructure(check.rule as never, project)).toBe(false)
})

test('um bloco desativado ou solto fora das áreas não cumpre a montagem', () => {
  const check = criterios2D('movimento').find((check) => check.id === 'movimento-na-partida')!
  const project = projeto2D('movimento')
  const block = fixtureBlock(project.blocksState, 'sz_g2d_arrows_x')
  Object.assign(block, { disabled: true })
  expect(evaluateProjectStructure(check.rule as never, project)).toBe(false)
  const detached = {
    ...project,
    blocksState: { blocks: { languageVersion: 0, blocks: [{ ...block, disabled: false }] } },
  }
  expect(evaluateProjectStructure(check.rule as never, detached)).toBe(false)
})

/** A parte nova não pode aprovar a desmontagem de uma conquista anterior. */
test.each([
  ['vidas', 'sz_g2d_update_group', 'GROUP', 'tiros'],
  ['final', 'sz_g2d_update_group', 'GROUP', 'tiros'],
  ['vidas', 'sz_g2d_draw_group', 'GROUP', 'tiros'],
  ['final', 'sz_g2d_draw_score', 'LABEL', 'Acertos:'],
  ['final', 'sz_g2d_set_health', 'SPRITE', 'nave'],
  ['final', 'sz_g2d_prune_offscreen', 'GROUP', 'asteroides'],
] as const)('%s continua exigindo %s/%s=%s', (stage, type, field, selected) => {
  const project = projeto2D(stage)
  const block = fixtureBlocks(project.blocksState).find(
    (block) => block.type === type && String(block.fields?.[field]) === selected,
  )
  expect(block).toBeDefined()
  Object.assign(block!, { disabled: true })
  const rejected = criterios2D(stage).filter(
    (check) =>
      !isExecutionRule(check.rule) && !evaluateProjectStructure(check.rule as never, project),
  )
  expect(rejected.length).toBeGreaterThan(0)
})

test.each([
  ['sz_g2d_arrows_x', 'SPRITE', 'nave', 'SPEED', 6],
  ['sz_g2d_spawn_image_in_group', 'GROUP', 'tiros', 'VY', -8],
  ['sz_g2d_spawn_image_in_group', 'GROUP', 'tiros', 'W', 11],
  ['sz_g2d_spawn_image_in_group', 'GROUP', 'asteroides', 'VY', 3],
  ['sz_g2d_spawn_image_in_group', 'GROUP', 'asteroides', 'H', 49],
  ['sz_js_var_create', 'NAME', 'pontos', 'VALUE', 1],
  ['sz_js_var_create', 'NAME', 'meta', 'VALUE', 21],
  ['sz_g2d_set_health', 'SPRITE', 'nave', 'AMOUNT', 4],
] as const)('a aparência não autoriza mudar %s/%s=%s, %s para %s', (type, field, selected, input, altered) => {
  const project = projeto2D('final')
  const block = fixtureBlocks(project.blocksState).find(
    (block) => block.type === type && String(block.fields?.[field]) === selected,
  )!
  expect(block).toBeDefined()
  setFixtureLiteral(block, input, altered)
  expect(
    criterios2D('final').some(
      (check) =>
        !isExecutionRule(check.rule) && !evaluateProjectStructure(check.rule as never, project),
    ),
  ).toBe(true)
})
