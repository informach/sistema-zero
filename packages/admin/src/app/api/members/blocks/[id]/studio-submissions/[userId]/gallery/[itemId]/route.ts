import { isGallerySubmission } from '@sistemazero/core/learning'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getStudioSubmission, getStudioSubmissionPrevious } from '@/server/members'
import { r2PresignGetUgc } from '@/server/r2'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string; userId: string; itemId: string }> },
) {
  const { id, userId, itemId } = await params
  const query = new URL(request.url).searchParams
  if (!z.uuid().safeParse(id).success || !z.uuid().safeParse(userId).success)
    return NextResponse.json({ error: { message: 'Entrega inválida.' } }, { status: 400 })
  const result =
    query.get('version') === 'previous'
      ? await getStudioSubmissionPrevious(id, userId)
      : await getStudioSubmission(id, userId)
  if (result.status !== 200) return NextResponse.json(result.body, { status: result.status })
  const project = result.body.project
  if (!isGallerySubmission(project) || project.requestId !== query.get('requestId'))
    return NextResponse.json(
      { error: { message: 'A entrega mudou. Abra novamente para ver a versão atual.' } },
      { status: 409 },
    )
  const item = project.items.find((entry) => entry.itemId === itemId)
  const prefix = `creations/${userId}/lesson-submissions/${id}/${project.requestId}/`
  if (
    !item ||
    ![item.storageKey, ...item.parts.map((part) => part.storageKey)].every(
      (key) => key.startsWith(prefix) && !key.includes('..'),
    )
  )
    return NextResponse.json({ error: { message: 'Cópia não encontrada.' } }, { status: 404 })
  try {
    const url = await r2PresignGetUgc(item.storageKey, { expiresInSeconds: 600 })
    const parts = await Promise.all(
      item.parts.map(async (part) => ({
        hash: part.hash,
        url: await r2PresignGetUgc(part.storageKey, { expiresInSeconds: 600 }),
      })),
    )
    return NextResponse.json({ url, parts }, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch {
    return NextResponse.json(
      { error: { message: 'Não foi possível abrir a cópia. Tente novamente.' } },
      { status: 503 },
    )
  }
}
