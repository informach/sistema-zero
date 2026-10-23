import { readdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { pensaTestTarget } from '../tests/db/pensa-native-database'

pensaTestTarget('pensa_verification_guard')
const root = fileURLToPath(new URL('../', import.meta.url))
const files = (await readdir(new URL('../tests/db/', import.meta.url)))
  .filter((name) => /^pensa-native.*\.test\.ts$/.test(name))
  .sort()
  .map((name) => `tests/db/${name}`)
if (files.length < 2) throw new Error('The native Pensa database suites are missing')
const child = Bun.spawn(
  [process.execPath, 'test', ...files, 'tests/unit/pensa-functional-migration.test.ts'],
  { cwd: root, env: process.env, stdout: 'inherit', stderr: 'inherit' },
)
process.exit(await child.exited)
