import 'server-only'
import { createHash } from 'node:crypto'
import { z } from 'zod'
import { getEnv } from '@/lib/env'
import { canonicalVimeoDomains } from '@/lib/vimeo-helpers'
import type { CourseVideoCopyJournal } from './course-video-copy'
import { createCourseVideoCopier, createCourseVideoCopyJournal } from './course-video-copy'
import { r2ReadJsonIn, r2WriteJsonIn } from './r2'
import {
  addVideoToFolder,
  applyPrivacy,
  getTextTrackVtt,
  getVideo,
  getWhitelistDomains,
  listTextTracks,
  parseVimeoIdFromUri,
  vimeoFetch,
} from './vimeo'

const file = z.object({
  type: z.string(),
  quality: z.string(),
  width: z.number().nullable().optional(),
  height: z.number().nullable().optional(),
  size: z.number().int().nonnegative().nullable().optional(),
})
const video = z.object({
  uri: z.string(),
  name: z.string(),
  modified_time: z.string(),
  status: z.string(),
  duration: z.number().nullable(),
  width: z.number(),
  height: z.number(),
  files: z.array(file).default([]),
})
const domainsSchema = z.object({
  data: z.array(z.object({ domain: z.string() })),
  total: z.number().optional(),
})
const listSchema = z.object({
  data: z.array(z.object({ uri: z.string(), name: z.string() })),
  paging: z.object({ next: z.string().nullable().optional() }).optional(),
})
const sha = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex')

/** Exact marker lookup without Vimeo's full-text query limits or delayed search index. */
export async function findCourseVideoCopies(
  marker: string,
  signal: AbortSignal,
): Promise<string[]> {
  if (!/^SZ-[a-f0-9]{64}$/.test(marker)) throw new Error('Marcador de cópia inválido')
  const ids: string[] = []
  for (let page = 1; page <= 10; page++) {
    signal.throwIfAborted()
    const response = listSchema.parse(
      await vimeoFetch(
        `/me/videos?sort=date&direction=desc&per_page=100&page=${page}&fields=uri,name`,
        { signal: AbortSignal.any([signal, AbortSignal.timeout(30_000)]) },
      ),
    )
    ids.push(
      ...response.data
        .filter((row) => row.name === marker)
        .map((row) => parseVimeoIdFromUri(row.uri)),
    )
    if (!response.paging?.next || ids.length > 1) return ids
  }
  return ids
}

/** Uses Vimeo's native copy. No media download, upload or re-encoding. */
export function productionCourseVideoCopier(signal: AbortSignal, journal?: CourseVideoCopyJournal) {
  const env = getEnv()
  const bucket = env.R2_PRIVATE_BUCKET
  const folder = env.VIMEO_FOLDER_ID
  const whitelist = canonicalVimeoDomains(getWhitelistDomains())
  if (!bucket || !folder || !/^\d+$/.test(folder) || !whitelist.length)
    throw new Error('Configure a pasta Vimeo e os domínios de produção')
  const call = async (path: string, init: RequestInit = {}, empty = false) => {
    signal.throwIfAborted()
    return vimeoFetch<unknown>(
      path,
      { ...init, signal: AbortSignal.any([signal, AbortSignal.timeout(30_000)]) },
      { skipJsonParse: empty },
    )
  }
  const domains = async (id: string) => {
    const response = domainsSchema.parse(await call(`/videos/${id}/privacy/domains?per_page=100`))
    if ((response.total ?? response.data.length) > 100)
      throw new Error('Vídeo com mais de cem domínios autorizados')
    return canonicalVimeoDomains(response.data.map((row) => row.domain))
  }
  const verifyConfiguration = async (id: string) => {
    const privacy = z
      .object({
        privacy: z.object({ view: z.string(), embed: z.string(), download: z.boolean() }),
        parent_folder: z.object({ uri: z.string() }).nullable().optional(),
      })
      .parse(await call(`/videos/${id}?fields=privacy,parent_folder`))
    if (
      privacy.privacy.view !== 'disable' ||
      privacy.privacy.embed !== 'whitelist' ||
      privacy.privacy.download ||
      !new RegExp(`^/users/\\d+/projects/${folder}$`).test(privacy.parent_folder?.uri ?? '') ||
      JSON.stringify(await domains(id)) !== JSON.stringify(whitelist)
    )
      throw new Error('Privacidade ou pasta do vídeo copiado incorreta')
  }
  return createCourseVideoCopier(
    {
      async inspect(id) {
        const current = video.parse(
          await call(
            `/videos/${id}?fields=uri,name,modified_time,status,duration,width,height,files`,
          ),
        )
        if (parseVimeoIdFromUri(current.uri) !== id)
          throw new Error('Resposta Vimeo de outro vídeo')
        if (
          ['transcoding_error', 'uploading_error', 'quota_exceeded', 'unavailable'].includes(
            current.status,
          )
        )
          throw new Error('O Vimeo recusou o processamento do vídeo')
        const tracks = await listTextTracks(id)
        if (tracks.length > 20) throw new Error('Mais de vinte faixas de texto no mesmo vídeo')
        const captions = []
        for (const track of tracks) {
          signal.throwIfAborted()
          captions.push([
            track.type,
            track.language,
            track.active,
            track.name ?? '',
            sha(await getTextTrackVtt(track.link)),
          ])
        }
        const files = current.files
          .filter((entry) => entry.type === 'video/mp4' && entry.size)
          .map((entry) =>
            JSON.stringify([
              entry.type,
              entry.quality,
              entry.width ?? null,
              entry.height ?? null,
              entry.size,
            ]),
          )
          .sort()
        return {
          id,
          name: current.name,
          modifiedAt: current.modified_time,
          available: current.status === 'available' && files.length > 0,
          contentHash: sha([
            current.duration,
            current.width,
            current.height,
            files,
            captions.map((value) => JSON.stringify(value)).sort(),
          ]),
        }
      },
      async copy(sourceId, marker) {
        const response = z.object({ uri: z.string() }).parse(
          await call(`/me/videos/${sourceId}/copy`, {
            method: 'POST',
            body: JSON.stringify({ name: marker }),
          }),
        )
        return parseVimeoIdFromUri(response.uri)
      },
      find: (marker) => findCourseVideoCopies(marker, signal),
      async configure(id) {
        const previous = await domains(id)
        signal.throwIfAborted()
        await addVideoToFolder(id, folder)
        await applyPrivacy(id, whitelist)
        for (const domain of previous)
          if (!whitelist.includes(domain))
            await call(
              `/videos/${id}/privacy/domains/${encodeURIComponent(domain)}`,
              { method: 'DELETE' },
              true,
            )
      },
      verifyConfiguration,
      embedUrl: async (id) => (await getVideo(id)).embedUrl,
    },
    journal ??
      createCourseVideoCopyJournal({
        read: (key) => r2ReadJsonIn(bucket, key),
        create: (key, value) => r2WriteJsonIn(bucket, key, value, true),
      }),
  )
}
