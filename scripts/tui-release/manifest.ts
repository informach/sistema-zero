import { createHash } from 'node:crypto'
import { lstat, open, readdir, readFile, realpath } from 'node:fs/promises'
import { join, resolve, sep } from 'node:path'
import { z } from 'zod'

export const manifestSchema = z.object({
  format: z.literal(1),
  version: z.string(),
  platform: z.literal('win32'),
  arch: z.literal('x64'),
  schemaMax: z.number().int(),
  files: z.record(
    z.string().regex(/^[a-zA-Z0-9][a-zA-Z0-9._-]*$/),
    z.object({
      bytes: z.number().int().min(0).max(32_000_000),
      sha256: z.string().regex(/^[a-f0-9]{64}$/),
    }),
  ),
})
export const sha256 = (data: Uint8Array | string) => createHash('sha256').update(data).digest('hex')
async function boundedFile(path: string, limit: number) {
  const handle = await open(path, 'r')
  try {
    const info = await handle.stat()
    if (!info.isFile() || info.size > limit) throw new Error('Release asset exceeds limit')
    const value = Buffer.alloc(info.size)
    let offset = 0
    while (offset < value.length) {
      const read = await handle.read(value, offset, value.length - offset, offset)
      if (!read.bytesRead) throw new Error('Release asset changed while reading')
      offset += read.bytesRead
    }
    if ((await handle.stat()).size !== value.length)
      throw new Error('Release asset changed while reading')
    return value
  } finally {
    await handle.close()
  }
}
export async function manifest(directory: string) {
  const files: z.infer<typeof manifestSchema>['files'] = {}
  for (const name of (await readdir(directory)).sort()) {
    if (name === 'manifest.json') continue
    const path = join(directory, name),
      info = await lstat(path)
    if (!info.isFile() || info.isSymbolicLink() || info.size > 32_000_000)
      throw new Error('Unexpected release asset: ' + name)
    files[name] = { bytes: info.size, sha256: sha256(await readFile(path)) }
  }
  return manifestSchema.parse({
    format: 1,
    version: '0.1.0',
    platform: process.platform,
    arch: process.arch,
    schemaMax: 5,
    files,
  })
}
export async function verify(directory: string) {
  const root = await realpath(directory)
  const raw = await boundedFile(join(root, 'manifest.json'), 1_000_000)
  const value = manifestSchema.parse(JSON.parse(raw.toString('utf8')))
  if (
    Object.keys(value.files).length > 256 ||
    Object.values(value.files).reduce((sum, file) => sum + file.bytes, 0) > 128_000_000
  )
    throw new Error('Release inventory exceeds limit')
  if (value.platform !== process.platform || value.arch !== process.arch)
    throw new Error('Release platform does not match this machine')
  for (const required of [
    'cli.js',
    'main.js',
    'worker.js',
    'schema-worker.js',
    'typescript-worker.js',
    'browser-worker.mjs',
    'windows-job.ps1',
    'windows-job.exe',
    'windows-security.ps1',
    'package.json',
    'bun.lock',
    'smoke.js',
    'launcher.js',
  ])
    if (!value.files[required]) throw new Error('Missing release asset: ' + required)
  for (const [name, expected] of Object.entries(value.files)) {
    const path = resolve(root, name)
    const info = await lstat(path)
    if (
      !path.startsWith(root + sep) ||
      !info.isFile() ||
      info.isSymbolicLink() ||
      info.size !== expected.bytes ||
      sha256(await boundedFile(path, expected.bytes)) !== expected.sha256
    )
      throw new Error('Release integrity failed: ' + name)
  }
  return { value, digest: sha256(raw) }
}
