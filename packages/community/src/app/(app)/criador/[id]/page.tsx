import { RoomCanvas } from '@sistemazero/member-shell/components/cosmetics/room/room-canvas'
import { badgeInfo } from '@sistemazero/member-shell/lib/badge-info'
import { Gamepad2, Play, Trophy } from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { PageBand, PageBody, SectionHeader } from '@/components/community/page'
import { shell } from '@/server/shell'

export const dynamic = 'force-dynamic'

const BACK = { href: '/mural-dos-criadores-adulto', label: 'Mostra dos criadores' }

/**
 * O perfil público de quem cria na comunidade adulta: só existe com o perfil público ligado (o
 * members responde 404 quando a pessoa desliga). Nome, XP, conquistas, jogos e o espaço 3D.
 */
export default async function AdultPublicProfile({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(id)) notFound()
  const response = await shell.members.getPublicProfile(id)
  if (response.status === 404 || response.status === 403) notFound()
  if (response.status !== 200 || response.body?.audience !== 'adult')
    return (
      <>
        <PageBand compact back={BACK} title="Perfil de criador" />
        <PageBody>
          <p role="status" className="sz-card p-6 text-muted-foreground">
            Perfil indisponível agora. Tente novamente mais tarde.
          </p>
        </PageBody>
      </>
    )
  const profile = response.body
  const games = (profile.games ?? []).filter((game) => game.playId)
  const name = profile.displayName || 'Criador'
  return (
    <>
      <PageBand
        back={BACK}
        kicker="Perfil público"
        title={
          <span className="flex items-center gap-4">
            {profile.avatarPhotoUrl ? (
              <img
                src={profile.avatarPhotoUrl}
                alt=""
                className="size-[3.6rem] flex-none rounded-full bg-(--acao-tint) object-cover md:size-[4.4rem]"
              />
            ) : null}
            <span className="min-w-0">{name}</span>
          </span>
        }
        lead={`${profile.xp} XP${profile.ranking ? ` · posição ${profile.ranking.position} no ranking` : ''}`}
      />
      <PageBody>
        <section aria-labelledby="conquistas" className="flex flex-col gap-5">
          <SectionHeader id="conquistas" title="Conquistas" />
          {profile.badges.length ? (
            <ul className="flex flex-wrap gap-2.5">
              {profile.badges.map((badge) => (
                <li key={badge.slug} className="sz-chip sz-chip-acao min-h-[2.2rem] px-3.5">
                  <Trophy aria-hidden />
                  {badgeInfo(badge.slug)?.title ?? badge.slug}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted-foreground">Nenhuma conquista ainda.</p>
          )}
        </section>

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
                    <span className="inline-flex flex-none items-center gap-1.5 font-bold text-(--link) text-[0.9rem]">
                      <Play aria-hidden className="size-4" />
                      Jogar
                    </span>
                  </span>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground">Nenhum jogo publicado ainda.</p>
          )}
        </section>

        {profile.room ? (
          <section aria-labelledby="espaco-3d" className="flex flex-col gap-5">
            <SectionHeader id="espaco-3d" title="Espaço 3D" />
            <div className="sz-card overflow-hidden">
              <RoomCanvas
                state={profile.room}
                mode="view"
                staticView
                avatarPhotoUrl={profile.avatarPhotoUrl}
              />
            </div>
          </section>
        ) : null}
      </PageBody>
    </>
  )
}
