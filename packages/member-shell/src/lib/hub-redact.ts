// Helper PURO (sem `server-only`) — privacidade do aluno na comunidade. Vive em
// `lib/` p/ ser testável (o `routes/hub.ts` é `server-only` e não importa em teste).

/**
 * Esconde o `authorId` de TERCEIROS antes de a thread/comentário chegar ao browser.
 * Os apps de aluno (community/community-kids) comparam o id SÓ com o do próprio
 * viewer p/ rotular "Você"/"Colega" — ninguém EXIBE o id; então o de outras pessoas
 * vira `null` (o UUID opaco nunca sai do servidor). O id do PRÓPRIO viewer é mantido
 * (ele já o conhece — está no seu JWT). Sem viewer (sessão ausente) → tudo redigido.
 *
 * Estrutural e tolerante: trata página (`{ items: [...] }`), item único (com
 * `authorId`) e deixa intacto qualquer outra coisa (envelopes de erro, `null` etc.).
 */
export function redactAuthors<T>(body: T, viewerId: string | null): T {
  if (!body || typeof body !== 'object') return body

  // Página por cursor: redige cada item.
  if ('items' in body && Array.isArray((body as { items: unknown[] }).items)) {
    const page = body as unknown as { items: unknown[] }
    return { ...page, items: page.items.map((i) => redactAuthors(i, viewerId)) } as unknown as T
  }

  // Thread/comentário: mantém só se for do próprio viewer.
  if ('authorId' in body) {
    const item = body as unknown as { authorId: string | null }
    if (viewerId !== null && item.authorId === viewerId) return body
    return { ...item, authorId: null } as unknown as T
  }

  return body
}
