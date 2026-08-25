import { parseLimit, parseOffset } from '@/lib/list-params'
import { forwardUpstream } from '@/server/forward'
import { createCourse, listCourses } from '@/server/members'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const audienceParam = searchParams.get('audience')
  const { status, body } = await listCourses({
    q: searchParams.get('q') ?? undefined,
    status: searchParams.get('status') ?? undefined,
    // Seletor global de plataforma: repassa só valores válidos (lixo → sem filtro).
    audience: audienceParam === 'kids' || audienceParam === 'adult' ? audienceParam : undefined,
    limit: parseLimit(searchParams.get('limit')),
    offset: parseOffset(searchParams.get('offset')),
  })
  return forwardUpstream({ status, body })
}

export async function POST(req: Request) {
  const json = await req.json().catch(() => null)
  const { status, body } = await createCourse(json)
  return forwardUpstream({ status, body })
}
