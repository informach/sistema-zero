import { Gamepad2, Play, Sparkles, Trophy, UserRound } from 'lucide-react'
import type { PublicProfileDTO } from '@/lib/types'
import { AvatarWithAura } from './avatar-with-aura'
import { KidsBackButton } from './back-button'
import { badgeInfo, badgeTone } from './badges'
import { KidsBand } from './kids-band'
import { KidsEyebrow } from './kids-eyebrow'
import { KidsSectionHeader } from './kids-section-header'
import { LevelBadge } from './level-badge'
import { backToSection } from './nav'
import { LazyRoomCanvas } from './room/lazy-room-canvas'

/** A pílula de vidro do herói azul (a mesma do "Meu perfil"): a tinta clara sobre o azul. */
const VIDRO = 'kids-marca-vidro inline-flex min-h-9 items-center gap-2 rounded-full px-3.5 py-1.5'

/**
 * Perfil PÚBLICO de uma criança (visível a colegas da comunidade): avatar + nome +
 * colocação no ranking + XP + as conquistas QUE ELA TEM (não o catálogo). Nenhum dado
 * sensível (sem e-mail/telefone).
 *
 * No desenho das telas-modelo (11/09/2026), na régua do "Meu perfil": a seta de volta para a
 * Comunidade e o herói azul no creme (o nome é o h1 DENTRO do herói, como no Clube), o quarto no
 * menta, os jogos do Mural no azul-claro e as conquistas fechando no lilás. Sem quarto ou sem
 * jogos, a faixa some e a ordem continua (a última é sempre a das conquistas).
 */
export function PublicProfileView({ profile }: { profile: PublicProfileDTO }) {
  const games = profile.games ?? []
  const badges = profile.badges
    .map((b) => ({ slug: b.slug, info: badgeInfo(b.slug) }))
    .filter((b): b is { slug: string; info: NonNullable<ReturnType<typeof badgeInfo>> } =>
      Boolean(b.info),
    )
  // A régua é o próprio mapa do menu: o perfil de outra criança volta para a Comunidade.
  const back = backToSection('/crianca')

  return (
    <>
      <KidsBand tone="creme">
        {back ? (
          <div className="mb-5">
            <KidsBackButton href={back.href} label={back.label} showLabel />
          </div>
        ) : null}
        <div className="mb-3">
          <KidsEyebrow icon={UserRound}>Perfil de criador</KidsEyebrow>
        </div>
        <section
          aria-labelledby="perfil-publico-nome"
          className="kids-marca rounded-[1.75rem] p-5 shadow-[0_18px_40px_-26px_color-mix(in_oklab,var(--sz-primary)_70%,transparent)] md:px-[1.625rem] md:py-6"
        >
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:gap-[1.625rem]">
            <AvatarWithAura
              photoUrl={profile.avatarPhotoUrl ?? null}
              name={profile.name}
              levelSlug={profile.level?.slug}
              size="xl"
              // O quadrado de vidro do "Meu perfil": sobre o azul do herói, o círculo sumiria.
              className="kids-marca-vidro size-24 shrink-0 rounded-[1.5rem] md:size-[6.5rem]"
              label={`Avatar de ${profile.name}`}
            />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                <h1
                  id="perfil-publico-nome"
                  className="sz-display min-w-0 break-words text-[2rem] md:text-[2.25rem]"
                >
                  {profile.name}
                </h1>
                <LevelBadge levelSlug={profile.level?.slug} variant="destaque" />
              </div>
              <p className="mt-4 flex flex-wrap items-center gap-2 font-bold text-[0.8125rem]">
                <span className={VIDRO}>
                  <Sparkles className="size-4 shrink-0" aria-hidden />
                  <span className="sz-display text-sm">{profile.xp} XP</span>
                </span>
                {profile.ranking ? (
                  <span className={VIDRO}>
                    <Trophy className="size-4 shrink-0" aria-hidden />
                    <span className="sz-display text-sm">{profile.ranking.position}º lugar</span>
                  </span>
                ) : null}
              </p>
            </div>
          </div>
        </section>
      </KidsBand>

      {profile.room ? (
        <KidsBand tone="menta">
          <section aria-labelledby="perfil-publico-quarto">
            <KidsSectionHeader id="perfil-publico-quarto" title="O quarto" />
            <div className="kids-carta overflow-hidden p-2 md:p-3">
              <LazyRoomCanvas
                state={profile.room}
                avatarPhotoUrl={profile.avatarPhotoUrl ?? null}
              />
            </div>
          </section>
        </KidsBand>
      ) : null}

      {games.length > 0 ? (
        <KidsBand tone="ceu">
          <section aria-labelledby="perfil-publico-jogos">
            <KidsSectionHeader id="perfil-publico-jogos" title="Jogos publicados no Mural" />
            <ul className="grid grid-cols-2 gap-4 md:grid-cols-3 md:gap-5">
              {games.map((game) => {
                const inner = (
                  <>
                    <div className="relative aspect-video w-full overflow-hidden rounded-2xl bg-(--band-ceu)">
                      {game.coverUrl ? (
                        <img
                          src={game.coverUrl}
                          alt=""
                          width={16}
                          height={9}
                          className="size-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div className="grid size-full place-items-center">
                          <Gamepad2 className="size-8 text-primary/60" aria-hidden />
                        </div>
                      )}
                    </div>
                    <span className="sz-display mt-3 block truncate px-1 text-[1.0625rem]">
                      {game.title}
                    </span>
                    {game.playId ? (
                      <span className="sz-btn-gradient mt-3 h-10 w-full gap-1.5 text-sm">
                        <Play className="size-4" aria-hidden /> Jogar
                      </span>
                    ) : null}
                  </>
                )
                const card = 'kids-carta flex h-full flex-col p-3'
                return (
                  <li key={`${game.playId ?? 'sem-play'}:${game.publishedAt}`}>
                    {game.playId ? (
                      <a
                        href={`/jogar/${game.playId}`}
                        target="_blank"
                        rel="noreferrer"
                        className={`${card} transition-transform hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:transition-none`}
                      >
                        {inner}
                      </a>
                    ) : (
                      // Snapshot legado sem play: mostra a criação (capa + título) sem o
                      // "Jogar" e SEM animação de hover, nada sugere clique.
                      <div className={card}>{inner}</div>
                    )}
                  </li>
                )
              })}
            </ul>
          </section>
        </KidsBand>
      ) : null}

      <KidsBand tone="lilas">
        <section aria-labelledby="perfil-publico-conquistas">
          <KidsSectionHeader id="perfil-publico-conquistas" title="Conquistas" />
          {badges.length === 0 ? (
            <p className="kids-carta px-5 py-4 font-medium text-muted-foreground text-sm">
              Ainda não tem conquistas. Logo logo aparecem aqui! 😄
            </p>
          ) : (
            <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
              {badges.map(({ slug, info }) => {
                const Icon = info.icon
                const tom = badgeTone(slug)
                return (
                  <li
                    key={slug}
                    className="kids-carta flex flex-col items-center gap-2.5 px-3 py-5 text-center"
                  >
                    <span
                      aria-hidden="true"
                      className="grid size-12 place-items-center rounded-[0.875rem]"
                      style={{ background: tom.fundo, color: tom.tinta }}
                    >
                      <Icon className="size-6" />
                    </span>
                    <span className="sz-display text-[0.9375rem] leading-tight">{info.title}</span>
                  </li>
                )
              })}
            </ul>
          )}
        </section>
      </KidsBand>
    </>
  )
}
