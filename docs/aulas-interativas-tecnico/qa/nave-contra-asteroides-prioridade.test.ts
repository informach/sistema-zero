import { expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import type { LearningManifest } from '../../../packages/core/src/learning'
import { evaluateStudioSectionProject } from '../../../packages/studio/src/blockly/projectCheckAuthoring'
import { buildWorkspaceStateFromIR } from '../../../packages/studio/src/blockly/workspaceState'
import type { SZIRV2 } from '../../../packages/studio/src/ir/schema'
import { exampleHarness } from '../../../packages/studio/src/official-extensions/game-2d/__tests__/examplePlaythroughHarness'
import { asteroidsExample } from '../../../packages/studio/src/official-extensions/game-2d/examples/arcade'
import { caminhoAula } from './caminhos'
import { projetoNave } from './nave-contra-asteroides-etapas'

function finalProgram(order: 'original' | 'inverted' | 'inverted-extra' | 'original-extra') {
  const ir = structuredClone(projetoNave(9).ir) as SZIRV2
  const loop = ir.behavior.loops.find((node) => node.type === 'g2d:updateEachFrame')
  if (loop?.type !== 'g2d:updateEachFrame') throw new Error('Authored loop missing')
  const game = loop.body.find((node) => node.type === 'if')
  if (game?.type !== 'if') throw new Error('Authored game guard missing')
  const victory = game.then.at(-2)!
  const defeat = game.then.at(-1)!
  const unrelated = structuredClone(victory)
  if (unrelated.type !== 'if') throw new Error('Authored victory condition missing')
  unrelated.cond = { type: 'bool', value: false }
  unrelated.then.length = 0
  const last =
    order === 'original'
      ? [victory, defeat]
      : order === 'original-extra'
        ? [victory, unrelated, defeat]
        : order === 'inverted-extra'
          ? [defeat, victory, unrelated]
          : [defeat, victory]
  game.then.splice(-2, 2, ...last)
  return ir
}

function accepted(ir: SZIRV2) {
  const manifest = JSON.parse(
    readFileSync(caminhoAula('nave-contra-asteroides-dia-5.manifesto.json'), 'utf8'),
  ) as LearningManifest
  const checks = manifest.sections.find((section) => section.key === 'entrega')!.completion!
    .projectChecks!
  return evaluateStudioSectionProject(checks, {
    ...projetoNave(9),
    ir,
    blocksState: buildWorkspaceStateFromIR(ir),
  }).every((row) => row.passed)
}

function simultaneousEnd(ir: SZIRV2) {
  const sample = structuredClone(ir)
  const score = sample.behavior.start.find((node) => node.type === 'var' && node.name === 'pontos')
  if (score?.type !== 'var') throw new Error('Authored score missing')
  score.value = { type: 'num', value: 26 }
  const game = exampleHarness({ ...asteroidsExample, ir: sample })
  game.fireKey('Enter')
  game.fireKey('Enter', 'keyup')
  game.sprites[0]!.hp = 0
  game.nextFrame()
  expect(game.errors).toEqual([])
  return { defeat: game.api.sceneIs('fim'), victory: game.api.sceneIs('vitoria') }
}

for (const order of ['original', 'original-extra'] as const) {
  test(`${order}: aceita a prioridade ensinada, mesmo com um Se alheio entre os finais`, () => {
    const ir = finalProgram(order)
    expect(simultaneousEnd(ir)).toEqual({ defeat: true, victory: false })
    expect(accepted(ir)).toBe(true)
  })
}

for (const order of ['inverted', 'inverted-extra'] as const) {
  test(`${order}: recusa vitória sobrescrevendo derrota, mesmo com outro Se depois`, () => {
    const ir = finalProgram(order)
    expect(simultaneousEnd(ir)).toEqual({ defeat: false, victory: true })
    expect(accepted(ir)).toBe(false)
  })
}
