import { mkdir, open, stat, unlink } from 'node:fs/promises'
import path from 'node:path'
import { z } from 'zod'
import { assetManifestSchema } from '../../../../marketing-contracts/src/assets'
import { idSchema } from '../../../../marketing-contracts/src/common'
import type { Asset } from '../../shared/contracts'
import { FileIntegrityError, type LocalAssets } from '../assets'
import { requireStorageUrl } from './asset-transfer'
import type { SyncTransport } from './sync-engine'

type DownloadFile = (url: string, offset: number, signal: AbortSignal) => Promise<Response>
const downloadFile: DownloadFile = (url, offset, signal) =>
  fetch(url, {
    headers: offset ? { range: `bytes=${offset}-` } : {},
    redirect: 'error',
    credentials: 'omit',
    signal: AbortSignal.any([signal, AbortSignal.timeout(30 * 60 * 1000)]),
  })

const responseSchema = z.object({ manifest: assetManifestSchema, url: z.string().url() }).strict()
/** Range resumes incomplete downloads. Whole-file hash is verified before any preview/use. */
export async function downloadAsset(
  projectId: string,
  id: string,
  assets: LocalAssets,
  transport: SyncTransport,
  signal: AbortSignal,
  fetchFile: DownloadFile = downloadFile,
) {
  idSchema.parse(projectId)
  idSchema.parse(id)
  const response = responseSchema.parse(
    await transport.request(`/projects/${projectId}/assets/${id}/download`),
  )
  if (response.manifest.id !== id || response.manifest.projectId !== projectId)
    throw new Error('O servidor retornou um arquivo de outro projeto')
  const existing = assets.list().find((asset) => asset.id === id)
  if (existing) {
    if (existing.sha256 !== response.manifest.sha256) throw new Error('Identidade local divergente')
    try {
      return (await assets.verify(id)).asset
    } catch (error) {
      if (!(error instanceof FileIntegrityError)) throw error
      // This cache entry is reproducible: the server confirmed the same immutable identity.
      await assets.evict(id)
    }
  }
  await mkdir(assets.directory, { recursive: true })
  const partial = path.join(assets.directory, `${id}.download.partial`)
  let offset = 0
  try {
    offset = (await stat(partial)).size
  } catch (error) {
    if (!(error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT'))
      throw error
  }
  if (offset > response.manifest.size) {
    await unlink(partial)
    offset = 0
  }
  if (offset < response.manifest.size) {
    let release = await assets.reserve(response.manifest.size - offset)
    try {
      const remote = await fetchFile(requireStorageUrl(response.url), offset, signal)
      if (![200, 206].includes(remote.status) || !remote.body) {
        await remote.body?.cancel()
        throw new Error(`O download foi interrompido (HTTP ${remote.status})`)
      }
      if (offset && remote.status === 200) {
        // A storage response may ignore Range. Start its full response at byte zero, never append it.
        await unlink(partial)
        offset = 0
        release()
        release = () => {}
        try {
          release = await assets.reserve(response.manifest.size)
        } catch (error) {
          await remote.body.cancel()
          throw error
        }
      }
      if (
        remote.status === 206 &&
        remote.headers.get('content-range') !==
          `bytes ${offset}-${response.manifest.size - 1}/${response.manifest.size}`
      ) {
        await remote.body.cancel()
        throw new Error('Intervalo do download não corresponde ao arquivo')
      }
      const file = await open(partial, 'a'),
        reader = remote.body.getReader()
      try {
        while (true) {
          signal.throwIfAborted()
          const { done, value } = await reader.read()
          if (done) break
          if (offset + value.byteLength > response.manifest.size)
            throw new Error('O download excedeu o tamanho do arquivo confirmado')
          let written = 0
          while (written < value.byteLength) {
            const result = await file.write(value, written, value.byteLength - written)
            if (!result.bytesWritten) throw new Error('Não foi possível gravar o download')
            written += result.bytesWritten
          }
          offset += value.byteLength
        }
        await file.sync()
      } finally {
        await reader.cancel().catch(() => undefined)
        reader.releaseLock()
        await file.close()
      }
    } finally {
      release()
    }
  }
  if (offset !== response.manifest.size)
    throw new Error(
      'O download terminou antes do arquivo completo. As partes recebidas foram preservadas para retomar.',
    )
  let asset: Asset
  try {
    asset = await assets.acceptDownload(partial, response.manifest)
  } catch (error) {
    if (error instanceof FileIntegrityError) {
      await unlink(partial)
      throw new Error(
        'O download chegou corrompido. O parcial foi descartado; tente baixar novamente.',
        { cause: error },
      )
    }
    throw error
  }
  try {
    await unlink(partial)
  } catch (error) {
    if (!(error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT'))
      throw error
  }
  return asset
}
