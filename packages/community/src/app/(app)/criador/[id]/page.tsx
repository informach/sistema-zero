import { RoomCanvas } from '@sistemazero/member-shell/components/cosmetics/room/room-canvas'
import { ArrowLeft, Eye, Gamepad2, Play, Trophy } from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { PageBody, SectionHeader } from '@/components/community/page'
import { adultBadgeInfo } from '@/lib/adult-badges'
import { getSession } from '@/server/session'
import { shell } from '@/server/shell'

export const dynamic = 'force-dynamic'

/**
 * De onde a pessoa veio: o voltar segue a página que abriu o perfil (`?de=`, só estes valores; o
 * resto cai no Mural, de onde vem a maioria dos links).
 */
const ORIGINS = {
  mural: { href: '/mural-dos-criadores-adulto', label: 'Voltar para o Mural' },
  ranking: { href: '/ranking', label: 'Voltar para o ranking' },
  perfil: { href: '/perfil', label: 'Voltar para Meu perfil' },
} as const

const NUMBER = new Intl.NumberFormat('pt-BR')

/**
 * O perfil público de quem cria na comunidade adulta (direção de arte de 18/10/2026): só existe com
 * o perfil público ligado (o members responde 404 quando a pessoa desliga, e a página não confirma
 * se ela existe). A faixa escura com a foto e quatro números, os jogos antes das conquistas, as
 * conquistas com a explicação e o espaço 3D só para ver.
 */
export default async function AdultPublicProfile({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ de?: string }>
}) {
  const [{ id }, { de }] = await Promise.all([params, searchParams])
  if (!/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(id)) notFound()
  // `Object.hasOwn`: um `?de=constructor` acharia a função herdada e o voltar ficaria sem destino.
  const back =
    de && Object.hasOwn(ORIGINS, de) ? ORIGINS[de as keyof typeof ORIGINS] : ORIGINS.mural
  const [response, session] = await Promise.all([shell.members.getPublicProfile(id), getSession()])
  if (response.status === 404 || response.status === 403) notFound()
  if (response.status !== 200 || response.body?.audience !== 'adult')
    return (
      <>
        <ProfileBand back={back}>
          <h1 className="sz-h1-sm text-white">Perfil de criador</h1>
        </ProfileBand>
        <PageBody>
          <div role="status" className="sz-card flex flex-col items-start gap-3 p-7">
            <strong className="sz-h3">Perfil indisponível agora.</strong>
            <p className="m-0 text-muted-foreground">Tente novamente mais tarde.</p>
            <Link
              href={`/criador/${id}${de ? `?de=${encodeURIComponent(de)}` : ''}`}
              className="sz-btn"
            >
              Tentar de novo
            </Link>
          </div>
        </PageBody>
      </>
    )
  const profile = response.body
  const games = (profile.games ?? []).filter((game) => game.playId)
  const badges = profile.badges
    .map((badge) => ({ badge, info: adultBadgeInfo(badge.slug) }))
    .filter((item) => item.info !== null)
  const name = profile.displayName || 'Criador'
  const isMe = session?.id === id
  const stats = [
    { label: 'Pontos de experiência', value: `${NUMBER.format(profile.xp)} XP` },
    profile.ranking
      ? { label: 'No ranking', value: `${NUMBER.format(profile.ranking.position)}º lugar` }
      : null,
    { label: 'Jogos publicados', value: NUMBER.format(games.length) },
    { label: 'Conquistas', value: NUMBER.format(badges.length) },
  ].filter((stat) => stat !== null)

  return (
    <>
      <ProfileBand back={back}>
        <div className="flex flex-wrap items-center gap-6">
          {profile.avatarPhotoUrl ? (
            <img
              src={profile.avatarPhotoUrl}
              alt={`Foto do avatar de ${name}`}
              className="size-24 flex-none rounded-full border-4 border-(--sz-community-action-light) bg-(--acao-tint) object-cover md:size-32"
            />
          ) : (
            <span
              aria-hidden="true"
              className="inline-flex size-24 flex-none items-center justify-center rounded-full border-4 border-(--sz-community-action-light) bg-primary font-bold text-[2rem] text-primary-foreground md:size-32"
            >
              {initials(name)}
            </span>
          )}
          <div className="flex min-w-0 flex-col gap-1.5">
            <span className="sz-kicker text-(--topo-texto)">PERFIL DE CRIADOR</span>
            <h1 className="sz-h1 break-words text-white">{name}</h1>
          </div>
        </div>
        <dl className="m-0 grid grid-cols-2 gap-3 md:grid-cols-4">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="flex flex-col gap-1 rounded-2xl bg-(--topo-borda) px-4 py-4 md:px-5"
            >
              <dt className="text-xs">{stat.label}</dt>
              <dd className="m-0 font-extrabold text-[1.2rem] text-white leading-tight md:text-[1.5rem] [font-family:var(--font-display)]">
                {stat.value}
              </dd>
            </div>
          ))}
        </dl>
      </ProfileBand>
      <PageBody>
        {isMe ? (
          <div className="flex items-start gap-3.5 rounded-2xl bg-(--acao-tint) px-5 py-4">
            <Eye aria-hidden="true" className="mt-0.5 size-6 flex-none text-(--acao-texto)" />
            <p className="m-0">
              É assim que os outros membros veem o seu perfil.{' '}
              <Link href="/perfil" className="sz-link">
                Mudar o que aparece
              </Link>
            </p>
          </div>
        ) : null}

        <section aria-labelledby="jogos" className="flex flex-col gap-5">
          <SectionHeader id="jogos" title="Jogos publicados" />
          {games.length ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {games.map((game) => (
                <Link
                  key={game.playId}
                  href={`/jogar/${game.playId}`}
                  prefetch={false}
                  className="sz-card group flex flex-col overflow-hidden text-foreground no-underline transition-colors hover:border-(--link)"
                >
                  {game.coverUrl ? (
                    <img
                      src={game.coverUrl}
                      alt={`Capa de ${game.title}`}
                      className="aspect-video w-full bg-(--topo) object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <span
                      aria-hidden
                      className="flex aspect-video w-full items-center justify-center bg-(--topo) text-(--sz-community-blue-light)"
                    >
                      <Gamepad2 className="size-[2.6rem]" />
                    </span>
                  )}
                  <span className="flex items-center justify-between gap-3 p-5">
                    <strong className="sz-h4">{game.title}</strong>
                    <span className="sz-chip sz-chip-acao min-h-11 flex-none px-3.5">
                      <Play aria-hidden />
                      Jogar
                    </span>
                  </span>
                </Link>
              ))}
            </div>
          ) : (
            <p className="m-0 text-muted-foreground">Nenhum jogo publicado ainda.</p>
          )}
        </section>

        <section aria-labelledby="conquistas" className="flex flex-col gap-5">
          <SectionHeader id="conquistas" title="Conquistas" />
          {badges.length ? (
            <ul className="m-0 grid list-none gap-3 p-0 sm:grid-cols-2 lg:grid-cols-3">
              {badges.map(({ badge, info }) => {
                const Icon = info?.icon ?? Trophy
                return (
                  <li key={badge.slug} className="sz-card-sm flex items-start gap-3.5 p-[1.1rem]">
                    <span
                      aria-hidden="true"
                      className="inline-flex size-12 flex-none items-center justify-center rounded-xl bg-(--acao-tint) text-(--acao-texto)"
                    >
                      <Icon className="size-6" />
                    </span>
                    <span className="flex min-w-0 flex-col gap-0.5 leading-snug">
                      <strong>{info?.title}</strong>
                      <span className="text-muted-foreground text-xs">{info?.description}</span>
                    </span>
                  </li>
                )
              })}
            </ul>
          ) : (
            <p className="m-0 text-muted-foreground">Nenhuma conquista ainda.</p>
          )}
        </section>

        {profile.room ? (
          <section aria-labelledby="espaco-3d" className="flex flex-col gap-5">
            <SectionHeader id="espaco-3d" title="Espaço 3D" />
            <div className="sz-card relative overflow-hidden">
              <RoomCanvas
                state={profile.room}
                mode="view"
                staticView
                avatarPhotoUrl={profile.avatarPhotoUrl}
              />
              <span className="pointer-events-none absolute right-4 bottom-4 inline-flex min-h-10 items-center gap-2 rounded-full bg-[rgba(15,26,51,0.8)] px-3.5 font-bold text-white text-xs">
                <Eye aria-hidden="true" className="size-4" />
                Só para ver
              </span>
            </div>
          </section>
        ) : null}
      </PageBody>
    </>
  )
}

function ProfileBand({
  back,
  children,
}: {
  back: { href: string; label: string }
  children: React.ReactNode
}) {
  return (
    <section className="bg-(--topo) text-(--topo-texto)">
      <div className="sz-page flex flex-col gap-6 pt-8 pb-10">
        <Link
          href={back.href}
          prefetch={false}
          className="inline-flex min-h-12 items-center gap-2 self-start font-bold text-(--sz-community-action-light) underline-offset-4 hover:underline focus-visible:outline-3 focus-visible:outline-(--sz-community-action-light) focus-visible:outline-offset-2"
        >
          <ArrowLeft aria-hidden="true" className="size-5" />
          {back.label}
        </Link>
        {children}
      </div>
    </section>
  )
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  const first = parts[0]?.[0] ?? ''
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : ''
  return `${first}${last}`.toUpperCase() || 'C'
}
