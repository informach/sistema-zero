'use client'
import { isEmbeddedAppPath } from '@sistemazero/member-shell/lib/embedded-app-path'
import { isFocusOnlyPath } from '@sistemazero/member-shell/lib/focus-route'
import { isLessonPath } from '@sistemazero/member-shell/lib/lesson-path'
import { useTeacherUnread } from '@sistemazero/member-shell/lib/teacher-unread'
import { EdgePanelHandle } from '@sistemazero/ui/edge-panel-handle'
import { usePathname } from 'next/navigation'
import { type CSSProperties, type ReactNode, useState } from 'react'
import type { SessionUserWithAvatar } from '@/lib/types'
import {
  COMMUNITY_SIDEBAR_ID,
  COMMUNITY_SIDEBAR_WIDTH,
  CommunitySidebar,
  CommunityTabs,
  CommunityTopBar,
} from './community-nav'

/** A sala da oficina ao vivo mantém a barra compacta também no computador. */
function isLiveRoomPath(pathname: string): boolean {
  return pathname.startsWith('/oficinas/aulas/')
}

/**
 * A moldura do app (o "Estúdio à noite", 25/10/2026). Páginas da comunidade: menu lateral escuro
 * do `lg` para cima; abaixo dele, a barra do topo e as abas fixas embaixo (o `<main>` reserva a
 * altura delas). Na AULA, o menu lateral começa recolhido, como no Kids. A SALA AO
 * VIVO é a aula com a barra compacta do topo em toda largura: ela tem a própria barra fixa
 * embaixo e calcula a transmissão fixa a partir da altura desse topo (`--sz-lesson-stage-top`).
 * As ferramentas de tela cheia (`data-embedded`) não levam moldura nenhuma.
 */
export function CommunityFrame({
  user,
  banner,
  arquipelagoLiberado = false,
  children,
}: {
  user: SessionUserWithAvatar
  banner: ReactNode
  arquipelagoLiberado?: boolean
  children: ReactNode
}) {
  const pathname = usePathname() ?? ''
  const embedded = isEmbeddedAppPath(pathname)
  const lesson = isLessonPath(pathname)
  const live = isLiveRoomPath(pathname)
  // Aula e sala usam o mesmo espaço de conteúdo; as demais páginas cuidam da largura do
  // conteúdo (`sz-page`).
  const framed = lesson || live
  const app = !embedded && !live
  // Os não lidos de Recados: UMA leitura para o menu lateral, a barra e as abas (as três ficam
  // montadas, só escondidas por CSS; três hooks seriam três buscas a cada rota, foco e 30 s).
  const unread = useTeacherUnread(pathname, app || live)
  // O menu da esquerda com a alça de esconder e mostrar (27/10/2026, como o Kids): nas telas de
  // foco (o Meu espaço 3D) ele nasce recolhido a cada entrada e a alça presa à borda o devolve.
  // A escolha vale só para a rota em que foi feita; nas outras páginas o menu fica aberto.
  const menuWidth = lesson ? 'var(--kids-menu-width, 16.75rem)' : COMMUNITY_SIDEBAR_WIDTH
  const focus = app && (lesson || isFocusOnlyPath(pathname))
  const [menuOpenOn, setMenuOpenOn] = useState<string | null>(null)
  const menuCollapsed = focus && menuOpenOn !== pathname
  // O id do conteúdo é o gancho estável da reserva do rodapé, com ou sem menu lateral.
  const main = (
    <main
      id="conteudo"
      style={
        live
          ? ({ '--sz-lesson-stage-top': '4rem', '--sz-lesson-tabs-height': '0px' } as CSSProperties)
          : undefined
      }
      className={
        embedded
          ? 'flex min-h-0 w-full flex-1 overflow-hidden'
          : framed
            ? 'kids-aula w-full min-w-0 flex-1 px-4 pt-6 pb-40 md:px-8 md:pt-8 md:pb-32'
            : 'min-w-0 flex-1 pb-[calc(4.2rem+env(safe-area-inset-bottom))] lg:pb-0'
      }
    >
      {children}
    </main>
  )

  return (
    <div
      data-embedded={embedded ? 'true' : undefined}
      data-lesson={lesson ? 'true' : undefined}
      data-menu-open={app && !menuCollapsed ? 'true' : undefined}
      style={{ '--sz-community-sidebar-width': menuWidth } as CSSProperties}
      className={`sz-app flex flex-col bg-background ${framed ? 'sz-lesson-ui' : ''} ${embedded ? 'h-dvh overflow-hidden' : 'min-h-screen'}`}
    >
      {banner}
      {live ? <CommunityTopBar user={user} unread={unread} compact /> : null}
      {app ? <CommunityTopBar user={user} unread={unread} lesson={lesson} /> : null}
      {app ? (
        <div className={`${lesson ? 'kids-shell-row' : ''} flex min-h-0 flex-1`}>
          <CommunitySidebar
            user={user}
            unread={unread}
            collapsed={menuCollapsed}
            lesson={lesson}
            arquipelagoLiberado={arquipelagoLiberado}
          />
          {main}
        </div>
      ) : (
        main
      )}
      {app ? (
        <CommunityTabs lesson={lesson} unread={unread} arquipelagoLiberado={arquipelagoLiberado} />
      ) : null}
      {focus ? (
        // O menu só existe do `lg` para cima, e a alça também (por CSS: medir a janela no
        // primeiro quadro desencontraria o HTML do servidor). Irmã do menu, não mora no cabeçalho:
        // fechada, ela continua à vista na borda da tela.
        <EdgePanelHandle
          side="left"
          open={!menuCollapsed}
          openOffset={menuWidth}
          label={menuCollapsed ? 'Mostrar menu' : 'Esconder menu'}
          controlsId={COMMUNITY_SIDEBAR_ID}
          onToggle={() => setMenuOpenOn(menuCollapsed ? pathname : null)}
          className={
            lesson
              ? 'hidden border-border bg-card text-foreground md:flex'
              : 'hidden border-(--linha-escura) bg-(--topo) text-(--texto-claro) lg:flex'
          }
        />
      ) : null}
    </div>
  )
}
