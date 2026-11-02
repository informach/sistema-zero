import { recordingPart } from '~/lib/recording-part'
import { staffAccess } from '~/server/access'
import { guardarProjeto } from '~/server/projetos-gravados'

/** Guarda o projeto do Estúdio da parte gravada agora, para a parte seguinte abrir com ele. */
export async function POST(req: Request): Promise<Response> {
  if (!(await staffAccess()))
    return Response.json({ error: { code: 'UNAUTHORIZED' } }, { status: 401 })
  const body = (await req.json().catch(() => null)) as {
    lessonId?: unknown
    blockId?: unknown
    parte?: unknown
    project?: unknown
  } | null
  let parte: number | null = null
  try {
    parte = recordingPart(typeof body?.parte === 'number' ? String(body.parte) : undefined)
  } catch {
    parte = null
  }
  if (
    !body ||
    typeof body.lessonId !== 'string' ||
    typeof body.blockId !== 'string' ||
    !parte ||
    typeof body.project !== 'object' ||
    body.project === null
  )
    return Response.json({ error: { code: 'BAD_REQUEST' } }, { status: 400 })
  guardarProjeto(body.lessonId, body.blockId, parte, body.project)
  return new Response(null, { status: 204 })
}
