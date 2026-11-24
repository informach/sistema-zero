/** QA das duas experiências existentes usadas pela Patrulha; não resolve a atividade no manifesto. */
import assert from 'node:assert/strict'
import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { isExperimentationActivity } from '../../../../packages/core/src/learning/scene'
import {
  isSceneAction,
  type SceneAction,
} from '../../../../packages/core/src/learning/scene/actions'
import { openScene, stepScene } from '../../../../packages/core/src/learning/scene/engine'
import {
  evaluateExperimentation,
  sceneGoals,
} from '../../../../packages/core/src/learning/scene/evaluate'
import { sceneStart } from '../../../../packages/core/src/learning/scene/start'
import { formatarJson } from '../../qa/formatar-json'
import {
  experienciaContatoPatrulha,
  experienciaEixosPatrulha,
} from '../../qa/patrulha-espacial-experiencias'

const cases: { part: ReturnType<typeof experienciaEixosPatrulha>; actions: SceneAction[] }[] = [
  {
    part: experienciaEixosPatrulha(),
    actions: [
      { type: 'island-axis', axis: 'x', value: -1 },
      { type: 'island-axis', axis: 'x', value: -2 },
      { type: 'island-axis', axis: 'y', value: 2 },
      { type: 'island-axis', axis: 'y', value: 1 },
      { type: 'island-axis', axis: 'z', value: -2 },
      { type: 'island-axis', axis: 'z', value: -3 },
    ],
  },
  {
    part: experienciaContatoPatrulha(),
    actions: [
      { type: 'island-test' },
      { type: 'island-view', view: 'side' },
      { type: 'island-axis', axis: 'y', value: 1 },
      { type: 'island-test' },
    ],
  },
]

const results = cases.map(({ part, actions }) => {
  const activity = part.experience!.activity
  assert.ok(isExperimentationActivity(activity), `${part.key}: atividade oficial válida`)
  const start = sceneStart(activity)
  const goals = activity.setup!.goals
  let state = openScene(start)
  const before = evaluateExperimentation(activity.scene, state, true, undefined, goals)
  assert.equal(before.passed, false, 'A bancada não pode abrir pronta')
  assert.deepEqual(state.evidence.discoveries, [])
  const trace = actions.map((action) => {
    assert.ok(isSceneAction(action, activity.scene), `Ação oficial: ${JSON.stringify(action)}`)
    state = stepScene(start, state, action)
    return {
      action,
      goals: sceneGoals(activity.scene, state, undefined, goals),
      state: state.island3d,
    }
  })
  const after = evaluateExperimentation(activity.scene, state, true, undefined, goals)
  assert.equal(after.passed, true, `${part.key}: todas as descobertas precisam fechar`)
  assert.equal(after.participated, true)
  if (part.key === 'encontro-no-espaco') {
    assert.equal(trace[0].state!.tested, false, 'Vista de cima pode coincidir sem contato')
    assert.equal(
      trace.at(-1)!.state!.tested,
      true,
      'Baixar a chave ao encontro produz contato real',
    )
  }
  return {
    key: part.key,
    scene: activity.scene,
    mode: state.island3d!.mode,
    goals,
    before,
    actions: trace,
    after,
  }
})

const out = resolve(
  import.meta.dirname,
  '../../../aulas-interativas/construtor/patrulha-espacial/qa-experiencias.json',
)
mkdirSync(resolve(out, '..'), { recursive: true })
writeFileSync(
  out,
  formatarJson({
    engine: 'Motor oficial scene; ações públicas e avaliador oficial, sem desenho da interface',
    results,
  }),
)
console.log(
  JSON.stringify({
    passed: true,
    scenes: results.length,
    goals: results.reduce((sum, r) => sum + r.goals!.length, 0),
    report: out,
  }),
)
