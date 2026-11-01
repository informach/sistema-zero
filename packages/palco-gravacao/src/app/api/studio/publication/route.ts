import { staffAccess } from '~/server/access'

/** O histórico de uma publicação: no palco nenhuma publicação existe. */
export async function POST(): Promise<Response> {
  if (!(await staffAccess()))
    return Response.json({ error: { code: 'UNAUTHORIZED' } }, { status: 401 })
  return Response.json(null)
}
