import { Card, CardContent } from '@sistemazero/ui/card'
import { Sparkles, Trophy } from 'lucide-react'
import type { PublicProfileDTO } from '@/lib/types'
import { badgeInfo } from './badges'
import { KidsAvatar } from './kids-avatar'
import { RoomCanvas } from './room/room-canvas'

/**
 * Perfil PÚBLICO de uma criança (visível a colegas da comunidade): avatar + nome +
 * colocação no ranking + XP + as conquistas QUE ELA TEM (não o catálogo). Nenhum dado
 * sensível (sem e-mail/telefone). Quarto virtual entra na Fase 3.
 */
export function PublicProfileView({ profile }: { profile: PublicProfileDTO }) {
  const badges = profile.badges
    .map((b) => ({ slug: b.slug, info: badgeInfo(b.slug) }))
    .filter((b): b is { slug: string; info: NonNullable<ReturnType<typeof badgeInfo>> } =>
      Boolean(b.info),
    )

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col items-center gap-3 text-center sm:flex-row sm:text-left">
            <KidsAvatar
              photoUrl={profile.avatarPhotoUrl ?? null}
              size="xl"
              label={`Avatar de ${profile.name}`}
            />
            <div className="min-w-0 flex-1">
              <h1 className="sz-display text-2xl">{profile.name}</h1>
              <p className="mt-1 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-sm sm:justify-start">
                <span className="inline-flex items-center gap-1.5 text-primary">
                  <Sparkles className="size-4" />
                  <span className="[font-family:var(--font-display)] font-bold">
                    {profile.xp} XP
                  </span>
                </span>
                {profile.ranking ? (
                  <span className="inline-flex items-center gap-1.5">
                    <Trophy className="size-4 text-primary" />
                    <span className="[font-family:var(--font-display)] font-bold">
                      {profile.ranking.position}º lugar
                    </span>
                  </span>
                ) : null}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {profile.room ? (
        <section>
          <h2 className="sz-display mb-3 text-lg">O quarto</h2>
          <RoomCanvas
            state={profile.room}
            mode="view"
            avatarPhotoUrl={profile.avatarPhotoUrl ?? null}
          />
        </section>
      ) : null}

      <section>
        <h2 className="sz-display mb-3 text-lg">Conquistas</h2>
        {badges.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            Ainda não tem conquistas — logo logo aparecem aqui! 😄
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {badges.map(({ slug, info }) => {
              const Icon = info.icon
              return (
                <div
                  key={slug}
                  className="flex flex-col items-center gap-1.5 rounded-2xl border-2 border-border bg-(--kids-lime-tint) p-3 text-center"
                >
                  <Icon className="size-7" />
                  <span className="font-semibold text-xs">{info.title}</span>
                </div>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}
