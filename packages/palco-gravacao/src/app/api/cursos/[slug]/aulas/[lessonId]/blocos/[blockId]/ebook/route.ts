import { staffAccess } from '~/server/access'
import { paths } from '~/server/gateway'
import { privateFile } from '~/server/private-file'

/** O PDF do livro 3D da aula (o Kids serve este mesmo caminho, com a marca do aluno). */
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ slug: string; lessonId: string; blockId: string }> },
): Promise<Response> {
  const access = await staffAccess()
  if (!access) return Response.json({ error: { code: 'UNAUTHORIZED' } }, { status: 401 })
  const { slug, lessonId, blockId } = await ctx.params
  return privateFile(paths.ebook(slug, lessonId, blockId), access.token, 'inline')
}
