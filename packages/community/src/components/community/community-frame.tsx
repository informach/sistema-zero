'use client'
import { isEmbeddedAppPath } from '@sistemazero/member-shell/lib/embedded-app-path'
import { isFocusOnlyPath } from '@sistemazero/member-shell/lib/focus-route'
import { isLessonPath } from '@sistemazero/member-shell/lib/lesson-path'
import { useTeacherUnread } from '@sistemazero/member-shell/lib/teacher-unread'
import { EdgePanelHandle } from '@sistemazero/ui/edge-panel-handle'
import { usePathname } from 'next/navigation'
import { type ReactNode, useState } from 'react'
import type { SessionUserWithAvatar } from '@/lib/types'
import {
  COMMUNITY_SIDEBAR_ID,
  COMMUNITY_SIDEBAR_WIDTH,
  CommunitySidebar,
  CommunityTabs,
  CommunityTopBar,
} from './community-nav'

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
  // Os não lidos de Recados: UMA leitura para o menu lateral, a barra e as abas (as três ficam
  // montadas, só escondidas por CSS; três hooks seriam três buscas a cada rota, foco e 30 s). A aula
  // e as ferramentas de tela cheia não mostram o selo e não buscam.
  const unread = useTeacherUnread(pathname, app || live)
  // O menu da esquerda com a alça de esconder e mostrar (27/10/2026, como o Kids): nas telas de
  // foco (o Meu espaço 3D) ele nasce recolhido a cada entrada e a alça presa à borda o devolve.
  // A escolha vale só para a rota em que foi feita; nas outras páginas o menu fica aberto.
  const focus = app && isFocusOnlyPath(pathname)
  const [menuOpenOn, setMenuOpenOn] = useState<string | null>(null)
  const menuCollapsed = focus && menuOpenOn !== pathname
  // ⚠️ O `<main>` é filho DIRETO do `.sz-app` fora da moldura: as regras da aula e da sala ao vivo
  // (`.sz-app:has(.sz-aula-adulto) > main`, a reserva do rodapé fixo) dependem disso.
  const main = (
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
  )

  return (
    <div
      data-embedded={embedded ? 'true' : undefined}
      className={`sz-app flex flex-col bg-background ${embedded ? 'h-dvh overflow-hidden' : 'min-h-screen'}`}
    >
      {banner}
      {live ? <CommunityTopBar user={user} unread={unread} compact /> : null}
      {app ? <CommunityTopBar user={user} unread={unread} /> : null}
      {app ? (
        <div className="flex min-h-0 flex-1">
          <CommunitySidebar user={user} unread={unread} collapsed={menuCollapsed} />
          {main}
        </div>
      ) : (
        main
      )}
      {app ? <CommunityTabs unread={unread} /> : null}
      {focus ? (
        // O menu só existe do `lg` para cima, e a alça também (por CSS: medir a janela no
        // primeiro quadro desencontraria o HTML do servidor). Irmã do menu, não mora no cabeçalho:
        // fechada, ela continua à vista na borda da tela.
        <EdgePanelHandle
          side="left"
          open={!menuCollapsed}
          openOffset={COMMUNITY_SIDEBAR_WIDTH}
          label={menuCollapsed ? 'Mostrar menu' : 'Esconder menu'}
          controlsId={COMMUNITY_SIDEBAR_ID}
          onToggle={() => setMenuOpenOn(menuCollapsed ? pathname : null)}
          className="hidden border-(--linha-escura) bg-(--topo) text-(--texto-claro) lg:flex"
        />
      ) : null}
    </div>
  )
}
