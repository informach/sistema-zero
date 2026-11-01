import { staffAccess } from '~/server/access'

/**
 * Publicar no Mural, no palco: a janela mostra o sucesso com os links, e nada vai para o Mural.
 * Os links apontam para uma página do próprio palco que diz isso.
 */
export async function POST(req: Request): Promise<Response> {
  if (!(await staffAccess()))
    return Response.json({ error: { code: 'UNAUTHORIZED' } }, { status: 401 })
  const origin = new URL(req.url).origin
  return Response.json({
    publicationId: 'palco-exemplo',
    muralUrl: `${origin}/publicado-no-palco`,
    playUrl: `${origin}/publicado-no-palco`,
  })
}
