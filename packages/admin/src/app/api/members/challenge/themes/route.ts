import { createChallengeTheme, listChallengeThemes } from '@/server/challenge'
import { forwardUpstream } from '@/server/forward'

/** Biblioteca de temas (fixos + custom) → `GET /members/admin/challenge/themes`. */
export async function GET() {
  const { status, body } = await listChallengeThemes()
  return forwardUpstream({ status, body })
}

/** Cria tema custom → `POST /members/admin/challenge/themes`. */
export async function POST(req: Request) {
  const json = await req.json().catch(() => null)
  const { status, body } = await createChallengeTheme(json)
  return forwardUpstream({ status, body })
}
