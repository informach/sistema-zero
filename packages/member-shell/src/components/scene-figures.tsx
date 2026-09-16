'use client'

import type { SceneFigure, SceneWorldKind } from '@sistemazero/core/learning/scene'
import type { ReactNode } from 'react'

/**
 * As FIGURAS do elenco e o FUNDO de cada mundo (Raio-X, lote 3, 16/09/2026).
 *
 * ⭐⭐ O elenco trocava só os nomes: a criança do Desafio lia "nave" e via um dinossauro azul na
 * grama, a de O Jogo do Meu Jeito lia "pedra" e "chama" sobre um Dino e três árvores. Hoje o palco
 * pergunta ao core o que desenhar para cada papel (`actorFigure`) e em que mundo (`sceneWorld`), e
 * desenha AQUI. Um palco que chama o Dino direto volta a mentir para uma turma de nave, e é por
 * isso que os três desenhos do Corre Dino deixaram de ser exportados: a única porta é
 * `ActorFigure`.
 *
 * O ENQUADRAMENTO de toda figura é o do Dino: `(x, y)` é o meio do chão sob ela, o corpo sobe
 * para o `y` negativo e cabe em ~60 × 60 unidades. Por isso uma figura entra no lugar de outra sem
 * o palco recalcular posição. A exceção é a floresta, que é uma ÁRVORE de 138 de altura (é
 * cenário, e é assim que o `layers` e o `world` sempre a desenharam).
 *
 * ⚠️ As cores das figuras novas são tokens PRÓPRIOS (`scene-rock`, `scene-flame`…), nunca os do
 * papel ou da tinta: esses mudam no mundo espaço (ver `styles/scene.css`). O corpo da nave é
 * `currentColor`, como o Dino — quem escolhe a cor é o palco (`text-primary`, o fantasma em
 * `text-scene-ink-soft`, as duas pistas da `delta-time` em azul e âmbar).
 */

/** O desenho de uma figura na origem. `escuro` só muda a floresta (a árvore do meio do `layers`). */
const DESENHOS: Record<SceneFigure, (escuro: boolean) => ReactNode> = {
  // ⚠️⚠️ Os três do Corre Dino são os MESMOS traços de antes, e o traço fica direto dentro do grupo
  // da figura (é o `translate` desse grupo que os testes do palco leem para achar o Dino).
  dino: () => (
    <>
      <path
        d="M-22 -8V-33H-12V-51H20V-30H4V-20H18V-13H-1V0H-11V-9H-18V0H-27V-12L-39 -24V-36L-22 -22Z"
        fill="currentColor"
      />
      <rect x="9" y="-44" width="5" height="5" rx="1" fill="white" />
    </>
  ),
  cacto: () => (
    <>
      <path
        className="fill-scene-leaf"
        d="M-7 0V-20H-20V-40H-12V-29H-7V-54Q0 -64 7 -54V-36H14V-47H22V-27H7V0Z"
      />
      {/* A nervura do cacto: clara sobre o verde, senão some dentro do corpo. */}
      <path className="stroke-scene-grass" d="M0 -49V-8" strokeWidth="2" />
    </>
  ),
  floresta: (escuro) => (
    <>
      <path className="fill-scene-bark" d="M-6 -73H6V0H-6Z" />
      <path
        d="M-43 -28L-25 -61H-35L-16 -91H-25L0 -138L25 -91H16L35 -61H25L43 -28Z"
        className={escuro ? 'fill-scene-leaf-dark' : 'fill-scene-leaf-soft'}
      />
    </>
  ),
  /**
   * A nave de pé, com o bico para cima: é a nave do Desafio (54 por 62, que foge dos asteroides e
   * atira para cima). Casco, bico e asas vermelhas, janela e o fogo do motor embaixo — as quatro
   * coisas que uma criança desenha quando desenha "nave".
   */
  nave: () => (
    <>
      <path className="fill-scene-flame" d="M-7 -13C-7 -6 -3 -3 0 0C3 -3 7 -6 7 -13Z" />
      <path
        className="fill-scene-flame-core"
        d="M-3.5 -13C-3.5 -9 -1.5 -6.5 0 -4.5C1.5 -6.5 3.5 -9 3.5 -13Z"
      />
      <path className="fill-scene-fin" d="M-11 -32L-23 -19V-9L-11 -16Z" />
      <path className="fill-scene-fin" d="M11 -32L23 -19V-9L11 -16Z" />
      <path fill="currentColor" d="M0 -60C8 -54 12 -45 12 -36V-15H-12V-36C-12 -45 -8 -54 0 -60Z" />
      {/* O bico é o mesmo arco do casco cortado em t ≈ 0,585: sem isso sobrava uma franja. */}
      <path
        className="fill-scene-fin"
        d="M0 -60C4.7 -56.5 8 -52 9.9 -47H-9.9C-8 -52 -4.7 -56.5 0 -60Z"
      />
      <path className="fill-scene-fin" d="M-7 -15H7L5 -12H-5Z" />
      <circle
        className="fill-scene-window stroke-scene-fin"
        cx="0"
        cy="-34"
        r="5.5"
        strokeWidth="2.5"
      />
    </>
  ),
  /**
   * O tiro: uma BOLINHA de luz, sem direção. É o que a criança monta no Dia 2 ("Criar tiro… Raio
   * 5") e o mesmo tiro redondo da `cooldown`.
   *
   * ⚠️⚠️ Era uma bala com bico e rastro apontando para CIMA (review do lote 3): na `velocity` do
   * Dia 2 metade da atividade é o tiro DESCENDO, e o desenho dizia "subindo" enquanto o número
   * dizia "desceu". Uma bolinha não mente em sentido nenhum. Ela também tinha 57 de altura, na
   * régua em que a nave tem os 62 do jogo: saía cinco vezes maior que o tiro de verdade.
   * ⚠️ Raio 9 e não 5: no celular o palco encolhe a ~60%, e a bolinha do jogo viraria um ponto.
   * ⚠️ Centrada no MEIO da caixa do personagem (y −26), e não no chão: é o ponto que a `velocity`
   * liga à linha do passo (o meio do Dino), e um tiro voando não pisa em nada.
   */
  tiro: () => (
    <>
      <circle
        className="fill-scene-flame stroke-scene-flame-deep"
        cx="0"
        cy="-26"
        r="8"
        strokeWidth="2"
      />
      <circle className="fill-scene-flame-core" cx="0" cy="-26" r="4" />
    </>
  ),
  /** O asteroide: pedra de pontas, cinza-lilás, cheia de crateras. */
  asteroide: () => (
    <>
      <path
        className="fill-scene-rock stroke-scene-rock-dark"
        d="M-19 -6L-25 -21L-19 -38L-4 -47L13 -44L24 -32L25 -15L15 -3L-2 0Z"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      <circle className="fill-scene-rock-dark" cx="-8" cy="-28" r="6" />
      <path
        className="stroke-scene-rock-light"
        d="M-12.6 -23.4A6.5 6.5 0 0 0 -3.4 -23.4"
        strokeWidth="2"
        fill="none"
      />
      <circle className="fill-scene-rock-dark" cx="11" cy="-18" r="4" />
      <circle className="fill-scene-rock-dark" cx="8" cy="-36" r="2.5" />
      <circle className="fill-scene-rock-dark" cx="-11" cy="-11" r="2.5" />
    </>
  ),
  /**
   * A pedra: marrom, de quinas, com crateras e o brilho em cima.
   *
   * ⚠️ Contorno FECHADO de oito quinas, sem base reta (review do lote 3): a cúpula de base chata de
   * antes lia "biscoito", e nos dois cursos a pedra É o asteroide, que cai no espaço, onde base reta
   * não faz sentido. Ela encosta em `y = 0` por uma quina só. O marrom continua: é o que a separa do
   * asteroide cinza.
   * ⚠️ A cratera maior fica à ESQUERDA de propósito: na `layers` a chama cobre o lado direito, e é
   * essa cratera que faz o pedacinho que sobra se reconhecer como pedra.
   */
  pedra: () => (
    <>
      <path
        className="fill-scene-stone stroke-scene-stone-dark"
        d="M-4 0L-21 -7L-26 -22L-14 -36L6 -40L21 -32L27 -16L17 -3Z"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      <ellipse className="fill-scene-stone-dark" cx="-13" cy="-18" rx="5.5" ry="4.5" />
      <ellipse className="fill-scene-stone-dark" cx="11" cy="-13" rx="4" ry="3.2" />
      <circle className="fill-scene-stone-dark" cx="5" cy="-27" r="2.2" />
      <path
        className="stroke-scene-stone-light"
        d="M-15 -30C-11 -35 -5 -37 1 -37.5"
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
      />
    </>
  ),
  /** A chama: três línguas, vermelha por fora e clara no miolo (é a chama do Pinta da Aula 5). */
  chama: () => (
    <>
      <path
        className="fill-scene-flame-deep"
        d="M0 0C-17 0 -21 -14 -17 -26C-14 -34 -8 -38 -9 -50C-2 -44 2 -40 3 -34C6 -44 10 -52 8 -62C18 -52 22 -38 20 -24C19 -10 14 0 0 0Z"
      />
      <path
        className="fill-scene-flame"
        d="M0 0C-11 0 -14 -9 -12 -17C-10 -23 -5 -26 -5 -33C0 -29 2 -26 3 -22C5 -28 7 -33 6 -40C12 -33 14 -24 13 -16C12 -7 9 0 0 0Z"
      />
      <path
        className="fill-scene-flame-core"
        d="M0 0C-6 0 -7.5 -6 -6 -11C-4.5 -15 -2 -17 -1.5 -22C3 -18 6 -12 6 -7C6 -3 4 0 0 0Z"
      />
    </>
  ),
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
}: {
  figure: SceneFigure
  x: number
  y: number
  /** O rastro de onde estava: a mesma figura, clarinha. */
  ghost?: boolean
  escala?: number
  escuro?: boolean
}) {
  return (
    <g
      data-figure={figure}
      transform={`translate(${x} ${y})${escala === 1 ? '' : ` scale(${escala})`}`}
      opacity={ghost ? 0.3 : 1}
    >
      {DESENHOS[figure](escuro)}
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
  return <g transform={`translate(${x} ${y})`}>{DESENHOS.floresta(escuro)}</g>
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
 * ⚠️⚠️ A linha do chão só fica onde ela MEDE alguma coisa (a régua da `velocity`, a altura da
 * `gravity`/`impulse`, a batida da `hitbox` e da `restart`). Nos outros palcos a nave, o asteroide
 * e a chama ficavam "estacionados" numa linha pontilhada, e na mesma aula a `world` já dizia "no
 * espaço não há chão". Sem a linha, elas flutuam um pouco acima de onde pisariam.
 * ⚠️ Na terra `pisoDoMundo` devolve o MESMO número: o Corre Dino não muda um pixel.
 */
export const FLUTUA_NO_ESPACO = 20
export const pisoDoMundo = (mundo: SceneWorldKind, chao: number) =>
  mundo === 'espaco' ? chao - FLUTUA_NO_ESPACO : chao

/**
 * As estrelas de um retângulo, sempre as MESMAS para o mesmo tamanho.
 *
 * ⚠️ Sorteio com semente fixa, e não `Math.random`: o palco renderiza a cada gesto, e estrelas
 * novas a cada toque piscariam a tela inteira — o contrário do "fundo" que elas são.
 */
function estrelas(w: number, h: number) {
  let semente = 9173 + Math.round(w) * 31 + Math.round(h)
  const sorteio = () => {
    semente = (semente * 16807) % 2147483647
    return semente / 2147483647
  }
  const quantas = Math.round((w * h) / 2400)
  return Array.from({ length: quantas }, (_, i) => ({
    i,
    x: sorteio() * w,
    y: sorteio() * h,
    r: 0.7 + sorteio() * 1.1,
    brilho: 0.45 + sorteio() * 0.55,
  }))
}

/**
 * O FUNDO do mundo espaço: o céu escuro com estrelas e, quando a cena precisa, a linha que era o
 * chão (`chao`), discreta.
 *
 * ⚠️ `chao` só onde a linha MEDE (ver `FLUTUA_NO_ESPACO`). ⚠️ `data-fundo` é o contrato da
 * varredura (`tests/scene-figures.test.tsx`): é por ele que ela sabe que o palco pintou o céu, e
 * não só pôs a moldura no espaço (esquecer o fundo deixava a grama da terra dentro dela).
 *
 * ⚠️⚠️ Só o espaço mora aqui. A TERRA continua desenhada por cada palco do jeito de sempre (o
 * degradê do laboratório, os pontinhos da pista, a grama da velocidade): unificar o fundo do
 * Corre Dino mudaria o desenho de todas as aulas dele, e o pedido é que ele continue igual.
 * ⚠️ As cores vêm do bloco `.sz-scene-espaco`, que o `SceneCanvas` põe na moldura quando recebe
 * `mundo="espaco"`: fora dele, este fundo sairia da cor do céu da terra.
 */
export function FundoEspaco({
  w,
  h,
  x = 0,
  y = 0,
  chao,
  semEstrelas = [],
}: {
  w: number
  h: number
  x?: number
  y?: number
  chao?: number
  /**
   * Onde o palco escreve um PLACAR por cima do céu: ali as estrelinhas não são desenhadas.
   *
   * ⚠️ Review do lote 3: uma estrelinha colada no "restam" das vidas virava ponto final, e outra
   * no "15" da `variable` virava parte do número. O halo do texto (`scene.css`) só apaga a estrela
   * que ENCOSTA na letra; estas duas ficavam a dois ou três pixels e continuavam lá. Tirar as
   * estrelas da zona não mexe no sorteio: as outras ficam onde estavam, sem piscar.
   */
  semEstrelas?: readonly { x: number; y: number; w: number; h: number }[]
}) {
  const livre = (cx: number, cy: number) =>
    !semEstrelas.some((z) => cx >= z.x && cx <= z.x + z.w && cy >= z.y && cy <= z.y + z.h)
  // ⚠️ No alto do meio e na beirada direita: é onde os palcos menos escrevem (o placar das vidas,
  // a régua da tela e o número da caixa moram nos cantos da esquerda e no alto da direita).
  const brilhantes = [
    [0.62, 0.08],
    [0.9, 0.55],
  ] as const
  return (
    <g data-fundo="espaco">
      <rect className="fill-scene-sky" x={x} y={y} width={w} height={h} />
      {estrelas(w, h)
        .filter((e) => livre(x + e.x, y + e.y))
        .map((e) => (
          <circle
            key={e.i}
            className="fill-scene-star"
            cx={x + e.x}
            cy={y + e.y}
            r={e.r}
            opacity={e.brilho}
          />
        ))}
      {/* Estrelas de quatro pontas: com elas o fundo se lê "espaço" até num palco pequeno. */}
      {brilhantes.map(([fx, fy]) => (
        <path
          key={`${fx}-${fy}`}
          className="fill-scene-star"
          transform={`translate(${x + fx * w} ${y + fy * h})`}
          d="M0 -6Q1 -1 6 0Q1 1 0 6Q-1 1 -6 0Q-1 -1 0 -6Z"
        />
      ))}
      {chao !== undefined && (
        <path
          className="stroke-scene-line"
          d={`M${x} ${chao}h${w}`}
          strokeWidth="2"
          strokeDasharray="2 7"
          strokeLinecap="round"
        />
      )}
    </g>
  )
}
