import { expect, test } from 'bun:test'
import { createEmptyProject } from '../core/project'
import { nativeRecovery } from './projectRecoveryGuards'
import type { RecoveryWrite } from './projectStorageCoordinator'
import { projectRecoveryKey } from './projectStorageKeys'
import { projectStorageEntries } from './projectStorageRecords'

for (const version of [3, 4] as const) {
  test(`recovery v${version} validates its own partition namespace without changing revision identity`, () => {
    const project = createEmptyProject('lesson-project', 'Aula')
    const recovery: RecoveryWrite = {
      version: 1,
      projectId: project.id,
      head: { version: 1, writer: 'writer', token: 'revision', base: null, sequence: 1 },
      applications: [],
      write: { puts: projectStorageEntries(project, version) },
      replacesRecovery: [
        { key: projectRecoveryKey(project.id, 'ancestor', version), token: 'before' },
      ],
    }
    const key = projectRecoveryKey(project.id, 'writer', version)
    expect(nativeRecovery(recovery, key, version)).toBe(recovery)
    expect(() => nativeRecovery(recovery, key, version === 3 ? 4 : 3)).toThrow()
    expect(() => nativeRecovery({ ...recovery, futureControl: true }, key, version)).toThrow()
    expect(() =>
      nativeRecovery(
        {
          ...recovery,
          replacesRecovery: [
            {
              key: projectRecoveryKey('foreign', 'ancestor', version),
              token: 'before',
            },
          ],
        },
        key,
        version,
      ),
    ).toThrow()
  })
}
