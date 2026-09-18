'use client'

import type { SceneCast, SceneState } from '@sistemazero/core/learning/scene'
import {
  actorFigure,
  DELTA_RACE,
  POOL_CROSSING,
  quantos,
  sceneBrainLabel,
  sceneCenario,
} from '@sistemazero/core/learning/scene'
import { FundoDoCenario } from './scene-arte'
// ⚠️ O `VIEW` vem do canvas: os desenhos leem o enquadramento para encostar no chão e na borda.
import { SceneCanvas, Texto, SCENE_VIEW as VIEW } from './scene-canvas'
import { ActorFigure, pisoDoMundo } from './scene-figures'

/**
 * Os palcos do MOTOR (lote 5 do Raio-X, 16/09/2026): `pool`, `entity-state`, `delta-time` e
 * `circle-collision`. Saíram do `scene-engine-stages` junto com o redesenho.
 *
 * ⭐⭐ A régua do redesenho é DESENHAR O INVISÍVEL. Nas quatro o palco antigo mostrava um número ou uma
 * cor, e o mecanismo que a cena ensina morava na frase escrita embaixo: o corpo reaproveitado, o que
 * cada personagem faz, os quadros de cada computador e os raios da conta. Agora o mecanismo é o
 * desenho: o número pintado em cada cacto, a pose de cada torre, uma pegada por quadro desenhado e os
 * dois raios deitados em fila embaixo da distância.
 *
 * ⚠️ O par de comparação segue nas duas cores de sempre (A azul `scene-a`, B laranja `scene-b`).
 */

/* ── pool ────────────────────────────────────────────────────────────────────────────────── */

/** Onde o cacto entra e onde sai, na pista. A travessia é da direita para a esquerda. */
const POOL_PISTA = { entrada: 510, saida: 60 } as const
/**
 * Quantos dos que saíram a pilha desenha; os mais antigos viram "+N". ⚠️ Sete, e não oito: com o "+N" na
 * frente, o oitavo passava da borda da caixa da pilha.
 */
const PILHA_MAX = 7

/** O cacto da reciclagem: os fabricados, o número pintado em cada um e a pilha dos que saíram. */
export function PoolStage({ state, cast }: { state: SceneState; cast?: SceneCast }) {
  const { onScreen, progress, created, last, recycling } = state.nursery
  const obstaculo = actorFigure(cast, 'obstacle')
  const mundo = sceneCenario(cast, 'pool')
  const piso = pisoDoMundo(mundo, 250)
  // ⚠️ A pilha é todo fabricado que não é o da tela: sem reciclagem cada saída empilha um, reciclando
  // o mesmo volta e a pilha fica como estava.
  const saiu = Math.max(0, created - (onScreen > 0 ? 1 : 0))
  const pilha = Array.from(
    { length: Math.min(saiu, PILHA_MAX) },
    (_, i) => saiu - Math.min(saiu, PILHA_MAX) + i + 1,
  )
  const escondidos = saiu - pilha.length
  const x =
    POOL_PISTA.entrada - (progress / POOL_CROSSING) * (POOL_PISTA.entrada - POOL_PISTA.saida)
  // ⚠️ O arco da volta só no INSTANTE da volta (os primeiros quadros da travessia): aceso o tempo todo,
  // ele virava enfeite e deixava de dizer "este acabou de voltar".
  const voltando = last === 'voltou' && onScreen > 0 && progress <= 2
  return (
    <SceneCanvas
      cast={cast}
      mundo={mundo}
      titulo="A pista dos cactos e a pilha dos que já saíram"
      descricao={`${onScreen > 0 ? `Na pista, o cacto nº ${onScreen}.` : 'Nenhum cacto na pista.'} Na pilha dos que já saíram: ${quantos(saiu, 'cacto', 'cactos')}. Reciclar quem saiu: ${recycling ? 'ligado' : 'desligado'}.`}
      // ⭐ Uma frase NEUTRA do desenho (lote 5): o rodapé antigo era a regra ("um conta o que existe…").
      rodape="O número pintado é o nome de cada cacto."
    >
      <FundoDoCenario
        cenario={mundo}
        w={VIEW.w}
        h={VIEW.h}
        chao={piso}
        detalhe="calmo"
        semDetalhe={[{ x: 12, y: 10, w: 290, h: 96 }]}
      />
      {/* A PILHA dos que saíram: pequenos e apagados, cada um com o número dele. */}
      <g data-pilha={saiu}>
        <rect
          className="fill-scene-card stroke-scene-card-line"
          x={16}
          y={12}
          width={282}
          height={92}
          rx={12}
          strokeWidth="1.5"
        />
        <Texto className="fill-scene-ink-soft" x={30} y={32} tamanho={13} fontWeight="700">
          já saíram
        </Texto>
        {escondidos > 0 && (
          <Texto className="fill-scene-ink-soft" x={30} y={86} tamanho={13} fontWeight="700">
            +{escondidos}
          </Texto>
        )}
        {pilha.map((n, i) => (
          <g key={`saiu-${n}`} data-saiu={n}>
            <ActorFigure
              figure={obstaculo}
              x={(escondidos > 0 ? 82 : 46) + i * 30}
              y={84}
              escala={0.42}
              ghost
            />
            {/* ⚠️ 13, e não 11 (consertos do review da onda B do lote 5): 10,3px já na coluna de 600px. */}
            <Texto
              className="fill-scene-ink"
              x={(escondidos > 0 ? 82 : 46) + i * 30}
              y={99}
              textAnchor="middle"
              tamanho={13}
              fontWeight="700"
            >
              {n}
            </Texto>
          </g>
        ))}
      </g>
      {/* A entrada e a saída da pista. ⚠️ ACIMA do arco da volta (consertos do review da onda B do lote
          5): em `piso - 76` a ponta da seta caía em cima do "e" de "entrada". */}
      <Texto
        className="fill-scene-ink-soft"
        x={POOL_PISTA.entrada + 18}
        y={piso - 96}
        textAnchor="end"
        tamanho={12}
      >
        entrada
      </Texto>
      <Texto className="fill-scene-ink-soft" x={POOL_PISTA.saida - 34} y={piso - 96} tamanho={12}>
        saída
      </Texto>
      {voltando && (
        <path
          data-volta
          className="stroke-scene-a"
          d={`M${POOL_PISTA.saida} ${piso - 60}C${POOL_PISTA.saida + 60} 118 ${POOL_PISTA.entrada - 60} 118 ${POOL_PISTA.entrada} ${piso - 60}`}
          strokeWidth="3"
          fill="none"
          strokeDasharray="7 6"
        />
      )}
      {voltando && (
        <path className="fill-scene-a" d={`M${POOL_PISTA.entrada} ${piso - 52}l-9 -14h18Z`} />
      )}
      {onScreen > 0 && (
        <g data-cacto-da-tela={onScreen}>
          <ActorFigure figure={obstaculo} x={x} y={piso} />
          {/* ⭐ O número PINTADO: um selo claro no corpo, para ler em qualquer figura do elenco. */}
          <circle
            className="fill-scene-card stroke-scene-ink"
            cx={x}
            cy={piso - 34}
            r={13}
            strokeWidth="2"
          />
          <Texto
            className="fill-scene-ink"
            x={x}
            y={piso - 29}
            textAnchor="middle"
            tamanho={14}
            fontWeight="800"
          >
            {onScreen}
          </Texto>
        </g>
      )}
    </SceneCanvas>
  )
}

/* ── entity-state ────────────────────────────────────────────────────────────────────────── */

/**
 * As três torres, de onde sai o centro de cada uma. ⚠️ Puxadas para a esquerda do meio (lote 5): o alvo
 * mora à DIREITA de cada torre, e com a 3ª em 464 o alvo dela saía cortado na borda do palco.
 */
const TORRES_X = [84, 260, 436] as const
const MEIO_DAS_TORRES = TORRES_X[1]
const BASE_DA_TORRE = 246

/**
 * Uma torre na POSE do estado dela. ⚠️⚠️ As poses diferem em SILHUETA, e não só em cor (lote 5): parada
 * com o cano reto, mirando com o cano no alvo e a linha da mira, atirando com o clarão e o tiro no ar,
 * recarregando com o cano baixo e a barra enchendo. O relógio anima (o tiro anda, a barra enche).
 */
function Torre({ cx, estado, tique }: { cx: number; estado: string; tique: number }) {
  const cabeca = { x: cx, y: BASE_DA_TORRE - 52 }
  const angulo = estado === 'mirar' || estado === 'atirar' ? -35 : estado === 'recarregar' ? 28 : 0
  const rad = (angulo * Math.PI) / 180
  const cano = 46
  const boca = { x: cabeca.x + Math.cos(rad) * cano, y: cabeca.y + Math.sin(rad) * cano }
  const alvo = { x: cabeca.x + Math.cos(rad) * 108, y: cabeca.y + Math.sin(rad) * 108 }
  const ativa = estado !== 'parado'
  return (
    <g data-torre={estado}>
      {(estado === 'mirar' || estado === 'atirar') && (
        <g data-alvo>
          <circle
            className="fill-scene-card stroke-scene-alert"
            cx={alvo.x}
            cy={alvo.y}
            r={15}
            strokeWidth="3"
          />
          <circle className="fill-scene-alert" cx={alvo.x} cy={alvo.y} r={5} />
        </g>
      )}
      {estado === 'mirar' && (
        <path
          className="stroke-scene-alert"
          d={`M${boca.x} ${boca.y}L${alvo.x} ${alvo.y}`}
          strokeWidth="2"
          strokeDasharray="5 5"
        />
      )}
      <path
        className={ativa ? 'fill-scene-a' : 'fill-scene-ink-soft'}
        d={`M${cx - 36} ${BASE_DA_TORRE}H${cx + 36}L${cx + 24} ${BASE_DA_TORRE - 34}H${cx - 24}Z`}
      />
      <path
        className={ativa ? 'stroke-scene-a' : 'stroke-scene-ink-soft'}
        d={`M${cabeca.x} ${cabeca.y}L${boca.x} ${boca.y}`}
        strokeWidth="12"
        strokeLinecap="round"
      />
      <circle
        className={
          ativa ? 'fill-scene-a-wash stroke-scene-a' : 'fill-scene-grid stroke-scene-ink-soft'
        }
        cx={cabeca.x}
        cy={cabeca.y}
        r={22}
        strokeWidth="3"
      />
      {estado === 'atirar' && (
        <g data-tiro>
          <path
            className="fill-scene-flame"
            d={`M${boca.x} ${boca.y}m-9 0l6 -4 3 -8 3 8 6 4 -6 4 -3 8 -3 -8Z`}
          />
          {/* O tiro anda a cada quadro do relógio: três lugares no caminho até o alvo. */}
          <circle
            className="fill-scene-flame-core stroke-scene-flame-deep"
            cx={boca.x + Math.cos(rad) * (18 + (tique % 3) * 18)}
            cy={boca.y + Math.sin(rad) * (18 + (tique % 3) * 18)}
            r={6}
            strokeWidth="2"
          />
        </g>
      )}
      {estado === 'recarregar' && (
        <g data-recarga>
          <rect
            className="fill-scene-card stroke-scene-ink-soft"
            x={cx - 32}
            y={cabeca.y - 46}
            width={64}
            height={12}
            rx={6}
            strokeWidth="2"
          />
          <rect
            className="fill-scene-a"
            x={cx - 30}
            y={cabeca.y - 44}
            width={(60 * ((tique % 3) + 1)) / 3}
            height={8}
            rx={4}
          />
        </g>
      )}
    </g>
  )
}

/** As três torres, cada uma na pose do próprio estado, e onde o estado mora. */
export function EntityStateStage({ state, cast }: { state: SceneState; cast?: SceneCast }) {
  const { states, ticks, shared } = state.brains
  return (
    <SceneCanvas
      cast={cast}
      titulo="As três torres e o que cada uma está fazendo"
      descricao={`${states.map((e, i) => `a ${i + 1}ª ${sceneBrainLabel(e)}`).join(', ')}.${shared ? ' O estado mora no jogo.' : ''}`}
      // ⚠️ SEM rodapé (lote 2 do Raio-X): "O estado não é do jogo: é de cada um." respondia a previsão.
    >
      <path className="fill-scene-grass" d={`M0 ${BASE_DA_TORRE}H${VIEW.w}V${VIEW.h}H0Z`} />
      {/* ⭐ Com o estado NO JOGO, um balão só em cima, ligado às três: é a crença errada desenhada. */}
      {shared && (
        <g data-estado-do-jogo>
          <rect
            className="fill-scene-card stroke-scene-a"
            x={MEIO_DAS_TORRES - 100}
            y={8}
            width={200}
            height={34}
            rx={12}
            strokeWidth="2"
          />
          <Texto
            className="fill-scene-a"
            x={MEIO_DAS_TORRES}
            y={30}
            textAnchor="middle"
            tamanho={14}
            fontWeight="700"
          >
            o jogo: {sceneBrainLabel(states[0] ?? 'parado')}
          </Texto>
          {TORRES_X.map((x) => (
            <path
              key={`fio-${x}`}
              className="stroke-scene-a"
              d={`M${MEIO_DAS_TORRES} 42L${x} ${BASE_DA_TORRE - 100}`}
              strokeWidth="1.5"
              strokeDasharray="4 5"
              opacity={0.6}
            />
          ))}
        </g>
      )}
      {states.map((estado, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: são três torres fixas, 1ª à 3ª.
        <g key={`torre-${i + 1}`}>
          <Torre cx={TORRES_X[i] ?? 84} estado={estado} tique={ticks} />
          <Texto
            className={estado === 'parado' ? 'fill-scene-ink-soft' : 'fill-scene-a'}
            x={TORRES_X[i] ?? 84}
            y={BASE_DA_TORRE + 30}
            textAnchor="middle"
            tamanho={15}
            fontWeight="700"
          >
            {i + 1}ª · {sceneBrainLabel(estado)}
          </Texto>
        </g>
      ))}
    </SceneCanvas>
  )
}

/* ── delta-time ──────────────────────────────────────────────────────────────────────────── */

/** A pista inteira cabe na tela: da largada à chegada. ⚠️ Sem teto de desenho que desminta o número. */
const PISTA = { largada: 44, chegada: 470 } as const
const naPista = (pos: number) =>
  PISTA.largada +
  (Math.min(pos, DELTA_RACE.chegada) / DELTA_RACE.chegada) * (PISTA.chegada - PISTA.largada)

/** A corrida: dois computadores, as pegadas de cada quadro desenhado e a bandeira da chegada. */
export function DeltaTimeStage({ state, cast }: { state: SceneState; cast?: SceneCast }) {
  const { mode, fastX, slowX, fastFrames, slowFrames } = state.machines
  const heroi = actorFigure(cast, 'hero')
  const mundo = sceneCenario(cast, 'delta-time')
  const { chegada, passo } = DELTA_RACE
  const pistas = [
    {
      nome: 'computador rápido',
      y: 118,
      pos: fastX,
      quadros: fastFrames,
      passo,
      tom: 'text-scene-a',
      marca: 'fill-scene-a',
    },
    {
      nome: 'computador devagar',
      y: 240,
      pos: slowX,
      quadros: slowFrames,
      passo: mode === 'seconds' ? passo * 2 : passo,
      tom: 'text-scene-b-ink',
      marca: 'fill-scene-b',
    },
  ]
  return (
    <SceneCanvas
      cast={cast}
      mundo={mundo}
      titulo="A corrida do mesmo jogo em dois computadores"
      // ⚠️ "marcas", e não "pegadas" (consertos do review da onda B do lote 5): uma nave não deixa pegada.
      descricao={`O Dino anda a cada ${mode === 'frames' ? 'quadro' : 'segundo'}. O rápido está em ${fastX}, com ${quantos(fastFrames, 'marca', 'marcas')}; o devagar em ${slowX}, com ${quantos(slowFrames, 'marca', 'marcas')}. A chegada é ${chegada}.`}
      // ⚠️ SEM rodapé (lote 2 do Raio-X): "As duas se afastaram" é o rótulo de uma meta.
    >
      {(palco) => (
        <>
          <FundoDoCenario cenario={mundo} w={VIEW.w} h={VIEW.h} detalhe="calmo" />
          {pistas.map((pista) => {
            const chegou = pista.pos >= chegada
            return (
              <g key={pista.nome} data-pista={pista.nome} data-pegadas={pista.quadros}>
                {/* ⚠️ O nome ACIMA do caminho do Dino (review do lote 2): em cima dele o desenho o cobria. */}
                <Texto
                  className="fill-scene-ink-soft"
                  x={PISTA.largada - 14}
                  y={pista.y - 72}
                  tamanho={13}
                >
                  {pista.nome}
                </Texto>
                <path
                  className="stroke-scene-line"
                  d={`M${PISTA.largada - 14} ${pista.y + 4}H${PISTA.chegada + 30}`}
                  strokeWidth="2"
                />
                {/* ⭐ Uma PEGADA por quadro desenhado, no lugar em que o Dino pisou naquele quadro. */}
                {Array.from({ length: Math.min(pista.quadros, 60) }, (_, k) => (
                  <rect
                    // biome-ignore lint/suspicious/noArrayIndexKey: a pegada k é o quadro k, em ordem.
                    key={`pegada-${k + 1}`}
                    className={pista.marca}
                    x={naPista((k + 1) * pista.passo) - 2}
                    y={pista.y + 10}
                    width={4}
                    height={10}
                    rx={2}
                    opacity={0.8}
                  />
                ))}
                {/* ⚠️ A NAVE vai DEITADA, com o bico para a chegada (consertos do review da onda B do lote 5): a
                figura nasce de pé, e andava pela pista com o bico para cima. Gira no meio da altura dela
                (62), então ela fica acima da pista como o Dino. */}
                <g
                  className={pista.tom}
                  transform={
                    heroi === 'nave'
                      ? `rotate(90 ${naPista(pista.pos) + 12} ${pista.y - 31})`
                      : undefined
                  }
                >
                  <ActorFigure figure={heroi} x={naPista(pista.pos) + 12} y={pista.y} />
                </g>
                {chegou && (
                  <Texto
                    className="fill-scene-ink"
                    // ⚠️ No estreito, embaixo das marcas e encostado na borda direita por dentro (conserto
                    // "letra no celular"): ao lado do Dino, na letra de 12px, "chegou!" saía cortado.
                    x={palco.estreito ? VIEW.w - 4 : PISTA.chegada + 34}
                    y={palco.estreito ? pista.y + 26 + palco.letra(13) : pista.y - 22}
                    textAnchor={palco.estreito ? 'end' : 'start'}
                    tamanho={13}
                    fontWeight="700"
                  >
                    chegou!
                  </Texto>
                )}
              </g>
            )
          })}
          {/* A chegada: a linha e a bandeira. */}
          <path
            className="stroke-scene-rule"
            d={`M${PISTA.chegada} 34V${VIEW.h - 22}`}
            strokeWidth="3"
            strokeDasharray="8 6"
          />
          <path className="stroke-scene-ink" d={`M${PISTA.chegada} 14V40`} strokeWidth="2" />
          <path className="fill-scene-alert" d={`M${PISTA.chegada} 14l24 7-24 7Z`} />
          <Texto
            className="fill-scene-ink-soft"
            x={PISTA.chegada - 6}
            y={26}
            textAnchor="end"
            tamanho={12}
          >
            chegada
          </Texto>
        </>
      )}
    </SceneCanvas>
  )
}

/* ── circle-collision ────────────────────────────────────────────────────────────────────── */

/** Quanto cada unidade da conta vale no desenho. ⚠️ Os círculos SÃO os da conta: mesmo número. */
const ESCALA_DOS_CIRCULOS = 1.6

/**
 * A colisão escrita à mão: dois círculos, o raio de cada um, a distância entre os centros e os dois
 * raios DEITADOS em fila embaixo dela. A batida é a ponta da fila alcançar o outro centro.
 */
export function CircleCollisionStage({ state, cast }: { state: SceneState; cast?: SceneCast }) {
  const { distance, a, b } = state.circles
  const soma = a + b
  const encostando = distance <= soma
  const s = ESCALA_DOS_CIRCULOS
  // ⚠️ O centro azul fica FIXO onde cabe o maior raio (60 × 1,6 = 96) com folga: com 90, o círculo de
  // raio 60 saía cortado na borda esquerda. O maior caso (distância 200, raios 60) termina em 528 de 560.
  const ax = 112
  const bx = ax + distance * s
  const ra = a * s
  const rb = b * s
  const cy = 128
  const fila = cy + Math.max(ra, rb) + 34
  return (
    <SceneCanvas
      cast={cast}
      titulo="Os dois círculos, os raios e a distância entre os centros"
      descricao={`Distância entre os centros ${Math.round(distance)}. Raios ${a} e ${b}, que somam ${soma}. ${encostando ? 'A fila dos raios alcança o outro centro.' : 'A fila dos raios ainda não alcança o outro centro.'}`}
      // ⭐ Frase neutra do desenho (lote 5): o rodapé antigo era a regra, e neste palco nem era verdade.
      rodape="A fila embaixo são os dois raios deitados."
    >
      <circle className="fill-scene-a-wash stroke-scene-a" cx={ax} cy={cy} r={ra} strokeWidth="2" />
      <circle
        className="fill-scene-b-wash stroke-scene-b"
        cx={bx}
        cy={cy}
        r={rb}
        strokeWidth="2"
        fillOpacity={0.5}
      />
      {/* ⭐ O RAIO de cada um, do centro até a borda, na cor dele (para baixo, fora da linha da distância). */}
      <path
        data-raio="a"
        className="stroke-scene-a"
        d={`M${ax} ${cy}V${cy + ra}`}
        strokeWidth="4"
        strokeLinecap="round"
      />
      <path
        data-raio="b"
        className="stroke-scene-b"
        d={`M${bx} ${cy}V${cy + rb}`}
        strokeWidth="4"
        strokeLinecap="round"
      />
      <path
        className={encostando ? 'stroke-scene-alert' : 'stroke-scene-rule'}
        d={`M${ax} ${cy}H${bx}`}
        strokeWidth="3"
      />
      <circle className="fill-scene-a" cx={ax} cy={cy} r="5" />
      <circle className="fill-scene-b" cx={bx} cy={cy} r="5" />
      {/* ⚠️ O número ACIMA dos dois círculos (lote 5): no meio da linha ele caía em cima da borda azul. */}
      <Texto
        className="fill-scene-ink"
        x={(ax + bx) / 2}
        y={Math.max(18, cy - Math.max(ra, rb) - 10)}
        textAnchor="middle"
        tamanho={15}
        fontWeight="700"
      >
        distância {Math.round(distance)}
        {/* ⚠️ "bateu" COLADO à distância, logo acima do ponto de contato (consertos do review da onda B
            do lote 5): no canto de cima à direita ele ficava a uns 300px da batida. */}
        {encostando && (
          <tspan data-bateu className="fill-scene-alert" fontWeight="800">
            {' '}
            · bateu
          </tspan>
        )}
      </Texto>
      {/* ⭐ A FILA dos raios, começando no centro azul: a batida é a ponta dela chegar na guia. */}
      <path
        className="stroke-scene-rule"
        d={`M${bx} ${cy}V${fila + 16}`}
        strokeWidth="1.5"
        strokeDasharray="4 4"
      />
      <path
        className="stroke-scene-rule"
        d={`M${ax} ${cy}V${fila + 16}`}
        strokeWidth="1.5"
        strokeDasharray="4 4"
      />
      <g data-fila={soma}>
        <path
          className="stroke-scene-a"
          d={`M${ax} ${fila}H${ax + ra}`}
          strokeWidth="9"
          strokeLinecap="butt"
        />
        <path
          className="stroke-scene-b"
          d={`M${ax + ra} ${fila}H${ax + ra + rb}`}
          strokeWidth="9"
          strokeLinecap="butt"
        />
        <circle
          className={encostando ? 'fill-scene-alert' : 'fill-scene-ink-soft'}
          cx={ax + ra + rb}
          cy={fila}
          r={6}
        />
      </g>
      <Texto className="fill-scene-ink-soft" x={ax} y={fila + 30} tamanho={13} fontWeight="600">
        {a} + {b} = {soma}
      </Texto>
    </SceneCanvas>
  )
}
