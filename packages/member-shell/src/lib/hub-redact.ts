// Helper PURO (sem `server-only`) — privacidade do aluno na comunidade. Vive em
// `lib/` p/ ser testável (o `routes/hub.ts` é `server-only` e não importa em teste).

/**
 * Esconde o `authorId` CRU de TERCEIROS antes de a thread/comentário chegar ao browser
 * (o UUID opaco nunca sai do servidor para outras pessoas). O id do PRÓPRIO viewer é
 * mantido (ele já o conhece — está no seu JWT) → a UI rotula "Você".
 *
 * **Perfil público (06/2026):** quando o autor é PÚBLICO (`authorPublic` — opt-in dos
 * pais, snapshot no hub), expõe um `authorProfileId` (o id do perfil) como ALVO do link
 * p/ `/crianca/[id]`, mantendo o `authorDisplayName`.
 *
 * **`revealNames` (Clube kids, 07/2026):** com a flag LIGADA (só a vitrine KIDS passa),
 * o `authorDisplayName` (1º nome) é preservado para TODOS — decisão de produto: o avatar
 * é um boneco 3D que a criança monta (não a foto real) e o 1º nome sozinho não é
 * sensível, então o fórum mostra rosto+nome de todos. O LINK ao perfil público
 * (`authorProfileId`) segue GATED no opt-in dos pais. DESLIGADA (fórum adulto) mantém o
 * comportamento original: nome só quando público, senão a UI cai em "Colega".
 * O perfil público em si é o portão VIVO (404 se os pais desligarem depois) — defesa em
 * profundidade contra snapshot velho.
 *
 * Estrutural e tolerante: trata página (`{ items: [...] }`), item único (com
 * `authorId`) e deixa intacto qualquer outra coisa (envelopes de erro, `null` etc.).
 */
export function redactAuthors<T>(body: T, viewerId: string | null, revealNames = false): T {
  if (!body || typeof body !== 'object') return body

  // Página por cursor: redige cada item.
  if ('items' in body && Array.isArray((body as { items: unknown[] }).items)) {
    const page = body as unknown as { items: unknown[] }
    return {
      ...page,
      items: page.items.map((i) => redactAuthors(i, viewerId, revealNames)),
    } as unknown as T
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
      // KIDS (`revealNames`): 1º nome de TODOS; ADULTO: só quando público.
      authorDisplayName: revealNames || isPublic ? (item.authorDisplayName ?? null) : null,
    } as unknown as T
  }

  return body
}

/** Avatar+nível de um autor (do members em lote) para o `attachAuthorAvatars`. */
export interface AuthorAvatarInfo {
  photoUrl: string | null
  level: string
}

/**
 * Coleta os `authorId` CRUS (ANTES da redação, que os zera) de uma página/item — o BFF
 * usa a lista p/ buscar avatar+nível em LOTE no members. Tolerante (página/item/outro).
 */
export function collectAuthorIds(body: unknown, into: Set<string> = new Set()): Set<string> {
  if (!body || typeof body !== 'object') return into
  if ('items' in body && Array.isArray((body as { items: unknown[] }).items)) {
    for (const i of (body as { items: unknown[] }).items) collectAuthorIds(i, into)
    return into
  }
  if ('authorId' in body) {
    const id = (body as { authorId: unknown }).authorId
    if (typeof id === 'string' && id) into.add(id)
  }
  return into
}

/**
 * Anexa `authorAvatarUrl`/`authorLevel` a cada tópico/comentário pelo `authorId` CRU.
 * Roda ANTES do `redactAuthors` (que zera o id). Estrutural → os campos sobrevivem à
 * redação (que faz `...item`). Autor sem avatar no mapa → item intacto (boneco padrão).
 */
export function attachAuthorAvatars<T>(body: T, avatars: Record<string, AuthorAvatarInfo>): T {
  if (!body || typeof body !== 'object') return body
  if ('items' in body && Array.isArray((body as { items: unknown[] }).items)) {
    const page = body as unknown as { items: unknown[] }
    return {
      ...page,
      items: page.items.map((i) => attachAuthorAvatars(i, avatars)),
    } as unknown as T
  }
  if ('authorId' in body) {
    const item = body as unknown as { authorId: string | null }
    const info = item.authorId ? avatars[item.authorId] : undefined
    if (!info) return body
    return { ...item, authorAvatarUrl: info.photoUrl, authorLevel: info.level } as unknown as T
  }
  return body
}
