import { describe, expect, test } from 'bun:test'
import {
  evaluateSimulation,
  initialSimulationParameters,
  isLearningAnswers,
  isSimulationActivity,
  LEARNING_SCENES,
  type LearningAnswers,
  recordSimulationTrial,
  type SimulationActivity,
  simulationFrame,
  simulationTrials,
} from '../src/learning'
import { simulationCases } from './simulation-cases'

describe('native concept exploration', () => {
  test.each([
    ...LEARNING_SCENES,
  ])('%s requires actual comparison trials; restoring preserves progress', (scene) => {
    const activity: SimulationActivity = { type: 'simulation', version: 1, scene }
    const initial = initialSimulationParameters(activity)
    expect(isSimulationActivity(activity)).toBe(true)
    expect(evaluateSimulation(activity, { simulation: initial, passed: true }).passed).toBe(false)
    let answers: LearningAnswers = {}
    for (const parameters of simulationCases[scene])
      answers = recordSimulationTrial(activity, answers, parameters)
    expect(isLearningAnswers(answers)).toBe(true)
    expect(evaluateSimulation(activity, answers)).toMatchObject({
      passed: true,
      evidence: 'exploration',
      verifiedBy: 'client',
    })
    expect(evaluateSimulation(activity, JSON.parse(JSON.stringify(answers))).passed).toBe(true)
    expect(
      simulationTrials(activity, recordSimulationTrial(activity, answers, initial)).length,
    ).toBeLessThanOrEqual(simulationCases[scene].length + 1)
  })
  test('invalid and oversized trails never satisfy exploration', () => {
    const activity: SimulationActivity = { type: 'simulation', version: 1, scene: 'jump' }
    for (const simulationTrials of [
      ['invalid'],
      ['{"gravity":0,"force":1000000}'],
      Array.from({ length: 101 }, () => '{"gravity":0,"force":8}'),
    ])
      expect(evaluateSimulation(activity, { simulationTrials }).passed).toBe(false)
    expect(isSimulationActivity({ ...activity, scene: 'arbitrary-script' })).toBe(false)
  })
  test('gravity changes the trajectory and returns to ground; zero gravity keeps climbing', () => {
    expect(simulationFrame('jump', { gravity: 1, force: 8 }, 0.5).dinoY).toBeGreaterThan(0)
    expect(simulationFrame('jump', { gravity: 1, force: 8 }, 1).dinoY).toBe(0)
    expect(simulationFrame('jump', { gravity: 0, force: 8 }, 1).dinoY).toBeGreaterThan(
      simulationFrame('jump', { gravity: 0, force: 8 }, 0.25).dinoY,
    )
  })
  test('state guards stop clocks; cleanup changes stored population without deleting visible cacti', () => {
    expect(simulationFrame('score', { guarded: 1, screen: 0 }, 1).points).toBe(0)
    expect(simulationFrame('score', { guarded: 0, screen: 0 }, 1).points).toBe(5)
    const clean = simulationFrame('cleanup', { cleanup: 1 }, 1),
      kept = simulationFrame('cleanup', { cleanup: 0 }, 1)
    expect(clean.cacti).toEqual(kept.cacti)
    expect(clean.stored).toBeLessThan(kept.stored)
  })
  test('base limit is distinct from final random velocity and existing objects keep their speed', () => {
    const frame = simulationFrame('acceleration', { limited: 1, ticks: 5, sample: 1 }, 1)
    expect(frame.base).toBe(-9)
    expect(frame.velocity).toBe(-10)
    expect(frame.cacti.find((c) => c.id === 'previous')?.x).toBe(130)
    expect(simulationFrame('acceleration', { limited: 0, ticks: 5, sample: 1 }, 1).base).toBe(-10)
  })
})
