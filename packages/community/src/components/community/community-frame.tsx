'use client'
import { isEmbeddedAppPath } from '@sistemazero/member-shell/lib/embedded-app-path'
import { isLessonPath } from '@sistemazero/member-shell/lib/lesson-path'
import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'
import type { SessionUserWithAvatar } from '@/lib/types'
import { CommunitySidebar, CommunityTabs, CommunityTopBar } from './community-nav'

/** A sala da oficina ao vivo usa o layout da aula (com a barra do topo, ao contrário da aula). */
function isLiveRoomPath(pathname: string): boolean {
  return pathname.startsWith('/oficinas/aulas/')
}

/**
 * A moldura do app (o "Estúdio à noite", 25/10/2026). Páginas da comunidade: menu lateral escuro
 * do `lg` para cima; abaixo dele, a barra do topo e as abas fixas embaixo (o `<main>` reserva a
 * altura delas). A AULA é o player do Kids, em tela inteira, sem moldura (como sempre). A SALA AO
 * VIVO é a aula com a barra compacta do topo em toda largura: ela tem a própria barra fixa
 * embaixo e calcula a transmissão fixa a partir da altura desse topo (`--sz-lesson-stage-top`).
 * As ferramentas de tela cheia (`data-embedded`) não levam moldura nenhuma.
 */
export function CommunityFrame({
  user,
  banner,
  children,
}: {
  user: SessionUserWithAvatar
  banner: ReactNode
  children: ReactNode
}) {
  const pathname = usePathname() ?? ''
  const embedded = isEmbeddedAppPath(pathname)
  const lesson = isLessonPath(pathname)
  const live = isLiveRoomPath(pathname)
  // A aula e a sala ao vivo são componentes compartilhados com o Kids: mantêm a moldura de
  // sempre. As demais páginas desenham a própria faixa de ponta a ponta e cuidam da largura do
  // conteúdo (`sz-page`).
  const framed = lesson || live
  const app = !embedded && !framed

  return (
    <div
      data-embedded={embedded ? 'true' : undefined}
      className={`sz-app flex flex-col bg-background ${embedded ? 'h-dvh overflow-hidden' : 'min-h-screen'}`}
    >
      {banner}
      {live ? <CommunityTopBar user={user} compact /> : null}
      {app ? <CommunityTopBar user={user} /> : null}
      <div className={app ? 'flex min-h-0 flex-1' : 'contents'}>
        {app ? <CommunitySidebar user={user} /> : null}
        <main
          id="conteudo"
          className={
            embedded
              ? 'flex min-h-0 w-full flex-1 overflow-hidden'
              : framed
                ? 'mx-auto w-full max-w-6xl flex-1 px-4 py-8 md:px-6'
                : 'min-w-0 flex-1 pb-[calc(4.2rem+env(safe-area-inset-bottom))] lg:pb-0'
          }
        >
          {children}
        </main>
      </div>
      {app ? <CommunityTabs /> : null}
    </div>
  )
}
