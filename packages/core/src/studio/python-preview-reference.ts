import { z } from 'zod'
import { StudioSha256Schema } from './project-environment'
import { StudioProjectIdSchema } from './project-identity'
import { isStudioPythonWebOrigin, STUDIO_PYTHON_PREVIEW_LIFETIME_MS } from './python-preview-input'

export const studioPythonPreviewRoute = (id: string) =>
  `/v1/python-previews/${StudioSha256Schema.parse(id)}/`
export const StudioPythonPreviewReferenceSchema = z
  .strictObject({
    kind: z.literal('python-preview'),
    version: z.literal(1),
    id: StudioSha256Schema,
    projectId: StudioProjectIdSchema,
    revision: StudioSha256Schema,
    runtimeManifestSha256: StudioSha256Schema,
    /** Optional only for historical metadata; executable hosts must require version1. */
    previewHostAudioVersion: z.literal(1).optional(),
    url: z.string().max(4096),
    sha256: StudioSha256Schema,
    expiresAt: z.number().int().nonnegative(),
  })
  .superRefine((value, context) => {
    try {
      const url = new URL(value.url)
      if (
        !isStudioPythonWebOrigin(url.origin) ||
        value.url !== `${url.origin}${studioPythonPreviewRoute(value.id)}index.html`
      )
        throw new Error('URL inválida')
    } catch {
      context.addIssue({ code: 'custom', message: 'Endereço do preview Python inválido.' })
    }
  })
export type StudioPythonPreviewReference = z.infer<typeof StudioPythonPreviewReferenceSchema>

/** A reference is metadata, never authorization. Hosts also fence access and the current revision. */
export function verifyStudioPythonPreviewReference(
  raw: unknown,
  scope: {
    projectId: string
    revision: string
    runtimeManifestSha256: string
    serviceOrigin: string
    parentOrigin: string
    now: number
  },
) {
  const ref = StudioPythonPreviewReferenceSchema.parse(raw)
  if (
    !isStudioPythonWebOrigin(scope.serviceOrigin) ||
    !isStudioPythonWebOrigin(scope.parentOrigin) ||
    scope.serviceOrigin === scope.parentOrigin ||
    new URL(ref.url).origin !== scope.serviceOrigin ||
    ref.projectId !== scope.projectId ||
    ref.revision !== scope.revision ||
    ref.runtimeManifestSha256 !== scope.runtimeManifestSha256 ||
    !Number.isSafeInteger(scope.now) ||
    ref.expiresAt <= scope.now ||
    ref.expiresAt > scope.now + STUDIO_PYTHON_PREVIEW_LIFETIME_MS
  )
    throw new Error('O preview Python não corresponde ao projeto, à origem ou ao prazo autorizado.')
  return ref
}
