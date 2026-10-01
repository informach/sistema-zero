'use client'

import { type ReactNode, type RefObject, useLayoutEffect, useRef } from 'react'
import { cn } from '../lib/cn'
import { encaixeDoMundo } from '../lib/scene-encaixe'

/**
 * O CONSOLE: a experiência inteira numa peça só.
 *
 * ⭐⭐ Relato dela (18/09/2026), depois que as figuras passaram a ser as do Jogo 2D: *"a aparência
 * geral da experiência, e isso conta instrução do Zappy, cena e controles da cena, tem que parecer
 * que são uma única unidade e fazem parte de um jogo, para instigar a criança a realmente querer
 * fazer"*. Antes disto o bloco eram QUATRO retângulos em volta de um desenho de jogo — o cartão do
 * bloco, o balão do Zappy, a moldura da faixa e as caixas da bancada —, com raios que nem
 * conversavam (20 / 16 / 12).
 *
 * Hoje é um bloco só, nesta ordem, e é o que ela aprovou na maquete (a "Proposta B"):
 *
 *     ┌─ console ─────────────────────────────────┐
 *     │  [placa]   x 300   y 150        ●●○       │  ← o HUD, no molde do `drawScore` do jogo
 *     │ ┌──────────── o mundo ──────────────────┐ │
 *     │ └───────────────────────────────────────┘ │
 *     │  🐲 a fala do Zappy, perto da ação        │
 *     │ ╭─ prancha ────────────────────────────╮  │
 *     │ │ [gesto]  [medida]  [chave]           │  │
 *     │ ╰──────────────────────────────────────╯  │
 *     │  retorno e frase da situação              │
 *     └───────────────────────────────────────────┘
 *
 * ⚠️⚠️ **O MATERIAL continua sendo o do APLICATIVO.** Ela escolheu o meio-termo: a ARRUMAÇÃO é
 * nova, mas o cromo segue vestindo o tema do perfil (cartão, borda, cor de ação), e não o deck
 * escuro do jogo. Isso PRESERVA a regra "mundo é o jogo, cromo é o tema" — o que mudou foi só
 * onde cada peça mora. Quem veste o jogo é o que está DENTRO do palco, mais o HUD.
 *
 * ⚠️ Estes componentes são só MOLDURA: nenhuma regra de cena, nenhum estado. As classes moram em
 * `styles/scene.css` porque o app precisa poder vesti-las (a folha é importada por cada host).
 */

/** A moldura única. `destacado` é o anel do passo da demonstração, que antes ia na moldura antiga. */
export function SceneConsole({
  destacado,
  palpite,
  children,
}: {
  destacado?: boolean
  /** O momento antes de mexer: o console ganha o tom da cor de ação, como o cartão de hoje. */
  palpite?: boolean
  children: ReactNode
}) {
  return (
    <div
      className={cn(
        'sz-scene-console',
        palpite && 'sz-scene-console--palpite',
        destacado && 'ring-2 ring-primary ring-offset-4 ring-offset-card',
      )}
    >
      {children}
    </div>
  )
}

/**
 * A faixa da fala: o Zappy DENTRO do console, encostado no mundo.
 *
 * ⚠️⚠️ Numa faixa PRÓPRIA, e não por cima do cenário. Ela viu as duas na maquete e escolheu esta:
 * o balão sobre o mundo tapava a régua do topo e a marca do `0, 0` — justamente o que a cena do
 * endereço ensina. Pôr o balão sobre o desenho exigiria cada palco reservar essa faixa, nas 45.
 */
export function ConsoleFala({ children }: { children: ReactNode }) {
  return <div className="sz-scene-console-fala">{children}</div>
}

/**
 * O miolo do console: o que rola por cima do mundo (avisos) precisa deste `relative`.
 *
 * ⭐⭐ E é ele que ENCAIXA o palco pela altura no ampliado (01/10/2026): o mundo nunca rola por
 * dentro (regra dela: "a cena é o mais importante, tem que estar sempre visível; se for para ter
 * barra de rolagem, tem que ser no card inteiro"). A conta mora em `lib/scene-encaixe.ts`; aqui só
 * se mede e se escreve a largura na variável `--sz-scene-encaixe`, que o CSS da moldura lê.
 */
export function ConsoleMundo({ children }: { children: ReactNode }) {
  const mundo = useRef<HTMLDivElement>(null)
  useEncaixeDoMundo(mundo)
  return (
    <div ref={mundo} className="sz-scene-console-mundo">
      {children}
    </div>
  )
}

/**
 * Mede e escreve `--sz-scene-encaixe` no mundo enquanto o CSS disser que o encaixe vale
 * (`--sz-scene-encaixe-ativo: 1`, só no ampliado em duas colunas). Fora disso a variável sai e a
 * moldura volta à largura toda.
 *
 * ⚠️ Quem avisa que o encaixe vale é o CSS, não um estado do React: a mesma árvore serve o bloco em
 * linha e o ampliado (a cena não reinicia ao ampliar), e é a folha de estilo que sabe em que
 * janela as duas colunas existem.
 * ⚠️ Observa o mundo (muda ao ampliar e com a janela), o cartão em volta (é dele que se lê o quanto
 * já está rolando) e a RAIZ do palco (um aviso que entra, um rodapé que quebra linha); a raiz é
 * trocada pelo React (o retrato do palpite vira o palco), por isso o `MutationObserver` nos filhos.
 * ⚠️ Sem laço: a variável só é reescrita quando a largura muda mais de 1px, e `fixo` não depende da
 * largura (o que depende é proporcional e já está na conta), então a segunda medida bate com a
 * primeira.
 */
function useEncaixeDoMundo(ref: RefObject<HTMLDivElement | null>) {
  useLayoutEffect(() => {
    const mundo = ref.current
    if (!mundo || typeof ResizeObserver === 'undefined') return
    let ultima = Number.NaN
    const aplicar = () => {
      const ativo =
        getComputedStyle(mundo).getPropertyValue('--sz-scene-encaixe-ativo').trim() === '1'
      const largura = ativo ? encaixeDoMundo(mundo) : null
      if (largura === null) {
        if (!Number.isNaN(ultima)) {
          mundo.style.removeProperty('--sz-scene-encaixe')
          ultima = Number.NaN
        }
        return
      }
      if (Math.abs(largura - ultima) <= 1) return
      ultima = largura
      mundo.style.setProperty('--sz-scene-encaixe', `${Math.floor(largura)}px`)
    }
    const tamanhos = new ResizeObserver(() => aplicar())
    tamanhos.observe(mundo)
    if (mundo.parentElement) tamanhos.observe(mundo.parentElement)
    let raizObservada: Element | null = null
    const observarRaiz = () => {
      const raiz = mundo.firstElementChild
      if (raiz === raizObservada) return
      if (raizObservada) tamanhos.unobserve(raizObservada)
      raizObservada = raiz
      if (raiz) tamanhos.observe(raiz)
    }
    observarRaiz()
    const filhos = new MutationObserver(() => {
      observarRaiz()
      aplicar()
    })
    filhos.observe(mundo, { childList: true })
    aplicar()
    return () => {
      tamanhos.disconnect()
      filhos.disconnect()
      mundo.style.removeProperty('--sz-scene-encaixe')
    }
  }, [ref])
}

/** A prancha só existe quando a experiência já está aberta para interação. */
export function ConsolePrancha({ children }: { children: ReactNode }) {
  return <div className="sz-scene-prancha">{children}</div>
}

/** Duas regiões estáveis: empilhadas na aula, lado a lado ao ampliar em tela larga. */
export function ConsoleVisual({ children }: { children: ReactNode }) {
  return <div className="sz-scene-console-visual">{children}</div>
}

export function ConsoleActions({ children }: { children: ReactNode }) {
  return <div className="sz-scene-console-actions">{children}</div>
}
