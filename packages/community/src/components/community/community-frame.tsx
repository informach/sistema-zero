'use client'
import { isEmbeddedAppPath } from '@sistemazero/member-shell/lib/embedded-app-path'
import { isLessonPath } from '@sistemazero/member-shell/lib/lesson-path'
import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'
import type { SessionUserWithAvatar } from '@/lib/types'
import { CommunityTopnav } from './community-topnav'

/** A sala da oficina ao vivo usa o layout da aula (com a barra do topo, ao contrário da aula). */
function isLiveRoomPath(pathname: string): boolean {
  return pathname.startsWith('/oficinas/aulas/')
}

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
  // A aula e a sala ao vivo são componentes compartilhados com o Kids: mantêm a moldura de
  // sempre. As demais páginas desenham a própria faixa de ponta a ponta (direção de arte de
  // 18/10/2026) e cuidam da largura do conteúdo (`sz-page`).
  const framed = isLessonPath(pathname) || isLiveRoomPath(pathname)
  return (
    <div
      data-embedded={embedded ? 'true' : undefined}
      className={`sz-app flex flex-col bg-background ${embedded ? 'h-dvh overflow-hidden' : 'min-h-screen'}`}
    >
      {banner}
      {!embedded ? <CommunityTopnav user={user} /> : null}
      <main
        id="conteudo"
        className={
          embedded
            ? 'flex min-h-0 w-full flex-1 overflow-hidden'
            : framed
              ? 'mx-auto w-full max-w-6xl flex-1 px-4 py-8 md:px-6'
              : 'w-full flex-1'
        }
      >
        {children}
      </main>
    </div>
  )
}
