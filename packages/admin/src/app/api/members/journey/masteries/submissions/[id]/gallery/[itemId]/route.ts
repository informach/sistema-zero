import { z } from 'zod'
import { forwardUpstream } from '@/server/forward'
import { getMasterySubmission } from '@/server/masteries'
import { masteryGalleryItem } from '@/server/mastery-gallery-snapshot'
import { r2PresignGetUgc } from '@/server/r2'

const headers = { 'cache-control': 'private, no-store' }
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; itemId: string }> },
) {
  const { id, itemId } = await params
  if (!z.uuid().safeParse(id).success || !/^[A-Za-z0-9_-]{1,64}$/.test(itemId))
    return Response.json({ error: { message: 'Cópia inválida.' } }, { status: 400, headers })
  const result = await getMasterySubmission(id)
  if (result.status !== 200) {
    const response = forwardUpstream(result)
    response.headers.set('cache-control', 'private, no-store')
    return response
  }
  const selected = masteryGalleryItem(result.body, itemId)
  if (!selected)
    return Response.json(
      { error: { message: 'Cópia não encontrada nesta entrega.' } },
      { status: 404, headers },
    )
  try {
    const [url, parts] = await Promise.all([
      r2PresignGetUgc(selected.item.storageKey, { expiresInSeconds: 600 }),
      Promise.all(
        selected.item.parts.map(async (part) => ({
          hash: part.hash,
          url: await r2PresignGetUgc(part.storageKey, { expiresInSeconds: 600 }),
        })),
      ),
    ])
    return Response.json({ url, parts }, { headers })
  } catch {
    return Response.json(
      { error: { message: 'Não foi possível abrir a cópia. Tente novamente.' } },
      { status: 503, headers },
    )
  }
}
