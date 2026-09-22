'use client'

import {
  cenarioTemChao,
  type SceneCenarioId,
  type SceneFigure,
} from '@sistemazero/core/learning/scene'
import type { NomeDaFigura } from '@sistemazero/studio/arte'
import { ArteSvg } from './scene-arte'

/**
 * As FIGURAS do elenco e o FUNDO de cada mundo (Raio-X, lote 3, 16/09/2026).
 *
 * ⭐⭐ O elenco trocava só os nomes: a criança do Desafio lia "nave" e via um dinossauro azul na
 * grama, a de O Jogo do Meu Jeito lia "pedra" e "chama" sobre um Dino e três árvores. Hoje o palco
 * pergunta ao core o que desenhar para cada papel (`actorFigure`) e em que mundo (`sceneCenario`), e
 * desenha AQUI. Um palco que chama o Dino direto volta a mentir para uma turma de nave, e é por
 * isso que os três desenhos do Corre Dino deixaram de ser exportados: a única porta é
 * `ActorFigure`.
 *
 * O ENQUADRAMENTO de toda figura é o do Dino: `(x, y)` é o meio do chão sob ela, o corpo sobe
 * para o `y` negativo e cabe em ~60 × 60 unidades. Por isso uma figura entra no lugar de outra sem
 * o palco recalcular posição. A exceção é a floresta, que é uma ÁRVORE de 138 de altura (é
 * cenário, e é assim que o `layers` e o `world` sempre a desenharam).
 *
 * ⚠️⚠️ **O DESENHO deixou de morar aqui.** As figuras eram onze SVGs feitos à mão, com as cores
 * saindo de tokens (`scene-rock`, `scene-flame`…) e o corpo do Dino em `currentColor`. Hoje quem
 * desenha é a arte do Jogo 2D (`@sistemazero/studio/arte`, pelo `ArteSvg`), com as cores DELA — o
 * mundo é o jogo, e o cromo em volta é que veste o tema do app. Um token de figura que sobrou em
 * algum palco não pinta mais nada; quem quiser mudar uma cor mexe na arte, que é a mesma que o
 * jogo usa.
 */

/**
 * De que figura da ARTE DO JOGO cada papel do elenco é desenhado.
 *
 * ⭐⭐ Era aqui que moravam onze desenhos feitos à mão — o Dino como uma silhueta chapada de um
 * `<path>` só, o cacto como um contorno. A criança montava o jogo na aula e via, na cena seguinte,
 * algo que não se parecia com ele. Hoje o palco chama o MESMO código de desenho do runtime do
 * Jogo 2D, pelo `ArteSvg`, e o que sobra aqui é o de-para entre o vocabulário do elenco (que os
 * manifestos escrevem) e o do catálogo da arte.
 *
 * ⚠️ A `floresta` do elenco é a ÁRVORE do catálogo: no jogo, "floresta" é o FUNDO (os morros que
 * rolam), e o papel de cenário do Corre Dino sempre foi uma árvore.
 */
const FIGURA_DA_ARTE: Record<Exclude<SceneFigure, 'estrelas'>, NomeDaFigura> = {
  dino: 'dino',
  cacto: 'cacto',
  floresta: 'arvore',
  nave: 'nave',
  asteroide: 'asteroide',
  pedra: 'pedra',
  tiro: 'tiro',
  chama: 'chama',
  gorila: 'gorila',
  banana: 'banana',
  predio: 'predio',
}

/**
 * Um papel do elenco desenhado: a figura que o core escolheu, no lugar de `(x, y)`.
 *
 * ⚠️ `data-figure` é o contrato dos testes (`tests/scene-figures.test.tsx`): é por ele que a
 * varredura das 45 cenas confere que o palco desenhou a figura do papel, e não o Dino.
 */
export function ActorFigure({
  figure,
  x,
  y,
  ghost = false,
  escala = 1,
  escuro = false,
  cor,
  corSecundaria,
  variante,
  t,
}: {
  figure: SceneFigure
  x: number
  y: number
  /** O rastro de onde estava: a mesma figura, clarinha. */
  ghost?: boolean
  escala?: number
  escuro?: boolean
  /** Cor do corpo e das asas quando a cena ensina que uma cópia pode ser repintada. */
  cor?: string
  corSecundaria?: string
  /** Variação semântica que a própria arte conhece, como a nave `desligada`. */
  variante?: string
  /**
   * O relógio da cena, em milissegundos.
   *
   * ⚠️⚠️ AUSENTE por padrão, e isso é load-bearing: sem valor, o `ArteSvg` cai no contexto
   * `RelogioDaArte`, que é quem o player alimenta. Um default `= 0` aqui passaria zero para
   * SEMPRE e a animação nunca aconteceria — com tudo verde, porque nada mais reprova. Foi
   * exatamente o estado em que este código chegou ao full review.
   * ⚠️ Nunca de `Date.now()`: com o tempo parado o desenho é o mesmo quadro, e é isso que mantém
   * o `renderToStaticMarkup` das varreduras estável.
   */
  t?: number
}) {
  if (figure === 'estrelas')
    return (
      <g
        data-figure="estrelas"
        transform={`translate(${x} ${y})${escala === 1 ? '' : ` scale(${escala})`}`}
        opacity={ghost ? 0.3 : 1}
      >
        <rect x={-61} y={-150} width={122} height={152} rx={8} fill="#101d44" />
        <path
          d="M-38 -128v10m-5-5h10M20 -135v10m-5-5h10M-8 -108v8m-4-4h8M39 -94v10m-5-5h10M-42 -64v8m-4-4h8M6 -49v10m-5-5h10M44 -26v8m-4-4h8"
          stroke="#e3edff"
          strokeWidth={2}
          strokeLinecap="round"
        />
        <circle cx={-14} cy={-77} r={2} fill="#ffe596" />
        <circle cx={31} cy={-64} r={2} fill="#ffe596" />
        <circle cx={-31} cy={-23} r={2} fill="#ffe596" />
      </g>
    )
  return (
    <g
      data-figure={figure}
      transform={`translate(${x} ${y})${escala === 1 ? '' : ` scale(${escala})`}`}
      opacity={ghost ? 0.3 : 1}
    >
      <ArteSvg
        nome={FIGURA_DA_ARTE[figure]}
        t={t}
        cor={cor}
        corSecundaria={corSecundaria}
        variante={variante ?? (escuro ? 'escura' : undefined)}
      />
    </g>
  )
}

/**
 * Uma árvore da PAISAGEM do Corre Dino, que não é papel de ninguém (as árvores da tela do jogo na
 * cena `world`). Mesmo desenho da floresta, sem `data-figure`: a varredura das figuras confere
 * PAPÉIS, e uma árvore de fundo contada como "cenário do elenco" exigiria uma chama no lugar dela.
 */
export function ArvoreDoMundo({
  x,
  y,
  escuro = false,
}: {
  x: number
  y: number
  escuro?: boolean
}) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <ArteSvg nome="arvore" variante={escuro ? 'escura' : undefined} />
    </g>
  )
}

/**
 * O CENÁRIO do `layers` quando ele não é a floresta: UMA figura só, crescida e um pouco à direita
 * do personagem.
 *
 * ⚠️⚠️ Eram três cópias em fila, como as árvores (review do lote 3): com a chama do Meu Jeito isso
 * virava uma FOGUEIRA, e da pedra sobrava uma faixa marrom na base da chama do meio, que lia "a
 * lenha" e não "a pedra". A frase embaixo diz "só um pedacinho da pedra aparece", e a criança não
 * achava o pedacinho. Na aula a chama é o fogo DO asteroide, uma só. Deslocada, ela cobre mais da
 * metade da pedra e deixa à vista o lado esquerdo, com a cratera.
 * ⚠️ A floresta continua sendo as três árvores do Corre Dino, nos lugares de sempre.
 */
export const CENARIO_UNICO = { dx: 22, escala: 1.3 } as const

/**
 * Quanto as figuras SOBEM no espaço, onde não há chão para pisar (review do lote 3).
 *
 * ⚠️⚠️ A linha do chão só fica onde ela MEDE alguma coisa: hoje o laboratório (`gravity`, `impulse`,
 * `hitbox`, `experience-scene`) e a `jump-sound` (`scene-dino-stages`), os únicos que passam `chao` ao
 * `FundoDoCenario`. Nos outros palcos a nave, o asteroide
 * e a chama ficavam "estacionados" numa linha pontilhada, e na mesma aula a `world` já dizia "no
 * espaço não há chão". Sem a linha, elas flutuam um pouco acima de onde pisariam.
 * ⚠️ Na terra `pisoDoMundo` devolve o MESMO número: o Corre Dino não muda um pixel.
 */
export const FLUTUA_NO_ESPACO = 20
export const pisoDoMundo = (mundo: SceneCenarioId, chao: number) =>
  !cenarioTemChao(mundo) ? chao - FLUTUA_NO_ESPACO : chao
