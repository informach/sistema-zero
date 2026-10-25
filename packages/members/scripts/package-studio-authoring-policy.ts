import { createHash } from 'node:crypto'
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises'
import { createStudioAuthoringPolicy } from '../src/domain/studio/authoring-policy'
import {
  STUDIO_POLICY_DIRECTORY,
  STUDIO_POLICY_MAX_BYTES,
} from '../src/infrastructure/config/studio-authoring-policy'

/** Package public, reviewed deployment metadata; never fetch a catalog at service startup. */
export async function packageStudioAuthoringPolicy(input: string) {
  const metadata = await stat(input)
  if (!metadata.isFile() || metadata.size > STUDIO_POLICY_MAX_BYTES)
    throw new Error('Arquivo do catálogo inválido ou acima do limite.')
  const bytes = await readFile(input)
  if (bytes.length > STUDIO_POLICY_MAX_BYTES) throw new Error('Catálogo acima do limite.')
  await createStudioAuthoringPolicy(JSON.parse(bytes.toString('utf8')))
  const sha256 = createHash('sha256').update(bytes).digest('hex')
  const destination = new URL(`${sha256}.json`, STUDIO_POLICY_DIRECTORY)
  await mkdir(STUDIO_POLICY_DIRECTORY, { recursive: true })
  try {
    await writeFile(destination, bytes, { flag: 'wx' })
  } catch (error) {
    if (!(error instanceof Error && 'code' in error && error.code === 'EEXIST')) throw error
    if (!(await readFile(destination)).equals(bytes))
      throw new Error('Arquivo existente não corresponde ao hash do catálogo.')
  }
  return { sha256, bytes: bytes.length, file: destination.pathname }
}

if (import.meta.main) {
  const [input, ...extra] = process.argv.slice(2)
  if (!input || extra.length)
    throw new Error('Uso: bun scripts/package-studio-authoring-policy.ts <catalogo.json>')
  console.log(JSON.stringify(await packageStudioAuthoringPolicy(input)))
}
