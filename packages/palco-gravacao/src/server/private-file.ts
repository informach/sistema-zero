import 'server-only'
import { PrivateObjectNotFoundError, r2GetObjectPrivate } from '@sistemazero/member-shell/server/r2'
import { gatewayFetch, readJson } from './gateway'

const R2_PRIVATE_PREFIX = 'r2priv:'

/**
 * Um material privado da aula (o PDF do livro, um anexo), pelo próprio palco: o members diz onde
 * ele está e o arquivo vem do bucket privado do ambiente, sem marca d'água (é a equipe, no
 * staging) e sem registrar download. Vai pela mesma origem, então o leitor do livro o abre sem
 * depender do CORS do bucket.
 */
export async function privateFile(
  resolvePath: string,
  access: string,
  disposition: 'inline' | 'attachment',
): Promise<Response> {
  const resolved = await gatewayFetch(resolvePath, { access })
  const body = resolved.ok
    ? await readJson<{ storageRef?: string; label?: string }>(resolved)
    : null
  if (!body?.storageRef)
    return Response.json(
      { error: { code: 'NOT_FOUND', message: 'Material não encontrado.' } },
      { status: resolved.ok ? 502 : resolved.status },
    )
  if (!body.storageRef.startsWith(R2_PRIVATE_PREFIX)) {
    if (/^https?:\/\//.test(body.storageRef)) return Response.redirect(body.storageRef, 302)
    return Response.json(
      { error: { code: 'INVALID_MATERIAL', message: 'Referência de material inválida.' } },
      { status: 502 },
    )
  }
  try {
    const file = await r2GetObjectPrivate(body.storageRef.slice(R2_PRIVATE_PREFIX.length))
    const name = (body.label ?? 'material').replace(/[^\p{L}\p{N} ._-]/gu, '')
    return new Response(file.body, {
      headers: {
        'content-type': file.contentType ?? 'application/octet-stream',
        'content-disposition':
          disposition === 'inline'
            ? 'inline'
            : `attachment; filename*=UTF-8''${encodeURIComponent(name)}`,
        'cache-control': 'private, no-store',
        ...(file.contentLength !== null ? { 'content-length': String(file.contentLength) } : {}),
      },
    })
  } catch (error) {
    const missing = error instanceof PrivateObjectNotFoundError
    return Response.json(
      {
        error: {
          code: missing ? 'NOT_FOUND' : 'SERVICE_UNAVAILABLE',
          message: missing ? 'Arquivo não encontrado.' : 'O armazenamento não respondeu.',
        },
      },
      { status: missing ? 404 : 503 },
    )
  }
}
