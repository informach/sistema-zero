import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { type Settings, settingsSchema } from '@sistemazero/agent-core'
import { protectWindows } from './process/security'
import { profileIdentity } from './profile-identity'

const privateProfiles = new Map<string, Promise<unknown>>()

export function profileDirectory() {
  return profileIdentity(
    process.env.SISTEMAZERO_HOME ||
      join(process.env.LOCALAPPDATA || join(homedir(), '.local', 'share'), 'sistemazero', 'agent'),
  )
}
export function isMissing(error: unknown) {
  return error instanceof Error && 'code' in error && error.code === 'ENOENT'
}
export async function ensureProfile(directory: string) {
  await mkdir(directory, { recursive: true, mode: 0o700 })
  if (!privateProfiles.has(directory))
    privateProfiles.set(directory, protectWindows('directory', directory))
  try {
    await privateProfiles.get(directory)
  } catch (error) {
    privateProfiles.delete(directory)
    throw error
  }
}
export async function readSettings(directory: string): Promise<Settings> {
  try {
    return settingsSchema.parse(
      JSON.parse(await readFile(join(directory, 'settings.json'), 'utf8')),
    )
  } catch (error) {
    if (isMissing(error)) return settingsSchema.parse({})
    throw error
  }
}
export async function writeSettings(directory: string, value: unknown) {
  const settings = settingsSchema.parse(value)
  await ensureProfile(directory)
  const target = join(directory, 'settings.json')
  const temporary = `${target}.${crypto.randomUUID()}.tmp`
  await writeFile(temporary, JSON.stringify(settings, null, 2), { mode: 0o600 })
  await rename(temporary, target)
  return settings
}
