import { expect, test } from 'bun:test'
import { documentFixture } from '../../../studio/src/state/fixtures/projectDocuments'
import {
  reconcileStudioChainEnvironment,
  studioChainCandidate,
} from '../../src/domain/studio/chain-environment'

test('chains compare pinned environments, ignoring student-editable work', () => {
  for (const language of ['javascript', 'python'] as const)
    for (const kind of ['classic', 'pro'] as const) {
      const project = documentFixture(language, kind)
      const edited = { ...project, files: { 'main.py': 'print(123)' }, assets: [], mode: 'code' }
      const environment = reconcileStudioChainEnvironment('jogo', undefined, [], [project, edited])
      expect(environment?.programmingLanguage).toBe(language)
      expect(environment?.kind).toBe(kind)
      expect(environment).not.toHaveProperty('files')
      expect(environment).not.toHaveProperty('assets')
      expect(reconcileStudioChainEnvironment('jogo', environment, [], [edited])).toEqual(
        environment,
      )
    }
})

test('same chain rejects language, kind, release, template and implicit legacy migration', () => {
  const project = documentFixture('python', 'pro')
  if (project.kind !== 'pro') throw new Error('fixture')
  for (const changed of [
    documentFixture('javascript', 'pro'),
    documentFixture('python', 'classic'),
    { ...project, runtime: { ...project.runtime, releaseId: 'another-release' } },
    { ...project, proMeta: { ...project.proMeta, templateId: 'another-template' } },
    { formatVersion: 2 },
  ])
    expect(() => reconcileStudioChainEnvironment('jogo', undefined, [project], [changed])).toThrow(
      'outro nome',
    )
})

test('legacy absence means JavaScript; explicit malformed runtime does not become absence', () => {
  expect(studioChainCandidate({ kind: 'studio', chain: ' \uFEFFjogo\u00a0 ' })).toEqual([
    { chain: 'jogo', project: { formatVersion: 2 } },
  ])
  expect(reconcileStudioChainEnvironment('jogo', undefined, [{ formatVersion: 2 }], [{}])).toEqual({
    formatVersion: 2,
    programmingLanguage: 'javascript',
    kind: 'classic',
  })
  expect(() =>
    reconcileStudioChainEnvironment('jogo', undefined, [{ formatVersion: 2, runtime: null }], [{}]),
  ).toThrow('histórico')
})

test('ambiguous historical chain can retire but its name cannot be reused', () => {
  const history = [documentFixture('javascript', 'classic'), documentFixture('python', 'classic')]
  expect(reconcileStudioChainEnvironment('jogo', undefined, history, [])).toBeNull()
  expect(() => reconcileStudioChainEnvironment('jogo', null, [], [history[0]])).toThrow('histórico')
})
