import { performance } from 'node:perf_hooks'
import {
  appendExplorationAction,
  type ExplorationActivity,
  initialExploration,
  type LearningAnswers,
  replayExploration,
  transitionExploration,
} from '../../../packages/core/src/learning'

function advance(mission: 'spawn' | 'score', parts: number[]) {
  const activity: ExplorationActivity = { type: 'exploration', version: 2, mission }
  let state = initialExploration(activity)
  if (mission === 'score')
    state = transitionExploration(activity, state, {
      type: 'connect',
      port: 'condition',
      enabled: true,
    })
  for (const seconds of parts)
    state = transitionExploration(activity, state, { type: 'advance', seconds })
  return {
    elapsed: state.elapsed,
    discoveries: state.discoveries,
    born: state.born,
    points: state.points,
  }
}

const activity: ExplorationActivity = { type: 'exploration', version: 2, mission: 'layers' }
const timings = []
for (const size of [10, 100, 500, 900]) {
  let answers: LearningAnswers = {}
  for (let i = 0; i < size; i++)
    answers = appendExplorationAction(activity, answers, { type: 'layer', front: i % 2 === 0 })
  for (let i = 0; i < 30; i++) replayExploration(activity, answers)
  const samples = []
  for (let i = 0; i < 200; i++) {
    const start = performance.now()
    replayExploration(activity, answers)
    samples.push(performance.now() - start)
  }
  samples.sort((a, b) => a - b)
  const acceptedActions = (answers.explorationTrace as string[]).reduce(
    (sum, chunk) => sum + JSON.parse(chunk).length,
    0,
  )
  timings.push({
    requestedActions: size,
    acceptedActions,
    serializedBytes: Buffer.byteLength(JSON.stringify(answers)),
    medianMs: +samples[100].toFixed(4),
    p95Ms: +samples[190].toFixed(4),
  })
}
const chunking = ['spawn', 'score'].map((mission) => ({
  mission,
  oneStep: advance(mission as 'spawn' | 'score', [1]),
  manySteps: advance(
    mission as 'spawn' | 'score',
    Array.from({ length: 25 }, () => 0.04),
  ),
}))
console.log(
  JSON.stringify(
    {
      note: 'Local diagnostic, Bun; not browser or child-device performance. No product files changed.',
      chunking,
      replayTimings: timings,
    },
    null,
    2,
  ),
)
