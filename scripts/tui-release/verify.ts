import { cp, mkdtemp, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { RuntimeClient } from '../../packages/agent-runtime/src/client'
import { Credentials } from '../../packages/agent-runtime/src/credentials'
import { verify } from './manifest'

const directory = await mkdtemp(join(tmpdir(), 'Sistema Zero instalação '))
await cp(resolve(import.meta.dir, '../../packages/tui/dist'), directory, { recursive: true })
await verify(directory)
const profile = join(directory, 'perfil')
const install = Bun.spawn([process.execPath, 'install', '--frozen-lockfile', '--ignore-scripts'], {
  cwd: directory,
  stdout: 'pipe',
  stderr: 'pipe',
})
const logs = await Promise.all([
  new Response(install.stdout).text(),
  new Response(install.stderr).text(),
])
if ((await install.exited) !== 0) throw new Error(logs.join('\n'))
const smoke = Bun.spawn([process.execPath, 'smoke.js'], {
  cwd: directory,
  stdout: 'pipe',
  stderr: 'pipe',
})
const [smokeOutput, smokeErrors, smokeCode] = await Promise.all([
  new Response(smoke.stdout).text(),
  new Response(smoke.stderr).text(),
  smoke.exited,
])
if (smokeCode !== 0) throw new Error('Installed worker/renderer smoke failed: ' + smokeErrors)
const help = Bun.spawn([process.execPath, 'cli.js', '--help'], {
  cwd: directory,
  stdout: 'pipe',
  stderr: 'pipe',
})
if (!(await new Response(help.stdout).text()).includes('Sistema Zero') || (await help.exited) !== 0)
  throw new Error('Packaged help failed')
const doctor = Bun.spawn([process.execPath, 'cli.js', 'doctor'], {
  cwd: directory,
  env: { ...process.env, SISTEMAZERO_HOME: profile },
  stdout: 'pipe',
  stderr: 'pipe',
})
const output = await new Response(doctor.stdout).text()
const errors = await new Response(doctor.stderr).text()
if ((await doctor.exited) !== 0) throw new Error(errors)
const client = await RuntimeClient.connect(profile)
try {
  await client.request('runtime.shutdown')
} finally {
  client.close()
  await new Credentials(profile).delete('ipc')
}
await writeFile(
  join(directory, 'verification.json'),
  JSON.stringify(
    {
      directory,
      doctor: JSON.parse(output),
      smoke: JSON.parse(smokeOutput),
      verifiedAt: new Date().toISOString(),
    },
    null,
    2,
  ),
)
console.log(
  JSON.stringify(
    { directory, doctor: JSON.parse(output), smoke: JSON.parse(smokeOutput) },
    null,
    2,
  ),
)
