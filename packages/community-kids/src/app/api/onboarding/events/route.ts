import { NextResponse } from 'next/server'
import { z } from 'zod'
import { GUIDE_VERSION } from '@/lib/guide'
import {
  ONBOARDING_ACTIONS,
  ONBOARDING_AUDIENCES,
  ONBOARDING_STEPS,
} from '@/lib/onboarding-telemetry'
import { getSession } from '@/server/session'

const MAX_BODY_CHARS = 512
const EventBody = z
  .object({
    version: z.literal(GUIDE_VERSION),
    audience: z.enum(ONBOARDING_AUDIENCES),
    action: z.enum(ONBOARDING_ACTIONS),
    step: z.enum(ONBOARDING_STEPS).optional(),
  })
  .strict()

const noContent = () => new NextResponse(null, { status: 204 })

/**
 * Coleta eventos agregáveis do onboarding em log estruturado. O proxy garante
 * same-origin; a sessão confirma a audiência e nenhum id/nome da criança é logado.
 */
export async function POST(req: Request): Promise<Response> {
  const session = await getSession()
  if (!session) return noContent()

  let raw: string
  try {
    raw = await req.text()
  } catch {
    return noContent()
  }
  if (!raw || raw.length > MAX_BODY_CHARS) return noContent()

  let payload: unknown
  try {
    payload = JSON.parse(raw)
  } catch {
    return noContent()
  }
  const parsed = EventBody.safeParse(payload)
  if (!parsed.success) return noContent()
  const actualAudience = session.activeProfile ? 'child' : 'parent'
  if (parsed.data.audience !== actualAudience) return noContent()

  console.info(
    '[kids-onboarding]',
    JSON.stringify({ ...parsed.data, occurredAt: new Date().toISOString() }),
  )
  return noContent()
}
