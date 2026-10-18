import { describe, expect, test } from 'bun:test'
import { documentFixture } from './fixtures/projectDocuments'
import { projectToMetaRecord } from './projectStorageRecords'
import { projectEnvironmentSummary, toProjectSummary } from './projectSummary'

describe('project summaries identify environments without granting execution', () => {
  test('only known historical formats without a foreign environment default to JavaScript', () => {
    for (const formatVersion of [undefined, 1, 2])
      expect(projectEnvironmentSummary({ formatVersion })).toEqual({
        programmingLanguage: 'javascript',
        kind: 'classic',
      })
    for (const raw of [
      { formatVersion: 4 },
      { formatVersion: 0 },
      { formatVersion: '2' },
      { formatVersion: 2, programmingLanguage: 'python' },
      { formatVersion: 2, runtime: {} },
      { python: {} },
      { kind: 'alien' },
    ])
      expect(projectEnvironmentSummary(raw).programmingLanguage).toBe('unknown')
  })

  test('the four variants expose identity without source, assets, dependency lock or capabilities', () => {
    for (const language of ['javascript', 'python'] as const)
      for (const kind of ['classic', 'pro'] as const) {
        const project = documentFixture(language, kind)
        const summary = toProjectSummary(project.id, projectToMetaRecord(project))
        expect(summary).toMatchObject({
          programmingLanguage: language,
          kind,
          runtime: project.runtime,
          id: project.id,
          name: project.name,
        })
        for (const key of ['files', 'tree', 'assets', 'python', 'capabilities'])
          expect(summary).not.toHaveProperty(key)
      }
  })

  test('malformed and incomplete v3 metadata cannot masquerade as JavaScript', () => {
    const project = documentFixture('python', 'pro')
    for (const patch of [
      { programmingLanguage: 'ruby' },
      { runtime: undefined },
      { kind: undefined },
      { runtime: { ...project.runtime, manifestSha256: 'invalid' } },
    ])
      expect(projectEnvironmentSummary({ ...project, ...patch }).programmingLanguage).toBe(
        'unknown',
      )
    expect(toProjectSummary('id', null)).toBeNull()
  })
})
