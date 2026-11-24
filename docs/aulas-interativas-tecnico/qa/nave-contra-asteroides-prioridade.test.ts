import { expect, test } from 'bun:test'
import { evaluateProjectStructure } from '../../../packages/core/src/learning/project-structure'
import { boot } from '../recursos/construtor-base/runtime-2d'
import { criterios2D } from './construtor-2d-criterios'
import { projeto2D } from './construtor-2d-projetos'
import { exportFromIR } from './construtor-base-projetos'

type Order = 'correta' | 'correta-com-outro-se' | 'duas-perguntas-soltas' | 'vitoria-primeiro'
function projectWithOrder(order: Order) {
  const project = projeto2D('final')
  const ir = structuredClone(project.ir)
  const frame = ir.behavior.loops.find(
    (node: { type: string }) => node.type === 'g2d:updateEachFrame',
  )
  const playing = frame.body[0]
  const result = playing.then.find(
    (node: any) => node.type === 'if' && node.cond.type === 'g2d:healthDepleted',
  )
  if (!result) throw new Error('Condição de resultado da fonte não encontrada')
  const victory = structuredClone(result.else[0])
  const defeat = { ...structuredClone(result), else: [] }
  const at = playing.then.indexOf(result)
  if (order === 'correta-com-outro-se')
    playing.then.splice(at, 0, {
      type: 'if',
      cond: { type: 'bool', value: false },
      // biome-ignore lint/suspicious/noThenProperty: campo canônico do nó if da IR do Estúdio.
      then: [],
      else: [],
    })
  if (order === 'duas-perguntas-soltas') playing.then.splice(at, 1, defeat, victory)
  if (order === 'vitoria-primeiro') playing.then.splice(at, 1, { ...victory, else: [defeat] })
  return exportFromIR({
    projectId: `qa-resultado-${order}`,
    name: 'QA de prioridade',
    ir,
    assets: project.assets,
  })
}

for (const order of [
  'correta',
  'correta-com-outro-se',
  'duas-perguntas-soltas',
  'vitoria-primeiro',
] as const) {
  test(`${order}: a conquista e o motor concordam quando meta e última vida chegam juntas`, async () => {
    const project = projectWithOrder(order)
    const check = criterios2D('final').find((check) => check.id === 'resultado-unico')!
    const correct = order === 'correta' || order === 'correta-com-outro-se'
    expect(evaluateProjectStructure(check.rule as never, project)).toBe(correct)
    const game = await boot(project, project.files)
    try {
      game.press('Enter')
      game.state().pontos = 20
      game.api.setHealth(game.state().nave, 0)
      game.tick()
      expect(game.api.sceneIs('derrota')).toBe(correct)
      expect(game.api.sceneIs('vitoria')).toBe(!correct)
      expect(game.errors).toEqual([])
      expect(game.warnings).toEqual([])
    } finally {
      game.dispose()
    }
  })
}
