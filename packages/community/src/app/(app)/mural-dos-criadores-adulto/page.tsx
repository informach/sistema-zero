import { CREATOR_SHOWCASE_SLUGS } from '@sistemazero/core/creations'
import Link from 'next/link'
import { getCreativeToolsState } from '@/server/creative-tools'
import { getSession } from '@/server/session'
import { shell } from '@/server/shell'
import { SpaceViewClient } from '../comunidade/[slug]/space-view-client'

export const dynamic = 'force-dynamic'
export default async function AdultShowcasePage({
  searchParams,
}: {
  searchParams: Promise<{ desafio?: string; ordem?: string }>
}) {
  const [session, state, query, challengeResult] = await Promise.all([
    getSession(),
    getCreativeToolsState(),
    searchParams,
    shell.members.getChallengeReadonly().catch(() => null),
  ])
  const challenge =
    challengeResult?.status === 200 && challengeResult.body?.audience === 'adult'
      ? challengeResult.body.challenge
      : null
  const challengeKey = query.desafio === '1' ? (challenge?.key ?? null) : null
  const sort = query.ordem === 'plays' ? 'plays' : 'recent'
  return (
    <div className="space-y-5">
      <nav
        aria-label="Filtros da mostra"
        className="flex flex-wrap gap-4 text-sm font-semibold text-primary"
      >
        <Link
          href="/mural-dos-criadores-adulto"
          aria-current={!challengeKey && sort === 'recent' ? 'page' : undefined}
        >
          Novidades
        </Link>
        <Link
          href="/mural-dos-criadores-adulto?ordem=plays"
          aria-current={!challengeKey && sort === 'plays' ? 'page' : undefined}
        >
          Mais jogados
        </Link>
        {challenge ? (
          <Link
            href="/mural-dos-criadores-adulto?desafio=1"
            aria-current={challengeKey ? 'page' : undefined}
          >
            Desafio: {challenge.title}
          </Link>
        ) : null}
        <Link href="/desafios">Ver desafio do mês</Link>
      </nav>
      <SpaceViewClient
        key={`${session?.id}:${sort}:${challengeKey ?? 'all'}`}
        showcaseFilter={{ sort, challengeKey }}
        slug={CREATOR_SHOWCASE_SLUGS.adult}
        viewerId={session?.id ?? ''}
        showcase
        remixCapability={
          state.kind === 'ready' && state.studioAvailable
            ? { pro: state.tier.pro, allowedExtensions: state.tier.allowedExtensions }
            : null
        }
      />
    </div>
  )
}
