import { expect, test } from 'bun:test'
import { mkdtemp, rmdir, unlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { bundle, remote } from '../../../../scripts/release/sync-course-audiences'

test('o operador mantém publicação e política nos módulos implantados', async () => {
  const code = await bundle('members')
  expect(code).toContain(
    'from "/app/packages/members/src/infrastructure/persistence/drizzle/lesson-draft.repository.ts"',
  )
  expect(code).toContain(
    'from "/app/packages/members/src/infrastructure/config/studio-authoring-policy.ts"',
  )
  expect(code).not.toContain('from "drizzle-orm"')
  expect(code).not.toContain('function loadStudioAuthoringPolicy')
  expect(code).toContain('async function executeCourseSync')
  expect(code).not.toContain(
    'from "/app/packages/members/src/infrastructure/persistence/drizzle/course-sync.ts"',
  )
}, 30_000)

test('um recibo existente recusa a execução antes de abrir o Railway', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'sz-course-sync-log-'))
  const file = join(directory, 'existing.log')
  try {
    await writeFile(file, 'evidência anterior', { flag: 'wx' })
    await expect(remote('members', 'staging', '', {}, file)).rejects.toMatchObject({
      code: 'EEXIST',
    })
    expect(await Bun.file(file).text()).toBe('evidência anterior')
  } finally {
    await unlink(file)
    await rmdir(directory)
  }
})
