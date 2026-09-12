'use client'

import type { CreativeToolId } from '@sistemazero/core/career'
import { ChevronDown } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { cn } from '@/lib/cn'
import type { GamificationMeView, SessionUserWithAvatar } from '@/lib/types'
import { useFocusMode } from './focus-mode'
import { KidsLogo } from './kids-logo'
import {
  isNavActive,
  NAV_ITEMS,
  type NavChild,
  type NavItem,
  navMatch,
  openGroupFor,
  visibleChildren,
} from './nav'
import { RecadosBell } from './recados-bell'
import { StreakWidget } from './streak-widget'
import { UserMenu } from './user-menu'

// A régua de "que item acende" mora no `nav.ts`, junto do mapa; fica exportada daqui
// também porque outras telas já a importavam deste arquivo.
export { isNavActive }

/** Medidas do modelo (1440px): item de 46px, canto de 12px, rótulo de 16px. */
const ITEM_BASE =
  'flex h-[2.875rem] shrink-0 items-center gap-3.5 rounded-[0.75rem] px-3.5 font-semibold text-base transition-colors'

function NavLink({ item, active }: { item: NavItem; active: boolean }) {
  const Icon = item.icon
  return (
    <Link
      href={item.href}
      prefetch={false}
      aria-current={active ? 'page' : undefined}
      className={cn(ITEM_BASE, active ? 'kids-marca' : 'hover:bg-(--menu-vidro) hover:text-white')}
    >
      <Icon
        className={cn('size-5 shrink-0', !active && 'text-(--menu-icone)')}
        strokeWidth={1.75}
        aria-hidden
      />
      {item.label}
    </Link>
  )
}

/**
 * Seção com destinos por dentro. O `<details>` é NATIVO (o mesmo padrão do "Minhas
 * ferramentas" do perfil): dá teclado e leitor de tela sem uma linha de JS. Aqui ele é
 * CONTROLADO, porque só um grupo fica aberto por vez e o aberto segue a página.
 *
 * ⚠️ O clique no nome ABRE em vez de navegar (decisão da dona): a página da seção é o
 * primeiro filho ("Meus trabalhos", "Nossa turma", "Meu perfil"). Foi o que devolveu o
 * atalho que as crianças perderam quando o menu virou cinco páginas-hub.
 */
export function NavGroup({
  item,
  filhos,
  pathname,
  aberto,
  onToggle,
}: {
  item: NavItem
  filhos: NavChild[]
  pathname: string
  aberto: boolean
  onToggle: (open: boolean) => void
}) {
  const Icon = item.icon
  const dentro = isNavActive(pathname, item.href, navMatch(item))
  return (
    <details
      open={aberto}
      // `onToggle` é o evento do PRÓPRIO elemento: sem ele o `open` controlado e o DOM
      // saem de sincronia no primeiro clique.
      // ⚠️⚠️ O navegador dispara `toggle` TAMBÉM quando quem mudou o atributo foi o React
      // (é o caso do grupo que FECHA quando outro abre). Sem descartar esse eco, abrir o
      // segundo grupo fazia o fechamento do primeiro voltar como "a criança fechou" e
      // zerava a escolha na mesma volta: o clique não abria nada.
      onToggle={(event) => {
        const open = (event.currentTarget as HTMLDetailsElement).open
        if (open !== aberto) onToggle(open)
      }}
      className="group shrink-0"
    >
      <summary
        className={cn(
          ITEM_BASE,
          'cursor-pointer list-none [&::-webkit-details-marker]:hidden',
          // A seção que contém a página atual fica marcada, mas SEM a pílula cheia: a
          // pílula é do filho ativo, e duas coisas acesas disputariam a atenção.
          dentro ? 'text-white' : 'hover:bg-(--menu-vidro) hover:text-white',
        )}
      >
        <Icon
          className={cn('size-5 shrink-0', !dentro && 'text-(--menu-icone)')}
          strokeWidth={1.75}
          aria-hidden
        />
        {item.label}
        <ChevronDown
          className="ml-auto size-4 shrink-0 text-(--menu-icone) transition-transform group-open:rotate-180"
          aria-hidden
        />
      </summary>
      <ul className="mt-1 flex flex-col gap-1 pl-3.5">
        {filhos.map((child) => {
          const ChildIcon = child.icon
          const active = isNavActive(pathname, child.href)
          return (
            <li key={child.href}>
              <Link
                href={child.href}
                prefetch={false}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex h-10 items-center gap-3 rounded-[0.75rem] px-3 font-semibold text-[0.9375rem] transition-colors',
                  active ? 'kids-marca' : 'hover:bg-(--menu-vidro) hover:text-white',
                )}
              >
                <ChildIcon
                  className={cn('size-4 shrink-0', !active && 'text-(--menu-icone)')}
                  strokeWidth={1.75}
                  aria-hidden
                />
                {child.label}
              </Link>
            </li>
          )
        })}
      </ul>
    </details>
  )
}

/**
 * Menu fixo do desktop, no desenho das telas-modelo (11/09/2026): 268px, o logo no topo,
 * cinco seções com ícone de TRAÇO e a atual numa pílula cheia na cor de ação. No rodapé, de
 * cima para baixo: o atalho dos Recados, os chips de sequência e XP, e o cartão do perfil,
 * que é o botão do menu da conta. `gamification` é best-effort (`null` esconde os chips).
 *
 * Desde 09/2026 as seções com destinos por dentro ABREM a lista em vez de navegar (ver
 * `NavGroup`); as demais seguem links simples.
 *
 * Desde a paleta do Pen (11/09/2026) o menu é a ÂNCORA ESCURA da página (`--menu`, com o
 * rótulo em `--menu-texto` e o ícone em `--menu-icone`), nos dois temas: navy no Padrão,
 * ameixa no Pink. O rodapé é branco a 8% (`--menu-vidro`), como no Pen.
 *
 * ⚠️ Os ladrilhos coloridos atrás dos ícones SAÍRAM de propósito (a imagem mostra o
 * traço puro). Eles eram uma decisão de 10/09/2026; a imagem-modelo manda.
 */
export function AppSidebar({
  user,
  gamification,
  avatarPhotoUrl = null,
  tools = null,
}: {
  user: SessionUserWithAvatar
  gamification: GamificationMeView | null
  /** Foto (snapshot) do avatar 3D do perfil ativo — `null` mostra a inicial. */
  avatarPhotoUrl?: string | null
  /** Ferramentas que a criança PODE abrir. `null` (dado indisponível) mostra todas. */
  tools?: CreativeToolId[] | null
}) {
  const pathname = usePathname()
  // Modo foco da aula: o aluno pode esconder o menu p/ ganhar área útil (só em
  // página de aula + desktop; ver focus-mode.tsx). Colapsa a barra no lugar.
  const { navCollapsed } = useFocusMode()
  // Qual grupo está aberto. `null` = segue a PÁGINA (decisão da dona): entrar no Estúdio
  // já deixa o Criar aberto, e o Pinta a um clique. Um clique em outro grupo o abre só
  // até a próxima navegação, quando o menu volta a refletir onde a criança está.
  const [aberto, setAberto] = useState<string | null>(null)
  // biome-ignore lint/correctness/useExhaustiveDependencies: só o pathname reseta a escolha
  useEffect(() => setAberto(null), [pathname])
  const abertoAgora = openGroupFor(pathname, aberto)

  return (
    <aside
      // Colapsada ela fica INERTE: `opacity-0 pointer-events-none` não tira os links do
      // tab order nem do leitor de tela — sem isto o Tab passeava por 9 itens invisíveis.
      inert={navCollapsed}
      aria-hidden={navCollapsed}
      className={cn(
        'sticky top-0 hidden h-screen min-h-0 shrink-0 flex-col border-(--menu-2) bg-(--menu) text-(--menu-texto) md:flex',
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
        <KidsLogo fundo="escuro" />
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
          const filhos = visibleChildren(item, tools)
          const active = isNavActive(pathname, item.href, navMatch(item))
          if (!filhos.length) return <NavLink key={item.href} item={item} active={active} />
          return (
            <NavGroup
              key={item.href}
              item={item}
              filhos={filhos}
              pathname={pathname}
              aberto={abertoAgora === item.href}
              onToggle={(open) => setAberto(open ? item.href : null)}
            />
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
