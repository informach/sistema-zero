import { CREATOR_SHOWCASE_SLUGS } from '@sistemazero/core/creations'
import { pythonRemixCapabilities } from '@sistemazero/member-shell/lib/studio-python-remix'
import { Plus, Trophy } from 'lucide-react'
import Link from 'next/link'
import { PageBand, PageBody } from '@/components/community/page'
import { cn } from '@/lib/cn'
import { getCreativeToolsState } from '@/server/creative-tools'
import { getSession } from '@/server/session'
import { shell } from '@/server/shell'
import { SpaceViewClient } from '../comunidade/[slug]/space-view-client'

export const dynamic = 'force-dynamic'

const filterClass = (active: boolean) =>
  cn(
    'inline-flex min-h-[2.4rem] items-center gap-2 rounded-full px-4 font-bold text-[0.9rem] no-underline transition-colors',
    active
      ? 'bg-primary text-primary-foreground'
      : 'border-2 border-border bg-card text-foreground hover:bg-muted',
  )

export default async function AdultShowcasePage({
  searchParams,
}: {
  searchParams: Promise<{ desafio?: string; ordem?: string }>
}) {
  const [session, state, query, challengeResult, python] = await Promise.all([
    getSession(),
    getCreativeToolsState(),
    searchParams,
    shell.members.getChallengeReadonly().catch(() => null),
    shell.members
      .studioFreeOptionsReadonly()
      .then((response) => (response.status === 200 ? pythonRemixCapabilities(response.body) : []))
      .catch(() => []),
  ])
  const challenge =
    challengeResult?.status === 200 && challengeResult.body?.audience === 'adult'
      ? challengeResult.body.challenge
      : null
  const challengeKey = query.desafio === '1' ? (challenge?.key ?? null) : null
  const sort = query.ordem === 'plays' ? 'plays' : 'recent'
  const studioReady = state.kind === 'ready' && state.studioAvailable
  return (
    <>
      <PageBand
        back={{ href: '/comunidade', label: 'Comunidade' }}
        title="Mostra dos criadores"
        lead="Jogos prontos da comunidade. Jogue no navegador, comente e faça a sua versão no Estúdio."
        actions={
          // Publicar é pelo Compartilhar do Estúdio; sem ele liberado, o Criar explica o porquê.
          <Link href={studioReady ? '/estudio' : '/criar'} prefetch={false} className="sz-btn">
            <Plus aria-hidden />
            Publicar um jogo meu
          </Link>
        }
      >
        <nav aria-label="Filtros da mostra" className="mt-2 flex flex-wrap items-center gap-2">
          <Link
            href="/mural-dos-criadores-adulto"
            prefetch={false}
            aria-current={!challengeKey && sort === 'recent' ? 'page' : undefined}
            className={filterClass(!challengeKey && sort === 'recent')}
          >
            Novidades
          </Link>
          <Link
            href="/mural-dos-criadores-adulto?ordem=plays"
            prefetch={false}
            aria-current={!challengeKey && sort === 'plays' ? 'page' : undefined}
            className={filterClass(!challengeKey && sort === 'plays')}
          >
            Mais jogados
          </Link>
          {challenge ? (
            <Link
              href="/mural-dos-criadores-adulto?desafio=1"
              prefetch={false}
              aria-current={challengeKey ? 'page' : undefined}
              className={filterClass(Boolean(challengeKey))}
            >
              <Trophy aria-hidden className="size-[1.1rem]" />
              Desafio: {challenge.title}
            </Link>
          ) : null}
          <Link
            href="/desafios"
            prefetch={false}
            className="sz-link ml-1 inline-flex min-h-[2.4rem] items-center text-[0.9rem]"
          >
            Ver o desafio do mês
          </Link>
        </nav>
      </PageBand>
      <PageBody className="gap-8 pt-9">
        <SpaceViewClient
          key={`${session?.id}:${sort}:${challengeKey ?? 'all'}`}
          showcaseFilter={{ sort, challengeKey }}
          slug={CREATOR_SHOWCASE_SLUGS.adult}
          viewerId={session?.id ?? ''}
          showcase
          remixCapability={
            state.kind === 'ready' && state.studioAvailable
              ? { pro: state.tier.pro, allowedExtensions: state.tier.allowedExtensions, python }
              : null
          }
        />
      </PageBody>
    </>
  )
}
