import { expect, test } from 'bun:test'
import {
  readStudioPythonMissionObservation,
  readStudioPythonMissionProbe,
  verifyStudioPythonMissionObservation,
} from '../src/studio/python-mission-observation'

test('mission probes allow bounded selectors and arguments, never answers or executable expressions', () => {
  expect(readStudioPythonMissionProbe({ type: 'value', path: 'pontuação' }).type).toBe('value')
  for (const probe of [
    { type: 'value', path: 'hero.x()' },
    { type: 'value', path: 'x', expected: 3 },
    { type: 'functionReturns', id: 'f', name: 'f', args: [[]], expected: true },
    { type: 'functionReturns', id: 'f', name: 'f', module: '../evil.py', args: [[]] },
    { type: 'functionReturns', id: 'f', name: 'f', args: Array(9).fill([]) },
  ])
    expect(() => readStudioPythonMissionProbe(probe)).toThrow()
})

test('worker observations cannot forge motion samples, verdicts, scope or missing cases', () => {
  expect(() =>
    readStudioPythonMissionObservation({
      type: 'sprite',
      observed: { found: true, objectId: 1 },
      pose: { x: 1, y: 2 },
    }),
  ).toThrow()
  expect(() =>
    readStudioPythonMissionObservation({
      type: 'value',
      observed: { found: true, value: 2 },
      passed: true,
    }),
  ).toThrow()
  const probe = readStudioPythonMissionProbe({
    id: 'f',
    type: 'functionReturns',
    name: 'f',
    args: [[], []],
  })
  expect(() =>
    verifyStudioPythonMissionObservation(
      { id: 'g', type: 'functionReturns', missing: true },
      probe,
    ),
  ).toThrow()
  expect(() =>
    verifyStudioPythonMissionObservation(
      { id: 'f', type: 'functionReturns', cases: [{ ok: true, value: 1 }] },
      probe,
    ),
  ).toThrow()
  expect(
    verifyStudioPythonMissionObservation(
      { id: 'f', type: 'functionReturns', missing: true },
      probe,
    ),
  ).toMatchObject({ missing: true })
})
