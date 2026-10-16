import { z } from 'zod'

export const releaseConfigurationSchema = z
  .object({
    schemaVersion: z.literal(1),
    feedUrl: z
      .string()
      .url()
      .refine((value) => {
        const url = new URL(value)
        return (
          url.protocol === 'https:' &&
          !url.username &&
          !url.password &&
          !url.search &&
          !url.hash &&
          url.pathname.endsWith('/')
        )
      }, 'Informe uma pasta HTTPS pública, sem credencial e terminada em /.'),
    publisherNames: z
      .array(
        z
          .string()
          .trim()
          .min(1)
          .max(500)
          .refine(
            (value) => /(^|,\s*)CN=/.test(value),
            'Use o Subject completo do certificado, incluindo CN=.',
          ),
      )
      .min(1)
      .max(5),
  })
  .strict()
export type ReleaseConfiguration = z.infer<typeof releaseConfigurationSchema>
export type DesktopUpdate = {
  state:
    | 'unavailable'
    | 'idle'
    | 'checking'
    | 'available'
    | 'downloading'
    | 'ready'
    | 'installing'
    | 'error'
  currentVersion: string
  version?: string
  progress?: number
  message?: string
}

const updateManifestSchema = z.object({
  version: z.string().regex(/^\d+\.\d+\.\d+$/),
  files: z
    .array(
      z.object({
        url: z.string().min(1),
        sha512: z.string().regex(/^[A-Za-z0-9+/]{86}==$/),
        size: z
          .number()
          .int()
          .positive()
          .max(4 * 1024 ** 3),
      }),
    )
    .length(1),
})
export function validateUpdateManifest(value: unknown, config: ReleaseConfiguration) {
  const manifest = updateManifestSchema.parse(value)
  for (const file of manifest.files) {
    const url = new URL(file.url, config.feedUrl)
    if (
      !url.href.startsWith(config.feedUrl) ||
      url.username ||
      url.password ||
      url.search ||
      url.hash ||
      !url.pathname.endsWith('.exe')
    )
      throw new Error('A atualização aponta para um arquivo fora da distribuição autorizada.')
  }
  return manifest
}
