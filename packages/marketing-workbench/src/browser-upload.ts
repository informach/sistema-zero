import { md5 } from '@noble/hashes/legacy.js'
import { sha256 } from '@noble/hashes/sha2.js'
import { bytesToHex } from '@noble/hashes/utils.js'
import {
  assetManifestSchema,
  r2ObjectUrl,
  UPLOAD_PART_BYTES,
  type UploadStart,
  type UploadView,
  uploadStartSchema,
  uploadViewSchema,
} from '@sistemazero/marketing-contracts'
import { z } from 'zod'
import type { WorkbenchPort } from './port'

const partSchema = z
  .object({
    url: z.string().url(),
    size: z.number().int().positive(),
    headers: z.object({ 'content-md5': z.string(), 'content-length': z.string() }).strict(),
  })
  .strict()
const extensions: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  mp4: 'video/mp4',
  mov: 'video/quicktime',
  webm: 'video/webm',
  wav: 'audio/wav',
  mp3: 'audio/mpeg',
  m4a: 'audio/mp4',
  txt: 'text/plain',
  md: 'text/markdown',
  html: 'text/html',
  json: 'application/json',
  woff2: 'font/woff2',
  pdf: 'application/pdf',
}
export type UploadProgress = (message: string, fraction: number) => void
export async function hashUpload(file: Blob, signal: AbortSignal, onProgress: UploadProgress) {
  const hash = sha256.create()
  for (let offset = 0; offset < file.size; offset += UPLOAD_PART_BYTES) {
    signal.throwIfAborted()
    hash.update(new Uint8Array(await file.slice(offset, offset + UPLOAD_PART_BYTES).arrayBuffer()))
    onProgress('Conferindo o original', Math.min(1, (offset + UPLOAD_PART_BYTES) / file.size))
  }
  return bytesToHex(hash.digest())
}
export const storageUploadUrl = r2ObjectUrl
type SendPart = (
  url: string,
  bytes: Uint8Array<ArrayBuffer>,
  md5: string,
  signal: AbortSignal,
) => Promise<void>
const sendPart: SendPart = async (url, bytes, digest, signal) => {
  // Content-Length is a forbidden browser header. Fetch derives it from this exact byte buffer.
  const response = await fetch(storageUploadUrl(url), {
    method: 'PUT',
    body: bytes,
    headers: { 'content-md5': digest },
    credentials: 'omit',
    redirect: 'error',
    signal: AbortSignal.any([signal, AbortSignal.timeout(120000)]),
  })
  await response.body?.cancel()
  if (!response.ok)
    throw new Error(
      `Envio interrompido (HTTP ${response.status}). Selecione o mesmo arquivo para continuar.`,
    )
}
export async function transferBrowserFile(
  file: Blob,
  input: UploadStart,
  request: WorkbenchPort['request'],
  signal: AbortSignal,
  onProgress: UploadProgress,
  send: SendPart = sendPart,
): Promise<UploadView> {
  if (file.size !== input.manifest.size)
    throw new Error('O arquivo não corresponde ao original do envio')
  const route = `/projects/${input.manifest.projectId}/assets/${input.manifest.id}`
  const remote = uploadViewSchema.parse(await request('/assets', 'POST', input))
  if (
    remote.manifest.id !== input.manifest.id ||
    remote.manifest.projectId !== input.manifest.projectId ||
    remote.manifest.sha256 !== input.manifest.sha256
  )
    throw new Error('A resposta não corresponde ao arquivo deste projeto')
  if (remote.state === 'confirmed' || remote.state === 'verifying') return remote
  if (remote.state === 'failed') throw new Error(remote.error ?? 'O servidor recusou o arquivo')
  if (!remote.bytesReceived) {
    for (let offset = 0, number = 1; offset < file.size; offset += UPLOAD_PART_BYTES, number++) {
      signal.throwIfAborted()
      const bytes = new Uint8Array(
          await file.slice(offset, offset + UPLOAD_PART_BYTES).arrayBuffer(),
        ),
        digest = md5(bytes)
      const base64 = btoa(String.fromCharCode(...digest)),
        existing = remote.parts.find((part) => part.number === number)
      if (
        existing?.size !== bytes.length ||
        existing.etag.replaceAll('"', '') !== bytesToHex(digest)
      ) {
        const part = partSchema.parse(
          await request(`${route}/part`, 'POST', { number, md5: base64 }),
        )
        if (
          part.size !== bytes.length ||
          part.headers['content-md5'] !== base64 ||
          part.headers['content-length'] !== String(bytes.length)
        )
          throw new Error('A parte não corresponde ao original')
        await send(part.url, bytes, base64, signal)
      }
      onProgress('Enviando ao acervo', Math.min(1, (offset + bytes.length) / file.size))
    }
  }
  signal.throwIfAborted()
  return uploadViewSchema.parse(await request(`${route}/complete`, 'POST'))
}
export async function uploadBrowserFile(
  scope: string,
  projectId: string,
  file: File,
  request: WorkbenchPort['request'],
  signal: AbortSignal,
  onProgress: UploadProgress,
) {
  if (!file.size || file.size > 2_000_000_000) throw new Error('Escolha um arquivo de até 2 GB')
  const mime = assetManifestSchema.shape.mime.parse(
    extensions[file.name.split('.').at(-1)?.toLowerCase() ?? ''] ?? file.type,
  )
  const sha256 = await hashUpload(file, signal, onProgress),
    key = `marketing-upload:${scope}:${projectId}:${sha256}`
  if (!navigator.locks)
    throw new Error(
      'Este navegador não oferece a proteção de envios simultâneos. Use uma versão atual ou o app desktop.',
    )
  return navigator.locks.request(key, { signal }, async () => {
    const raw = localStorage.getItem(key)
    const input = raw
      ? uploadStartSchema.parse(JSON.parse(raw))
      : uploadStartSchema.parse({
          operationId: crypto.randomUUID(),
          manifest: {
            schemaVersion: 1,
            id: crypto.randomUUID(),
            projectId,
            name: file.name,
            sha256,
            size: file.size,
            mime,
            role: mime === 'font/woff2' ? 'font' : 'original',
            sourceAssetId: null,
            width: null,
            height: null,
            durationMs: null,
            codec: null,
            rotation: null,
          },
        })
    if (
      input.manifest.projectId !== projectId ||
      input.manifest.sha256 !== sha256 ||
      input.manifest.size !== file.size
    )
      throw new Error('O registro local de envio não corresponde a este arquivo')
    // Persist identity before contacting the server. Reselection recomputes SHA-256 before resuming.
    localStorage.setItem(key, JSON.stringify(input))
    return transferBrowserFile(file, input, request, signal, onProgress)
  })
}
