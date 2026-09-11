'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/cn'
import type { GamificationMeView, SessionUserWithAvatar } from '@/lib/types'
import { useFocusMode } from './focus-mode'
import { KidsLogo } from './kids-logo'
import { isNavActive, NAV_ITEMS } from './nav'
import { RecadosBell } from './recados-bell'
import { StreakWidget } from './streak-widget'
import { UserMenu } from './user-menu'

// A régua de "que item acende" mora no `nav.ts`, junto do mapa; fica exportada daqui
// também porque outras telas já a importavam deste arquivo.
export { isNavActive }

/**
 * Menu fixo do desktop, no desenho das telas-modelo (11/09/2026): branco, 268px, o logo
 * no topo, cinco itens com ícone de TRAÇO e o ativo numa pílula azul cheia. No rodapé,
 * de cima para baixo: o atalho dos Recados, os chips de sequência e XP, e o cartão do
 * perfil, que é o botão do menu da conta. `gamification` é best-effort (`null`
 * esconde os chips).
 *
 * ⚠️ Os ladrilhos coloridos atrás dos ícones SAÍRAM de propósito (a imagem mostra o
 * traço puro). Eles eram uma decisão de 10/09/2026; a imagem-modelo manda.
 */
export function AppSidebar({
  user,
  gamification,
  avatarPhotoUrl = null,
}: {
  user: SessionUserWithAvatar
  gamification: GamificationMeView | null
  /** Foto (snapshot) do avatar 3D do perfil ativo — `null` mostra a inicial. */
  avatarPhotoUrl?: string | null
}) {
  const pathname = usePathname()
  // Modo foco da aula: o aluno pode esconder o menu p/ ganhar área útil (só em
  // página de aula + desktop; ver focus-mode.tsx). Colapsa a barra no lugar.
  const { navCollapsed } = useFocusMode()

  return (
    <aside
      // Colapsada ela fica INERTE: `opacity-0 pointer-events-none` não tira os links do
      // tab order nem do leitor de tela — sem isto o Tab passeava por 9 itens invisíveis.
      inert={navCollapsed}
      aria-hidden={navCollapsed}
      className={cn(
        'sticky top-0 hidden h-screen min-h-0 shrink-0 flex-col border-border/70 bg-card md:flex',
        'overflow-hidden transition-[width,padding,border,opacity] duration-300 ease-in-out motion-reduce:transition-none',
        navCollapsed
          ? 'w-0 border-r-0 px-0 opacity-0 pointer-events-none'
          : 'w-[16.75rem] border-r px-5 opacity-100',
      )}
    >
      <Link
        href="/"
        aria-label="Início"
        className="mt-6 flex h-10 shrink-0 items-center px-2"
        prefetch={false}
      >
        <KidsLogo priority />
      </Link>

      {/* ⚠️ `prefetch={false}` é PROPOSITAL: todos os itens da sidebar ficam SEMPRE na viewport e
          TODA rota é `force-dynamic` + faz ida ao gateway (members/hub). O prefetch automático do
          Next disparava ~7 requisições RSC pesadas (incl. /estudio e /quarto) a CADA página numa
          réplica ÚNICA → tempestade de 502/ERR_HTTP2 e navegação lenta. Navegar passa a buscar sob
          demanda; o `loading.tsx` do grupo dá o esqueleto instantâneo no clique. */}
      <nav
        aria-label="Navegação principal"
        className="mt-6 flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto overscroll-contain"
      >
        {NAV_ITEMS.map((item) => {
          const active = isNavActive(pathname, item.href, item.match)
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              prefetch={false}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'flex h-[2.875rem] shrink-0 items-center gap-3 rounded-xl px-3.5 font-semibold text-[0.9375rem] transition-colors',
                active ? 'kids-marca' : 'text-foreground hover:bg-muted',
              )}
            >
              <Icon className="size-5 shrink-0" aria-hidden />
              {item.label}
            </Link>
          )
        })}
      </nav>

      <div className={cn('flex flex-col gap-3.5 pt-4 pb-7', 'shrink-0')}>
        <RecadosBell variant="pill" />
        {gamification ? <StreakWidget gamification={gamification} /> : null}
        <UserMenu
          user={user}
          gamification={gamification}
          avatarPhotoUrl={avatarPhotoUrl}
          direction="up"
          variant="card"
        />
      </div>
    </aside>
  )
}
