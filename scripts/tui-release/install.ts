import { Database } from 'bun:sqlite'
import { cp, mkdir, open, readFile, rename, stat } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { z } from 'zod'
import { ensureProfile } from '../../packages/agent-runtime/src/config'
import { listen } from '../../packages/agent-runtime/src/ipc/server'
import { verify } from './manifest'

const pointerSchema = z.object({
  release: z.string().regex(/^[a-f0-9]{64}$/),
  previous: z
    .string()
    .regex(/^[a-f0-9]{64}$/)
    .optional(),
  backup: z.string().optional(),
})
async function pointer(directory: string) {
  try {
    return pointerSchema.parse(JSON.parse(await readFile(join(directory, 'active.json'), 'utf8')))
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') return undefined
    throw error
  }
}
async function publish(directory: string, value: z.infer<typeof pointerSchema>) {
  const path = join(directory, `active-${crypto.randomUUID()}.tmp`)
  const file = await open(path, 'wx', 0o600)
  try {
    await file.writeFile(JSON.stringify(value))
    await file.sync()
  } finally {
    await file.close()
  }
  await rename(path, join(directory, 'active.json'))
}
async function run(args: string[], cwd: string) {
  const child = Bun.spawn([process.execPath, ...args], {
    cwd,
    stdin: 'ignore',
    stdout: 'pipe',
    stderr: 'pipe',
  })
  const timer = setTimeout(() => child.kill(), 120000)
  try {
    const [output, errors, code] = await Promise.all([
      new Response(child.stdout).text(),
      new Response(child.stderr).text(),
      child.exited,
    ])
    if (code !== 0) throw new Error('Release verification failed: ' + errors.slice(-4000))
    return output
  } finally {
    clearTimeout(timer)
  }
}
/** Immutable releases and one atomic pointer; interruption before publication leaves the old release active. */
export async function install(
  source: string,
  destination: string,
  profile: string,
  rollback = false,
) {
  source = resolve(source)
  destination = resolve(destination)
  profile = resolve(profile)
  if (destination.toLocaleLowerCase() === profile.toLocaleLowerCase())
    throw new Error('Install directory and runtime profile must be distinct')
  await ensureProfile(destination)
  // A kernel-owned endpoint disappears on crash and serializes updates of this install,
  // even when two callers select different runtime profiles.
  const installation = await listen(destination, async () => {
    throw new Error('Installation in progress')
  })
  try {
    return await installLocked(source, destination, profile, rollback)
  } finally {
    await installation.close()
  }
}
async function installLocked(
  source: string,
  destination: string,
  profile: string,
  rollback: boolean,
) {
  await ensureProfile(profile)
  await mkdir(join(destination, 'releases'), { recursive: true, mode: 0o700 })
  const old = await pointer(destination)
  if (rollback && !old?.previous) throw new Error('No previous release is recorded')
  const candidate = rollback ? join(destination, 'releases', old!.previous!) : source
  const integrity = await verify(candidate)
  if (old?.release === integrity.digest) return { unchanged: true, release: integrity.digest }
  const target = join(destination, 'releases', integrity.digest)
  if (!rollback) {
    const staging = join(destination, 'releases', 'preparing-' + crypto.randomUUID())
    await mkdir(staging)
    // Copy only manifested, flat assets. Never import node_modules or links from a source tree.
    for (const name of [...Object.keys(integrity.value.files), 'manifest.json'])
      await cp(join(source, name), join(staging, name), { errorOnExist: true })
    await verify(staging)
    await run(['install', '--frozen-lockfile', '--ignore-scripts'], staging)
    await run(['cli.js', '--help'], staging)
    try {
      await rename(staging, target)
    } catch (error) {
      if (
        !(error instanceof Error) ||
        !('code' in error) ||
        !['EEXIST', 'ENOTEMPTY', 'EPERM'].includes(String(error.code))
      )
        throw error
      const present = await verify(target)
      if (present.digest !== integrity.digest) throw new Error('Existing immutable release differs')
      await run(['cli.js', '--help'], target)
    }
  }
  // Holding the actual IPC endpoint excludes a supervisor, including concurrent startup.
  let guard: Awaited<ReturnType<typeof listen>>
  try {
    guard = await listen(profile, async () => {
      throw new Error('Profile is being upgraded; retry after installation')
    })
  } catch {
    throw new Error(
      'Close this profile runtime before updating: sistemazero rpc runtime.shutdown. No release was activated.',
    )
  }
  try {
    let backup: string | undefined
    const database = join(profile, 'state.sqlite')
    if (
      await stat(database).then(
        () => true,
        (error) => {
          if (error.code === 'ENOENT') return false
          throw error
        },
      )
    ) {
      const db = new Database(database, { readonly: true, strict: true })
      try {
        const version = z
          .object({ user_version: z.number() })
          .parse(db.query('PRAGMA user_version').get()).user_version
        if (version > integrity.value.schemaMax)
          throw new Error(
            'Rollback cannot read the current schema. Preserve the current database and explicitly restore a compatible migration backup before retrying.',
          )
        backup = `${database}.upgrade-${Date.now()}-${crypto.randomUUID()}.backup`
        db.query('VACUUM INTO ?').run(backup)
      } finally {
        db.close()
      }
    }
    // Launcher is self-contained, stable and installed once. Version changes live in releases.
    const launcher = join(destination, 'launcher.js')
    try {
      await cp(join(target, 'launcher.js'), launcher, { errorOnExist: true, force: false })
    } catch (error) {
      if (!(error instanceof Error) || !('code' in error) || error.code !== 'EEXIST') throw error
    }
    await publish(destination, { release: integrity.digest, previous: old?.release, backup })
    return { release: integrity.digest, previous: old?.release, backup, launcher }
  } finally {
    await guard.close()
  }
}
if (import.meta.main) {
  const [source, destination, profile, operation] = process.argv.slice(2)
  if (!source || !destination || !profile || (operation && operation !== '--rollback'))
    throw new Error('Usage: bun install.js SOURCE INSTALL_DIRECTORY PROFILE [--rollback]')
  console.log(
    JSON.stringify(
      await install(source, destination, profile, operation === '--rollback'),
      null,
      2,
    ),
  )
}
