import { resolve } from 'node:path'

/** Ponte de ensaio apenas no servidor loopback. O token nunca chega ao navegador. */
export async function pedidoAoEditorLocal(caminho: string): Promise<Response> {
  const arquivo = Bun.file(
    resolve(import.meta.dir, '../../../output/molda-cenarios/local-session.json'),
  )
  if (!(await arquivo.exists())) return new Response('Editor local não iniciado', { status: 503 })
  const sessao = await arquivo.json()
  if (sessao.url !== 'http://127.0.0.1:4533/api/molda-cenarios')
    return new Response('Endereço de ensaio inválido', { status: 503 })
  try {
    const r = await fetch(`${sessao.url}${caminho}`, {
      headers: { authorization: `Bearer ${sessao.token}` },
      redirect: 'error',
      signal: AbortSignal.timeout(30000),
    })
    return new Response(r.body, {
      status: r.status,
      headers: {
        'content-type': r.headers.get('content-type') ?? 'application/json',
        'cache-control': 'no-store',
      },
    })
  } catch {
    return new Response('Editor local indisponível. Inicie bun scripts/molda-cenarios-dev.ts.', {
      status: 503,
    })
  }
}
