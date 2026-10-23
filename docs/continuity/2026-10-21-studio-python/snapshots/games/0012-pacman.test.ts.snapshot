import { expect, test } from 'bun:test'
import { readFile } from 'node:fs/promises'
import { documentFixture } from '../../../packages/studio/src/state/fixtures/projectDocuments'
import { type PacmanScenario, preparePacmanScenario } from './pacman'

// Document preparation tests only: no claim to run this unit fixture as a game.
function sourceDocument() {
  const project = documentFixture('python', 'pro')
  if (project.programmingLanguage !== 'python' || project.kind !== 'pro') throw new Error('fixture')
  // The shared structural fixture has a noncanonical legacy image name. This
  // source-only fixture declares no media, like the snapshot tests.
  project.assets = []
  delete project.coverAssetName
  return project
}

for (const scenario of [
  'observe',
  'pellet',
  'power',
  'death',
  'victory-near-end',
  'defeat-near-end',
  'geometry',
  'ai',
] as const satisfies readonly PacmanScenario[]) {
  test(`${scenario} adds one observer while preserving the source document`, async () => {
    const project = sourceDocument()
    const before = structuredClone(project)
    const result = await preparePacmanScenario(project, scenario)
    expect(project).toEqual(before)
    expect(result.project.python.entrypoint).toBe('qa_entry.py')
    const { 'qa_entry.py': entry, ...rest } = result.project.tree
    expect(rest).toEqual(before.tree)
    expect(result.project.assets).toEqual(before.assets)
    expect(result.project.runtime).toEqual(before.runtime)
    expect(entry?.kind).toBe('file')
    if (entry?.kind !== 'file') throw new Error('Missing observer')
    const configuration = entry.content.match(/^CONFIG = (.+)$/m)?.[1]
    expect(configuration).toBeDefined()
    if (!configuration) throw new Error('Missing configuration')
    expect(JSON.parse(configuration)).toEqual({ scenario, seed: 2026 })
    const source = await readFile(
      new URL(
        scenario === 'geometry' || scenario === 'ai'
          ? './pacman_functional_observer.py'
          : './pacman_observer.py',
        import.meta.url,
      ),
      'utf8',
    )
    // Only the explicit configuration differs, including for all six historical scenarios.
    expect(entry.content.replace(/^CONFIG = .+$/m, 'CONFIG = PIN')).toBe(
      source.replace(/^CONFIG = .+$/m, 'CONFIG = PIN'),
    )
    result.project.tree['new.py'] = { kind: 'file', content: 'independent clone' }
    expect(project).toEqual(before)
  })
}

test('preparation refuses to overwrite an existing observer', async () => {
  const project = sourceDocument()
  project.tree['qa_entry.py'] = { kind: 'file', content: 'preserve original' }
  const before = structuredClone(project)
  await expect(preparePacmanScenario(project, 'geometry')).rejects.toThrow()
  expect(project).toEqual(before)
})

test('preparation refuses unsafe seeds without changing the source document', async () => {
  const project = sourceDocument()
  const before = structuredClone(project)
  await expect(preparePacmanScenario(project, 'ai', Number.NaN)).rejects.toThrow()
  expect(project).toEqual(before)
})
