import { createHash, randomUUID } from 'node:crypto'

const MAX_FILE = 8 * 1024 * 1024
const MAX_BODY = MAX_FILE + 128 * 1024
const TYPES = new Set([
  'application/pdf',
  'application/zip',
  'text/plain',
  'text/csv',
  'image/png',
  'image/jpeg',
  'image/webp',
  'audio/mpeg',
  'audio/ogg',
  'audio/wav',
])
export interface LiveMaterialUpload {
  id: string
  title: string
  fileName: string
  storageKey: string
  contentType: string
  sizeBytes: number
  sha256: string
  uploadedBy: string
}
const response = (status: number, message: string) =>
  Response.json(
    { error: { code: 'LIVE_MATERIAL_UPLOAD', message } },
    { status, headers: { 'Cache-Control': 'private, no-store' } },
  )
function matchesType(bytes: Uint8Array, type: string) {
  const head = Buffer.from(bytes.subarray(0, 16))
  if (type === 'application/pdf') return head.subarray(0, 5).toString() === '%PDF-'
  if (type === 'application/zip')
    return head[0] === 0x50 && head[1] === 0x4b && [3, 5, 7].includes(head[2] ?? 0)
  if (type === 'image/png')
    return head.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
  if (type === 'image/jpeg') return head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff
  if (type === 'image/webp')
    return head.subarray(0, 4).toString() === 'RIFF' && head.subarray(8, 12).toString() === 'WEBP'
  if (type === 'audio/wav')
    return head.subarray(0, 4).toString() === 'RIFF' && head.subarray(8, 12).toString() === 'WAVE'
  if (type === 'audio/ogg') return head.subarray(0, 4).toString() === 'OggS'
  if (type === 'audio/mpeg')
    return (
      head.subarray(0, 3).toString() === 'ID3' ||
      (head[0] === 0xff && ((head[1] ?? 0) & 0xe0) === 0xe0)
    )
  try {
    new TextDecoder('utf-8', { fatal: true }).decode(bytes)
    return !bytes.includes(0)
  } catch {
    return false
  }
}

/** Bounded upload, private storage and provenance registration; no browser-supplied object key. */
export function createLiveMaterialUploadHandler(deps: {
  session(): Promise<{ id: string } | Response>
  put(input: { key: string; body: Uint8Array; contentType: string }): Promise<unknown>
  remove(key: string): Promise<unknown>
  register(input: LiveMaterialUpload): Promise<{ status: number; body: unknown }>
}) {
  return async (request: Request) => {
    const session = await deps.session()
    if (session instanceof Response) return session
    if (!request.headers.get('content-type')?.startsWith('multipart/form-data;'))
      return response(400, 'Envie um arquivo de material.')
    const reader = request.body?.getReader()
    if (!reader) return response(400, 'Envie um arquivo de material.')
    let form: FormData
    try {
      const chunks: Uint8Array[] = []
      let size = 0
      while (true) {
        const chunk = await reader.read()
        if (chunk.done) break
        size += chunk.value.byteLength
        if (size > MAX_BODY) {
          await reader.cancel()
          return response(413, 'O material deve ter até 8 MB.')
        }
        chunks.push(chunk.value)
      }
      form = await new Response(Buffer.concat(chunks), {
        headers: { 'content-type': request.headers.get('content-type')! },
      }).formData()
    } catch {
      return response(400, 'Não foi possível ler o material.')
    }
    const file = form.get('file'),
      title = form.get('title')
    if (
      !(file instanceof File) ||
      file.size < 1 ||
      file.size > MAX_FILE ||
      !TYPES.has(file.type) ||
      typeof title !== 'string' ||
      !title.trim() ||
      title.length > 200
    )
      return response(
        400,
        'Use um PDF, imagem, áudio, ZIP ou texto de até 8 MB e informe um título.',
      )
    const bytes = new Uint8Array(await file.arrayBuffer())
    if (!matchesType(bytes, file.type))
      return response(400, 'O conteúdo do arquivo não corresponde ao formato informado.')
    const id = randomUUID()
    const fileName =
      file.name
        .normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^A-Za-z0-9._-]/g, '_')
        .replace(/^[^A-Za-z0-9]+/, '')
        .slice(0, 120) || 'material'
    const storageKey = `live/materials/${id}/${fileName}`
    let stored = false
    try {
      await deps.put({ key: storageKey, body: bytes, contentType: file.type })
      stored = true
      const result = await deps.register({
        id,
        title: title.trim(),
        fileName,
        storageKey,
        contentType: file.type,
        sizeBytes: bytes.byteLength,
        sha256: createHash('sha256').update(bytes).digest('hex'),
        uploadedBy: session.id,
      })
      if (result.status < 200 || result.status >= 300)
        throw new Error('Registro do material recusado')
      return Response.json(result.body, {
        status: 201,
        headers: { 'Cache-Control': 'private, no-store' },
      })
    } catch {
      if (stored) {
        try {
          await deps.remove(storageKey)
        } catch {
          /* Unreferenced object; never expose an unregistered material. */
        }
      }
      return response(503, 'Não foi possível guardar o material. Tente novamente.')
    }
  }
}
