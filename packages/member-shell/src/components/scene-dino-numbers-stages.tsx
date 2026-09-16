'use client'

import {
  actorFigure,
  castText,
  numero,
  quantos,
  RANDOM_SPOTS,
  type SceneAction,
  type SceneCast,
  type SceneState,
  type SceneWorldKind,
  sceneWorld,
} from '@sistemazero/core/learning/scene'
import { type ReactNode, useId } from 'react'
import { SceneButton } from './exploration-stage'
import { SceneCanvas, Texto, usePalco } from './scene-canvas'
import { focarNaBancadaDepoisDeComecar } from './scene-dino-stages'
import { ActorFigure, FundoEspaco, pisoDoMundo } from './scene-figures'

/**
 * Os palcos do Corre Dino, segunda metade (lote 5 do Raio-X, 16/09/2026): `restart`, `score`,
 * `random` e `acceleration`. A `hitbox` continua no laboratório (`experience-scene.tsx`), que tem a
 * régua da batida.
 *
 * ⭐⭐ Eles moravam no palco COMPARTILHADO do `exploration-stage`, que desenhava para os quatro a
 * mesma pista com caixas de área, alça ↔, setas soltas no céu e cactos empilhados em 500. Cada um
 * agora desenha o que a descoberta pede: a pista com os cactos da partida anterior, o placar das
 * três telas, a régua do sorteio com as marquinhas e as raias da corrida, e a fileira de cactos
 * com o número colado em cada um.
 *
 * ⚠️ O enquadramento é o do palco do Corre Dino (600 × 310, o chão em 238), o mesmo dos palcos da
 * primeira metade (`scene-dino-stages.tsx`): uma aula passa de uma cena à outra sem o mundo mudar
 * de tamanho. ⚠️ Toda figura de papel passa por `ActorFigure(actorFigure(cast, papel))` (lote 3), e
 * o que cada palco desenha é a tabela `SCENE_ROLES` do core.
 * ⚠️ Todo número com sinal usa `numero` (o sinal de menos do conteúdo, U+2212).
 */

const STAGE = { w: 600, h: 310 } as const
const CHAO = 238
/** O x do jogo (0 a 480) no palco: o Dino da pista fica em 60, que é o 120 do desenho. */
const naPista = (x: number) => 60 + x

const TELA: Record<string, string> = { start: 'INÍCIO', playing: 'JOGANDO', end: 'FIM DA PARTIDA' }

/** O fundo da pista: grama e pontinhos na terra, céu de estrelas no espaço. */
function Pista({
  mundo,
  semEstrelas = [],
}: {
  mundo: SceneWorldKind
  semEstrelas?: readonly { x: number; y: number; w: number; h: number }[]
}) {
  const id = useId()
  if (mundo === 'espaco') return <FundoEspaco w={STAGE.w} h={STAGE.h} semEstrelas={semEstrelas} />
  return (
    <>
      <defs>
        <pattern id={`${id}-dots`} width="24" height="24" patternUnits="userSpaceOnUse">
          <circle className="fill-scene-grid" cx="2" cy="2" r="1" />
        </pattern>
      </defs>
      <rect width={STAGE.w} height={STAGE.h} fill={`url(#${id}-dots)`} opacity="0.35" />
      <path className="fill-scene-grass" d={`M0 ${CHAO}H${STAGE.w}V${STAGE.h}H0Z`} />
      <path className="stroke-scene-line" d={`M0 ${CHAO}H${STAGE.w}`} strokeWidth="2" />
    </>
  )
}

function Selo({ children }: { children: ReactNode }) {
  return (
    <Texto className="fill-scene-ink" x="20" y="28" tamanho={13} fontWeight="600">
      {children}
    </Texto>
  )
}

/** Um cartão de número no alto, à direita: o contador que a cena quer à vista. */
function Cartao({
  rotulo,
  valor,
  alerta = false,
  apagado = false,
}: {
  rotulo: string
  valor: string
  alerta?: boolean
  /** O número em cinza: o placar parado esperando a partida (consertos da onda A). */
  apagado?: boolean
}) {
  const { estreito, letra } = usePalco()
  /**
   * ⚠️ O rótulo com " · " que não cabe na largura do cartão PARTE em dois (conserto "letra no celular"): o
   * nome em cima e o resto ("esperando") embaixo do número, e o cartão cresce. Numa linha só, "SEU PLACAR
   * · esperando" passava da borda do cartão e do desenho.
   */
  const [nome = rotulo, ...resto] = rotulo.split(' · ')
  // ⚠️ Pelo `estreito`, e não pela estimativa de largura: na coluna do computador o cartão é o de sempre.
  const partido = estreito && resto.length > 0
  const embaixo = 74 + letra(13) + 6
  return (
    <g transform="translate(404 18)">
      <rect
        className={
          alerta
            ? 'fill-scene-card stroke-scene-alert'
            : apagado
              ? 'fill-scene-card stroke-scene-rule'
              : 'fill-scene-card stroke-scene-a'
        }
        width="176"
        height={partido ? embaixo + 10 : 92}
        rx="16"
        strokeWidth="2"
      />
      <Texto className="fill-scene-ink-soft" x="88" y="26" textAnchor="middle" tamanho={13}>
        {partido ? nome : rotulo}
      </Texto>
      {partido && (
        <Texto className="fill-scene-ink-soft" x="88" y={embaixo} textAnchor="middle" tamanho={13}>
          {resto.join(' · ')}
        </Texto>
      )}
      <Texto
        className={alerta ? 'fill-scene-alert' : apagado ? 'fill-scene-ink-soft' : 'fill-scene-a'}
        x="88"
        y="74"
        textAnchor="middle"
        tamanho={40}
        fontWeight="700"
      >
        {valor}
      </Texto>
    </g>
  )
}

/**
 * O cartão da BASE da `acceleration`. ⚠️ No estreito (conserto "letra no celular") o rótulo fica só
 * "base" e a conta PARTE em duas linhas na seta: na letra de 12px, "base: velocidade dos novos" e
 * "−9 > −9? não → fica" passavam das duas bordas do cartão.
 */
function CartaoDaBase({
  rotulo,
  base,
  conta,
  alerta,
}: {
  rotulo: string
  base: number
  conta: string
  alerta: boolean
}) {
  const { estreito, letra } = usePalco()
  // ⚠️ Pelo `estreito`, e não pela estimativa de largura: na coluna do computador o cartão é o de sempre.
  const nome = estreito ? 'base' : rotulo
  // A conta parte na seta ("−9 > −9?" / "→ fica") ou nos dois-pontos ("sem a condição:" / "some −1").
  const trechos = conta.includes(' → ')
    ? conta.split(' → ').map((trecho, n) => (n === 0 ? trecho : `→ ${trecho}`))
    : conta.split(': ').map((trecho, n, todos) => (n < todos.length - 1 ? `${trecho}:` : trecho))
  const partida = estreito && trechos.length > 1
  // ⚠️ Com folga de linha: a 2 unidades as duas linhas da conta se encostavam na caixa do texto.
  const linha = letra(14) + 6
  return (
    <g transform="translate(20 48)">
      <rect
        className="fill-scene-card stroke-scene-a"
        width="206"
        height={partida ? 110 + linha + 12 : 140}
        rx="16"
        strokeWidth="2"
      />
      {/* ⚠️ "base" (consertos do review da onda A do lote 5): a instrução, as pistas e as metas dizem
          "base", e o cartão dizia só "velocidade dos novos". */}
      <Texto className="fill-scene-ink-soft" x="103" y="26" textAnchor="middle" tamanho={13}>
        {nome}
      </Texto>
      <Texto
        className="fill-scene-a"
        x="103"
        y={78}
        textAnchor="middle"
        tamanho={44}
        fontWeight="700"
      >
        {numero(base)}
      </Texto>
      {(partida ? trechos : [conta]).map((trecho, n) => (
        <Texto
          key={trecho}
          className={alerta ? 'fill-scene-alert' : 'fill-scene-ink'}
          x="103"
          y={(partida ? 110 : 118) + n * linha}
          textAnchor="middle"
          tamanho={14}
          fontWeight="600"
        >
          {trecho}
        </Texto>
      ))}
    </g>
  )
}

/* ── restart ────────────────────────────────────────────────────────────────────────────────── */

/**
 * `restart` — a pista da partida, com os cactos que ficaram nela.
 *
 * ⭐⭐ Redesenho do lote 5: a cena tinha UM cacto, as caixas pontilhadas das áreas, a alça ↔ e "Ainda
 * estão separadas", que eram da cena da colisão. O que a Aula 9 testa é "nenhum cacto antigo deve
 * permanecer", e agora os cactos antigos são o desenho: na tela de início eles ficam na pista, um
 * pouco apagados, e o contador diz quantos são. ⚠️ O Dino aparece também no INÍCIO (antes a caixa
 * pontilhada dele ficava vazia), e o toque na tela é o gesto em qualquer tela (o `overlay`).
 */
export function RestartStage({
  state,
  cast,
  dispatch,
}: {
  state: SceneState
  cast?: SceneCast
  dispatch?: (action: SceneAction) => void
}) {
  const heroi = actorFigure(cast, 'hero')
  const obstaculo = actorFigure(cast, 'obstacle')
  const mundo = sceneWorld(cast, 'restart')
  const piso = pisoDoMundo(mundo, CHAO)
  const tela = state.match.screen
  const cactos = state.crowd.cacti.filter((c) => c.x <= 480)
  const herdados = tela === 'start' && cactos.length > 0
  return (
    <SceneCanvas
      className="relative"
      view={STAGE}
      cast={cast}
      mundo={mundo}
      titulo="A pista da partida"
      descricao={`${tela === 'start' ? 'Tela de início' : tela === 'end' ? 'Fim da partida' : 'Partida'}, com ${quantos(cactos.length, 'cacto', 'cactos')} na pista.`}
      overlay={
        dispatch && tela !== 'playing' ? (
          <button
            type="button"
            // ⚠️ "do jogo" (consertos do review da onda A do lote 5): o da bancada também se chama "Tocar
            // na tela", e o Tab passava por dois botões com o mesmo nome em seguida.
            aria-label="Tocar na tela do jogo"
            className="absolute inset-0 cursor-pointer rounded-2xl focus-visible:outline-4 focus-visible:-outline-offset-4 focus-visible:outline-primary"
            onClick={(e) => {
              // ⚠️ Ao COMEÇAR, este botão some: o foco vai para a bancada (consertos da onda A, T3).
              if (tela === 'start') focarNaBancadaDepoisDeComecar(e.currentTarget)
              dispatch({ type: 'start', input: 'tap' })
            }}
          />
        ) : undefined
      }
    >
      <Pista
        mundo={mundo}
        semEstrelas={[
          { x: 14, y: 8, w: 200, h: 30 },
          { x: 396, y: 12, w: 196, h: 104 },
        ]}
      />
      <Selo>{TELA[tela]}</Selo>
      <Cartao
        rotulo={castText('cactos na pista', cast)}
        valor={String(cactos.length)}
        alerta={herdados}
      />
      {/* ⚠️ Na tela de início com a pista vazia, o convite (consertos do review da onda A do lote 5): nada
          dizia que a tela É o botão. Com cactos herdados o convite sai, para não cobrir a pista. */}
      {tela === 'start' && cactos.length === 0 && (
        <g>
          <rect
            className="fill-scene-card stroke-scene-card-line"
            x="60"
            y="70"
            width="280"
            height="64"
            rx="16"
            strokeWidth="2"
          />
          <Texto
            className="fill-scene-ink"
            x="200"
            y="110"
            textAnchor="middle"
            tamanho={20}
            fontWeight="700"
          >
            Toque para começar
          </Texto>
        </g>
      )}
      {/* ⚠️ Na tela de início os cactos da partida anterior ficam APAGADOS, mas à vista: é a pista
          que a partida seguinte vai herdar. */}
      {cactos.map((c) => (
        <g key={c.id} opacity={herdados ? 0.45 : 1}>
          <ActorFigure figure={obstaculo} x={naPista(c.x)} y={piso} />
        </g>
      ))}
      <g className="text-primary" opacity={tela === 'end' ? 0.6 : 1}>
        <ActorFigure figure={heroi} x={naPista(60)} y={piso} />
      </g>
      {tela === 'end' && (
        <path
          className="fill-scene-alert"
          transform={`translate(${naPista(94)} ${piso - 44})`}
          d="M0 -16L4 -5L15 -8L8 1L15 10L3 7L0 18L-3 7L-15 10L-8 1L-15 -8L-4 -5Z"
        />
      )}
    </SceneCanvas>
  )
}

/* ── score ──────────────────────────────────────────────────────────────────────────────────── */

/**
 * `score` — as três telas da partida, com o placar à vista e a fileira do que se viu em cada uma.
 *
 * ⭐⭐ Redesenho do lote 5: "▶ Toque para começar" ficava POR CIMA do cartão "SEU PLACAR", justo o
 * número que a criança devia olhar na tela de início. O cartão mora no alto à direita, e a troca de
 * tela é um gesto da bancada ("Próxima tela"). A fileira embaixo guarda o último placar visto em
 * cada tela (`match.seen`), que é a comparação da aula sem depender de memória.
 * ⚠️ Jogando aparece um cacto vindo: a partida acaba por batida, não por um botão abstrato.
 */
export function ScoreStage({
  state,
  cast,
  dispatch,
}: {
  state: SceneState
  cast?: SceneCast
  dispatch?: (action: SceneAction) => void
}) {
  const heroi = actorFigure(cast, 'hero')
  const obstaculo = actorFigure(cast, 'obstacle')
  const mundo = sceneWorld(cast, 'score')
  const piso = pisoDoMundo(mundo, CHAO)
  const tela = state.match.screen
  /** O placar parado na tela de início com a peça dentro de Se jogando (consertos da onda A). */
  const esperando = tela === 'start' && state.match.guarded
  const visto = (i: number) => {
    const v = state.match.seen[i] ?? -1
    return v < 0 ? '–' : String(v)
  }
  const telas = [
    { id: 'start', nome: 'Início' },
    { id: 'playing', nome: 'Jogando' },
    { id: 'end', nome: 'Fim' },
  ] as const
  return (
    <SceneCanvas
      className="relative"
      view={STAGE}
      cast={cast}
      mundo={mundo}
      titulo="A tela do jogo, o placar e o placar de cada tela"
      descricao={`Tela: ${TELA[tela]?.toLowerCase()}. O placar mostra ${state.match.points}${esperando ? ', esperando a partida' : ''}. Visto em cada tela: início ${visto(0)}, jogando ${visto(1)}, fim ${visto(2)}.`}
      overlay={
        // ⚠️⚠️ O convite "Toque para começar" era um desenho MORTO (consertos do review da onda A do lote
        // 5): grande na tela de início, e tocar nele não fazia nada, duas aulas depois de a `restart`
        // ensinar que a tela é o botão. Agora ele é o mesmo gesto do "Próxima tela: Jogando".
        tela === 'start' && dispatch ? (
          <div className="absolute left-[33%] top-[33%] -translate-x-1/2 -translate-y-1/2">
            <SceneButton
              onClick={(e) => {
                focarNaBancadaDepoisDeComecar(e.currentTarget)
                dispatch({ type: 'start', input: 'tap' })
              }}
            >
              Toque para começar
            </SceneButton>
          </div>
        ) : undefined
      }
    >
      <Pista
        mundo={mundo}
        semEstrelas={[
          { x: 14, y: 8, w: 200, h: 30 },
          { x: 396, y: 12, w: 196, h: 104 },
          { x: 20, y: 250, w: 560, h: 52 },
        ]}
      />
      <Selo>{TELA[tela]}</Selo>
      {/* ⚠️ "esperando" em cinza com a peça dentro do Se, na tela de início (consertos do review da onda
          A do lote 5): "no início, esperou" era uma ausência que a imagem não marcava. */}
      <Cartao
        rotulo={esperando ? 'SEU PLACAR · esperando' : 'SEU PLACAR'}
        valor={String(state.match.points)}
        apagado={esperando}
      />
      {/* O desenho do convite fica só na demonstração: na bancada ele é o botão do `overlay`. */}
      {tela === 'start' && !dispatch && (
        <g>
          <rect
            className="fill-scene-card stroke-scene-card-line"
            x="60"
            y="70"
            width="280"
            height="64"
            rx="16"
            strokeWidth="2"
          />
          <Texto
            className="fill-scene-ink"
            x="200"
            y="110"
            textAnchor="middle"
            tamanho={20}
            fontWeight="700"
          >
            Toque para começar
          </Texto>
        </g>
      )}
      {tela !== 'start' && (
        <>
          <g opacity={tela === 'end' ? 0.5 : 1}>
            <ActorFigure figure={obstaculo} x={tela === 'end' ? 178 : 380} y={piso} />
          </g>
          <g className="text-primary" opacity={tela === 'end' ? 0.6 : 1}>
            <ActorFigure figure={heroi} x={130} y={piso} />
          </g>
        </>
      )}
      {/* A fileira do que se viu em cada tela: a tela de agora com o contorno do par. */}
      {telas.map((t, i) => (
        <g key={t.id} transform={`translate(${30 + i * 186} 254)`}>
          <rect
            className={
              t.id === tela
                ? 'fill-scene-card stroke-scene-a'
                : 'fill-scene-card stroke-scene-card-line'
            }
            width="168"
            height="44"
            rx="12"
            strokeWidth={t.id === tela ? 3 : 2}
          />
          <Texto
            className={t.id === tela ? 'fill-scene-a' : 'fill-scene-ink'}
            x="84"
            y="29"
            textAnchor="middle"
            tamanho={17}
            fontWeight="700"
          >
            {t.nome} {visto(i)}
          </Texto>
        </g>
      ))}
    </SceneCanvas>
  )
}

/* ── random ─────────────────────────────────────────────────────────────────────────────────── */

/** A régua do sorteio: o x do jogo de 440 a 580, esticado para caber os sete lugares. */
const naRegua = (x: number) => 60 + (x - 440) * 3.4
const REGUA_Y = 122
/** As raias da corrida: o x do jogo de 300 a 520. */
const naRaia = (x: number) => 60 + (x - 300) * 2.2
const LARGADA = 500

/**
 * `random` — a régua dos lugares sorteados e as raias da corrida de velocidade.
 *
 * ⭐⭐ Redesenho do lote 5: não havia sorteio (quatro exemplos fixos), os cactos de velocidade
 * nasciam em cima do de posição, e as setas flutuavam no céu por ordem de criação. Agora:
 * - em cima, a RÉGUA de onde um cacto pode nascer, com a borda 480 e a parte "fora da tela"
 *   sombreada; cada lugar sorteado ganha uma marquinha, e o lugar que repetiu ganha "2×";
 * - embaixo, uma RAIA por sorteio de velocidade: o cacto larga em 500 e corre 1 segundo, então o de
 *   −6 chega mais longe que o de −5, e a diferença vira distância, com o número colado nele.
 * ⚠️ Sem Dino (`SCENE_ROLES`): a cena é sobre onde e como os cactos nascem.
 */
export function RandomStage({ state, cast }: { state: SceneState; cast?: SceneCast }) {
  const obstaculo = actorFigure(cast, 'obstacle')
  const mundo = sceneWorld(cast, 'random')
  const { spots, samples } = state.speed
  const sorteados = spots.some((n) => n > 0)
  /**
   * ⚠️ Só a ÚLTIMA corrida de cada velocidade (consertos do review da onda A do lote 5): com quatro
   * raias, da terceira em diante os cactos entravam na grama e a última encostava na borda de baixo. A
   * comparação da cena é −5 contra −6, e duas raias bastam; o motor segue guardando as quatro.
   */
  const raias = state.crowd.cacti.filter(
    (c, i, todos) => !todos.slice(i + 1).some((depois) => depois.velocity === c.velocity),
  )
  const lugares = Array.from(
    { length: RANDOM_SPOTS.count },
    (_, i) => RANDOM_SPOTS.first + i * RANDOM_SPOTS.step,
  )
  const marcas = lugares
    .map((x, i) => ({ x, vezes: spots[i] ?? 0 }))
    .filter((marca) => marca.vezes > 0)
  const textoDaRegua = marcas.length
    ? `Na régua: ${marcas.map((marca) => (marca.vezes > 1 ? `${marca.x}, ${marca.vezes} vezes` : String(marca.x))).join('; ')}.`
    : 'A régua ainda não tem marquinha.'
  const nasRaias = raias.length
    ? ` Nas raias: ${raias.map((c) => numero(c.velocity)).join(', ')}.`
    : ''
  return (
    <SceneCanvas
      view={STAGE}
      cast={cast}
      mundo={mundo}
      titulo="A régua do sorteio e as raias da corrida"
      descricao={`${textoDaRegua}${nasRaias}`}
    >
      {(palco) => (
        <>
          <Pista
            mundo={mundo}
            semEstrelas={[
              { x: 14, y: 8, w: 240, h: 30 },
              { x: 40, y: 40, w: 540, h: 120 },
            ]}
          />
          <Selo>{castText('O sorteio de cada cacto', cast)}</Selo>
          {/* A régua: a tela até a borda 480, e o "fora da tela" sombreado depois dela. */}
          <g>
            <rect
              className="fill-scene-card"
              x={naRegua(440)}
              y={REGUA_Y - 62}
              width={naRegua(480) - naRegua(440)}
              height="62"
              opacity="0.7"
            />
            <rect
              className="fill-scene-b-wash"
              x={naRegua(480)}
              y={REGUA_Y - 62}
              width={naRegua(580) - naRegua(480)}
              height="62"
            />
            <Texto
              className="fill-scene-ink-soft"
              x={naRegua(460)}
              y={REGUA_Y - 44}
              textAnchor="middle"
              tamanho={12}
            >
              tela
            </Texto>
            {/* ⚠️ No estreito, encostado na ponta da faixa por dentro: centrado em 560, passava dela. */}
            <Texto
              className="fill-scene-b-ink"
              x={palco.estreito ? naRegua(580) - 6 : naRegua(560)}
              y={REGUA_Y - 44}
              textAnchor={palco.estreito ? 'end' : 'middle'}
              tamanho={12}
              fontWeight="600"
            >
              fora da tela
            </Texto>
            <path
              className="stroke-scene-rule"
              d={`M${naRegua(440)} ${REGUA_Y}H${naRegua(580)}`}
              strokeWidth="2"
            />
            <path
              className="stroke-scene-ink"
              d={`M${naRegua(480)} ${REGUA_Y - 62}V${REGUA_Y + 8}`}
              strokeWidth="2"
              strokeDasharray="5 4"
            />
            <Texto
              className="fill-scene-ink"
              x={naRegua(480)}
              y={REGUA_Y + 24}
              textAnchor="middle"
              tamanho={12}
              fontWeight="600"
            >
              {/* ⚠️ Só o número no estreito: "borda 480" na letra de 12px encostava no 500. */}
              {palco.estreito ? '480' : 'borda 480'}
            </Texto>
            {lugares.map((x, i) => {
              const vezes = spots[i] ?? 0
              const ultimo = sorteados && x === samples.x
              return (
                <g key={x}>
                  <path
                    className="stroke-scene-rule"
                    d={`M${naRegua(x)} ${REGUA_Y}v6`}
                    strokeWidth="1.5"
                  />
                  {/* ⚠️⚠️ No estreito, só 500, 530 e 560 (conserto "letra no celular"): os sete números na letra
                  de 12px se encavalavam ("500510520…"). As sete marquinhas ficam, e o lugar exato do
                  último sorteio está na faixa ("último lugar"). */}
                  {(!palco.estreito || (x - RANDOM_SPOTS.first) % 30 === 0) && (
                    <Texto
                      className="fill-scene-ink-soft"
                      x={naRegua(x)}
                      y={REGUA_Y + 20}
                      textAnchor="middle"
                      tamanho={11}
                    >
                      {x}
                    </Texto>
                  )}
                  {vezes > 0 && (
                    <g>
                      <path
                        className={
                          ultimo
                            ? vezes > 1
                              ? 'fill-scene-alert'
                              : 'fill-scene-a'
                            : 'fill-scene-rule'
                        }
                        d={`M${naRegua(x)} ${REGUA_Y - 2}l-7 -12h14Z`}
                      />
                      {vezes > 1 && (
                        <Texto
                          className={ultimo ? 'fill-scene-alert' : 'fill-scene-ink'}
                          x={naRegua(x)}
                          y={REGUA_Y - 20}
                          textAnchor="middle"
                          tamanho={13}
                          fontWeight="700"
                        >
                          {vezes}×
                        </Texto>
                      )}
                    </g>
                  )}
                </g>
              )
            })}
          </g>
          {/* As raias: a largada em 500, e cada cacto onde chegou em 1 segundo. */}
          {raias.length > 0 && (
            <g>
              <path
                className="stroke-scene-ink"
                d={`M${naRaia(LARGADA)} 162V${162 + raias.length * 36}`}
                strokeWidth="2"
                strokeDasharray="5 4"
              />
              {/* ⚠️ Sem o número (consertos do review da onda A do lote 5): as raias têm outra escala que a
              régua de cima, e "largada 500" ficava logo embaixo do "560" da régua. */}
              {/* ⚠️ Fora do estreito: na letra de 12px ele cobria o 560 da régua, logo acima. A linha
              tracejada continua, e as duas raias saem dela. */}
              {!palco.estreito && (
                <Texto
                  className="fill-scene-ink-soft"
                  x={naRaia(LARGADA)}
                  y="156"
                  textAnchor="middle"
                  tamanho={12}
                >
                  largada
                </Texto>
              )}
              {raias.map((c, i) => {
                const y = 194 + i * 36
                return (
                  <g
                    key={c.id}
                    aria-label={castText(`Cacto ${c.id}, velocidade ${numero(c.velocity)}`, cast)}
                  >
                    <path className="stroke-scene-card-line" d={`M40 ${y}H570`} strokeWidth="1.5" />
                    <path
                      className={c.velocity === -6 ? 'stroke-scene-b' : 'stroke-scene-a'}
                      d={`M${naRaia(LARGADA)} ${y - 8}H${naRaia(c.x)}`}
                      strokeWidth="3"
                      strokeDasharray="2 5"
                      strokeLinecap="round"
                    />
                    <ActorFigure figure={obstaculo} x={naRaia(c.x)} y={y} escala={0.5} />
                    <Texto
                      className={c.velocity === -6 ? 'fill-scene-b-ink' : 'fill-scene-a'}
                      x={naRaia(c.x) - 24}
                      y={y - 6}
                      textAnchor="end"
                      tamanho={15}
                      fontWeight="700"
                    >
                      {numero(c.velocity)}
                    </Texto>
                  </g>
                )
              })}
            </g>
          )}
          {/* O último lugar sorteado ganha o cacto, em cima da régua. */}
          {sorteados && raias.length === 0 && (
            <ActorFigure figure={obstaculo} x={naRegua(samples.x)} y={REGUA_Y + 110} escala={0.8} />
          )}
        </>
      )}
    </SceneCanvas>
  )
}

/* ── acceleration ───────────────────────────────────────────────────────────────────────────── */

/**
 * `acceleration` — a base com a conta da condição, e a fileira de cactos na ordem em que nasceram.
 *
 * ⭐⭐ Redesenho do lote 5: os cactos nasciam todos em 500, empilhados, com as setas soltas no céu
 * sem ligação com o cacto, e a comparação "antigo × novo" dependia de adivinhar qual seta era de
 * quem. Agora cada cacto ganha o lugar dele na FILEIRA, com o número embaixo e a seta do tamanho
 * da velocidade em cima, e ninguém muda de número depois de nascer. A caixa da base escreve a conta
 * do Estúdio ("−7 > −9? sim → some −1"). O cacto de −10 com a base parada ganha "sorteio −1".
 * ⚠️ Sem Dino (`SCENE_ROLES`).
 */
export function AccelerationStage({ state, cast }: { state: SceneState; cast?: SceneCast }) {
  const obstaculo = actorFigure(cast, 'obstacle')
  const mundo = sceneWorld(cast, 'acceleration')
  const { base, limited } = state.speed
  const todos = state.crowd.cacti
  const fileira = todos.slice(-8)
  /**
   * ⚠️⚠️ O −10 só ganha destaque com a base JÁ parada em −9 no passo anterior (consertos do review da
   * onda A do lote 5), que é o critério da meta: o primeiro −10 podia nascer no passo em que a base
   * CHEGA a −9, sair em vermelho com "base −9, sorteio −1", e a meta não cair nem o palpite voltar.
   * Quem estava antes dele na fila nasceu com a base de antes; o primeiro da fila (o motor guarda
   * oito) não tem quem conte, e aí vale a meta.
   */
  const destacado = (id: number) => {
    const i = todos.findIndex((c) => c.id === id)
    const c = todos[i]
    if (!c || c.velocity !== -10 || c.base !== -9) return false
    const anterior = todos[i - 1]
    return anterior ? anterior.base === -9 : state.evidence.discoveries.includes('variation-limit')
  }
  const ultimoDestaque = [...fileira].reverse().find((c) => destacado(c.id))
  const conta = limited
    ? base > -9
      ? `${numero(base)} > −9? sim → some −1`
      : `${numero(base)} > −9? não → fica`
    : 'sem a condição: some −1'
  return (
    <SceneCanvas
      view={STAGE}
      cast={cast}
      mundo={mundo}
      titulo="A base dos novos cactos, e a fileira dos que já nasceram"
      descricao={`A base, a velocidade dos novos, está em ${numero(base)}. ${
        fileira.length
          ? `Na fileira, do primeiro ao último: ${fileira.map((c) => numero(c.velocity)).join(', ')}.`
          : 'A fileira ainda está vazia.'
      }`}
    >
      {(palco) => (
        <>
          <Pista
            mundo={mundo}
            semEstrelas={[
              { x: 14, y: 8, w: 280, h: 30 },
              { x: 16, y: 44, w: 214, h: 150 },
              { x: 236, y: 40, w: 360, h: 230 },
            ]}
          />
          <Selo>{castText('A velocidade dos cactos', cast)}</Selo>
          <CartaoDaBase
            rotulo={castText('base: velocidade dos novos', cast)}
            base={base}
            conta={conta}
            alerta={limited && base <= -9}
          />
          {fileira.map((c, i) => {
            const cx = 268 + i * 44
            const destaque = destacado(c.id)
            const seta = Math.min(40, Math.abs(c.velocity) * 3.6)
            return (
              <g
                key={c.id}
                aria-label={castText(`Cacto ${c.id}, velocidade ${numero(c.velocity)}`, cast)}
              >
                <path
                  className={destaque ? 'stroke-scene-alert' : 'stroke-scene-a'}
                  d={`M${cx + seta / 2} 150H${cx - seta / 2}l6 -5m-6 5l6 5`}
                  strokeWidth="3"
                  fill="none"
                />
                <ActorFigure figure={obstaculo} x={cx} y={214} escala={0.6} />
                <Texto
                  className={destaque ? 'fill-scene-alert' : 'fill-scene-ink'}
                  x={cx}
                  y="234"
                  textAnchor="middle"
                  tamanho={15}
                  fontWeight="700"
                >
                  {numero(c.velocity)}
                </Texto>
              </g>
            )
          })}
          {/* ⚠️⚠️ "base −9, sorteio −1" UMA vez, com uma seta até o último −10 destacado (consertos do review
          da onda A do lote 5): o "sorteio −1" miúdo embaixo de cada cacto encavalava em dois −10
          seguidos ("sorteio −1sorteio −1"), e o rótulo ficava solto com a base já abaixo de −9. */}
          {ultimoDestaque &&
            (() => {
              const cx = 268 + fileira.indexOf(ultimoDestaque) * 44
              // ⚠️ Preso para CABER na largura que ele tem na letra em uso (no celular, ~230 unidades).
              const meia = Math.max(100, palco.larguraDoTexto('base −9, sorteio −1', 14) / 2)
              const x = Math.max(
                236 + meia,
                Math.min(STAGE.w - 10 - meia, Math.max(320, Math.min(520, cx))),
              )
              return (
                <g>
                  <Texto
                    className="fill-scene-alert"
                    x={x}
                    y="112"
                    textAnchor="middle"
                    tamanho={14}
                    fontWeight="700"
                  >
                    base −9, sorteio −1
                  </Texto>
                  <path
                    className="stroke-scene-alert"
                    d={`M${x} 118L${cx} 138`}
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </g>
              )
            })()}
        </>
      )}
    </SceneCanvas>
  )
}
