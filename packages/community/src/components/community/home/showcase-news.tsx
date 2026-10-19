import { CREATOR_SHOWCASE_SLUGS } from '@sistemazero/core/creations'
import {
  attachAdultPublicIdentities,
  collectAuthorIds,
  redactAuthors,
} from '@sistemazero/member-shell/lib/hub-redact'
import { Play } from 'lucide-react'
import Link from 'next/link'
import type { HubPage, HubThreadView } from '@/lib/types'
import { shell } from '@/server/shell'
import { CourseCover } from '../courses/course-cover'
import { SectionHeader } from '../page'

const SHOWN = 3

/**
 * Os jogos mais novos do Mural adulto (o canal `parede` do Mural, na ordem Novidades), com o
 * mesmo cuidado do BFF do fórum: o nome do autor só aparece quando o perfil é público AGORA (a
 * identidade é relida no members e falha fechada), e o id cru de terceiros nunca chega à página.
 * Best-effort: sem canal, sem jogo ou com o hub fora, a seção não aparece.
 */
async function loadShowcase(viewerId: string | null): Promise<HubThreadView[]> {
  try {
    const channels = await shell.hub.listChannels(CREATOR_SHOWCASE_SLUGS.adult)
    const channel =
      channels.status === 200 ? channels.body?.items.find((item) => item.slug === 'parede') : null
    if (!channel) return []
    const page = await shell.hub.listThreads(channel.id, { limit: 12, sort: 'recent' })
    if (page.status !== 200 || !page.body) return []
    const ids = [...collectAuthorIds(page.body)].slice(0, 100)
    const identities = new Map<string, string>()
    if (ids.length > 0) {
      const response = await shell.members.getAdultPublicIdentities(ids).catch(() => null)
      if (response?.status === 200)
        for (const identity of response.body?.identities ?? [])
          identities.set(identity.userId, identity.displayName)
    }
    const safe = redactAuthors(
      attachAdultPublicIdentities(page.body, identities) as HubPage<HubThreadView>,
      viewerId,
    )
    return safe.items.filter((thread) => thread.isShowcase && !thread.pending).slice(0, SHOWN)
  } catch {
    return []
  }
}

export async function ShowcaseNews({ viewerId }: { viewerId: string | null }) {
  const games = await loadShowcase(viewerId)
  if (games.length === 0) return null
  return (
    <section aria-labelledby="novidades-mostra" className="flex flex-col gap-5">
      <SectionHeader
        id="novidades-mostra"
        title="Novidades no Mural"
        action={
          <Link
            href="/mural-dos-criadores-adulto"
            prefetch={false}
            className="sz-link inline-flex min-h-[2.4rem] items-center"
          >
            Ver o Mural
          </Link>
        }
      />
      <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {games.map((game) => {
          const plays = game.playsCount ?? 0
          const author = game.authorId
            ? 'você'
            : game.authorPublic && game.authorDisplayName
              ? game.authorDisplayName
              : 'Criador'
          return (
            <li key={game.id} className="sz-card-sm flex flex-col overflow-hidden">
              <div className="aspect-[32/17] bg-(--topo)">
                <CourseCover src={game.coverImageUrl} />
              </div>
              <div className="flex flex-1 flex-col gap-1 p-4 md:p-5">
                <strong className="line-clamp-2">{game.title}</strong>
                <span className="text-[0.85rem] text-muted-foreground">
                  por {author} ·{' '}
                  {plays === 0
                    ? 'ainda sem jogadas'
                    : `${plays} ${plays === 1 ? 'jogada' : 'jogadas'}`}
                </span>
                <div className="mt-auto pt-2.5">
                  {game.playId ? (
                    <a
                      href={`/jogar/${encodeURIComponent(game.playId)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`Jogar ${game.title} (abre em outra aba)`}
                      className="sz-btn-outline sz-btn-sm"
                    >
                      <Play className="fill-current" aria-hidden />
                      Jogar
                    </a>
                  ) : (
                    // Post sem link jogável (antigo ou do fluxo da aula): o jogo mora só no Mural.
                    <Link
                      href="/mural-dos-criadores-adulto"
                      prefetch={false}
                      aria-label={`Ver ${game.title} no Mural`}
                      className="sz-btn-outline sz-btn-sm"
                    >
                      Ver no Mural
                    </Link>
                  )}
                </div>
              </div>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
