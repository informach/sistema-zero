import 'server-only'
import { randomUUID } from 'node:crypto'
import type { LiveRoomView, LiveWorkspaceView } from '@sistemazero/core/live'
import { NextResponse } from 'next/server'
import type { CallOpts, GatewayResponse } from '../server/gateway'
import { r2DeleteObjectPrivate, r2PresignGetPrivate, r2PutObjectPrivate } from '../server/r2'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const reply = (status: number, body: unknown) =>
  NextResponse.json(body, { status, headers: { 'Cache-Control': 'private, no-store' } })
const uploads = new Map<string, { count: number; resetAt: number }>()
function rateLimited(actorId: string) {
  const now = Date.now()
  const current = uploads.get(actorId)
  if (current && current.resetAt > now) {
    current.count++
    return current.count > 60
  }
  if (uploads.size >= 5000)
    for (const [id, item] of uploads) if (item.resetAt <= now) uploads.delete(id)
  if (uploads.size >= 5000) return true
  uploads.set(actorId, { count: 1, resetAt: now + 60_000 })
  return false
}
const previewStorage = {
  put: r2PutObjectPrivate,
  sign: r2PresignGetPrivate,
  remove: r2DeleteObjectPrivate,
}

/** Authorized temporary documents. Never serves project HTML from the application origin. */
export async function handleLivePreview(
  request: Request,
  sessionId: string,
  gatewayFetch: (path: string, options: CallOpts) => Promise<GatewayResponse>,
  storage: typeof previewStorage = previewStorage,
) {
  if (!UUID.test(sessionId)) return reply(404, { error: { message: 'Aula não encontrada.' } })
  const response = await gatewayFetch(`/members/live/sessions/${sessionId}`, { method: 'GET' })
  const room = response.status === 200 ? (response.body as LiveRoomView) : null
  let actorId: string
  let ttl: number
  if (room?.access.canOpen) {
    actorId = room.actorId
    ttl =
      room.role === 'teacher'
        ? 180
        : Math.min(180, Math.floor((Date.parse(room.access.endsAt) - Date.now()) / 1000))
  } else {
    const workspaceId = request.headers.get('x-live-workspace-id')
    if (!workspaceId || !UUID.test(workspaceId))
      return reply(403, { error: { message: 'O prazo desta aula não permite abrir o projeto.' } })
    const existing = await gatewayFetch(`/members/live/workspaces/${workspaceId}`, {
      method: 'GET',
    })
    if (existing.status !== 200) return reply(existing.status, existing.body)
    const workspace = existing.body as LiveWorkspaceView
    if (workspace.sessionId !== sessionId)
      return reply(403, { error: { message: 'Este projeto não pertence à aula.' } })
    // Members authorizes continuation of this canonical project through the subscription.
    // It does not reopen the lesson, recording, materials or live room.
    actorId = workspace.learnerId
    ttl = 180
  }
  const prefix = `live/previews/${sessionId}/${actorId}/`
  if (request.method === 'DELETE') {
    const id = new URL(request.url).searchParams.get('id')
    if (!id || !UUID.test(id)) return reply(400, { error: { message: 'Prévia inválida.' } })
    await storage.remove(`${prefix}${id}.html`)
    return new NextResponse(null, { status: 204 })
  }
  if (request.method !== 'POST') return reply(405, { error: { message: 'Ação inválida.' } })
  if (rateLimited(actorId))
    return reply(429, {
      error: { message: 'Aguarde um instante antes de rodar o projeto novamente.' },
    })
  const reader = request.body?.getReader()
  if (!reader) return reply(400, { error: { message: 'Envie o documento do projeto.' } })
  const chunks: Uint8Array[] = []
  let length = 0
  while (true) {
    const next = await reader.read()
    if (next.done) break
    length += next.value.byteLength
    if (length > 4_000_000) {
      await reader.cancel()
      return reply(413, { error: { message: 'A prévia ultrapassa o tamanho permitido.' } })
    }
    chunks.push(next.value)
  }
  const bytes = Buffer.concat(chunks)
  const id = randomUUID()
  const key = `${prefix}${id}.html`
  if (!Number.isFinite(ttl) || ttl <= 0)
    return reply(403, { error: { message: 'O prazo da aula terminou.' } })
  await storage.put({
    key,
    body: bytes,
    contentType: 'text/html; charset=utf-8',
    cacheControl: 'private, no-store',
  })
  try {
    const url = await storage.sign(key, {
      expiresInSeconds: ttl,
      responseContentDisposition: 'inline',
    })
    return reply(201, { id, url })
  } catch (error) {
    await storage.remove(key).catch(() => {})
    throw error
  }
}
