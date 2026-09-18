'use client'

import type { ReactNode } from 'react'
import { cn } from '../lib/cn'

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
 *     │  🐲 a fala do Zappy, largura cheia        │
 *     │ ┌──────────── o mundo ──────────────────┐ │
 *     │ └───────────────────────────────────────┘ │
 *     │  a frase da situação                      │
 *     │ ╭─ prancha ────────────────────────────╮  │
 *     │ │ [gesto]  [medida]  [chave]           │  │
 *     │ ╰──────────────────────────────────────╯  │
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

/** O miolo do console: o que rola por cima do mundo (avisos) precisa deste `relative`. */
export function ConsoleMundo({ children }: { children: ReactNode }) {
  return <div className="sz-scene-console-mundo">{children}</div>
}

/**
 * A prancha: a bandeja que segura o gesto e a bancada.
 *
 * ⭐ Ela fica À VISTA mesmo no PALPITE, em vez de sumir: a criança vê o que vai poder mexer, e o
 * bloco não muda de altura quando ela responde. Foi o que ela pediu na maquete — *"o palpite também
 * tem ali o balão de fala do Zappy, a cena do jogo e alguns controles desativados"*.
 *
 * ⚠️⚠️ `fechada` é a CORTINA do palpite, e por isso é `inert` + desfoque — não o `fechado` de um
 * controle solto (aquele continua no Tab e continua dizendo por que não responde). Os dois motivos
 * são antigos e continuam valendo: o gesto não pode chegar ao motor antes do palpite, e **os
 * motivos dos controles fechados SOPRAM a resposta** (a nota de uma chave que diz "abre depois que
 * 3 cactos passarem" é a previsão inteira). O `inert` tira a prancha do Tab e do leitor de tela; o
 * desfoque tira a leitura do texto miúdo e deixa as FORMAS à vista, que é o que a promessa acima
 * precisa. A trava do MOTOR não depende de nenhum dos dois: `dispatch` e `action.current` recusam
 * enquanto o palpite está pendente (`scene-activity.tsx`).
 */
export function ConsolePrancha({ fechada, children }: { fechada?: boolean; children: ReactNode }) {
  return (
    <div className={cn('sz-scene-prancha', fechada && 'sz-scene-prancha--fechada')} inert={fechada}>
      {children}
    </div>
  )
}
