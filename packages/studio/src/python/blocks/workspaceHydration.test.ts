import { expect, test } from 'bun:test'
import { setBlocksHydrationTimeoutForTests } from '../../persistence/service'
import { pythonEnvironmentFixture } from '../../state/fixtures/pythonEnvironment'
import { createStudioStores } from '../../state/studioStores'
import { createPythonWorkspaceDraft, readPythonWorkspaceDraft } from './workspaceDraft'

async function fixture() {
  const { project } = await pythonEnvironmentFixture('classic')
  if (project.kind !== 'classic') throw new Error('Fixture')
  const reads: { resolve(value: unknown): void; reject(error: Error): void }[] = []
  const stores = createStudioStores({
    persistence: {
      load: async () => null,
      save: async () => {},
      loadBlocksState: () =>
        new Promise((resolve, reject) => {
          reads.push({ resolve, reject })
        }),
    },
  })
  stores.project.getState().hydrateProject({ ...project, blocksState: null })
  const begin = () => {
    const current = stores.project.getState().project!
    stores.persistence.hydrateAfterLoad(current)
  }
  const draft = (value: string) =>
    createPythonWorkspaceDraft(
      project,
      'main.py',
      {
        blocks: {
          languageVersion: 0,
          blocks: [
            {
              type: 'sz_py_expression',
              id: 'root',
              inputs: {
                VALUE: {
                  block: { type: 'sz_py_integer', id: 'number', fields: { NUMBER: value } },
                },
              },
            },
          ],
        },
      },
      ['root'],
    )
  return { project, stores, reads, begin, draft }
}

test('late hydration never replaces a live Python envelope, including unfinished text', async () => {
  const { stores, reads, begin, draft } = await fixture()
  setBlocksHydrationTimeoutForTests(1)
  try {
    begin()
    await Bun.sleep(15)
    expect(stores.project.getState().blocksHydration).toBe('failed')
    const current = stores.project.getState().project!
    if (current.programmingLanguage !== 'python' || current.kind !== 'classic')
      throw new Error('Fixture')
    const live = draft('12a')
    expect(
      stores.project.getState().applyPythonSourceFiles(current, current.files, live),
    ).toBeNull()
    stores.project.getState().markSaved()
    reads[0]!.resolve(draft('1'))
    await Bun.sleep(0)
    const active = stores.project.getState().project!
    if (active.programmingLanguage !== 'python') throw new Error('Fixture')
    expect(readPythonWorkspaceDraft(active)).toEqual(live)
    expect(stores.project.getState().blocksHydration).toBe('discarded')
  } finally {
    setBlocksHydrationTimeoutForTests(null)
  }
})

test('a retry owns hydration status and ignores older responses and rejections', async () => {
  for (const fail of [false, true]) {
    const { stores, reads, begin, draft } = await fixture()
    begin()
    begin()
    if (fail) reads[0]!.reject(new Error('Old read failed'))
    else reads[0]!.resolve(draft('1'))
    await Bun.sleep(0)
    expect(stores.project.getState().blocksHydration).toBe('pending')
    expect(stores.project.getState().project!.blocksState).toBeNull()
    const latest = draft('2')
    reads[1]!.resolve(latest)
    await Bun.sleep(0)
    expect(stores.project.getState().blocksHydration).toBe('restored')
    expect(stores.project.getState().project!.blocksState).toEqual(latest)
  }
})
