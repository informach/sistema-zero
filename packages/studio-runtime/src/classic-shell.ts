import {
  buildClassicShellPage,
  CLASSIC_SHELL_PATH,
  classicShellHeaders,
  parseClassicShellParentOrigins,
} from '@sistemazero/core/studio/classic-shell'

/**
 * Casca da prévia do Clássico (lote 3.2, 19/11/2026). Página fixa, sem dados do aluno: recebe o
 * documento do jogo por mensagem do editor. Sem `STUDIO_CLASSIC_SHELL_PARENT_ORIGINS` a rota não
 * existe (404), então nada muda em nenhum deploy até alguém configurar as origens do editor.
 */
export function serveClassicShell(
  request: Request,
  parentOriginsSetting: string | undefined,
): Response | null {
  const url = new URL(request.url)
  if (url.pathname !== CLASSIC_SHELL_PATH) return null
  const origins = parseClassicShellParentOrigins(parentOriginsSetting)
  if (!origins.length) return new Response('Not found', { status: 404 })
  if (request.method !== 'GET' && request.method !== 'HEAD')
    return new Response('Method not allowed', { status: 405, headers: { allow: 'GET, HEAD' } })
  return new Response(request.method === 'HEAD' ? null : buildClassicShellPage(origins), {
    headers: classicShellHeaders(origins),
  })
}
