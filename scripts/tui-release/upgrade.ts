import { Database } from 'bun:sqlite'
import { cp, mkdir, mkdtemp, readdir, readFile, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { OwnedProcess } from '../../packages/agent-runtime/src/process/owned'
import { install } from './install'
import { verify } from './manifest'

const directory = await mkdtemp(join(tmpdir(), 'Zero upgrade ação '))
const destination = join(directory, 'installed'),
  profile = join(directory, 'profile')
const source = resolve(import.meta.dir, '../../packages/tui/dist')
const first = await install(source, destination, profile)
const db = new Database(join(profile, 'state.sqlite'))
db.run(
  "CREATE TABLE fixture(value TEXT); INSERT INTO fixture VALUES ('preserved'); PRAGMA user_version=5;",
)
db.close()
const second = join(directory, 'candidate')
await mkdir(second)
const old = await verify(source)
for (const name of [...Object.keys(old.value.files), 'manifest.json'])
  await cp(join(source, name), join(second, name))
await writeFile(
  join(second, 'manifest.json'),
  JSON.stringify({ ...old.value, version: 'upgrade-fixture' }),
)
const before = await readFile(join(destination, 'active.json'), 'utf8')
const child = await OwnedProcess.start(profile, {
  executable: process.execPath,
  args: [join(import.meta.dir, 'install.ts'), second, destination, profile],
  cwd: directory,
})
let diagnostic = ''
child.stdout.on('data', () => {})
child.stderr.on('data', (value) => {
  diagnostic = (diagnostic + value.toString()).slice(-4000)
})
try {
  const deadline = Date.now() + 10000
  while (
    !(await readdir(join(destination, 'releases'))).some((name) => name.startsWith('preparing-'))
  ) {
    if (Date.now() > deadline)
      throw new Error('Installer did not reach preparation boundary: ' + diagnostic)
    await Bun.sleep(10)
  }
} finally {
  await child.close()
}
if ((await readFile(join(destination, 'active.json'), 'utf8')) !== before)
  throw new Error('Interrupted installation changed the active release')
const upgraded = await install(second, destination, profile)
if (!('backup' in upgraded) || !upgraded.backup)
  throw new Error('Consistent upgrade backup missing')
const backup = new Database(upgraded.backup, { readonly: true })
try {
  if (JSON.stringify(backup.query('SELECT value FROM fixture').get()) !== '{"value":"preserved"}')
    throw new Error('Backup lost fixture data')
} finally {
  backup.close()
}
const rolledBack = await install(second, destination, profile, true)
if (rolledBack.release !== first.release)
  throw new Error('Rollback selected wrong immutable release')
const launcher = Bun.spawn([process.execPath, join(destination, 'launcher.js'), '--help'], {
  cwd: tmpdir(),
  stdout: 'pipe',
  stderr: 'pipe',
})
const [output, errors, code] = await Promise.all([
  new Response(launcher.stdout).text(),
  new Response(launcher.stderr).text(),
  launcher.exited,
])
if (code !== 0 || !output.includes('Sistema Zero'))
  throw new Error('Installed launcher failed: ' + errors)
const report = {
  at: new Date().toISOString(),
  directory,
  interruptedKeptPrevious: true,
  backupVerified: true,
  rollbackVerified: true,
  launcherVerified: true,
}
const reportPath = resolve(
  import.meta.dir,
  '../../.audits/tui-bench/working-tree/win32/upgrade.json',
)
await mkdir(resolve(reportPath, '..'), { recursive: true })
await writeFile(reportPath, JSON.stringify(report, null, 2))
console.log(JSON.stringify(report, null, 2))
