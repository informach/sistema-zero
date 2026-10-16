import { createHash } from 'node:crypto'
import { open } from 'node:fs/promises'
import { r2ObjectUrl } from '@sistemazero/marketing-contracts'
import { z } from 'zod'
import {
  UPLOAD_PART_BYTES,
  type UploadStart,
  uploadViewSchema,
} from '../../../../marketing-contracts/src/assets'
import type { LocalAssets } from '../assets'
import type { LocalWorkspaceStore } from './local-store'
import type { SyncTransport } from './sync-engine'

const partResponse = z
  .object({
    url: z.string().url(),
    size: z.number().int().positive(),
    headers: z.object({ 'content-md5': z.string(), 'content-length': z.string() }).strict(),
  })
  .strict()
export const requireStorageUrl = r2ObjectUrl
type PartSender = (
  url: string,
  bytes: Uint8Array<ArrayBuffer>,
  headers: Record<string, string>,
  signal: AbortSignal,
) => Promise<void>
const sendPart: PartSender = async (url, bytes, headers, signal) => {
  const response = await fetch(requireStorageUrl(url), {
    method: 'PUT',
    body: bytes,
    headers,
    redirect: 'error',
    credentials: 'omit',
    signal: AbortSignal.any([signal, AbortSignal.timeout(120000)]),
  })
  await response.body?.cancel()
  if (!response.ok)
    throw new Error(
      `O armazenamento não confirmou esta parte (HTTP ${response.status}); o envio pode ser retomado`,
    )
}
/** The server's actual parts are the resume cursor. Local progress is only a projection. */
export class AssetTransfer {
  constructor(
    private readonly local: LocalWorkspaceStore,
    private readonly assets: LocalAssets,
    private readonly transport: SyncTransport,
    private readonly send: PartSender = sendPart,
  ) {}
  async upload(
    input: UploadStart,
    signal: AbortSignal,
    onProgress: (fraction: number) => void = () => {},
  ) {
    const request = this.local.stageTransfer(input),
      manifest = request.manifest
    const entry = await this.assets.verify(manifest.id)
    if (entry.asset.sha256 !== manifest.sha256 || entry.asset.size !== manifest.size)
      throw new Error('O original difere do manifesto de envio')
    let uploadedBytes = 0
    try {
      signal.throwIfAborted()
      const remote = uploadViewSchema.parse(
        await this.transport.request('/assets', 'POST', request),
      )
      if (remote.state === 'confirmed') {
        this.local.transferProgress(manifest.id, 'confirmed', manifest.size)
        return remote
      }
      if (remote.state === 'failed') throw new Error(remote.error ?? 'O servidor recusou o arquivo')
      if (!remote.bytesReceived) {
        const file = await open(entry.path, 'r')
        try {
          const count = Math.ceil(manifest.size / UPLOAD_PART_BYTES)
          for (let number = 1; number <= count; number++) {
            signal.throwIfAborted()
            const offset = (number - 1) * UPLOAD_PART_BYTES,
              length = Math.min(UPLOAD_PART_BYTES, manifest.size - offset),
              bytes = Buffer.allocUnsafe(length)
            let read = 0
            while (read < length) {
              const { bytesRead } = await file.read(bytes, read, length - read, offset + read)
              if (bytesRead === 0) throw new Error('O original foi truncado durante o envio')
              read += bytesRead
            }
            const md5 = createHash('md5').update(bytes).digest(),
              existing = remote.parts.find((part) => part.number === number)
            if (
              existing?.size !== length ||
              existing.etag.replaceAll('"', '') !== md5.toString('hex')
            ) {
              const part = partResponse.parse(
                await this.transport.request(
                  `/projects/${manifest.projectId}/assets/${manifest.id}/part`,
                  'POST',
                  { number, md5: md5.toString('base64') },
                ),
              )
              if (
                part.size !== length ||
                part.headers['content-md5'] !== md5.toString('base64') ||
                part.headers['content-length'] !== String(length)
              )
                throw new Error('O servidor não vinculou a parte ao original')
              await this.send(part.url, bytes, part.headers, signal)
            }
            uploadedBytes += length
            this.local.transferProgress(manifest.id, 'uploading', uploadedBytes)
            onProgress(uploadedBytes / manifest.size)
          }
        } finally {
          await file.close()
        }
      }
      signal.throwIfAborted()
      const final = uploadViewSchema.parse(
        await this.transport.request(
          `/projects/${manifest.projectId}/assets/${manifest.id}/complete`,
          'POST',
        ),
      )
      this.local.transferProgress(
        manifest.id,
        final.state === 'confirmed' ? 'confirmed' : 'verifying',
        manifest.size,
      )
      return final
    } catch (error) {
      this.local.transferProgress(
        manifest.id,
        'failed',
        uploadedBytes,
        error instanceof Error ? error.message : 'Envio interrompido',
      )
      throw error
    }
  }
  async confirm(projectId: string, id: string) {
    const view = uploadViewSchema.parse(
      await this.transport.request(`/projects/${projectId}/assets/${id}`),
    )
    this.local.transferProgress(
      id,
      view.state === 'preparing' ? 'local' : view.state,
      view.bytesReceived
        ? view.manifest.size
        : view.parts.reduce((sum, part) => sum + part.size, 0),
      view.error,
    )
    return view
  }
}
