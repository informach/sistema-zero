import { createHash } from 'node:crypto'
import { open } from 'node:fs/promises'
import { createStudioAuthoringPolicy } from '../../domain/studio/authoring-policy'

export const STUDIO_POLICY_MAX_BYTES = 2_000_000
export const STUDIO_POLICY_DIRECTORY = new URL('./studio-authoring-catalogs/', import.meta.url)

type PolicyConfiguration = {
  STUDIO_AUTHORING_POLICY_JSON?: string
  STUDIO_AUTHORING_POLICY_SHA256?: string
}

/** Deployment-only selector: no request can choose a path, URL or policy. */
export async function loadStudioAuthoringPolicy(
  configuration: PolicyConfiguration,
  directory = STUDIO_POLICY_DIRECTORY,
) {
  const inline = configuration.STUDIO_AUTHORING_POLICY_JSON
  const sha256 = configuration.STUDIO_AUTHORING_POLICY_SHA256
  if (inline !== undefined && sha256 !== undefined)
    throw new Error('Configure apenas uma origem do catálogo do Estúdio: JSON ou SHA256.')
  if (sha256 === undefined) {
    if (inline === undefined) return undefined
    if (Buffer.byteLength(inline) > STUDIO_POLICY_MAX_BYTES)
      throw new Error('O catálogo do Estúdio excede o limite de tamanho.')
    return createStudioAuthoringPolicy(JSON.parse(inline))
  }
  if (!/^[a-f0-9]{64}$/.test(sha256)) throw new Error('SHA256 do catálogo do Estúdio inválido.')

  const file = await open(new URL(`${sha256}.json`, directory), 'r')
  try {
    const stat = await file.stat()
    if (!stat.isFile() || stat.size < 1 || stat.size > STUDIO_POLICY_MAX_BYTES)
      throw new Error('Arquivo do catálogo do Estúdio inválido ou acima do limite.')
    const bytes = await file.readFile()
    if (
      bytes.length > STUDIO_POLICY_MAX_BYTES ||
      createHash('sha256').update(bytes).digest('hex') !== sha256
    )
      throw new Error('Integridade do catálogo do Estúdio inválida.')
    return await createStudioAuthoringPolicy(JSON.parse(bytes.toString('utf8')))
  } finally {
    await file.close()
  }
}
