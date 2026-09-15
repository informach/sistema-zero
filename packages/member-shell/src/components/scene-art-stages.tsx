'use client'

import type { SceneCast, SceneState } from '@sistemazero/core/learning/scene'
import { useId } from 'react'
import { CactusFigure, DinoFigure } from './exploration-stage'
import { SceneCanvas } from './scene-canvas'

/**
 * Os palcos das cinco cenas de DESENHO e da cena das vidas (lote 4 da proposta).
 *
 * Nenhuma delas é sobre o mundo do jogo, então nenhuma cabe no palco compartilhado: quatro são
 * sobre o ATELIÊ (a faixa de quadros, o fantasma, o espelho, a folha de sprites) e a quinta é
 * sobre a LUPA. A das vidas é de jogo, mas precisa do placar e dos corações à vista o tempo
 * todo, que o palco compartilhado não tem.
 *
 * ⚠️ O que cada uma desenha é a resposta à pergunta da cena, e não decoração: a faixa de
 * quadros existe para a criança ver que são dois desenhos inteiros; o fantasma, para ela
 * comparar sem decorar; a folha, para ela ver que o recorte não muda quando o tamanho no jogo
 * muda. Mexer no desenho sem olhar a meta da cena é como mexer no enunciado.
 */

/**
 * ⚠️⚠️ Estes cinco palcos são mais BAIXOS que o enquadramento comum (`SCENE_VIEW`, 560 × 300):
 * o papel do espelho, a faixa de quadros e a folha de sprites não têm chão nem céu. Por isso
 * cada `SceneCanvas` daqui passa o `view` — sem ele o desenho seria emoldurado numa caixa 40
 * unidades mais alta e tudo sairia deslocado para cima.
 */
const VIEW = { w: 560, h: 260 } as const
/** Quanto vale UM quadradinho da pedra (a grade é 16 x 16) com a lupa em 1. */
const UNIDADE = 1.8
/** As doze colunas do papel do espelho, como VALORES: a posição de cada uma é a identidade
 *  dela, e o papel não reordena nada. */
const COLUNAS = Array.from({ length: 12 }, (_, i) => i)
/** O chão dos dois palcos de animação, para o passo ser medido na horizontal. */
const CHAO = VIEW.h - 40
// ⚠️ O desenho fica no MEIO do palco, e não à esquerda: com o quadro 2 deslocado pelo passo, os
// dois lugares precisam caber na parte que a criança olha. Medido no ensaio: em 150 sobrava meio
// palco vazio à direita e a comparação ficava num canto.
const BASE_X = 210

/** A faixa de quadros do Pinta: dois quadradinhos, e cada um guarda um desenho inteiro. */
function FaixaDeQuadros({ frame }: { frame: number }) {
  return (
    <g>
      {[1, 2].map((n) => (
        <g key={n}>
          <rect
            className={
              n === frame
                ? 'fill-scene-card stroke-scene-a'
                : 'fill-scene-card stroke-scene-card-line'
            }
            x={16 + (n - 1) * 62}
            y={16}
            width={56}
            height={44}
            rx={8}
            strokeWidth={n === frame ? 3 : 1.5}
          />
          <text
            className="fill-scene-ink-soft"
            x={44 + (n - 1) * 62}
            y={44}
            textAnchor="middle"
            fontSize="16"
            fontWeight="700"
          >
            {n}
          </text>
        </g>
      ))}
      <text className="fill-scene-ink-soft" x={16} y={76} fontSize="11" letterSpacing="0.6">
        faixa de quadros
      </text>
    </g>
  )
}

/**
 * Os dois quadros, com ou sem o fantasma.
 *
 * ⚠️ O desenho do quadro 2 fica DESLOCADO do quadro 1 pelo `passo`: é esse deslocamento que a
 * troca rápida transforma em movimento, e é ele que o fantasma deixa medir. Um palco em que os
 * dois quadros ficassem no mesmo lugar mostraria a troca e esconderia a animação.
 */
function AnimationStage({
  state,
  ghost,
  cast,
}: {
  state: SceneState
  ghost: boolean
  cast?: SceneCast
}) {
  const { frame, shift, onion, playing, rate, swaps } = state.animation
  const x = frame === 2 ? BASE_X + shift : BASE_X
  const mostrarFantasma = ghost && onion && frame === 2
  const descricao =
    frame === 2
      ? `Quadro 2: o desenho está ${shift} adiante do lugar do quadro 1.${
          mostrarFantasma ? ' O fantasma do quadro 1 aparece por baixo.' : ''
        }`
      : 'Quadro 1: o desenho está no lugar de partida.'
  const legenda = ghost
    ? mostrarFantasma
      ? 'A imagem fraquinha é o quadro 1. Ela é guia: não entra na animação.'
      : frame === 1
        ? 'No quadro 1 não há quadro anterior para mostrar.'
        : 'Sem o fantasma, o lugar do quadro 1 fica na memória.'
    : playing
      ? `Trocando ${rate} por segundo. Trocas até agora: ${swaps}.`
      : 'A troca está parada: dá para olhar um quadro de cada vez.'
  return (
    <SceneCanvas
      view={VIEW}
      cast={cast}
      titulo="A tela do desenho, com a faixa de quadros"
      descricao={descricao}
      rodape={legenda}
    >
      <rect className="fill-scene-sky" width={VIEW.w} height={VIEW.h} />
      <rect className="fill-scene-ground" y={CHAO} width={VIEW.w} height={VIEW.h - CHAO} />
      <path className="stroke-scene-line" d={`M0 ${CHAO}h${VIEW.w}`} strokeWidth="2" />
      <FaixaDeQuadros frame={frame} />
      {/* A régua do passo: ela é o que transforma "mexi um pouco" num número comparável. */}
      {ghost && frame === 2 && (
        <g>
          <path
            className="stroke-scene-b"
            d={`M${BASE_X} ${CHAO + 14}H${BASE_X + shift}`}
            strokeWidth="2"
            strokeDasharray="4 3"
          />
          <text
            className="fill-scene-b-ink"
            x={BASE_X + shift / 2}
            y={CHAO + 30}
            textAnchor="middle"
            fontSize="12"
            fontWeight="700"
          >
            {`passo ${shift}`}
          </text>
        </g>
      )}
      {mostrarFantasma && (
        <g className="text-primary">
          <DinoFigure x={BASE_X} y={CHAO} ghost />
        </g>
      )}
      <g className="text-primary">
        <DinoFigure x={x} y={CHAO} />
      </g>
    </SceneCanvas>
  )
}

export function FramesStage({ state, cast }: { state: SceneState; cast?: SceneCast }) {
  return <AnimationStage state={state} ghost={false} cast={cast} />
}
export function OnionSkinStage({ state, cast }: { state: SceneState; cast?: SceneCast }) {
  return <AnimationStage state={state} ghost cast={cast} />
}

/**
 * O espelho.
 *
 * ⚠️ O papel tem COLUNAS numeradas e o eixo fica ENTRE duas delas: sem os números, "mudei o
 * eixo e o reflexo foi junto" vira uma impressão, e a criança não tem como prever para onde o
 * próximo traço vai. O reflexo que cai fora do papel também precisa ser visível como falta.
 */
export function SymmetryStage({ state, cast }: { state: SceneState; cast?: SceneCast }) {
  const { on, line, painted } = state.mirror
  const larguraCol = (VIEW.w - 80) / COLUNAS.length
  const topo = 46
  const altura = VIEW.h - topo - 42
  const eixoX = 40 + line * larguraCol
  return (
    <SceneCanvas
      view={VIEW}
      cast={cast}
      titulo="O papel de doze colunas, com o espelho"
      descricao={`${painted.length} ${painted.length === 1 ? 'traço pintado' : 'traços pintados'}. O espelho está ${
        on ? `ligado na linha ${line}` : 'desligado'
      }.`}
      rodape={
        on
          ? `Cada traço aparece dos dois lados da linha ${line}.`
          : 'Com o espelho desligado, o traço fica só onde você pintar.'
      }
    >
      <rect className="fill-scene-sky" width={VIEW.w} height={VIEW.h} />
      <rect
        className="fill-scene-card stroke-scene-card-line"
        x={40}
        y={topo}
        width={larguraCol * COLUNAS.length}
        height={altura}
        strokeWidth="2"
        rx="6"
      />
      {COLUNAS.map((c) => (
        <g key={c}>
          {painted.includes(c) && (
            <rect
              className="fill-scene-a"
              x={40 + c * larguraCol + 3}
              y={topo + 10}
              width={larguraCol - 6}
              height={altura - 20}
              rx="4"
            />
          )}
          <text
            className="fill-scene-ink-soft"
            x={40 + c * larguraCol + larguraCol / 2}
            y={VIEW.h - 20}
            textAnchor="middle"
            fontSize="11"
          >
            {c}
          </text>
        </g>
      ))}
      {on && (
        <g>
          <path
            className="stroke-scene-alert"
            d={`M${eixoX} ${topo - 12}V${topo + altura + 8}`}
            strokeWidth="3"
            strokeDasharray="7 5"
          />
          <text
            className="fill-scene-alert"
            x={eixoX}
            y={topo - 18}
            textAnchor="middle"
            fontSize="12"
            fontWeight="700"
          >
            {`eixo ${line}`}
          </text>
        </g>
      )}
    </SceneCanvas>
  )
}

/**
 * A mesma silhueta, feita de quadradinhos: cada linha é `[linha, coluna inicial, largura]` numa
 * grade de 16 por 16. É o que faz a borda virar escadinha quando a lupa chega perto.
 */
const PEDRA_PIXEL: readonly (readonly [number, number, number])[] = [
  [3, 4, 7],
  [4, 2, 10],
  [5, 1, 12],
  [6, 1, 13],
  [7, 2, 12],
  [8, 3, 10],
  [9, 5, 6],
]
/** A mesma pedra descrita por curvas, do protótipo `interacoes/pixel-vetor.html`. */
const PEDRA_VETOR = 'M2 7Q3 1 9 2Q16 3 14 10Q11 16 5 13Q1 12 2 7'

/**
 * As duas pedras, lado a lado, com a lupa.
 *
 * ⚠️ As DUAS ficam sempre na tela: a cena é uma comparação, e esconder uma delas transformaria
 * a descoberta em memória. A lupa marca qual está sendo olhada, e só ela é ampliada.
 */
export function PixelVectorStage({ state, cast }: { state: SceneState; cast?: SceneCast }) {
  const id = useId()
  const { kind, zoom } = state.pixels
  const painel = { w: 220, h: 170 }
  const topo = 50
  const lados = [
    { chave: 'pixel' as const, rotulo: 'pedra de pixel', x: 40 },
    { chave: 'vector' as const, rotulo: 'pedra de vetor', x: VIEW.w - 40 - painel.w },
  ]
  return (
    <SceneCanvas
      view={VIEW}
      cast={cast}
      titulo="As duas pedras, com a lupa numa delas"
      descricao={`A lupa está em ${zoom} vezes, sobre a pedra de ${
        kind === 'pixel' ? 'pixel' : 'vetor'
      }. A borda dela ${zoom < 5 ? 'ainda parece igual à outra' : kind === 'pixel' ? 'virou escadinha' : 'continua lisa'}.`}
      rodape={
        zoom < 5
          ? 'De longe, as duas parecem a mesma pedra.'
          : 'De perto, a borda conta como cada uma foi feita.'
      }
    >
      <rect className="fill-scene-sky" width={VIEW.w} height={VIEW.h} />
      {lados.map((lado) => {
        const olhando = lado.chave === kind
        // ⚠️ A pedra que NÃO está sob a lupa fica "de longe" (teto de 2), e não em 1: ao lado de
        // uma ampliada em 6 ela virava um pontinho, e a cena parecia quebrada em vez de comparar.
        const escala = olhando ? zoom : Math.min(zoom, 2)
        // ⚠️⚠️ A unidade é calculada para a pedra INTEIRA caber no painel na lupa MÁXIMA. A
        // primeira versão usava um fator fixo (6) e no meio da faixa a pedra já era três vezes o
        // painel: sobrava só o miolo CHEIO, sem borda nenhuma — justamente o que a cena existe
        // para mostrar. Medido no ensaio, com a lupa em 6.
        // ⚠️ `clipPath` por painel: ampliar sem recorte faria a pedra invadir a vizinha, e a
        // comparação viraria uma bagunça em vez de duas bordas lado a lado.
        const corte = `${id}-${lado.chave}`
        return (
          <g key={lado.chave}>
            <clipPath id={corte}>
              <rect x={lado.x} y={topo} width={painel.w} height={painel.h} rx="10" />
            </clipPath>
            <rect
              className={
                olhando
                  ? 'fill-scene-card stroke-scene-a'
                  : 'fill-scene-card stroke-scene-card-line'
              }
              x={lado.x}
              y={topo}
              width={painel.w}
              height={painel.h}
              rx="10"
              strokeWidth={olhando ? 3 : 1.5}
            />
            <g clipPath={`url(#${corte})`}>
              <g
                transform={`translate(${lado.x + painel.w / 2} ${topo + painel.h / 2}) scale(${escala * UNIDADE}) translate(-8 -8)`}
              >
                {lado.chave === 'pixel' ? (
                  <g className="fill-scene-a">
                    {PEDRA_PIXEL.map(([linha, inicio, largura]) => (
                      <rect key={linha} x={inicio} y={linha} width={largura} height={1} />
                    ))}
                  </g>
                ) : (
                  <path className="fill-scene-a" d={PEDRA_VETOR} />
                )}
              </g>
            </g>
            <text
              className="fill-scene-ink-soft"
              x={lado.x + painel.w / 2}
              y={topo - 12}
              textAnchor="middle"
              fontSize="12"
              fontWeight={olhando ? 700 : 400}
            >
              {olhando ? `${lado.rotulo} (lupa de ${zoom})` : lado.rotulo}
            </text>
          </g>
        )
      })}
    </SceneCanvas>
  )
}

/**
 * A folha e o jogo.
 *
 * ⚠️ Os dois ficam lado a lado o tempo todo, e a folha NUNCA muda de tamanho: é a permanência
 * dela, ao lado de um sprite que cresce e encolhe, que ensina a cena. Se a folha acompanhasse
 * o tamanho do jogo, o palco estaria ensinando o contrário do enunciado.
 */
export function SheetStage({ state, cast }: { state: SceneState; cast?: SceneCast }) {
  const { cell, size } = state.sheet
  const folha = { x: 40, y: 56, lado: 160 }
  const meia = folha.lado / 2
  const jogo = { x: 300, y: 56, w: 220, h: 150 }
  const escala = size / 96
  return (
    <SceneCanvas
      view={VIEW}
      cast={cast}
      titulo="A folha de desenhos ao lado da tela do jogo"
      descricao={`O pedaço ${cell} de 4 está recortado. Na folha ele tem sempre o mesmo tamanho; no jogo, ${size}.`}
      rodape="A folha guarda os desenhos. O tamanho no jogo é outra escolha."
    >
      <rect className="fill-scene-sky" width={VIEW.w} height={VIEW.h} />
      <text className="fill-scene-ink-soft" x={folha.x} y={folha.y - 12} fontSize="12">
        folha de 64 por 64
      </text>
      <rect
        className="fill-scene-card stroke-scene-card-line"
        x={folha.x}
        y={folha.y}
        width={folha.lado}
        height={folha.lado}
        strokeWidth="2"
        rx="6"
      />
      {[1, 2, 3, 4].map((n) => {
        const cx = folha.x + ((n - 1) % 2) * meia
        const cy = folha.y + Math.floor((n - 1) / 2) * meia
        return (
          <g key={n}>
            <path
              className="stroke-scene-card-line"
              d={`M${folha.x + meia} ${folha.y}v${folha.lado}M${folha.x} ${folha.y + meia}h${folha.lado}`}
              strokeWidth="1.5"
            />
            <g
              className="text-primary"
              // ⚠️ Cada pedaço aparece um POUCO diferente (inclinação e tamanho): a frase da cena
              // é "cada pedaço é um desenho inteiro", e quatro cópias idênticas diriam o contrário.
              transform={`translate(${cx + meia / 2} ${cy + meia - 12}) rotate(${(n - 2) * 5}) scale(${0.5 + n * 0.02})`}
              opacity={n === cell ? 1 : 0.4}
            >
              <DinoFigure x={0} y={0} />
            </g>
            {n === cell && (
              <rect
                className="stroke-scene-alert"
                x={cx + 3}
                y={cy + 3}
                width={meia - 6}
                height={meia - 6}
                fill="none"
                strokeWidth="3"
                strokeDasharray="6 4"
                rx="4"
              />
            )}
          </g>
        )
      })}
      <text className="fill-scene-ink-soft" x={jogo.x} y={jogo.y - 12} fontSize="12">
        {`no jogo: ${size}`}
      </text>
      <rect
        className="fill-scene-grass stroke-scene-line"
        x={jogo.x}
        y={jogo.y}
        width={jogo.w}
        height={jogo.h}
        strokeWidth="2"
        rx="6"
      />
      <g
        className="text-primary"
        transform={`translate(${jogo.x + jogo.w / 2} ${jogo.y + jogo.h - 14}) scale(${escala})`}
      >
        <DinoFigure x={0} y={0} />
      </g>
    </SceneCanvas>
  )
}

/**
 * As vidas e o placar.
 *
 * ⚠️ As duas contagens ficam lado a lado e GRANDES: a cena é sobre elas mudarem por motivos
 * diferentes, e isso só se vê quando as duas estão à vista no mesmo instante da batida.
 */
export function LivesStage({ state, cast }: { state: SceneState; cast?: SceneCast }) {
  const { lives, points, onHit, hits } = state.lifeline
  const acabou = lives === 0
  return (
    <SceneCanvas
      view={VIEW}
      cast={cast}
      titulo="A tela do jogo com o placar e os corações"
      descricao={`${lives} ${lives === 1 ? 'vida' : 'vidas'} e ${points} ${
        points === 1 ? 'ponto' : 'pontos'
      }. ${acabou ? 'A partida acabou.' : `Batidas até agora: ${hits}.`}`}
      rodape={
        acabou
          ? 'Sem vidas, a partida acabou. O placar guardou o que foi feito.'
          : onHit
            ? 'O fio da vida está ligado: a próxima batida custa uma vida.'
            : 'O fio da vida está solto: bater não muda nenhuma das duas contagens.'
      }
    >
      <rect className="fill-scene-sky" width={VIEW.w} height={VIEW.h} />
      <rect className="fill-scene-ground" y={CHAO} width={VIEW.w} height={VIEW.h - CHAO} />
      <path className="stroke-scene-line" d={`M0 ${CHAO}h${VIEW.w}`} strokeWidth="2" />
      {/* Os corações: três lugares FIXOS, com o que já foi perdido em contorno. Sumir com eles
          esconderia de quanto se partiu, que é metade da comparação. */}
      <g>
        {[0, 1, 2].map((i) => (
          <path
            key={i}
            className={i < lives ? 'fill-scene-alert' : 'fill-none stroke-scene-alert'}
            strokeWidth="2"
            opacity={i < lives ? 1 : 0.5}
            transform={`translate(${24 + i * 34} 30) scale(1.1)`}
            d="M10 18C10 18 1 12 1 6.5A4.5 4.5 0 0 1 10 4A4.5 4.5 0 0 1 19 6.5C19 12 10 18 10 18Z"
          />
        ))}
        {/* ⚠️ "restam" e "placar", e não "vidas" e "pontos": as duas palavras já são os rótulos
            da faixa de estado logo acima, e repetir o mesmo nome no desenho faz a criança (e o
            teste) tomar os dois lugares por um só. Aqui é o HUD do jogo. */}
        <text className="fill-scene-ink-soft" x={24} y={68} fontSize="11">
          restam
        </text>
      </g>
      <g>
        <text
          className="fill-scene-b-ink"
          x={VIEW.w - 24}
          y={44}
          textAnchor="end"
          fontSize="30"
          fontWeight="700"
        >
          {points}
        </text>
        <text className="fill-scene-ink-soft" x={VIEW.w - 24} y={68} textAnchor="end" fontSize="11">
          placar
        </text>
      </g>
      <g className="text-primary" opacity={acabou ? 0.4 : 1}>
        <DinoFigure x={170} y={CHAO} />
      </g>
      <CactusFigure x={400} y={CHAO} />
      {acabou && (
        <text
          className="fill-scene-alert"
          x={VIEW.w / 2}
          y={VIEW.h / 2}
          textAnchor="middle"
          fontSize="26"
          fontWeight="700"
          letterSpacing="2"
        >
          FIM
        </text>
      )}
    </SceneCanvas>
  )
}
