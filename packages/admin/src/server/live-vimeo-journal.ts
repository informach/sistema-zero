import 'server-only'
import { z } from 'zod'
import { r2DeleteObjectIn, r2ReadJsonIn, r2WriteJsonIn } from './r2'

const entry = z.object({
  vimeo: z
    .object({
      videoId: z.string().regex(/^\d+$/),
      embedUrl: z.string().url(),
      status: z.enum(['processing', 'ready', 'failed']),
    })
    .nullable(),
})
export type VimeoUploadEntry = z.infer<typeof entry>
export interface VimeoUploadJournal {
  remove(bucket: string, key: string): Promise<void>
  read(bucket: string, key: string): Promise<VimeoUploadEntry | null>
  write(
    bucket: string,
    key: string,
    value: VimeoUploadEntry,
    createOnly?: boolean,
  ): Promise<boolean>
}

/** Private, durable receipt: a timeout saving in Members must never lose the provider ID. */
export const liveVimeoJournal: VimeoUploadJournal = {
  remove: r2DeleteObjectIn,
  async read(bucket, key) {
    const value = await r2ReadJsonIn(bucket, key)
    return value === null ? null : entry.parse(value)
  },
  write: r2WriteJsonIn,
}
