'use client'

import type { SceneAction, SceneCast, SceneState } from '@sistemazero/core/learning/scene'
import {
  AIM_ORIGIN,
  AIM_TARGET_MARGIN,
  actorFigure,
  CAMERA_LANDMARKS,
  CAMERA_WORLD,
  CONTACT_DRAWINGS,
  CONTACT_HEARTS,
  COOLDOWN_REFUSED_SECONDS,
  COOLDOWN_SHOT,
  cameraWindow,
  castText,
  cenarioTemChao,
  contactTouching,
  DIAGONAL_REACH,
  enemyOnScreen,
  HOLD_LANE,
  quantos,
  rechargeWords,
  SCENE_LIMITS,
  sceneCenario,
  TILEMAP_DINO_COLUMN,
  tilemapLanding,
} from '@sistemazero/core/learning/scene'
import { type KeyboardEvent, useId, useRef, useState } from 'react'
import { FundoDoCenario } from './scene-arte'
import { Escolha } from './scene-bench'
// ⚠️ O `VIEW` vem do canvas: os desenhos leem o enquadramento para encostar na borda, então ele e o
// `viewBox` do SVG têm de ser o MESMO número.
import {
  LarguraConhecidaDaCena,
  type Palco,
  SceneCanvas,
  Texto,
  SCENE_VIEW as VIEW,
} from './scene-canvas'
import { ActorFigure, ArvoreDoMundo, pisoDoMundo } from './scene-figures'
import { CoracaoDoJogo } from './scene-hud'

/**
 * Os palcos do NÚCLEO do Iniciante 2D, redesenhados no lote 5 do Raio-X (G5, 16/09/2026): a tecla
 * que as duas raquetes escutam, os cactos medidos, a ficha com os cactos que andam, a câmera que
 * leva a janela, as duas regras do encosto, os tiros que voam, a mira, a andada de 1 segundo e o
 * mapa escrito com letras. Proposta de cada um: `community-kids/tmp/storyboard/analise/g5-nucleo-2d.md`.
 *
 * ⚠️ Saíram do `scene-core-stages.tsx` (que ficou com a `velocity` e a `variable`): cada um destes
 * palcos ganhou gesto próprio, e dois deles recebem toque direto (o alvo que se arrasta e as letras
 * do mapa). As RÉGUAS (a pista das raquetes, o vaivém dos cactos, os corações, a velocidade do tiro)
 * moram no `nucleo.ts` do core, que o motor e a faixa também leem.
 *
 * ⚠️ O par de comparação continua FIXO nas duas cores de sempre (A azul `scene-a`, B laranja
 * `scene-b`): elas dizem QUAL medida é qual, e não são decoração.
 */

/* ── hold-vs-press ─────────────────────────────────────────────────────────────────────────── */

/** A pista das raquetes no desenho: o lugar 40 do jogo começa em 160, um passo de 30 são 28. */
const PISTA = { x0: 160, passo: 28 } as const
const naPista = (x: number) => PISTA.x0 + ((x - HOLD_LANE.start) / HOLD_LANE.step) * PISTA.passo

/**
 * UMA tecla e duas raquetes (lote 5 do Raio-X). ⚠️ A tecla AFUNDA quando está segurada, e os dois
 * fios saem dela: o de cima (azul) é o "Quando apertar a tecla", o de baixo (laranja) é "a tecla está
 * apertada?", tracejado com a tecla solta (a resposta é não) e cheio com ela segurada (a resposta é
 * sim, em cada quadro). Os fantasmas marcam onde cada raquete estava quando a tecla afundou.
 */
export function HoldVsPressStage({ state, cast }: { state: SceneState; cast?: SceneCast }) {
  const { pressX, holdX, holding, presses, pressFrom, holdFrom, pressSteps, holdSteps } =
    state.input
  const afundou = presses > 0
  // ⚠️ A VOLTA na pista é escrita (consertos do review da onda B do lote 5): depois de 13 passos a de
  // baixo recomeça do lado esquerdo, e sem a palavra o desenho diria que ela andou menos que a de cima.
  const voltas = Math.floor(holdSteps / HOLD_LANE.places)
  const pista = (
    palco: Palco,
    y: number,
    x: number,
    de: number,
    passos: number,
    rotulo: string,
    cor: 'a' | 'b',
  ) => (
    <g data-pista={cor === 'a' ? 'de-cima' : 'de-baixo'}>
      <Texto
        className={cor === 'a' ? 'fill-scene-a' : 'fill-scene-b-ink'}
        x={PISTA.x0 - 10}
        // ⚠️ Sobe com a LETRA dos passos (conserto "letra no celular"): no celular os dois encostavam.
        y={Math.min(y - 42, y - 26 - palco.letra(12))}
        tamanho={14}
        fontWeight="700"
      >
        {rotulo}
      </Texto>
      <path className="stroke-scene-line" d={`M${PISTA.x0 - 10} ${y + 18}H540`} strokeWidth="2" />
      {Array.from({ length: HOLD_LANE.places }, (_, i) => (
        <path
          // biome-ignore lint/suspicious/noArrayIndexKey: os lugares da pista são fixos.
          key={`lugar-${i}`}
          className="stroke-scene-grid"
          d={`M${PISTA.x0 + i * PISTA.passo} ${y + 12}v12`}
          strokeWidth="2"
        />
      ))}
      {afundou && (
        <rect
          data-fantasma
          className={cor === 'a' ? 'fill-scene-a' : 'fill-scene-b'}
          opacity={0.25}
          x={naPista(de) - 8}
          y={y - 16}
          width="16"
          height="34"
          rx="4"
        />
      )}
      <rect
        className={cor === 'a' ? 'fill-scene-a' : 'fill-scene-b'}
        x={naPista(x) - 8}
        y={y - 16}
        width="16"
        height="34"
        rx="4"
      />
      {!afundou && (
        // ⚠️ A previsão fala de "raquete" (consertos do review da onda B do lote 5): na abertura as duas
        // barrinhas ganham o nome, que sai no primeiro aperto.
        <Texto
          data-nome-da-raquete
          className="fill-scene-ink-soft"
          x={naPista(x)}
          y={y + 40}
          textAnchor="middle"
          tamanho={12}
          fontWeight="700"
        >
          raquete
        </Texto>
      )}
      {afundou &&
        (() => {
          const texto = `${quantos(passos, 'passo', 'passos')}${
            cor === 'b' && voltas > 0 ? ` · ↻ ${quantos(voltas, 'volta', 'voltas')}` : ''
          }`
          // ⚠️ Centrado na raquete, mas preso dentro do desenho na largura que ele tem na letra em uso.
          const meia = palco.larguraDoTexto(texto, 12) / 2
          const centro = Math.max(PISTA.x0 - 10 + meia, Math.min(VIEW.w - 6 - meia, naPista(x)))
          return (
            <Texto
              className="fill-scene-ink"
              x={palco.estreito ? centro : naPista(x) > 420 ? naPista(x) + 8 : naPista(x)}
              y={y - 22}
              textAnchor={palco.estreito ? 'middle' : naPista(x) > 420 ? 'end' : 'middle'}
              tamanho={12}
              fontWeight="700"
            >
              {texto}
            </Texto>
          )
        })()}
    </g>
  )
  const descer = holding ? 6 : 0
  return (
    <SceneCanvas
      cast={cast}
      titulo="Uma tecla e as duas raquetes que a escutam"
      descricao={`A tecla está ${holding ? 'segurada' : 'solta'}. ${
        afundou
          ? `Desde que a tecla afundou, a de cima deu ${quantos(pressSteps, 'passo', 'passos')} e a de baixo ${quantos(holdSteps, 'passo', 'passos')}.${voltas > 0 ? ` A de baixo deu ${quantos(voltas, 'volta', 'voltas')} na pista.` : ''}`
          : 'Nenhuma raquete saiu do começo.'
      }`}
      rodape="Uma tecla, duas raquetes."
    >
      {(palco) => (
        <>
          {/* Os dois fios saem da tecla. */}
          <path
            className="stroke-scene-a"
            d={`M110 ${140 + descer}C135 ${140 + descer} 120 86 ${PISTA.x0 - 14} 86`}
            fill="none"
            strokeWidth="3"
          />
          <path
            className="stroke-scene-b"
            d={`M110 ${170 + descer}C135 ${170 + descer} 120 228 ${PISTA.x0 - 14} 228`}
            fill="none"
            strokeWidth="3"
            strokeDasharray={holding ? undefined : '6 6'}
          />
          <g data-tecla={holding ? 'segurada' : 'solta'}>
            {/* A base fica, e a tampa AFUNDA: é o desenho de "estar apertada". */}
            <rect className="fill-scene-rule" x={20} y={124} width="94" height="72" rx="14" />
            <rect
              className={holding ? 'fill-scene-b' : 'fill-scene-card stroke-scene-card-line'}
              x={20}
              y={112 + descer}
              width="94"
              height="70"
              rx="14"
              strokeWidth="2"
            />
            <Texto
              className="fill-scene-ink"
              x={67}
              y={152 + descer}
              textAnchor="middle"
              tamanho={16}
              fontWeight="700"
            >
              tecla
            </Texto>
          </g>
          {pista(palco, 86, pressX, pressFrom, pressSteps, 'Quando apertar a tecla', 'a')}
          {pista(palco, 228, holdX, holdFrom, holdSteps, 'a tecla está apertada?', 'b')}
        </>
      )}
    </SceneCanvas>
  )
}

/* ── group-loop ────────────────────────────────────────────────────────────────────────────── */

/**
 * A torre e a direção de cada cacto: espalhados no plano, e não em fila. ⚠️ Os números cabem no
 * quadro com o vaivém inteiro (`HUNT_SWING`): o 1º nunca sobe além do alto, o 2º nunca desce além do
 * chão, e o 1º e o 3º nunca se encostam.
 */
const TORRE = { x: 70, y: 175 } as const
const DIRECAO_DO_CACTO = [-22, 22, 0] as const
const ESCALA_DO_LACO = 1.8

/** Onde o cacto `id` fica, a partir da distância dele até a torre. */
function lugarDoCacto(id: number, distancia: number) {
  const angulo = ((DIRECAO_DO_CACTO[id - 1] ?? 0) * Math.PI) / 180
  return {
    x: TORRE.x + Math.cos(angulo) * distancia * ESCALA_DO_LACO,
    y: TORRE.y + Math.sin(angulo) * distancia * ESCALA_DO_LACO,
  }
}

/**
 * A torre e três cactos espalhados, com as distâncias ESCONDIDAS até medir (lote 5 do Raio-X). "Medir"
 * traça uma régua da torre até AQUELE cacto, cada uma na própria direção, e revela o número; com o
 * laço, as três réguas ficam acesas. O anel de escolhido é azul quando a criança mediu os três e
 * âmbar tracejado quando escolheu sem medir.
 */
export function GroupLoopStage({ state, cast }: { state: SceneState; cast?: SceneCast }) {
  const { distances, looked, chosen, auto, blind, measured } = state.hunt
  const obstaculo = actorFigure(cast, 'obstacle')
  const mundo = sceneCenario(cast, 'group-loop')
  const piso = pisoDoMundo(mundo, 0)
  const medidos = [...looked].sort((a, b) => a - b)
  // ⚠️⚠️ A régua mostra a FOTO da medida (consertos do review da onda B do lote 5): sem o laço ela fica
  // presa no lugar e no número de quando a criança mediu, e desbota com "medido antes" quando o cacto já
  // saiu dali. Com o laço as três são medidas de novo em todo quadro. Antes as réguas seguiam os cactos
  // sozinhas, e o que o laço faz ("mede os três em todo quadro") já acontecia sem ele.
  const foto = (id: number) => measured[id - 1] || distances[id - 1] || 0
  const velha = (id: number) => !auto && foto(id) !== distances[id - 1]
  return (
    <SceneCanvas
      cast={cast}
      mundo={mundo}
      titulo="A torre e os três cactos do grupo"
      // ⚠️⚠️ Só as distâncias JÁ MEDIDAS: a previsão pergunta se é preciso medir o grupo inteiro.
      descricao={`Medidos: ${looked.length} de 3.${
        medidos.length && !auto
          ? ` ${medidos
              .map((i) =>
                velha(i)
                  ? `O ${i}º estava a ${foto(i)} quando você mediu`
                  : `O ${i}º está a ${foto(i)}`,
              )
              .join('. ')}.`
          : ''
      }${auto ? ' O laço mede os três.' : ''} Escolhido: ${chosen ? `o ${chosen}º` : 'nenhum'}.`}
      rodape="A torre e os três cactos do grupo."
    >
      {(palco) => (
        <>
          {/* ⚠️ `calmo`: as RÉGUAS e as distâncias são escritas por cima do mundo, e são elas
              que a cena ensina a comparar. */}
          <FundoDoCenario cenario={mundo} w={VIEW.w} h={VIEW.h} detalhe="calmo" />
          {distances.map((_, i) => {
            const id = i + 1
            if (!looked.includes(id) && !auto) return null
            const d = foto(id)
            const antes = velha(id)
            const { x, y } = lugarDoCacto(id, d)
            // A régua sai do alto da torre e chega no meio do cacto, no mesmo piso dos dois.
            const de = { x: TORRE.x, y: TORRE.y - 30 + piso }
            const ate = { x, y: y - 25 + piso }
            const meio = { x: (de.x + ate.x) / 2, y: (de.y + ate.y) / 2 }
            return (
              <g
                key={`regua-${id}`}
                data-regua={id}
                data-medido-antes={antes || undefined}
                opacity={antes ? 0.55 : undefined}
              >
                <path
                  className="stroke-scene-a"
                  d={`M${de.x} ${de.y}L${ate.x} ${ate.y}`}
                  strokeWidth="3"
                  strokeDasharray="7 5"
                />
                {antes && (
                  <circle
                    className="fill-none stroke-scene-a"
                    cx={ate.x}
                    cy={ate.y}
                    r="6"
                    strokeWidth="2"
                  />
                )}
                {(() => {
                  // ⚠️ A caixa do número cresce com a LETRA (conserto "letra no celular"): no celular o
                  // número de 23 unidades passava das bordas da caixa de 40.
                  const largura = Math.max(40, palco.larguraDoTexto(String(d), 14) + 10)
                  const altura = Math.max(22, palco.letra(14) + 6)
                  return (
                    <rect
                      className="fill-scene-card stroke-scene-a"
                      x={meio.x - largura / 2}
                      y={
                        palco.estreito
                          ? meio.y + 4 - altura / 2 - palco.letra(14) * 0.3
                          : meio.y - 12
                      }
                      width={largura}
                      height={altura}
                      rx="8"
                      strokeWidth="2"
                    />
                  )
                })()}
                <Texto
                  className="fill-scene-ink"
                  x={meio.x}
                  y={meio.y + 4}
                  textAnchor="middle"
                  tamanho={14}
                  fontWeight="700"
                >
                  {d}
                </Texto>
                {antes && (
                  // Alinhado à direita da caixa: centrado, o do 2º encostava no anel da escolha.
                  <Texto
                    className="fill-scene-ink"
                    x={meio.x + 20}
                    y={meio.y + 26}
                    textAnchor="end"
                    tamanho={12}
                    fontWeight="700"
                  >
                    medido antes
                  </Texto>
                )}
              </g>
            )
          })}
          {/* ⚠️ No espaço a torre é de METAL (review do lote 3). */}
          <g transform={`translate(0 ${piso})`}>
            <path
              className={!cenarioTemChao(mundo) ? 'fill-scene-rock' : 'fill-scene-bark'}
              d={`M${TORRE.x - 20} ${TORRE.y + 20}V${TORRE.y - 60}h40v80Z`}
            />
            <path
              className={!cenarioTemChao(mundo) ? 'fill-scene-fin' : 'fill-scene-leaf-dark'}
              d={`M${TORRE.x - 30} ${TORRE.y - 60}h60l-30-30Z`}
            />
          </g>
          {distances.map((d, i) => {
            const id = i + 1
            const { x, y } = lugarDoCacto(id, d)
            const medido = looked.includes(id) || auto
            return (
              <g key={`cacto-${id}`} data-cacto={id}>
                <ActorFigure figure={obstaculo} x={x} y={y + piso} />
                {/* ⚠️ EMBAIXO do cacto, abaixo do anel (consertos do review da onda B do lote 5): à esquerda o
                "1º" e o "3º" encostavam na régua e no anel. Em cima, o 1º no alto do vaivém saía do quadro
                no espaço, e a nuvem "?" mora ali. */}
                <Texto
                  data-numero-do-cacto={id}
                  className="fill-scene-ink"
                  x={x}
                  y={y + 24 + piso}
                  textAnchor="middle"
                  tamanho={14}
                  fontWeight="700"
                >
                  {`${id}º`}
                </Texto>
                {!medido && (
                  // ⚠️⚠️ A nuvem "?" até medir: o número escrito dava o mais perto sem medir nenhum.
                  // ⚠️ Na ALTURA do meio do cacto, e não no alto (conserto "letra no celular"): no alto a nuvem
                  // do 2º encostava no "3º" logo acima dele, e a bolha cresce com a letra.
                  <g data-sem-medida>
                    <circle
                      className="fill-scene-card stroke-scene-card-line"
                      cx={x + 38}
                      cy={y - 26 + piso}
                      r={Math.max(14, palco.letra(15) * 0.7)}
                      strokeWidth="2"
                    />
                    <Texto
                      className="fill-scene-ink-soft"
                      x={x + 38}
                      y={y - 26 + piso + palco.letra(15) * 0.35}
                      textAnchor="middle"
                      tamanho={15}
                      fontWeight="700"
                    >
                      ?
                    </Texto>
                  </g>
                )}
                {chosen === id && (
                  <circle
                    data-escolhido={blind ? 'sem-medir' : 'medido'}
                    className={blind ? 'stroke-scene-b' : 'stroke-scene-a'}
                    cx={x}
                    cy={y - 28 + piso}
                    r="34"
                    fill="none"
                    strokeWidth="4"
                    strokeDasharray={blind ? '8 6' : undefined}
                  />
                )}
              </g>
            )
          })}
        </>
      )}
    </SceneCanvas>
  )
}

/* ── enemy-type ────────────────────────────────────────────────────────────────────────────── */

/** As duas raias da pista: o chão de cada uma. Cactos de número par e ímpar andam em raias diferentes. */
const RAIAS_DA_FICHA = [190, 284] as const

/**
 * A ficha e os cactos que ANDAM com ela (lote 5 do Raio-X): da direita para a esquerda, cada um com a
 * velocidade (o número) e os corações da vida em cima, e um rastro que cresce com a velocidade. Com a
 * cópia ligada, cada cacto anda com a CÓPIA dele e ganha a etiqueta "cópia".
 *
 * ⚠️ A ficha é uma faixa no alto e os cactos andam em DUAS raias: com a cópia, um cacto rápido nascido
 * depois alcança os lentos, e numa raia só os números e os corações se empilhavam um sobre o outro.
 */
export function EnemyTypeStage({ state, cast }: { state: SceneState; cast?: SceneCast }) {
  const { speed, life, cacti, copy } = state.blueprint
  const obstaculo = actorFigure(cast, 'obstacle')
  const mundo = sceneCenario(cast, 'enemy-type')
  const clip = useId()
  const naTelaLista = cacti.filter((c) => enemyOnScreen(c.x)).sort((a, b) => a.x - b.x)
  const naTela = naTelaLista.length
  // ⚠️⚠️ A velocidade de CADA cacto na frase de quem não enxerga (consertos do review da onda B do lote
  // 5): "cada um com a cópia da ficha" não dizia que o novo anda diferente dos que nasceram antes.
  const velocidades = naTelaLista.map((c) => String(copy ? c.speed : speed))
  const lista =
    velocidades.length > 1
      ? `${velocidades.slice(0, -1).join(', ')} e ${velocidades.at(-1)}`
      : (velocidades[0] ?? '')
  const andam =
    naTela === 0
      ? ''
      : copy
        ? ` ${naTela === 1 ? 'O cacto anda' : 'Os cactos andam'} com velocidade ${lista}.`
        : ` ${naTela === 1 ? 'O cacto anda' : 'Cada cacto anda'} com velocidade ${speed}, a da ficha.`
  // ⚠️ Um cacto rápido ALCANÇA um lento na mesma raia (é a cópia funcionando): o número e os corações
  // do segundo sobem um degrau, para os dois continuarem legíveis.
  const degrau = new Map<number, number>()
  for (const raia of [0, 1]) {
    const ultimo = [Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY]
    for (const c of cacti.filter((k) => k.id % 2 === raia).sort((a, b) => a.x - b.x)) {
      const livre = ultimo.findIndex((x) => c.x - x >= 64)
      const nivel = livre === -1 ? 1 : livre
      ultimo[nivel] = c.x
      degrau.set(c.id, nivel)
    }
  }
  return (
    <SceneCanvas
      cast={cast}
      mundo={mundo}
      titulo="A ficha e os cactos que nasceram dela"
      descricao={`Ficha com velocidade ${speed} e vida ${life}. ${quantos(naTela, 'cacto', 'cactos')} na tela.${andam}`}
      rodape="A ficha e os cactos que nasceram dela."
    >
      {(palco) => (
        <>
          <FundoDoCenario
            cenario={mundo}
            w={VIEW.w}
            h={VIEW.h}
            detalhe="calmo"
            semDetalhe={[{ x: 14, y: 4, w: 532, h: 56 }]}
          />
          {cenarioTemChao(mundo) &&
            RAIAS_DA_FICHA.map((chao) => (
              <path
                key={`raia-${chao}`}
                className="stroke-scene-line"
                d={`M20 ${chao}H540`}
                strokeWidth="2"
              />
            ))}
          <g data-ficha>
            <rect
              className="fill-scene-card stroke-scene-a"
              x={20}
              y={8}
              width="520"
              height="48"
              rx="14"
              strokeWidth="3"
            />
            <Texto className="fill-scene-ink-soft" x={40} y={38} tamanho={14} fontWeight="700">
              a ficha
            </Texto>
            {(() => {
              /**
               * ⚠️ Os lugares da ficha andam com a LETRA (conserto "letra no celular"): no celular
               * "velocidade" passava por cima do número. Na coluna do computador são os de sempre.
               */
              const velocidadeX = !palco.estreito
                ? 150
                : Math.max(150, 40 + palco.larguraDoTexto('a ficha', 14) + 20)
              const numeroX = !palco.estreito
                ? 240
                : Math.max(240, velocidadeX + palco.larguraDoTexto('velocidade', 15) + 8)
              const vidaX = !palco.estreito
                ? 330
                : Math.max(330, numeroX + palco.larguraDoTexto(String(speed), 22) + 24)
              const coracoesX = !palco.estreito
                ? 382
                : Math.max(382, vidaX + palco.larguraDoTexto('vida', 15) + 20)
              return (
                <>
                  <Texto className="fill-scene-ink" x={velocidadeX} y={38} tamanho={15}>
                    velocidade
                  </Texto>
                  <Texto className="fill-scene-a" x={numeroX} y={39} tamanho={22} fontWeight="700">
                    {speed}
                  </Texto>
                  <Texto className="fill-scene-ink" x={vidaX} y={38} tamanho={15}>
                    vida
                  </Texto>
                  {Array.from({ length: life }, (_, i) => (
                    <CoracaoDoJogo
                      // biome-ignore lint/suspicious/noArrayIndexKey: os corações da ficha são contados, não nomeados.
                      key={`vida-ficha-${i}`}
                      x={coracoesX + i * 22}
                      y={42}
                      lado={18}
                    />
                  ))}
                </>
              )
            })()}
          </g>
          <clipPath id={clip}>
            <rect x={20} y={58} width={520} height={VIEW.h - 58} />
          </clipPath>
          <g clipPath={`url(#${clip})`}>
            {cacti.map((c) => {
              const px = 40 + c.x
              const piso = pisoDoMundo(mundo, RAIAS_DA_FICHA[c.id % 2] ?? RAIAS_DA_FICHA[0])
              const v = copy ? c.speed : speed
              const vidas = copy ? c.life : life
              const acima = (degrau.get(c.id) ?? 0) * 34
              // ⚠️ O rótulo desliza para DENTRO da tela quando o cacto está na borda (consertos do review da
              // onda B do lote 5): o "5 · cópia" de quem saía pela esquerda era cortado em "pia".
              const rotuloX = Math.max(64, Math.min(496, px))
              return (
                <g key={c.id} data-cacto-da-ficha={c.id}>
                  {/* O rastro cresce com a velocidade: parado não se vê o quanto anda. */}
                  <path
                    className="stroke-scene-a"
                    d={`M${px + 26} ${piso - 40}h${v * 4}M${px + 26} ${piso - 26}h${v * 3}`}
                    strokeWidth="3"
                    strokeLinecap="round"
                    opacity={0.6}
                  />
                  <ActorFigure figure={obstaculo} x={px} y={piso} />
                  {Array.from({ length: vidas }, (_, i) => (
                    <CoracaoDoJogo
                      // biome-ignore lint/suspicious/noArrayIndexKey: os corações de um cacto são contados.
                      key={`vida-${c.id}-${i}`}
                      x={rotuloX - (vidas - 1) * 6 + i * 12}
                      y={piso - 64 - acima}
                      lado={11}
                    />
                  ))}
                  <Texto
                    className="fill-scene-a"
                    x={rotuloX}
                    y={piso - 78 - acima}
                    textAnchor="middle"
                    tamanho={15}
                    fontWeight="700"
                  >
                    {/* ⚠️ No estreito só o número: "5 · cópia" na letra de 12px encostava no cacto vizinho,
                    e o modo da cópia está na faixa. */}
                    {copy && !palco.estreito ? `${v} · cópia` : v}
                  </Texto>
                </g>
              )
            })}
          </g>
          {cacti.length === 0 && (
            <Texto className="fill-scene-ink-soft" x={280} y={180} textAnchor="middle" tamanho={14}>
              ninguém nasceu ainda
            </Texto>
          )}
        </>
      )}
    </SceneCanvas>
  )
}

/* ── camera ────────────────────────────────────────────────────────────────────────────────── */

const TELA = { x: 30, y: 36, w: 500, h: 150 } as const
const MAPA = { x: 30, y: 222, w: 500, h: 50 } as const

/** Um marco do mundo, desenhado com a escala pedida (1 na tela grande, pequeno no mapa). */
function Marco({
  kind,
  x,
  y,
  escala,
  espaco,
}: {
  kind: 'arvore' | 'pedra' | 'bandeira'
  x: number
  y: number
  escala: number
  espaco: boolean
}) {
  if (kind === 'bandeira')
    return (
      <g data-marco="bandeira" transform={`translate(${x} ${y}) scale(${escala})`}>
        <path className="stroke-scene-ink" d="M0 0V-78" strokeWidth="4" />
        <path className="fill-scene-alert" d="M2 -78L40 -66L2 -54Z" />
      </g>
    )
  if (kind === 'pedra' || espaco)
    return (
      <g data-marco={kind} transform={`translate(${x} ${y}) scale(${escala})`}>
        <path
          className={
            espaco
              ? 'fill-scene-rock stroke-scene-rock-dark'
              : 'fill-scene-stone stroke-scene-stone-dark'
          }
          d="M-26 0L-20 -20L-4 -30L14 -26L26 -10L24 0Z"
          strokeWidth="3"
        />
      </g>
    )
  return (
    <g data-marco="arvore" transform={`scale(${escala})`}>
      <ArvoreDoMundo x={x / escala} y={y / escala} />
    </g>
  )
}

/**
 * O mundo com MARCOS e a tela que é uma janela sobre ele (lote 5 do Raio-X). ⚠️ Com a câmera
 * seguindo, é o CENÁRIO que passa: sem marcos, o Dino em 600 e o Dino em 900 davam o mesmo quadro, e
 * "a janela anda" só existia no mapa pequeno. Tudo é recortado pela moldura da tela; o Dino que saiu
 * vira uma seta na borda.
 */
export function CameraStage({ state, cast }: { state: SceneState; cast?: SceneCast }) {
  const { heroX, follow } = state.view
  const janela = cameraWindow(heroX, follow)
  const escalaTela = TELA.w / CAMERA_WORLD.screen
  const escalaMapa = MAPA.w / CAMERA_WORLD.width
  const dentro = heroX >= janela && heroX <= janela + CAMERA_WORLD.screen
  const mundo = sceneCenario(cast, 'camera')
  const espaco = !cenarioTemChao(mundo)
  const clip = useId()
  const chao = TELA.y + TELA.h - 16
  return (
    <SceneCanvas
      cast={cast}
      mundo={mundo}
      titulo="O mundo do jogo e a janela da tela"
      descricao={`O Dino está em ${heroX} de um mundo de ${CAMERA_WORLD.width}. A tela mostra do ${janela} ao ${janela + CAMERA_WORLD.screen}${dentro ? '' : ', e o Dino está fora dela'}.`}
      rodape="Embaixo, o mundo inteiro. O tracejado é o pedaço que a tela mostra."
    >
      {/* ⚠️ "o que a criança vê" falava de quem está lendo em terceira pessoa. */}
      <Texto
        className="fill-scene-ink-soft"
        x={TELA.x}
        y={TELA.y - 8}
        tamanho={13}
        fontWeight="700"
      >
        a tela do jogo
      </Texto>
      <clipPath id={clip}>
        <rect x={TELA.x} y={TELA.y} width={TELA.w} height={TELA.h} rx="10" />
      </clipPath>
      <g clipPath={`url(#${clip})`}>
        <FundoDoCenario
          cenario={mundo}
          x={TELA.x}
          y={TELA.y}
          w={TELA.w}
          h={TELA.h}
          chao={chao - TELA.y}
          detalhe="calmo"
        />
        {CAMERA_LANDMARKS.map((m) => (
          <Marco
            key={`${m.kind}-${m.x}`}
            kind={m.kind}
            x={TELA.x + (m.x - janela) * escalaTela}
            y={chao}
            escala={0.62}
            espaco={espaco}
          />
        ))}
        {dentro && (
          <g className="text-primary">
            <ActorFigure
              figure={actorFigure(cast, 'hero')}
              x={TELA.x + (heroX - janela) * escalaTela}
              y={chao}
            />
          </g>
        )}
      </g>
      <rect
        className="fill-none stroke-scene-line"
        x={TELA.x}
        y={TELA.y}
        width={TELA.w}
        height={TELA.h}
        rx="10"
        strokeWidth="2"
      />
      {!dentro && (
        // ⚠️ "o herói não está na tela": herói não é o Dino, e o texto não passava pelo elenco.
        <g data-seta-da-borda>
          <path
            className="fill-scene-alert"
            d={`M${TELA.x + TELA.w - 12} ${TELA.y + 64}l-22 -14v28Z`}
          />
          <Texto
            className="fill-scene-alert"
            x={TELA.x + TELA.w - 40}
            y={TELA.y + 70}
            textAnchor="end"
            tamanho={15}
            fontWeight="700"
          >
            {castText('o Dino foi para lá', cast)}
          </Texto>
        </g>
      )}
      <Texto
        className="fill-scene-ink-soft"
        x={MAPA.x}
        y={MAPA.y - 8}
        tamanho={13}
        fontWeight="700"
      >
        o mundo inteiro
      </Texto>
      <rect
        className={`${espaco ? 'fill-scene-sky' : 'fill-scene-grass'} stroke-scene-line`}
        x={MAPA.x}
        y={MAPA.y}
        width={MAPA.w}
        height={MAPA.h}
        rx="8"
        strokeWidth="2"
      />
      {CAMERA_LANDMARKS.map((m) => (
        <Marco
          key={`mapa-${m.kind}-${m.x}`}
          kind={m.kind}
          x={MAPA.x + m.x * escalaMapa}
          y={MAPA.y + MAPA.h - 6}
          escala={0.28}
          espaco={espaco}
        />
      ))}
      <rect
        data-janela={janela}
        className="stroke-scene-b"
        x={MAPA.x + janela * escalaMapa}
        y={MAPA.y - 3}
        width={CAMERA_WORLD.screen * escalaMapa}
        height={MAPA.h + 6}
        fill="none"
        strokeWidth="3"
        strokeDasharray="6 4"
      />
      {/* ⚠️ A bolinha fica DENTRO do mapa nas pontas do mundo (consertos do review da onda B do lote 5). */}
      <circle
        data-dino-no-mapa
        className="fill-scene-a"
        cx={Math.max(MAPA.x + 7, Math.min(MAPA.x + MAPA.w - 7, MAPA.x + heroX * escalaMapa))}
        cy={MAPA.y + MAPA.h / 2}
        r="7"
      />
    </SceneCanvas>
  )
}

/* ── contact ───────────────────────────────────────────────────────────────────────────────── */

/**
 * As DUAS regras ao mesmo tempo, uma pista cada (lote 5 do Raio-X): em cima "o Dino está encostando no
 * cacto?", embaixo "Quando o Dino começar a encostar no cacto", com as palavras dos blocos do Estúdio.
 * Um controle só move os dois cactos. ⚠️ O cacto fica à distância dos DESENHOS (`CONTACT_DRAWINGS` +
 * distância): em 0 eles se tocam, e o brilho do encosto fica no ponto de contato, e não sobre o rosto.
 */
export function ContactStage({ state, cast }: { state: SceneState; cast?: SceneCast }) {
  const { distance, top, bottom, frames } = state.hit
  const encostando = contactTouching(distance)
  const mundo = sceneCenario(cast, 'contact')
  const heroi = actorFigure(cast, 'hero')
  const obstaculo = actorFigure(cast, 'obstacle')
  const DINO = 100
  const pista = (alto: number, rotulo: string, restam: number, cor: 'a' | 'b') => {
    const piso = pisoDoMundo(mundo, alto + 126)
    return (
      <g data-pista-do-encosto={cor === 'a' ? 'de-cima' : 'de-baixo'}>
        <Texto
          className={cor === 'a' ? 'fill-scene-a' : 'fill-scene-b-ink'}
          x={20}
          y={alto + 22}
          tamanho={14}
          fontWeight="700"
        >
          {castText(rotulo, cast)}
        </Texto>
        {cenarioTemChao(mundo) && (
          <path className="stroke-scene-line" d={`M20 ${alto + 126}H540`} strokeWidth="2" />
        )}
        <g className="text-primary">
          <ActorFigure figure={heroi} x={DINO} y={piso} />
        </g>
        <ActorFigure figure={obstaculo} x={DINO + CONTACT_DRAWINGS + distance} y={piso} />
        {encostando && (
          <path
            data-encosto
            className="fill-scene-b stroke-scene-alert"
            strokeWidth="2"
            // ⚠️ ACIMA do ponto de contato, e não sobre ele: ali ficava em cima do rosto do Dino.
            transform={`translate(${DINO + 20} ${piso - 74})`}
            d="M0 -12L3 -4L11 -4L5 1L7 9L0 4L-7 9L-5 1L-11 -4L-3 -4Z"
          />
        )}
        {Array.from({ length: CONTACT_HEARTS }, (_, i) => (
          <CoracaoDoJogo
            // biome-ignore lint/suspicious/noArrayIndexKey: os dez corações da pista são fixos.
            key={`coracao-${cor}-${i}`}
            x={330 + i * 21}
            y={alto + 52}
            lado={18}
            cheio={i < restam}
          />
        ))}
        {restam === 0 && (
          <Texto
            className="fill-scene-alert"
            x={540}
            y={alto + 76}
            textAnchor="end"
            tamanho={13}
            fontWeight="700"
          >
            fim de jogo
          </Texto>
        )}
      </g>
    )
  }
  return (
    <SceneCanvas
      cast={cast}
      mundo={mundo}
      titulo="As duas regras do encosto"
      // ⚠️ Os corações PERDIDOS, no mesmo sentido da faixa (consertos do review da onda B do lote 5): a
      // frase contava os que sobravam e a faixa, os que saíram.
      descricao={`${encostando ? `Encostados há ${quantos(frames, 'quadro', 'quadros')}` : `Distância ${distance}`}. Em cima, ${quantos(CONTACT_HEARTS - top, 'coração', 'corações')} a menos. Embaixo, ${quantos(CONTACT_HEARTS - bottom, 'coração', 'corações')} a menos.`}
      rodape="Duas regras, o mesmo cacto."
    >
      <FundoDoCenario
        cenario={mundo}
        w={VIEW.w}
        h={VIEW.h}
        detalhe="calmo"
        semDetalhe={[
          { x: 14, y: 6, w: 330, h: 26 },
          { x: 316, y: 26, w: 232, h: 60 },
          { x: 14, y: 150, w: 330, h: 26 },
          { x: 316, y: 170, w: 232, h: 60 },
        ]}
      />
      {pista(0, 'o Dino está encostando no cacto?', top, 'a')}
      <path className="stroke-scene-rule" d="M20 146H540" strokeWidth="2" strokeDasharray="4 6" />
      {pista(146, 'Quando o Dino começar a encostar no cacto', bottom, 'b')}
    </SceneCanvas>
  )
}

/* ── cooldown ──────────────────────────────────────────────────────────────────────────────── */

/** A boca da arma no desenho: o tiro 0 sai daqui, e 440 de caminho acabam na borda. */
const BOCA = { x: 112, y: 150 } as const

/**
 * A arma, a barra da recarga e os tiros que VOAM (lote 5 do Raio-X). Sem recarga eles saem colados;
 * com recarga aparece o vão. O aperto que não virou tiro pisca "não saiu" na boca da arma por meio
 * segundo e some: ele não fica guardado para depois.
 */
export function CooldownStage({ state, cast }: { state: SceneState; cast?: SceneCast }) {
  const { seconds, ready, shots, refused, bullets, time, refusedAt } = state.weapon
  const cheio = seconds > 0 ? 1 - ready / seconds : 1
  const mundo = sceneCenario(cast, 'cooldown')
  const piso = pisoDoMundo(mundo, 176)
  // ⚠️ Um segundo, e não meio (consertos do review da onda B do lote 5): sumia antes de a criança olhar.
  // A bancada mostra o mesmo aviso ao lado do botão, onde os olhos estão.
  const recusouAgora = refusedAt >= 0 && time - refusedAt < COOLDOWN_REFUSED_SECONDS
  const escala = (VIEW.w - 20 - BOCA.x) / COOLDOWN_SHOT.end
  return (
    <SceneCanvas
      cast={cast}
      mundo={mundo}
      titulo="A arma, a barra de recarga e os tiros"
      descricao={`Recarga: ${rechargeWords(seconds)}. ${quantos(shots, 'tiro saiu', 'tiros saíram')}, e ${quantos(bullets.length, 'está', 'estão')} voando.${refused ? ` ${quantos(refused, 'aperto não virou tiro', 'apertos não viraram tiro')}.` : ''}`}
      rodape="A barra mostra a recarga."
    >
      {(palco) => (
        <>
          <FundoDoCenario
            cenario={mundo}
            w={VIEW.w}
            h={VIEW.h}
            detalhe="calmo"
            semDetalhe={[{ x: 300, y: 8, w: 250, h: 28 }]}
          />
          <g className="text-primary">
            <ActorFigure figure={actorFigure(cast, 'hero')} x={70} y={piso} />
          </g>
          {bullets.map((b, i) => (
            <circle
              // biome-ignore lint/suspicious/noArrayIndexKey: os tiros no ar são contados na ordem da fila.
              key={`tiro-${i}`}
              data-tiro-voando
              className="fill-scene-b stroke-scene-flame-deep"
              strokeWidth="2"
              cx={BOCA.x + b * escala}
              cy={BOCA.y + (piso - 176)}
              r="8"
            />
          ))}
          {recusouAgora && (
            <g data-nao-saiu>
              {/* ⚠️ A caixa cresce com a LETRA (conserto "letra no celular"): no celular o texto passava dela. */}
              <rect
                className="fill-scene-b-wash stroke-scene-b"
                x={BOCA.x - 6}
                y={BOCA.y - 58 + (piso - 176)}
                width={Math.max(96, palco.larguraDoTexto('✕ não saiu', 13) + 12)}
                height={Math.max(26, palco.letra(13) + 8)}
                rx="10"
                strokeWidth="2"
              />
              <Texto
                className="fill-scene-b-ink"
                x={BOCA.x - 6 + Math.max(96, palco.larguraDoTexto('✕ não saiu', 13) + 12) / 2}
                y={
                  palco.estreito
                    ? BOCA.y -
                      58 +
                      (piso - 176) +
                      (palco.letra(13) + 8) / 2 +
                      palco.letra(13) * 0.35
                    : BOCA.y - 40 + (piso - 176)
                }
                textAnchor="middle"
                tamanho={13}
                fontWeight="700"
              >
                ✕ não saiu
              </Texto>
            </g>
          )}
          <g>
            <Texto className="fill-scene-ink-soft" x={30} y={226} tamanho={13} fontWeight="700">
              recarga
            </Texto>
            {/* ⚠️ O ESTADO da barra, e não o ajuste (consertos do review da onda B do lote 5): cheia ou vazia,
            ela dizia "1 segundo". O ajuste mora no deslizante e na faixa. */}
            <Texto
              data-estado-da-recarga
              className="fill-scene-ink"
              x={530}
              y={226}
              textAnchor="end"
              tamanho={13}
              fontWeight="700"
            >
              {seconds === 0 ? 'sem recarga' : ready > 0 ? 'recarregando' : 'pronta'}
            </Texto>
            <rect className="fill-scene-grid" x={30} y={236} width="500" height="18" rx="9" />
            <rect className="fill-scene-a" x={30} y={236} width={500 * cheio} height="18" rx="9" />
          </g>
          {refused > 0 && (
            <Texto
              className="fill-scene-alert"
              x={530}
              y={26}
              textAnchor="end"
              tamanho={13}
              fontWeight="700"
            >
              {/* ⚠️ "na espera" sugeria que os tiros sairiam depois: o aperto recusado é jogado fora. */}
              {quantos(refused, 'aperto não virou tiro', 'apertos não viraram tiro')}
            </Texto>
          )}
        </>
      )}
    </SceneCanvas>
  )
}

/* ── aim ───────────────────────────────────────────────────────────────────────────────────── */

/** A tela da mira no desenho: 480 × 270 do jogo, a partir de (40, 15). */
const naMira = (x: number, y: number) => ({ x: 40 + x, y: 15 + y })

/**
 * O Dino no MEIO da tela, a seta até o alvo, o caminho reto e o tiro que voa (lote 5 do Raio-X).
 * ⚠️ O alvo se ARRASTA no palco (`dispatch`); os deslizantes da bancada continuam sendo o caminho do
 * teclado. Depois do tiro fica o traço do caminho que ele fez, e o estouro no alvo quando acertou.
 */
export function AimStage({
  state,
  cast,
  dispatch,
}: {
  state: SceneState
  cast?: SceneCast
  dispatch?: (action: SceneAction) => void
}) {
  const { targetX, targetY, chasing, flying, bulletX, bulletY, result, shotX, shotY } = state.sight
  const mundo = sceneCenario(cast, 'aim')
  // A caixa com a MESMA proporção do desenho, por cima dele: é por ela que o dedo vira x e y.
  const caixaRef = useRef<HTMLDivElement>(null)
  const arrasto = useRef<{ id: number; x: number; y: number; moveu: boolean } | null>(null)
  const origem = naMira(AIM_ORIGIN.x, AIM_ORIGIN.y)
  const alvo = naMira(targetX, targetY)
  const distancia = Math.hypot(targetX - AIM_ORIGIN.x, targetY - AIM_ORIGIN.y)
  const perto = distancia < 24
  // A seta PARA na borda do alvo (a ponta escondia debaixo dele), e o rótulo fica ao lado da linha,
  // do lado de cima, nunca por cima dela.
  const ux = distancia > 0 ? (targetX - AIM_ORIGIN.x) / distancia : 1
  const uy = distancia > 0 ? (targetY - AIM_ORIGIN.y) / distancia : 0
  const ponta = { x: alvo.x - ux * 22, y: alvo.y - uy * 22 }
  // A normal da linha que aponta para CIMA (y negativo); na linha deitada, para cima também.
  const normal =
    uy === 0 && ux === 0 ? { x: 0, y: -1 } : -ux <= 0 ? { x: uy, y: -ux } : { x: -uy, y: ux }
  const rotuloDaSeta = {
    // Perto da PONTA, e não no meio: no meio o rótulo caía em cima do Dino.
    // ⚠️ 30 da linha (consertos do review da onda B do lote 5): a 22 a seta atravessava "direção".
    x: origem.x + (ponta.x - origem.x) * 0.72 + normal.x * 30,
    y: origem.y + (ponta.y - origem.y) * 0.72 + normal.y * 30 + 4,
  }
  const setaId = useId()
  const L = SCENE_LIMITS
  const levarOAlvo = (clientX: number, clientY: number) => {
    const caixa = caixaRef.current?.getBoundingClientRect()
    if (!caixa?.width || !caixa.height || !dispatch) return
    const px = ((clientX - caixa.left) / caixa.width) * VIEW.w
    const py = ((clientY - caixa.top) / caixa.height) * VIEW.h
    const m = AIM_TARGET_MARGIN
    const x = Math.max(L.aimX.min + m, Math.min(L.aimX.max - m, Math.round((px - 40) / 10) * 10))
    const y = Math.max(L.aimY.min + m, Math.min(L.aimY.max - m, Math.round((py - 15) / 10) * 10))
    if (x !== targetX || y !== targetY) dispatch({ type: 'target', x, y })
  }
  const soltarOAlvo = () => {
    arrasto.current = null
  }
  const tiro = flying
    ? 'O tiro está voando.'
    : result === 'acertou'
      ? 'O tiro acertou o alvo.'
      : result === 'errou'
        ? 'O tiro passou longe do alvo.'
        : ''
  return (
    <SceneCanvas
      cast={cast}
      mundo={mundo}
      className={dispatch ? 'relative' : undefined}
      interativo={Boolean(dispatch)}
      // ⚠️⚠️ A ALÇA do alvo é HTML, por cima do desenho (consertos do review da onda B do lote 5, ALTO): o
      // `touch-action: none` estava no `<g>` do alvo, e o Chromium só respeita `touch-action` na caixa CSS
      // do `<svg>`, não nos elementos de dentro. Com o dedo chegavam `pointerdown`, dois `pointermove` e
      // `pointercancel`: o alvo andava ~30 e parava. Uma caixa de 52 px com `touch-action: none` segura só
      // o alvo; fora dele o dedo continua rolando a página. Posição em PORCENTAGEM de uma caixa com a
      // proporção do desenho (a moldura inteira é mais alta: tem o rodapé embaixo). Sem foco nem nome: o
      // caminho do teclado são os deslizantes da bancada.
      overlay={
        dispatch ? (
          <div
            ref={caixaRef}
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-0"
            style={{ aspectRatio: `${VIEW.w} / ${VIEW.h}` }}
          >
            <div
              data-alca-do-alvo
              className="pointer-events-auto absolute size-[52px] -translate-x-1/2 -translate-y-1/2 cursor-grab rounded-full select-none"
              style={{
                left: `${(alvo.x / VIEW.w) * 100}%`,
                top: `${(alvo.y / VIEW.h) * 100}%`,
                touchAction: 'none',
              }}
              onPointerDown={(e) => {
                arrasto.current = { id: e.pointerId, x: e.clientX, y: e.clientY, moveu: false }
                try {
                  e.currentTarget.setPointerCapture?.(e.pointerId)
                } catch {
                  // Sem captura, o arrasto segue enquanto o dedo estiver na alça.
                }
              }}
              onPointerMove={(e) => {
                const a = arrasto.current
                if (!a || a.id !== e.pointerId) return
                // ⚠️ Um toque PARADO não leva o alvo (consertos do review da onda B do lote 5): o
                // `pointerup` o empurrava 10 para onde o dedo estava.
                if (!a.moveu && Math.hypot(e.clientX - a.x, e.clientY - a.y) <= 4) return
                a.moveu = true
                levarOAlvo(e.clientX, e.clientY)
              }}
              onPointerUp={(e) => {
                const a = arrasto.current
                if (a?.id === e.pointerId && a.moveu) levarOAlvo(e.clientX, e.clientY)
                soltarOAlvo()
              }}
              // ⚠️ O cancelamento e a perda da captura também soltam (BAIXO-11): o alvo seguia o mouse
              // sem botão nenhum apertado.
              onPointerCancel={soltarOAlvo}
              onLostPointerCapture={soltarOAlvo}
            />
          </div>
        ) : undefined
      }
      titulo="O atirador, a seta e o alvo"
      descricao={`O alvo está em x ${targetX}, y ${targetY}. A mira está ${chasing ? 'ligada' : 'desligada'}.${tiro ? ` ${tiro}` : ''}`}
      rodape="O Dino, o alvo e a seta entre os dois."
    >
      {(palco) => (
        <>
          <FundoDoCenario cenario={mundo} x={40} y={15} w={480} h={270} detalhe="calmo" />
          <rect
            className="fill-none stroke-scene-line"
            x={40}
            y={15}
            width="480"
            height="270"
            rx="8"
            strokeWidth="2"
          />
          <defs>
            <marker
              id={setaId}
              markerUnits="userSpaceOnUse"
              markerWidth="14"
              markerHeight="14"
              refX="11"
              refY="7"
              orient="auto"
            >
              <path className="fill-scene-a" d="M0 0L14 7L0 14Z" />
            </marker>
          </defs>
          <g data-caminho-reto>
            <path
              className="stroke-scene-ink-soft"
              d={`M${origem.x} ${origem.y}H${40 + 480}`}
              strokeWidth="2"
              strokeDasharray="6 5"
            />
            {/* ⚠️⚠️ O NOME só depois do primeiro tiro (full review de experiência, M6): a previsão pergunta
                "Para onde vai o tiro?" (Direto no alvo / Reto para a frente), e "caminho reto" escrito no
                desenho, legível embaixo do véu, era a resposta. */}
            {(flying || result !== 'nada') && (
              <Texto
                className="fill-scene-ink-soft"
                x={512}
                y={origem.y - 8}
                textAnchor="end"
                tamanho={12}
                fontWeight="600"
              >
                caminho reto
              </Texto>
            )}
          </g>
          {!perto && (
            <g data-seta-da-mira>
              <path
                className="stroke-scene-a"
                d={`M${origem.x} ${origem.y}L${ponta.x} ${ponta.y}`}
                strokeWidth="3"
                markerEnd={`url(#${setaId})`}
              />
              {/* ⚠️ Com contorno da cor do céu: a linha que passar por perto some atrás das letras.
              ⚠️ Fora do estreito (conserto "letra no celular"): na letra de 12px o nome da seta caía em
              cima do Dino. O rodapé já dá nome a ela ("a seta entre os dois"). */}
              {!palco.estreito && (
                <Texto
                  className="fill-scene-a stroke-scene-sky"
                  x={rotuloDaSeta.x}
                  y={rotuloDaSeta.y}
                  textAnchor="middle"
                  tamanho={12}
                  fontWeight="700"
                  strokeWidth="4"
                  strokeLinejoin="round"
                  paintOrder="stroke"
                >
                  direção até o alvo
                </Texto>
              )}
            </g>
          )}
          {result !== 'nada' && !flying && (
            <path
              data-caminho-do-tiro={result}
              className="stroke-scene-alert"
              d={`M${origem.x} ${origem.y}L${naMira(shotX, shotY).x} ${naMira(shotX, shotY).y}`}
              // ⚠️ Grosso (consertos do review da onda B do lote 5): fino, o traço do tiro reto sumia em cima
              // do tracejado do "caminho reto".
              strokeWidth="5"
              strokeDasharray="2 8"
              strokeLinecap="round"
            />
          )}
          <g className="text-primary">
            <ActorFigure figure={actorFigure(cast, 'hero')} x={origem.x} y={origem.y + 26} />
          </g>
          {/* O gesto de arrastar mora na alça HTML do `overlay` (acima). */}
          <g data-alvo>
            <circle className="fill-scene-b" cx={alvo.x} cy={alvo.y} r="16" />
            <circle className="fill-scene-card" cx={alvo.x} cy={alvo.y} r="9" />
            <circle className="fill-scene-b" cx={alvo.x} cy={alvo.y} r="4" />
          </g>
          {result === 'acertou' && !flying && (
            <path
              data-estouro
              className="fill-scene-flame stroke-scene-flame-deep"
              strokeWidth="2"
              transform={`translate(${alvo.x} ${alvo.y})`}
              d="M0 -26L6 -9L24 -12L11 1L20 18L2 10L-10 24L-9 6L-26 2L-10 -6L-14 -22Z"
            />
          )}
          {flying && (
            <>
              <path
                className="stroke-scene-alert"
                d={`M${origem.x} ${origem.y}L${naMira(bulletX, bulletY).x} ${naMira(bulletX, bulletY).y}`}
                strokeWidth="5"
                strokeDasharray="2 8"
                strokeLinecap="round"
              />
              <circle
                data-tiro-da-mira
                className="fill-scene-flame stroke-scene-flame-deep"
                strokeWidth="2"
                cx={naMira(bulletX, bulletY).x}
                cy={naMira(bulletX, bulletY).y}
                r="8"
              />
            </>
          )}
        </>
      )}
    </SceneCanvas>
  )
}

/* ── diagonal ──────────────────────────────────────────────────────────────────────────────── */

/** O começo no desenho e a escala: 60 de caminho são 96 unidades (o raio do círculo). */
const COMECO = { x: 280, y: 162 } as const
const ESCALA_DA_ANDADA = 1.6
const naAndada = (x: number, y: number) => ({
  x: COMECO.x + x * ESCALA_DA_ANDADA,
  y: COMECO.y + y * ESCALA_DA_ANDADA,
})
const NOME_DA_ANDADA = { reto: 'reto', diagonal: 'diagonal', corrigida: 'com correção' } as const

/**
 * O Dino, o rastro e o círculo de referência (lote 5 do Raio-X). ⚠️ O círculo é até onde o Dino chega
 * andando reto em 1 segundo; a andada deixa um rastro de pontinhos, e o último lugar de cada tipo
 * fica como fantasma para comparar. As setas saíram do palco (elas moram na bancada).
 */
export function DiagonalStage({ state, cast }: { state: SceneState; cast?: SceneCast }) {
  const { x, y, last, ghosts, distance, strides } = state.walkPad
  const mundo = sceneCenario(cast, 'diagonal')
  const fim = naAndada(x, y)
  const pontos = Math.max(1, Math.round(distance / 10))
  const raio = DIAGONAL_REACH * ESCALA_DA_ANDADA
  // ⚠️⚠️ O Dino fica um pouco AO LADO de onde parou, e o fim da andada é um ponto grande pintado depois
  // dele (consertos do review da onda B do lote 5): com a correção, o desenho cobria justamente o ponto em
  // cima do círculo, que é a prova de "parou no círculo". E ele olha para o lado em que andou.
  // ⚠️ De lado (perpendicular ao caminho, para cima ou para a direita), e não mais longe no caminho: mais
  // longe, o Dino da andada corrigida cobria o fantasma da diagonal, que é a comparação da cena.
  const comprimento = Math.hypot(x, y)
  const lado = comprimento > 0 ? { x: y / comprimento, y: -x / comprimento } : { x: 0, y: 0 }
  const virar = lado.y > 0 || (lado.y === 0 && lado.x < 0) ? -1 : 1
  const fora = strides > 0 ? { x: lado.x * virar * 34, y: lado.y * virar * 34 } : { x: 0, y: 0 }
  const dino = { x: fim.x + fora.x, y: fim.y + fora.y }
  const paraTras = strides > 0 && x < 0
  return (
    <SceneCanvas
      cast={cast}
      mundo={mundo}
      titulo="O Dino, o rastro e o círculo de 1 segundo"
      descricao={
        strides
          ? `O Dino andou ${Math.round(distance)} ${last === 'diagonal' ? 'e passou do círculo' : 'e parou no círculo'}.${ghosts.length > 1 ? ` Fantasmas: ${ghosts.map((g) => NOME_DA_ANDADA[g.kind]).join(', ')}.` : ''}`
          : 'O Dino está no começo, no meio do círculo.'
      }
      rodape="O círculo mostra até onde o Dino chega andando reto em 1 segundo."
      // ⭐ No estreito os nomes dos fantasmas e o caminho de agora saem do desenho e vêm para cá, com a cor
      // de cada ponto (conserto "letra no celular"): na letra de 12px eles caíam em cima do Dino e do
      // círculo. O caminho de agora também está na faixa ("andou") e na frase.
      legenda={(palco) =>
        palco.estreito ? (
          <p
            aria-hidden
            data-fantasmas-da-andada=""
            // ⚠️ A linha fica reservada desde a abertura: o fantasma não pode empurrar a bancada.
            className="flex min-h-7 flex-wrap items-center gap-x-3 px-3 pb-1 text-sm font-bold text-scene-ink"
          >
            {ghosts
              .filter((g) => g.kind !== last)
              .map((g) => (
                <span key={g.kind} className="inline-flex items-center gap-1.5">
                  <span
                    className={`inline-block size-3 rounded-full ${g.kind === 'diagonal' ? 'bg-scene-b' : 'bg-scene-a'} opacity-60`}
                  />
                  {NOME_DA_ANDADA[g.kind]}: {Math.round(Math.hypot(g.x, g.y))}
                </span>
              ))}
          </p>
        ) : null
      }
    >
      {(palco) => (
        <>
          {/* ⚠️ `calmo`: a GRADE do chão vem por cima, e é ela que mostra que a diagonal anda
              mais que uma seta só. */}
          <FundoDoCenario cenario={mundo} w={VIEW.w} h={VIEW.h} detalhe="calmo" />
          {Array.from({ length: 29 }, (_, i) => (
            <path
              // biome-ignore lint/suspicious/noArrayIndexKey: a grade do chão é fixa.
              key={`v-${i}`}
              className="stroke-scene-grid"
              d={`M${COMECO.x + (i - 14) * 32} 0V${VIEW.h}`}
              strokeWidth="1"
            />
          ))}
          {Array.from({ length: 11 }, (_, i) => (
            <path
              // biome-ignore lint/suspicious/noArrayIndexKey: a grade do chão é fixa.
              key={`h-${i}`}
              className="stroke-scene-grid"
              d={`M0 ${COMECO.y + (i - 5) * 32}H${VIEW.w}`}
              strokeWidth="1"
            />
          ))}
          <circle
            data-circulo-de-um-segundo
            className="stroke-scene-a"
            cx={COMECO.x}
            cy={COMECO.y}
            r={raio}
            fill="none"
            strokeWidth="3"
            strokeDasharray="8 6"
          />
          <circle className="fill-scene-ink-soft" cx={COMECO.x} cy={COMECO.y} r="5" />
          {ghosts
            .filter((g) => g.kind !== last)
            .map((g) => {
              const p = naAndada(g.x, g.y)
              return (
                <g key={g.kind} data-fantasma-da-andada={g.kind} opacity={0.55}>
                  <path
                    className="stroke-scene-ink-soft"
                    d={`M${COMECO.x} ${COMECO.y}L${p.x} ${p.y}`}
                    strokeWidth="2"
                    strokeDasharray="3 6"
                  />
                  <circle
                    className={g.kind === 'diagonal' ? 'fill-scene-b' : 'fill-scene-a'}
                    cx={p.x}
                    cy={p.y}
                    r="7"
                  />
                  {/* ⚠️ No estreito o nome mora na legenda embaixo do desenho. */}
                  {!palco.estreito && (
                    <Texto
                      className="fill-scene-ink"
                      x={p.x + 10}
                      y={p.y + 18}
                      tamanho={12}
                      fontWeight="700"
                    >
                      {NOME_DA_ANDADA[g.kind]}
                    </Texto>
                  )}
                </g>
              )
            })}
          {strides > 0 &&
            Array.from({ length: pontos }, (_, i) => {
              const t = (i + 1) / pontos
              return (
                <circle
                  // biome-ignore lint/suspicious/noArrayIndexKey: os pontinhos do rastro são contados.
                  key={`rastro-${i}`}
                  data-rastro
                  className={last === 'diagonal' ? 'fill-scene-b' : 'fill-scene-a'}
                  cx={COMECO.x + (fim.x - COMECO.x) * t}
                  cy={COMECO.y + (fim.y - COMECO.y) * t}
                  r="4"
                />
              )
            })}
          <g className="text-primary">
            <g
              data-olha-para={paraTras ? 'esquerda' : 'direita'}
              transform={paraTras ? `translate(${2 * dino.x} 0) scale(-1 1)` : undefined}
            >
              <ActorFigure
                figure={actorFigure(cast, 'hero')}
                x={dino.x}
                y={dino.y + 26}
                escala={0.8}
              />
            </g>
          </g>
          {strides > 0 && (
            <circle
              data-fim-da-andada
              className={`${last === 'diagonal' ? 'fill-scene-b' : 'fill-scene-a'} stroke-scene-card`}
              cx={fim.x}
              cy={fim.y}
              r="8"
              strokeWidth="3"
            />
          )}
          {/* ⚠️ Fora do estreito: no celular o caminho de agora está na faixa ("andou") e na frase, e o
              rótulo na letra de 12px caía em cima do círculo e do fantasma. */}
          {last !== 'nada' && !palco.estreito && (
            <Texto
              className="fill-scene-ink"
              x={dino.x + (paraTras ? -30 : 30)}
              y={Math.max(16, dino.y - 44)}
              textAnchor={paraTras ? 'end' : 'start'}
              tamanho={13}
              fontWeight="700"
            >
              {`${NOME_DA_ANDADA[last]}: ${Math.round(distance)}`}
            </Texto>
          )}
        </>
      )}
    </SceneCanvas>
  )
}

/* ── tilemap ───────────────────────────────────────────────────────────────────────────────── */

/** A casa do mapa: 44 unidades, que são 44 pixels (o palco tem largura fixa), o alvo de toque da casa. */
const CASA = 44
const MAPA_TEXTO = { x: 12, y: 30 } as const
const MAPA_DESENHO = { x: 12, y: 334 } as const
const TILEMAP_VIEW = { w: 464, h: 632 } as const
const NOME_DA_LETRA: Record<string, string> = { '.': 'vazio', '#': 'bloco', o: 'moeda' }

/**
 * O mapa escrito com letras: o TEXTO em cima e o DESENHO embaixo, com as colunas alinhadas e a mesma
 * altura de linha (lote 5 do Raio-X). ⚠️⚠️ As letras do texto SÃO a bancada: cada casa é um botão
 * (um grupo por linha, e as setas do teclado andam entre as casas), e a letra que ele escreve vem da paleta de três letras. A casa
 * escrita acende nos dois lados, e o Dino cai até o primeiro bloco da coluna dele.
 *
 * ⚠️ Largura FIXA (464) com rolagem de lado no celular: cada casa tem os 44 pixels do alvo de toque.
 * Esticada na largura do palco, a casa ficava com 19 pixels num celular (e a 10ª coluna saía cortada
 * no desenho antigo, que terminava em 570 num quadro de 560).
 */
export function TilemapStage({
  state,
  cast,
  dispatch,
}: {
  state: SceneState
  cast?: SceneCast
  dispatch?: (action: SceneAction) => void
}) {
  const { rows, lastRow, lastCol } = state.grid
  const mundo = sceneCenario(cast, 'tilemap')
  const [letra, setLetra] = useState<'.' | '#' | 'o'>('#')
  const [foco, setFoco] = useState(0)
  const casas = useRef<(HTMLButtonElement | null)[]>([])
  const pouso = tilemapLanding(rows)
  const moedas = rows.join('').split('o').length - 1
  const mover = (e: KeyboardEvent<HTMLDivElement>) => {
    const linha = Math.floor(foco / 10)
    const coluna = foco % 10
    const destino =
      e.key === 'ArrowRight'
        ? linha * 10 + Math.min(9, coluna + 1)
        : e.key === 'ArrowLeft'
          ? linha * 10 + Math.max(0, coluna - 1)
          : e.key === 'ArrowDown'
            ? Math.min(5, linha + 1) * 10 + coluna
            : e.key === 'ArrowUp'
              ? Math.max(0, linha - 1) * 10 + coluna
              : // ⚠️ Home e End, como numa grade (consertos do review da onda B do lote 5).
                e.key === 'Home'
                ? e.ctrlKey
                  ? 0
                  : linha * 10
                : e.key === 'End'
                  ? e.ctrlKey
                    ? 59
                    : linha * 10 + 9
                  : null
    if (destino === null) return
    e.preventDefault()
    setFoco(destino)
    casas.current[destino]?.focus()
  }
  return (
    <div className="space-y-2 p-3">
      {dispatch && (
        <Escolha
          label="A letra que você escreve"
          valor={letra}
          opcoes={[
            { id: '#', label: '# bloco' },
            { id: 'o', label: 'o moeda' },
            { id: '.', label: '. vazio' },
          ]}
          onChange={setLetra}
        />
      )}
      {/* ⚠️⚠️ `w-0 min-w-full`: a rolagem de lado só existe se esta caixa NÃO empurrar a largura de
          quem está em volta. No player o palco mora num `<fieldset>`, que cresce até o conteúdo mais
          largo (`min-inline-size: min-content`): sem isto a cena inteira passava da moldura num
          celular e era cortada, a paleta junto, sem rolagem nenhuma. */}
      <div className="w-0 min-w-full overflow-x-auto">
        {/* ⚠️ A largura do desenho em pixels: cada casa fica com os 44 do alvo de toque. */}
        {/* ⚠️ A moldura já sabe a própria largura antes de medir (a caixa é fixa, menos a borda de 1px de
            cada lado): no celular a coluna é MENOR que ela, e a letra sairia do tamanho da coluna. */}
        <div
          className="mx-auto"
          style={{ width: TILEMAP_VIEW.w, maxWidth: 'none' }}
          data-parte-da-cena={TILEMAP_VIEW.w - 2}
        >
          <LarguraConhecidaDaCena.Provider value={TILEMAP_VIEW.w - 2}>
            <SceneCanvas
              className="relative"
              view={TILEMAP_VIEW}
              interativo={Boolean(dispatch)}
              cast={cast}
              mundo={mundo}
              titulo="O mapa escrito com letras e o desenho que nasce dele"
              descricao={`Seis linhas de dez casas. ${quantos(moedas, 'moeda', 'moedas')} no mapa. ${pouso === null ? 'A coluna do Dino não tem chão.' : `O Dino está em cima do bloco da linha ${pouso + 1}.`}`}
              overlay={
                dispatch ? (
                  <div
                    // ⚠️ `grid`/`row`/`gridcell` (consertos do review da onda B do lote 5): com grupos, o leitor
                    // de tela no modo de navegação não repassava as setas nem anunciava linha e coluna.
                    role="grid"
                    aria-label="O texto do mapa. As setas andam entre as casas."
                    className="absolute grid grid-rows-6"
                    // ⚠️⚠️ Em PORCENTAGEM do desenho, e não em pixels: no player a moldura perde a borda
                    // (a faixa de estado a cola), e um pixel de diferença desalinhava a 10ª coluna.
                    style={{
                      left: `${(MAPA_TEXTO.x / TILEMAP_VIEW.w) * 100}%`,
                      top: `${(MAPA_TEXTO.y / TILEMAP_VIEW.h) * 100}%`,
                      width: `${((CASA * 10) / TILEMAP_VIEW.w) * 100}%`,
                      height: `${((CASA * 6) / TILEMAP_VIEW.h) * 100}%`,
                    }}
                    onKeyDown={mover}
                  >
                    {rows.map((linha, row) => (
                      <div
                        // biome-ignore lint/suspicious/noArrayIndexKey: o mapa tem seis linhas fixas.
                        key={`linha-${row}`}
                        role="row"
                        // ⚠️ Fora do Tab (-1): o foco da grade é o botão de UMA casa (o `foco`).
                        tabIndex={-1}
                        aria-label={`Linha ${row + 1}`}
                        className="grid grid-cols-10"
                      >
                        {[...linha].map((tile, col) => {
                          const i = row * 10 + col
                          return (
                            <div
                              // biome-ignore lint/suspicious/noArrayIndexKey: a grade é fixa, 6 por 10.
                              key={`casa-${row}-${col}`}
                              role="gridcell"
                              tabIndex={-1}
                              className="flex"
                            >
                              <button
                                ref={(el) => {
                                  casas.current[i] = el
                                }}
                                type="button"
                                tabIndex={i === foco ? 0 : -1}
                                aria-label={`Linha ${row + 1}, casa ${col + 1}: ${NOME_DA_LETRA[tile] ?? tile}. Escrever ${NOME_DA_LETRA[letra]}.`}
                                className="block size-full min-h-11 rounded-md bg-transparent hover:bg-primary/10 focus-visible:outline-3 focus-visible:-outline-offset-3 focus-visible:outline-primary"
                                onFocus={() => setFoco(i)}
                                onClick={() =>
                                  dispatch({ type: 'paint-tile', row, col, tile: letra })
                                }
                              />
                            </div>
                          )
                        })}
                      </div>
                    ))}
                  </div>
                ) : undefined
              }
            >
              <rect className="fill-scene-ground" width={TILEMAP_VIEW.w} height={TILEMAP_VIEW.h} />
              <Texto
                className="fill-scene-ink-soft"
                x={MAPA_TEXTO.x}
                y={MAPA_TEXTO.y - 10}
                tamanho={13}
                fontWeight="700"
              >
                o texto
              </Texto>
              {rows.map((linha, row) =>
                [...linha].map((tile, col) => {
                  const acesa = row === lastRow && col === lastCol
                  return (
                    // biome-ignore lint/suspicious/noArrayIndexKey: a grade é fixa, 6 por 10.
                    <g key={`letra-${row}-${col}`} data-letra={`${row}-${col}`}>
                      <rect
                        className={
                          acesa
                            ? 'fill-scene-a-wash stroke-scene-a'
                            : 'fill-scene-card stroke-scene-grid'
                        }
                        x={MAPA_TEXTO.x + col * CASA + 1}
                        y={MAPA_TEXTO.y + row * CASA + 1}
                        width={CASA - 2}
                        height={CASA - 2}
                        rx="6"
                        strokeWidth={acesa ? 3 : 1}
                      />
                      <Texto
                        className="fill-scene-ink"
                        x={MAPA_TEXTO.x + col * CASA + CASA / 2}
                        y={MAPA_TEXTO.y + row * CASA + CASA / 2 + 8}
                        textAnchor="middle"
                        tamanho={24}
                        fontWeight="700"
                        fontFamily="ui-monospace, monospace"
                      >
                        {tile}
                      </Texto>
                    </g>
                  )
                }),
              )}
              <Texto
                className="fill-scene-ink-soft"
                x={MAPA_DESENHO.x}
                y={MAPA_DESENHO.y - 10}
                tamanho={13}
                fontWeight="700"
              >
                o desenho
              </Texto>
              <FundoDoCenario
                cenario={mundo}
                x={MAPA_DESENHO.x}
                y={MAPA_DESENHO.y}
                w={CASA * 10}
                h={CASA * 6}
                detalhe="calmo"
              />
              {rows.map((linha, row) =>
                [...linha].map((tile, col) => {
                  const x = MAPA_DESENHO.x + col * CASA
                  const y = MAPA_DESENHO.y + row * CASA
                  const acesa = row === lastRow && col === lastCol
                  return (
                    // biome-ignore lint/suspicious/noArrayIndexKey: a grade é fixa, 6 por 10.
                    <g key={`peca-${row}-${col}`} data-peca={tile}>
                      {tile === '#' && (
                        // ⚠️ No espaço o bloco é de ROCHA (consertos do review da onda B do lote 5): a nave
                        // pousava num caixote de madeira.
                        <rect
                          className={!cenarioTemChao(mundo) ? 'fill-scene-rock' : 'fill-scene-bark'}
                          x={x + 1}
                          y={y + 1}
                          width={CASA - 2}
                          height={CASA - 2}
                          rx="4"
                        />
                      )}
                      {tile === 'o' && (
                        <circle
                          className="fill-scene-b stroke-scene-flame-deep"
                          strokeWidth="2"
                          cx={x + CASA / 2}
                          cy={y + CASA / 2}
                          r={CASA / 4}
                        />
                      )}
                      {acesa && (
                        // ⚠️ Tracejado na casa APAGADA (consertos do review da onda B do lote 5): cheio, o
                        // contorno azul num quadrado vazio parecia um bloco de vidro.
                        <rect
                          data-casa-acesa={tile}
                          className="fill-none stroke-scene-a"
                          x={x + 2}
                          y={y + 2}
                          width={CASA - 4}
                          height={CASA - 4}
                          rx="6"
                          strokeWidth="3"
                          strokeDasharray={tile === '.' ? '6 5' : undefined}
                        />
                      )}
                    </g>
                  )
                }),
              )}
              <g className="text-primary" opacity={pouso === null ? 0.5 : 1}>
                <ActorFigure
                  figure={actorFigure(cast, 'hero')}
                  x={MAPA_DESENHO.x + TILEMAP_DINO_COLUMN * CASA + CASA / 2}
                  y={MAPA_DESENHO.y + (pouso === null ? 6 * CASA : pouso * CASA)}
                  escala={0.62}
                />
              </g>
              {/* A legenda: uma palavra por letra, espaçadas (o SVG junta os espaços de um texto só). */}
              {(['.', '#', 'o'] as const).map((letraDaLegenda, i) => (
                <Texto
                  key={`legenda-${letraDaLegenda}`}
                  className="fill-scene-ink"
                  x={TILEMAP_VIEW.w / 2 + (i - 1) * 140}
                  y={TILEMAP_VIEW.h - 14}
                  textAnchor="middle"
                  tamanho={15}
                  fontWeight="700"
                  fontFamily="ui-monospace, monospace"
                >
                  {`${letraDaLegenda} ${NOME_DA_LETRA[letraDaLegenda]}`}
                </Texto>
              ))}
            </SceneCanvas>
          </LarguraConhecidaDaCena.Provider>
        </div>
      </div>
      {/* ⚠️ No celular o mapa passa da tela e nada avisava que ele continua para o lado (consertos do
          review da onda B do lote 5). A partir de `sm` as dez colunas cabem. */}
      <p className="text-sm text-muted-foreground sm:hidden">
        Arraste o mapa para o lado para ver as dez colunas.
      </p>
    </div>
  )
}
