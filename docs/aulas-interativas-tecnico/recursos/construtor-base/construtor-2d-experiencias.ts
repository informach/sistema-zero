/** Percorre as quinze bancadas do curso com ações públicas; não grava descobertas no manifesto. */
import assert from 'node:assert/strict'
import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  isExperimentationActivity,
  type SceneAction,
} from '../../../../packages/core/src/learning/scene'
import {
  evaluateExperimentation,
  sceneGoals,
} from '../../../../packages/core/src/learning/scene/evaluate'
import {
  initialExperiment,
  isExperimentCommand,
  stepExperiment,
} from '../../../../packages/core/src/learning/scene/session'
import { sceneStart } from '../../../../packages/core/src/learning/scene/start'
import { isSceneState } from '../../../../packages/core/src/learning/scene/state'
import { aulas2D } from '../../qa/construtor-2d-conteudo'
import { formatarJson } from '../../qa/formatar-json'

const segundos = (n: number): SceneAction[] =>
  Array.from({ length: n }, () => ({ type: 'advance', seconds: 1 }))
const quadros = (n: number): SceneAction[] =>
  Array.from({ length: n }, () => ({ type: 'advance', seconds: 1 / 30 }))
const tresPedras: SceneAction[] = Array.from({ length: 3 }, () => ({ type: 'advance-to' }))
const paths: Record<string, SceneAction[]> = {
  'seta-e-velocidade': [
    { type: 'walk-pace', pace: 'lenta' },
    { type: 'hold-arrow', held: true },
    ...quadros(4),
    { type: 'hold-arrow', held: false },
    ...quadros(2),
    { type: 'walk-pace', pace: 'real' },
    { type: 'hold-arrow', held: true },
    ...segundos(2),
  ],
  'limite-da-tela': [
    { type: 'keep-on-screen', enabled: false },
    { type: 'walk-pace', pace: 'real' },
    { type: 'hold-arrow', held: true },
    ...segundos(6),
    { type: 'keep-on-screen', enabled: true },
    ...quadros(1),
    { type: 'walk-pace', pace: 'lenta' },
    ...quadros(3),
  ],
  'tecla-e-repeticao': [
    { type: 'place-in-area', card: 'event', area: 'event' },
    ...segundos(3),
    { type: 'trigger' },
    { type: 'place-in-area', card: 'event', area: 'loop' },
    ...segundos(3),
  ],
  'objetos-no-grupo': [
    ...segundos(2),
    { type: 'connect', port: 'cleanup', enabled: true },
    ...segundos(2),
  ],
  'escrito-e-lido': [
    { type: 'value-source', source: 'fixed' },
    { type: 'shoot' },
    { type: 'place', x: 640, y: 0 },
    { type: 'shoot' },
    { type: 'value-source', source: 'read' },
    { type: 'shoot' },
    { type: 'place', x: 160, y: 0 },
    { type: 'shoot' },
    { type: 'box-marks', on: true },
    { type: 'shoot' },
  ],
  'direcao-do-tiro': [
    { type: 'velocity', vx: 0, vy: -9 },
    ...segundos(1),
    { type: 'velocity', vx: 0, vy: 9 },
    ...segundos(1),
  ],
  'intervalo-das-pedras': [
    ...segundos(1),
    { type: 'connect', port: 'timer', enabled: true },
    { type: 'interval', seconds: 1.5 },
    ...segundos(3),
  ],
  'posicao-sorteada': [
    { type: 'sample', kind: 'position', unit: 0.1, guided: false },
    { type: 'sample', kind: 'position', unit: 0.7, guided: false },
    { type: 'sample', kind: 'position', unit: 0.4, guided: false },
    ...segundos(1),
  ],
  trombada: [
    ...segundos(1),
    { type: 'command-target', subject: 'shot', target: 'alias' },
    { type: 'command-target', subject: 'rock', target: 'alias' },
    ...segundos(3),
  ],
  'caixa-de-pontos': [
    { type: 'store', value: 0 },
    { type: 'change', by: 1 },
    { type: 'change', by: 1 },
    { type: 'show', on: true },
  ],
  'vidas-no-comeco': [
    { type: 'place-in-area', card: 'lives', area: 'start' },
    ...segundos(5),
    { type: 'place-in-area', card: 'lives', area: 'loop' },
    ...segundos(5),
  ],
  respiro: [
    { type: 'shield', frames: 0 },
    ...tresPedras,
    { type: 'shield', frames: 45 },
    ...tresPedras,
    { type: 'shield', frames: 15 },
    ...tresPedras,
  ],
  'estado-do-jogo': [
    ...segundos(3),
    { type: 'connect', port: 'condition', enabled: true },
    ...segundos(4),
    { type: 'start', input: 'tap' },
    ...segundos(3),
  ],
  'meta-do-jogo': [
    { type: 'goal-op', op: '>=' },
    ...Array.from({ length: 3 }, (): SceneAction => ({ type: 'goal-hit' })),
    { type: 'goal-op', op: '>' },
    ...Array.from({ length: 4 }, (): SceneAction => ({ type: 'goal-hit' })),
    { type: 'goal-restart' },
    { type: 'goal-hit' },
    { type: 'goal-edit' },
  ],
  reiniciar: [
    { type: 'start', input: 'key' },
    ...segundos(3),
    { type: 'start', input: 'key' },
    { type: 'start', input: 'key' },
    ...segundos(1),
    { type: 'connect', port: 'restart', enabled: true },
    { type: 'start', input: 'key' },
    { type: 'start', input: 'key' },
  ],
}

const cases = aulas2D.flatMap((aula) =>
  aula.trechos.filter((part) => part.experience).map((part) => ({ aula: aula.slug, part })),
)
assert.equal(cases.length, 15)
assert.deepEqual(Object.keys(paths).sort(), cases.map((c) => c.part.key).sort())
const results = cases.map(({ aula, part }) => {
  const activity = part.experience!.activity
  assert.ok(
    isExperimentationActivity(activity),
    `${aula}/${part.key}: contrato oficial da atividade`,
  )
  const start = sceneStart(activity)
  const targets = activity.setup!.goals!
  let session = initialExperiment(start)
  const evaluate = () =>
    evaluateExperimentation(
      activity.scene,
      session.state,
      true,
      activity.cast,
      targets,
      undefined,
      activity.setup?.goalCopy,
    )
  const goals = () =>
    sceneGoals(
      activity.scene,
      session.state,
      activity.cast,
      targets,
      undefined,
      activity.setup?.goalCopy,
    )
  const before = evaluate()
  assert.equal(before.passed, false, `${part.key}: não abre concluída`)
  assert.deepEqual(session.state.evidence.discoveries, [], `${part.key}: abre sem descobertas`)
  assert.equal(goals().length, targets.length, `${part.key}: todas as metas existem no catálogo`)
  const trace = paths[part.key]!.map((action) => {
    assert.ok(
      isExperimentCommand(action, start),
      `${part.key}: ação pública válida ${JSON.stringify(action)}`,
    )
    session = stepExperiment(start, session, action).session
    assert.ok(isSceneState(session.state), `${part.key}: estado oficial válido após cada ação`)
    return {
      action,
      complete: goals()
        .filter((g) => g.complete)
        .map((g) => g.id),
      ...(activity.scene === 'score-goal' ? { scoreGoal: session.state.scoreGoal } : {}),
      ...(activity.scene === 'spawn'
        ? { born: session.state.crowd.born, interval: session.state.crowd.interval }
        : {}),
    }
  })
  const after = evaluate()
  assert.equal(
    after.passed,
    true,
    `${part.key}: caminho público fecha todas as metas; faltam ${goals()
      .filter((g) => !g.complete)
      .map((g) => g.id)}`,
  )
  assert.equal(after.participated, true, `${part.key}: participação real registrada`)
  assert.ok(goals().every((g) => g.complete))
  if (activity.scene === 'score-goal') {
    assert.ok(trace.some((s) => s.scoreGoal?.points === 20 && s.scoreGoal?.won === true))
    assert.ok(trace.some((s) => s.scoreGoal?.points === 20 && s.scoreGoal?.won === false))
    assert.ok(trace.some((s) => s.scoreGoal?.points === 21 && s.scoreGoal?.won === true))
    assert.equal(session.state.scoreGoal.goal, 20)
  }
  if (activity.scene === 'spawn') {
    assert.equal(trace[0]!.born, 30, 'Sem relógio, nasce em cada quadro da bancada')
    assert.equal(trace.at(-1)!.born, 2, 'Com relógio de 1,5 s, nascem duas pedras em três segundos')
  }
  return {
    aula,
    key: part.key,
    scene: activity.scene,
    targets,
    before,
    actions: trace,
    goals: goals(),
    after,
  }
})

const out = resolve(import.meta.dirname, '../../qa/relatorios/construtor-2d-experiencias.json')
mkdirSync(resolve(out, '..'), { recursive: true })
writeFileSync(
  out,
  formatarJson({
    engine:
      'Core oficial: contrato da atividade, sessão de experimentação, ações públicas e avaliador; sem interface desenhada.',
    source:
      'qa/construtor-2d-conteudo.ts: atividades exatamente como serão derivadas nos manifestos.',
    passed: true,
    scenes: results.length,
    goals: results.reduce((sum, r) => sum + r.targets.length, 0),
    results,
  }),
)
console.log(
  JSON.stringify({
    passed: true,
    scenes: results.length,
    goals: results.reduce((sum, r) => sum + r.targets.length, 0),
    report: out,
  }),
)
