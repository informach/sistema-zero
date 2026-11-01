import { staffAccess } from '~/server/access'
import { paths } from '~/server/gateway'
import { privateFile } from '~/server/private-file'

/** Um material para baixar da aula. No palco o download não é registrado na conta de ninguém. */
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ slug: string; lessonId: string; attachmentId: string }> },
): Promise<Response> {
  const access = await staffAccess()
  if (!access) return Response.json({ error: { code: 'UNAUTHORIZED' } }, { status: 401 })
  const { slug, lessonId, attachmentId } = await ctx.params
  return privateFile(paths.attachment(slug, lessonId, attachmentId), access.token, 'attachment')
}
