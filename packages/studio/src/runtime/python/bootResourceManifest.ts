import { canonicalJson } from '@sistemazero/core/creations'
import { verifyStudioPythonDeployment } from '@sistemazero/core/studio/python-runtime-distribution'
import { z } from 'zod'
import {
  PYTHON_BOOT_RESOURCE_MIME as mime,
  PYTHON_BOOT_LIMITS,
  PYTHON_BOOT_RESOURCE_NAMES,
} from './bootResourceContract'

export { PYTHON_BOOT_RESOURCE_NAMES, type PythonBootResourceName } from './bootResourceContract'

export const PYTHON_BOOT_CACHE_PREFIX = 'sz-python-boot-v1:'
export const PYTHON_BOOT_CACHE_GENERATIONS = 3

const ManifestSchema = z
  .strictObject({
    version: z.literal(1),
    runtimeManifestSha256: z.string().regex(/^[a-f0-9]{64}$/),
    files: z
      .array(
        z.strictObject({
          name: z.enum(PYTHON_BOOT_RESOURCE_NAMES),
          bytes: z.number().int().positive().max(PYTHON_BOOT_LIMITS.fileBytes),
          sha256: z.string().regex(/^[a-f0-9]{64}$/),
          mime: z.string(),
        }),
      )
      .length(3),
  })
  .superRefine((value, context) => {
    if (
      new Set(value.files.map((file) => file.name)).size !== 3 ||
      value.files.some((file) => file.mime !== mime[file.name]) ||
      value.files.reduce((total, file) => total + file.bytes, 0) > PYTHON_BOOT_LIMITS.totalBytes
    )
      context.addIssue({ code: 'custom', message: 'Manifesto de boot Python inválido.' })
  })

export type PythonBootResourceManifest = z.infer<typeof ManifestSchema>

/** Copy before any await; a message/child cannot supply this configuration. */
export function capturePythonBootResourceManifest(raw: unknown): PythonBootResourceManifest {
  return ManifestSchema.parse(raw)
}

/** Structural configuration identity, never an authorization token or a cryptographic digest. */
export function pythonBootResourceManifestKey(raw: unknown): string {
  const manifest = capturePythonBootResourceManifest(raw)
  return canonicalJson({
    ...manifest,
    files: PYTHON_BOOT_RESOURCE_NAMES.map((name) => {
      const file = manifest.files.find((file) => file.name === name)
      if (!file) throw new Error('Recurso ausente no manifesto de boot Python.')
      return file
    }),
  })
}

/** Public data only, derived from the same verified deployment as executable artifacts. */
export async function createPythonBootResourceManifest(
  rawDeployment: unknown,
  expectedRuntimeHash: string,
): Promise<PythonBootResourceManifest> {
  if (!/^[a-f0-9]{64}$/.test(expectedRuntimeHash))
    throw new Error('Pin de release Python inválido.')
  const deployment = await verifyStudioPythonDeployment(rawDeployment)
  if (deployment.release.manifestSha256 !== expectedRuntimeHash)
    throw new Error('O manifesto de boot pertence a outra release Python.')
  const files = PYTHON_BOOT_RESOURCE_NAMES.map((name) => {
    const file = deployment.distribution.files.find((file) => file.path === name)
    if (!file) throw new Error(`Recurso de boot Python ausente: ${name}.`)
    return { name, bytes: file.bytes, sha256: file.sha256, mime: mime[name] }
  })
  return capturePythonBootResourceManifest({
    version: 1,
    runtimeManifestSha256: expectedRuntimeHash,
    files,
  })
}
