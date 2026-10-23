import { z } from 'zod'
import { hashSchema } from './common'

export const renderEngineSchema = z
  .object({
    name: z.literal('remotion'),
    version: z.string().min(1).max(50),
    bundleSha256: hashSchema,
    workerSha256: hashSchema,
    platform: z.enum(['win32', 'darwin', 'linux']),
    architecture: z.enum(['x64', 'arm64']),
  })
  .strict()
