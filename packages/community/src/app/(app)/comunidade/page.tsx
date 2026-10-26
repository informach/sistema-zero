import Link from 'next/link'
import { PageBand, PageBody } from '@/components/community/page'
import { PersonAvatar } from '@/components/community/user-menu'
import { getAvatarReadonly } from '@/server/members'
import { getSession } from '@/server/session'
import { shell } from '@/server/shell'
import { CommunityHomeClient } from './community-home-client'

export const dynamic = 'force-dynamic'

const SPACES = [
  {
    kind: 'mural',
    href: '/mural-dos-criadores-adulto',
    title: 'Mural dos Criadores',
    text: 'Jogos feitos por gente como você. Jogue, comente e faça a sua versão.',
    cta: 'Ver o Mural',
    art: 'var(--topo)',
  },
  {
    kind: 'desafio',
    href: '/desafios',
    title: 'Desafio do mês',
    text: 'Um tema novo por mês. Crie o seu jogo e participe até o fim do mês.',
    cta: 'Ver o desafio',
    art: 'linear-gradient(135deg, var(--sz-community-blue), var(--sz-community-purple))',
  },
  {
    kind: 'ranking',
    href: '/ranking',
    title: 'Ranking e liga',
    text: 'Uma liga nova toda semana, com quem está criando junto com você.',
    cta: 'Ver o ranking',
    art: 'linear-gradient(135deg, var(--cta-degrau), var(--dourado))',
  },
] as const

export default async function ComunidadePage() {
  const [session, avatar, preferences] = await Promise.all([
    getSession(),
    getAvatarReadonly().catch(() => null),
    shell.members.getAdultProfileReadonly().catch(() => null),
  ])
  const profile = preferences?.status === 200 ? (preferences.body ?? null) : null
  const avatarUrl = avatar?.status === 200 ? (avatar.body?.photoUrl ?? null) : null

  return (
    <>
      <PageBand
        kicker="Espaços da comunidade adulta"
        title="Comunidade"
        lead="Tire dúvidas, mostre seus projetos e troque ideias com outras pessoas que também estão criando o primeiro jogo."
      >
        {/* Os espaços de mostrar no palco, cada um com a sua arte (Estúdio à noite). */}
        <ul
          aria-label="Espaços para mostrar"
          className="m-0 mt-6 grid list-none gap-5 p-0 md:grid-cols-3"
        >
          {SPACES.map((space) => (
            <li key={space.href}>
              <Link
                href={space.href}
                prefetch={false}
                className="sz-card group flex h-full flex-col overflow-hidden text-foreground no-underline transition-colors hover:border-foreground/40"
              >
                <div
                  aria-hidden="true"
                  className="h-[8.5rem] flex-none"
                  style={{ background: space.art }}
                >
                  <SpaceArt kind={space.kind} />
                </div>
                <div className="flex flex-1 flex-col gap-2 p-5">
                  <h2 className="sz-h3">{space.title}</h2>
                  <p className="m-0 text-[0.9rem] text-muted-foreground">{space.text}</p>
                  <span className="sz-link mt-auto pt-1">{space.cta}</span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </PageBand>
      <PageBody>
        <div className="grid items-start gap-7 lg:grid-cols-[minmax(0,1fr)_19rem]">
          <CommunityHomeClient />
          <aside aria-label="Sobre a sua participação" className="flex flex-col gap-5">
            <section
              aria-labelledby="como-voce-aparece"
              className="sz-card flex flex-col gap-3 p-6"
            >
              <h2 id="como-voce-aparece" className="sz-h3">
                Como você aparece
              </h2>
              {session && profile ? (
                <div className="flex items-center gap-3">
                  <PersonAvatar
                    user={{ ...session, avatarUrl }}
                    className="size-[2.4rem] text-[0.85rem]"
                  />
                  <span className="flex min-w-0 flex-col">
                    <strong className="truncate">
                      {profile.publicEnabled ? profile.displayName || session.firstName : 'Colega'}
                    </strong>
                    <span className="text-[0.85rem] text-muted-foreground">
                      {profile.publicEnabled ? 'Perfil público ligado' : 'Perfil público desligado'}
                    </span>
                  </span>
                </div>
              ) : null}
              <p className="text-[0.85rem] text-muted-foreground">
                {/* Sem as preferências (falha de leitura) não dá para afirmar se está ligado. */}
                {profile === null
                  ? 'Com o perfil público desligado, as outras pessoas veem você como “Colega”. Ligado, aparecem o seu nome, os seus jogos e as suas conquistas.'
                  : profile.publicEnabled
                    ? 'Com o perfil público ligado, as outras pessoas veem o seu nome, os seus jogos e as suas conquistas. Desligando, você aparece como “Colega”.'
                    : 'Com o perfil público desligado, as outras pessoas veem você como “Colega”. Ligando, aparecem o seu nome, os seus jogos e as suas conquistas.'}
              </p>
              <Link
                href="/perfil"
                prefetch={false}
                className="sz-link inline-flex min-h-[2.4rem] items-center self-start"
              >
                Alterar em Meu perfil
              </Link>
            </section>
            <section aria-labelledby="duvida-aula" className="sz-card flex flex-col gap-3 p-6">
              <h2 id="duvida-aula" className="sz-h3">
                Dúvida sobre uma aula?
              </h2>
              <p className="text-[0.85rem] text-muted-foreground">
                Dentro da aula, “Preciso de ajuda” fala direto com a equipe. As respostas chegam em
                Recados.
              </p>
              <Link
                href="/recados"
                prefetch={false}
                className="sz-link inline-flex min-h-[2.4rem] items-center self-start"
              >
                Abrir Recados
              </Link>
            </section>
          </aside>
        </div>
      </PageBody>
    </>
  )
}

/** A arte decorativa de cada espaço: capas do Mural, o troféu do desafio e o pódio do ranking. */
function SpaceArt({ kind }: { kind: 'mural' | 'desafio' | 'ranking' }) {
  if (kind === 'mural')
    return (
      <svg
        viewBox="0 0 340 136"
        preserveAspectRatio="xMidYMid slice"
        className="block h-full w-full"
      >
        <rect x="30" y="20" width="120" height="68" rx="8" fill="var(--carta-2)" />
        <rect x="190" y="20" width="120" height="68" rx="8" fill="var(--carta-2)" />
        <rect
          x="110"
          y="56"
          width="120"
          height="68"
          rx="8"
          fill="var(--carta)"
          stroke="var(--cta)"
          strokeWidth="3"
        />
        <circle cx="70" cy="50" r="10" fill="var(--menta)" />
        <circle cx="270" cy="50" r="10" fill="var(--rosa)" />
        <path d="M170 74 L182 104 L170 98 L158 104 Z" fill="var(--cta)" />
      </svg>
    )
  if (kind === 'desafio')
    return (
      <svg
        viewBox="0 0 340 136"
        preserveAspectRatio="xMidYMid slice"
        className="block h-full w-full"
        shapeRendering="crispEdges"
      >
        <rect x="146" y="28" width="48" height="40" fill="var(--dourado)" />
        <rect x="130" y="32" width="16" height="20" fill="var(--dourado)" />
        <rect x="194" y="32" width="16" height="20" fill="var(--dourado)" />
        <rect x="162" y="68" width="16" height="16" fill="var(--dourado)" />
        <rect x="150" y="84" width="40" height="12" fill="var(--cta-degrau)" />
        <rect x="158" y="40" width="8" height="8" fill="var(--noite)" opacity="0.25" />
      </svg>
    )
  return (
    <svg
      viewBox="0 0 340 136"
      preserveAspectRatio="xMidYMid slice"
      className="block h-full w-full"
      shapeRendering="crispEdges"
    >
      <rect x="110" y="72" width="40" height="64" fill="var(--texto-claro-2)" />
      <rect
        x="150"
        y="44"
        width="40"
        height="92"
        fill="var(--cta)"
        stroke="var(--noite)"
        strokeWidth="3"
      />
      <rect x="190" y="88" width="40" height="48" fill="var(--laranja)" />
    </svg>
  )
}
