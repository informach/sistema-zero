import { RoomCanvas } from '@sistemazero/member-shell/components/cosmetics/room/room-canvas'
import { badgeInfo } from '@sistemazero/member-shell/lib/badge-info'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { shell } from '@/server/shell'

export const dynamic = 'force-dynamic'
export default async function AdultPublicProfile({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(id)) notFound()
  const response = await shell.members.getPublicProfile(id)
  if (response.status === 404 || response.status === 403) notFound()
  if (response.status !== 200 || response.body?.audience !== 'adult')
    return <p role="status">Perfil indisponível agora. Tente novamente mais tarde.</p>
  const profile = response.body
  const games = profile.games ?? []
  return (
    <div className="space-y-8">
      <Link href="/comunidade" className="text-sm text-primary underline">
        Voltar à comunidade
      </Link>
      <header className="flex items-center gap-5">
        {profile.avatarPhotoUrl ? (
          <img src={profile.avatarPhotoUrl} alt="Avatar 3D" className="size-24 rounded-full" />
        ) : null}
        <div>
          <h1 className="text-3xl font-bold">{profile.displayName || 'Criador'}</h1>
          <p className="mt-2 text-muted-foreground">
            {profile.xp} XP
            {profile.ranking ? ` · posição ${profile.ranking.position} no ranking` : ''}
          </p>
        </div>
      </header>
      <section>
        <h2 className="text-xl font-semibold">Conquistas</h2>
        <ul className="mt-3 flex flex-wrap gap-3">
          {profile.badges.map((badge) => (
            <li key={badge.slug} className="rounded-full bg-card px-4 py-2 text-sm">
              {badgeInfo(badge.slug)?.title ?? badge.slug}
            </li>
          ))}
        </ul>
      </section>
      <section>
        <h2 className="text-xl font-semibold">Jogos publicados</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {games.map((game) =>
            game.playId ? (
              <Link
                key={game.playId}
                href={`/jogar/${game.playId}`}
                className="overflow-hidden rounded-2xl border bg-card"
                prefetch={false}
              >
                {game.coverUrl ? (
                  <img
                    src={game.coverUrl}
                    alt={`Capa de ${game.title}`}
                    className="aspect-video w-full object-cover"
                    loading="lazy"
                  />
                ) : null}
                <p className="p-4 font-semibold">{game.title}</p>
              </Link>
            ) : null,
          )}
        </div>
        {!games.length ? (
          <p className="mt-3 text-sm text-muted-foreground">Nenhum jogo publicado ainda.</p>
        ) : null}
      </section>
      {profile.room ? (
        <section>
          <h2 className="mb-4 text-xl font-semibold">Espaço 3D</h2>
          <RoomCanvas
            state={profile.room}
            mode="view"
            staticView
            avatarPhotoUrl={profile.avatarPhotoUrl}
          />
        </section>
      ) : null}
    </div>
  )
}
