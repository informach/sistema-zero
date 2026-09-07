'use client'

import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'
import { isEmbeddedAppPath } from '@/lib/embedded-app-path'
import { isLessonPath } from '@/lib/lesson-path'
import { FocusModeToggle } from './focus-mode-toggle'

/**
 * Container do conteúdo da área do aluno. A maioria das páginas usa uma largura
 * confortável de leitura (`max-w-5xl` centralizado). Dois grupos ocupam TODA a
 * largura disponível depois da sidebar:
 *  - **Apps de criação** (`isEmbeddedAppPath`: Estúdio, Pensa, Pinta e Molda): largura E
 *    altura totais (`flex flex-col` para o editor preencher via `flex-1`), de BORDA A
 *    BORDA — o botão do menu e o selo da nuvem vivem na barra da ferramenta.
 *  - **Página de aula** (`/cursos/.../aulas/...`): o conteúdo (vídeo, livro 3D,
 *    imagens) dividia espaço com o card de aulas à direita e ficava apertado num
 *    `max-w-5xl` — aqui ganha a largura inteira, em fluxo vertical normal.
 */
export function MainContainer({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? ''
  // Pensa e Pinta seguem a régua do Estúdio: app embarcado quer largura E altura
  // totais (kanban/Modo Missão no Pensa; canvas + painéis de animação no Pinta).
  if (isEmbeddedAppPath(pathname)) {
    // App embarcado = altura TRAVADA na viewport (rolagem só nas áreas internas
    // do app, nunca na janela). No mobile NÃO há sidebar para "fixar" a altura e a
    // raiz do `(app)` é `min-h-screen` (cresce) → sem uma altura explícita o app
    // empurraria a página inteira. `100dvh - 3.5rem` desconta a top bar sticky
    // (h-14); o `pb-24` já reserva a tab bar (fixed).
    //
    // ⚠️ No DESKTOP a altura também é EXPLÍCITA (`md:h-dvh md:flex-none`, 26/08).
    // O `md:h-auto md:flex-1` antigo apostava que "a sidebar h-screen já trava a
    // linha" — MEDIDO FALSO quando o conteúdo DÁ altura (a galeria do Pinta com
    // muitos desenhos): o <main> crescia com o conteúdo (2204px medidos), a
    // JANELA rolava e o rolável interno do app nunca rolava — o sticky da barra
    // de seleção ficava preso no fim do conteúdo, fora da tela. Os editores
    // nunca expuseram isso porque só TOMAM altura (h-full). Com o banner de
    // impersonação a página rola a altura do banner — como no mobile, onde o
    // banner TAMPOUCO é descontado (a top bar, essa sim, é descontada no calc).
    //
    // ⚠️ O `md:min-h-[34rem]` casa com o piso `min-h-[34rem]` dos frames
    // (`embedded-app-loading.tsx`) + ZERO de padding (full review 26/08 pedia o
    // par; 07/09 o padding saiu): sem ele, uma janela desktop mais BAIXA que
    // ~544px (snap de meia tela, zoom 175-200%) fazia o piso do frame estourar
    // contra o `overflow-hidden` e o PÉ do app — a barra de seleção do Pinta —
    // ficava CLIPADO sem nenhum caminho de rolagem (medido: 2px visíveis a
    // 500px). Com o min-height, a página volta a rolar SÓ o necessário abaixo
    // desse limiar; acima dele, nada muda.
    //
    // ⭐ BORDA A BORDA (07/09/2026): sem padding lateral/superior nem a calha do
    // puxador. O botão de esconder o menu e o selo "Guardado na sua conta" moram
    // DENTRO da barra de cada ferramenta (contrato `hostChrome`, ver
    // `use-host-chrome.tsx`) — o app ganha 52px de largura e 32px de altura no
    // desktop. O `pb-24` do mobile fica: a tab bar é `fixed` por cima. Os fundos
    // do app e das ferramentas são os MESMOS primitivos, então não há emenda.
    //
    // ⚠️ INTERINO: o Molda ainda usa o puxador na calha + o selo acima (o pacote está
    // em obra em outra sessão); some no lote 6b, quando o `molda-client` ganhar o
    // `useHostChrome`.
    if (pathname.startsWith('/molda')) {
      return (
        <main
          id="main-content"
          tabIndex={-1}
          className="relative flex h-[calc(100dvh-3.5rem)] min-h-0 w-full flex-col overflow-hidden px-2 pt-4 pb-24 md:h-dvh md:min-h-[36rem] md:flex-none md:py-4 md:pr-4 md:pb-4 md:pl-9"
        >
          <FocusModeToggle target="nav" variant="edge" />
          {children}
        </main>
      )
    }
    return (
      <main
        id="main-content"
        tabIndex={-1}
        className="flex h-[calc(100dvh-3.5rem)] min-h-0 w-full flex-col overflow-hidden pb-24 md:h-dvh md:min-h-[34rem] md:flex-none md:pb-0"
      >
        {children}
      </main>
    )
  }
  return (
    <main
      id="main-content"
      tabIndex={-1}
      className={
        isLessonPath(pathname)
          ? 'w-full flex-1 px-4 py-6 pb-24 md:px-8 md:py-8 md:pb-8'
          : 'mx-auto w-full max-w-5xl flex-1 px-4 py-6 pb-24 md:px-8 md:py-8 md:pb-8'
      }
    >
      {children}
    </main>
  )
}
