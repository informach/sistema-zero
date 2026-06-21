// Helper PURO (sem `server-only`) — privacidade do aluno na comunidade. Vive em
// `lib/` p/ ser testável (o `routes/hub.ts` é `server-only` e não importa em teste).

/**
 * Esconde o `authorId` CRU de TERCEIROS antes de a thread/comentário chegar ao browser
 * (o UUID opaco nunca sai do servidor para outras pessoas). O id do PRÓPRIO viewer é
 * mantido (ele já o conhece — está no seu JWT) → a UI rotula "Você".
 *
 * **Perfil público (06/2026):** quando o autor é PÚBLICO (`authorPublic` — opt-in dos
 * pais, snapshot no hub), expõe um `authorProfileId` (o id do perfil) como ALVO do link
 * p/ `/crianca/[id]`, mantendo o `authorDisplayName`. Perfil NÃO público → sem
 * `authorProfileId` e sem `authorDisplayName` (a UI cai em "Colega"/sem byline).
 * O perfil público em si é o portão VIVO (404 se os pais desligarem depois) — defesa em
 * profundidade contra snapshot velho.
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
    const item = body as unknown as {
      authorId: string | null
      authorPublic?: boolean
      authorDisplayName?: string | null
    }
    if (viewerId !== null && item.authorId === viewerId) return body
    // Terceiro: zera o id cru; expõe o alvo do link SÓ quando o perfil é público.
    const isPublic = item.authorPublic === true
    const authorProfileId = isPublic && item.authorId ? item.authorId : null
    return {
      ...item,
      authorId: null,
      authorProfileId,
      authorDisplayName: isPublic ? (item.authorDisplayName ?? null) : null,
    } as unknown as T
  }

  return body
}
