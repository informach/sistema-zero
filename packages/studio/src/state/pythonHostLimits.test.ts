import { expect, test } from 'bun:test'
import { STUDIO_PRO_BUILD_LIMITS } from '@sistemazero/core/studio/pro-build'
import { isPythonProject } from '../core/editableProject'
import { pythonEnvironmentFixture } from './fixtures/pythonEnvironment'
import { createProjectStore } from './projectStore'

for (const kind of ['classic', 'pro'] as const) {
  test(`${kind}: host source quotas reject edits without publishing a partial document`, async () => {
    const { project } = await pythonEnvironmentFixture(kind)
    const store = createProjectStore({ limits: { maxFileChars: 200, maxTotalChars: 300 } })
    store.getState().hydrateProject(project)
    expect(store.getState().setPythonFile('main.py', '#'.repeat(180))).toBeNull()
    expect(store.getState().addExtraFile('helper.py')).toBeNull()
    const accepted = store.getState().project
    expect(store.getState().setPythonFile('helper.py', '#'.repeat(180))).toContain('limites')
    expect(store.getState().project).toBe(accepted)
    expect(store.getState().setPythonFile('main.py', '#'.repeat(201))).toContain('limites')
    expect(store.getState().project).toBe(accepted)
    if (!accepted || !isPythonProject(accepted)) throw new Error('Fixture')
    if (accepted.kind === 'classic') {
      expect(
        store.getState().applyPythonSourceFiles(
          accepted,
          {
            ...accepted.files,
            'helper.py': '#'.repeat(180),
          },
          null,
        ),
      ).toContain('limites')
    } else {
      let publishes = 0
      expect(
        store.getState().reconcileProFiles(
          accepted.id,
          accepted.tree,
          {
            ...accepted.tree,
            'helper.py': { kind: 'file', content: '#'.repeat(180) },
          },
          () => {
            publishes++
          },
        ),
      ).toContain('limites')
      expect(publishes).toBe(0)
    }
    expect(store.getState().project).toBe(accepted)
  })
}

test('host file counts and request quotas can narrow but cannot increase the hard Python limit', async () => {
  const classic = (await pythonEnvironmentFixture('classic')).project
  const store = createProjectStore({ limits: { maxExtraFiles: 0 } })
  store.getState().hydrateProject(classic)
  expect(store.getState().setPythonFile('main.py', 'print(1)')).toBeNull()
  expect(store.getState().addExtraFile('helper.py')).toContain('limites')
  const pro = (await pythonEnvironmentFixture('pro')).project
  const limited = createProjectStore({
    proBuildLimits: { ...STUDIO_PRO_BUILD_LIMITS, maxFiles: 2 },
  })
  limited.getState().hydrateProject(pro)
  expect(limited.getState().addProFile('helper.py')).toContain('limites')
  const oversized = createProjectStore({
    limits: { maxFileChars: 1_000_000 },
    proBuildLimits: { ...STUDIO_PRO_BUILD_LIMITS, maxFileChars: 1_000_000 },
  })
  oversized.getState().hydrateProject(pro)
  expect(oversized.getState().setPythonFile('main.py', '#'.repeat(256_001))).toContain('limites')
})
