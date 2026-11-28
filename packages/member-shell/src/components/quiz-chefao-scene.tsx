'use client'
import {
  actorFigure,
  BOSS_HEALTH,
  openScene,
  type SceneAction,
  type SceneCast,
  type SceneState,
  sceneNativeCast,
  stepScene,
} from '@sistemazero/core/learning/scene'
import { FundoDoCenario } from './scene-arte'
import { BossHealthStage } from './scene-boss-health'
import { SceneCanvas, Texto } from './scene-canvas'
import { SceneCenarioProvider, useSceneCenario } from './scene-cenario-context'
import { Note } from './scene-discovery-frame'
import { ActorFigure } from './scene-figures'

/**
 * As cenas de previsão que este componente desenha. Fora da lista, ele cai no caso de fábrica em
 * silêncio: `tests/quiz-cenas-do-manifesto.test.ts` confere a lista com o `manifest-quiz.ts` do core.
 */
export const CHEFAO_QUIZ_SCENES = [
  'chefao-um-tiro',
  'chefao-sem-retirada',
  'chefao-sem-guarda',
  'chefao-guarda',
] as const
type ChefaoScene = (typeof CHEFAO_QUIZ_SCENES)[number]
type ChefaoScene2d = Exclude<ChefaoScene, 'chefao-sem-retirada' | 'chefao-guarda'>

/** O elenco da aula: a nave e o chefão (um nome que não diz figura: o palco desenha o asteroide). */
export const CHEFAO_CAST: SceneCast = {
  hero: { name: 'nave', gender: 'f' },
  obstacle: { name: 'chefão', gender: 'm' },
}

const START = { scene: 'boss-health' } as const
const run = (actions: SceneAction[]) =>
  actions.reduce<SceneState>((s, a) => stepScene(START, s, a), openScene(START))
const DISPARAR: SceneAction = { type: 'boss-fire' }
const QUADRO: SceneAction = { type: 'boss-frame' }
const vezes = (n: number, action: SceneAction): SceneAction[] =>
  Array.from({ length: n }, () => action)

/** Quantos quadros passam depois da queda, na pergunta sem a guarda. */
const QUADROS_SEM_GUARDA = 3

/**
 * O caso de cada pergunta 2D do Poder "Chefão com resistência" que roda no MESMO motor da
 * experiência (`boss-health`: o chefão começa com 5 de vida, cada "Disparar" tira 1, no 0 ele cai e
 * o placar ganha 10; cada "Avançar um quadro" roda a regra do prêmio de novo).
 *
 * ⚠️ A Guarda do prêmio abre DESLIGADA, e trocá-la recomeça a partida: por isso nenhuma das duas
 * sequências mexe nela.
 * - `chefao-um-tiro`: antes do teste, a partida nova (vida 5, nenhum laser). Depois, um "Disparar":
 *   a vida vai a 4 e o chefão continua lá.
 * - `chefao-sem-guarda`: antes do teste, cinco "Disparar" (a vida acabou de chegar a 0, o chefão
 *   caiu e o placar está em 10). Depois, três "Avançar um quadro": o placar vai a 40.
 */
export function chefaoQuizState(scene: ChefaoScene2d, revealed: boolean): SceneState {
  if (scene === 'chefao-um-tiro') return run(revealed ? [DISPARAR] : [])
  return run([
    ...vezes(BOSS_HEALTH.life, DISPARAR),
    ...(revealed ? vezes(QUADROS_SEM_GUARDA, QUADRO) : []),
  ])
}

/**
 * A pergunta `chefao-sem-retirada`: sem o bloco que tira o laser do grupo `tiros` no acerto, o
 * MESMO laser continua dentro do chefão e o encontro conta de novo a cada quadro. O motor da
 * experiência sempre tira o laser, então este caso é um desenho próprio: a vida depois de cada
 * quadro. Antes do teste, nenhum quadro passou (a vida em 5); depois, 4, 3, 2, 1 e 0.
 */
export function chefaoSemRetiradaVidas(revealed: boolean): number[] {
  if (!revealed) return []
  const vidas: number[] = []
  for (let vida = BOSS_HEALTH.life; vida > 0; ) {
    vida-- // o laser continua no grupo: encosta de novo e tira mais 1
    vidas.push(vida)
  }
  return vidas
}

/** A patrulha (3D) da Aula 2: o placar começa em 15 e o chefão tem 1 de vida. */
export const GUARDA = { placar: 15, vida: 1, quadros: 3 } as const

/**
 * A pergunta 3D (`chefao-guarda`): o prêmio dentro do `Se chefaoDerrotado = falso`. Antes do teste,
 * o placar em 15 e o chefão com 1 de vida, um laser quase encostando. Depois, o laser tira a última
 * vida e a regra roda três quadros: no primeiro o prêmio soma e a guarda vira verdadeiro; nos
 * outros, nada soma.
 */
export function chefaoGuardaPlacar(revealed: boolean): {
  vida: number
  derrotado: boolean
  quadros: number[]
  placar: number
} {
  if (!revealed) return { vida: GUARDA.vida, derrotado: false, quadros: [], placar: GUARDA.placar }
  const vida = GUARDA.vida - 1
  let placar: number = GUARDA.placar
  let derrotado = false
  const quadros: number[] = []
  for (let i = 0; i < GUARDA.quadros; i++) {
    if (vida <= 0 && !derrotado) {
      placar += BOSS_HEALTH.prize
      derrotado = true
    }
    quadros.push(placar)
  }
  return { vida, derrotado, quadros, placar }
}

/** O que cada caso mostra, antes e depois do teste (a mesma frase vai ao leitor de tela). */
const DESCRICOES = {
  'chefao-um-tiro': [
    'O chefão espera no alto da tela, com 5 de vida, e a barra mostra os 5 pedaços. A nave está embaixo e ainda não disparou. Agora um laser vai sair e encostar no chefão.',
    'O laser acertou o chefão e saiu do grupo tiros. A vida foi de 5 para 4, e a barra perdeu um pedaço. O chefão continua lá: um laser só não basta.',
  ],
  'chefao-sem-retirada': [
    'Falta o bloco que tira o laser do grupo tiros no acerto. Um laser acabou de encostar no chefão, que ainda tem 5 de vida. O laser continua no grupo tiros, e o jogo vai rodar mais quadros.',
    'O laser ficou dentro do chefão, e a cada quadro o encontro contou de novo: a vida foi para 4, 3, 2, 1 e 0. No quinto quadro o chefão caiu. Um laser só levou toda a vida.',
  ],
  'chefao-sem-guarda': [
    'O prêmio não tem a guarda chefaoDerrotado. A vida do chefão acabou de chegar a 0: o chefão caiu, e o placar está em 10. O jogo vai rodar mais quadros.',
    'Passaram 3 quadros, e em cada um a vida continuava em 0: o prêmio somou 10 de novo a cada quadro. O placar foi para 20, 30 e 40, e não para de subir.',
  ],
  'chefao-guarda': [
    'Na patrulha, o placar está em 15, e o chefão tem 1 de vida. Um laser está quase encostando nele. O prêmio fica dentro do Se chefaoDerrotado = falso, e chefaoDerrotado ainda é falso.',
    'O laser tirou a última vida, e o chefão caiu. No primeiro quadro o prêmio somou 10, o placar foi para 25 e chefaoDerrotado virou verdadeiro. Nos quadros seguintes o placar ficou em 25: a guarda não deixou o prêmio somar de novo.',
  ],
} as const

/** A demonstração é a mesma para qualquer resposta; quem corrige é o servidor. */
export function ChefaoQuizScene({ scene, result }: { scene: string; result: boolean }) {
  const caso: ChefaoScene =
    scene === 'chefao-sem-retirada' || scene === 'chefao-sem-guarda' || scene === 'chefao-guarda'
      ? scene
      : 'chefao-um-tiro'
  return (
    <div
      className="sz-discovery-quiz-scene"
      aria-live="polite"
      data-chefao-sem-retirada={caso === 'chefao-sem-retirada' ? '' : undefined}
      data-chefao-guarda={caso === 'chefao-guarda' ? '' : undefined}
    >
      <SceneCenarioProvider cenario="nave">
        {caso === 'chefao-sem-retirada' ? (
          <ChefaoSemRetirada result={result} />
        ) : caso === 'chefao-guarda' ? (
          <ChefaoGuarda result={result} />
        ) : (
          <BossHealthStage state={chefaoQuizState(caso, result)} cast={CHEFAO_CAST} />
        )}
      </SceneCenarioProvider>
      <Note label={result ? 'O que aconteceu' : 'Antes do teste'}>
        {DESCRICOES[caso][result ? 1 : 0]}
      </Note>
    </div>
  )
}

const COR_DO_LASER = '#ff6b6b'
const COR_DA_VIDA = '#4ade80'

/** A barra de vida do chefão, com um gomo por ponto de vida (a mesma do palco 2D, no tamanho pedido). */
function Barra({ x, y, largura, vida }: { x: number; y: number; largura: number; vida: number }) {
  const gomo = largura / BOSS_HEALTH.life
  const altura = largura >= 100 ? 10 : 7
  return (
    <g data-barra={vida}>
      <rect
        x={x - largura / 2 - 2}
        y={y - 2}
        width={largura + 4}
        height={altura + 4}
        rx={3}
        fill="#1f2937"
        stroke="#f8fafc"
        strokeWidth={1.5}
      />
      {Array.from({ length: BOSS_HEALTH.life }, (_, i) => (
        <rect
          // biome-ignore lint/suspicious/noArrayIndexKey: os gomos são posições fixas da barra.
          key={i}
          x={x - largura / 2 + i * gomo + 1}
          y={y}
          width={gomo - 2}
          height={altura}
          rx={1.5}
          fill={i < vida ? COR_DA_VIDA : '#475569'}
        />
      ))}
    </g>
  )
}

/** O lugar de onde o chefão caiu: o contorno tracejado e a seta da queda. */
function ChefaoCaiu({ x, y, r }: { x: number; y: number; r: number }) {
  return (
    <g data-chefao-caiu>
      <circle
        cx={x}
        cy={y}
        r={r}
        fill="none"
        stroke="#f8fafc"
        strokeOpacity={0.7}
        strokeWidth={2}
        strokeDasharray="5 4"
      />
      <path
        d={`M ${x + r + 8} ${y - 8} l 0 ${r} l -5 -7 m 5 7 l 5 -7`}
        fill="none"
        stroke="#f8fafc"
        strokeOpacity={0.7}
        strokeWidth={2}
      />
    </g>
  )
}

/** Um laser parado, em pé (o desenho do tiro da nave). */
function Laser({ x, y, altura }: { x: number; y: number; altura: number }) {
  return (
    <rect
      data-laser
      x={x - 3}
      y={y - altura / 2}
      width={6}
      height={altura}
      rx={3}
      fill={COR_DO_LASER}
      stroke="#7f1d1d"
      strokeWidth={1}
    />
  )
}

/** O cartão do alto, com o que falta no código e o que isso deixa acontecer. */
function Cartao({ titulo, linha, estreito }: { titulo: string; linha: string; estreito: boolean }) {
  return (
    <>
      <rect
        x={12}
        y={12}
        width={536}
        height={48}
        rx={10}
        className="fill-scene-card stroke-scene-line"
      />
      <Texto x={24} y={33} tamanho={estreito ? 16 : 14} fontWeight="700" className="fill-scene-ink">
        {titulo}
      </Texto>
      <Texto x={24} y={52} tamanho={estreito ? 14 : 12} className="fill-scene-ink-soft">
        {linha}
      </Texto>
    </>
  )
}

const QUADRO_SR = { w: 100, passo: 108, x0: 14, y: 70, h: 222 } as const

/**
 * A pergunta `chefao-sem-retirada`: antes do teste, o chefão grande com 5 de vida e um laser que
 * acabou de encostar nele, dentro da caixa do grupo `tiros`. Depois, uma fileira de quadros: o MESMO
 * laser dentro do chefão em cada um, a vida descendo de um em um, e no último o chefão caído.
 */
function ChefaoSemRetirada({ result }: { result: boolean }) {
  const actors = sceneNativeCast('boss-health', CHEFAO_CAST)
  const mundo = useSceneCenario(actors, 'boss-health')
  const vidas = chefaoSemRetiradaVidas(result)
  const descricao = result
    ? `O mesmo laser dentro do chefão em ${vidas.length} quadros seguidos. A vida em cada quadro: ${vidas.join(', ')}. No último, o chefão caiu.`
    : `O chefão no alto, com ${BOSS_HEALTH.life} de vida, e um laser encostado nele, ainda no grupo tiros. A nave embaixo.`
  return (
    <SceneCanvas
      cast={actors}
      mundo={mundo}
      titulo="O laser que continua no grupo tiros"
      descricao={descricao}
    >
      {(palco) => (
        <>
          <FundoDoCenario cenario={mundo} w={560} h={300} detalhe="calmo" />
          <Cartao
            titulo="Sem o bloco que tira o laser do grupo"
            linha="o laser continua no grupo tiros"
            estreito={palco.estreito}
          />
          {result ? (
            vidas.map((vida, i) => {
              const x0 = QUADRO_SR.x0 + i * QUADRO_SR.passo
              const cx = x0 + QUADRO_SR.w / 2
              return (
                <g key={`vida-${vida}`} data-quadro-sem-retirada={i + 1} data-vida={vida}>
                  <rect
                    x={x0}
                    y={QUADRO_SR.y}
                    width={QUADRO_SR.w}
                    height={QUADRO_SR.h}
                    rx={10}
                    className={
                      vida === 0
                        ? 'fill-scene-card stroke-scene-alert'
                        : 'fill-scene-card stroke-scene-line'
                    }
                    fillOpacity={0.88}
                    strokeWidth={vida === 0 ? 3 : 2}
                  />
                  <Texto
                    x={cx}
                    y={QUADRO_SR.y + 22}
                    tamanho={palco.estreito ? 14 : 12}
                    fontWeight="700"
                    textAnchor="middle"
                    className="fill-scene-ink"
                  >
                    {`Quadro ${i + 1}`}
                  </Texto>
                  <Barra x={cx} y={QUADRO_SR.y + 36} largura={70} vida={vida} />
                  {vida > 0 ? (
                    <ActorFigure
                      figure={actorFigure(actors, 'obstacle')}
                      x={cx}
                      y={QUADRO_SR.y + 96}
                      escala={0.85}
                    />
                  ) : (
                    <ChefaoCaiu x={cx} y={QUADRO_SR.y + 96} r={22} />
                  )}
                  <Laser x={cx} y={QUADRO_SR.y + 112} altura={20} />
                  <Texto
                    x={cx}
                    y={QUADRO_SR.y + 170}
                    tamanho={palco.estreito ? 17 : 15}
                    fontWeight="800"
                    textAnchor="middle"
                    className={vida === 0 ? 'fill-scene-alert' : 'fill-scene-ink'}
                  >
                    {`Vida ${vida}`}
                  </Texto>
                  <Texto
                    x={cx}
                    y={QUADRO_SR.y + 200}
                    tamanho={palco.estreito ? 13 : 11}
                    textAnchor="middle"
                    className="fill-scene-ink-soft"
                  >
                    {vida === 0 ? 'o chefão caiu' : 'o laser ainda lá'}
                  </Texto>
                </g>
              )
            })
          ) : (
            <>
              <Barra x={280} y={86} largura={120} vida={BOSS_HEALTH.life} />
              <Texto
                x={350}
                y={95}
                tamanho={palco.estreito ? 16 : 14}
                fontWeight="800"
                className="fill-scene-ink"
              >
                {`Vida ${BOSS_HEALTH.life}`}
              </Texto>
              <g data-chefao={BOSS_HEALTH.life}>
                <ActorFigure
                  figure={actorFigure(actors, 'obstacle')}
                  x={280}
                  y={140}
                  escala={1.4}
                />
              </g>
              <g data-grupo="tiros" data-no-grupo={1}>
                <rect
                  x={262}
                  y={164}
                  width={36}
                  height={40}
                  rx={8}
                  fill="none"
                  className="stroke-scene-line"
                  strokeWidth={2}
                  strokeDasharray="5 3"
                />
                <Laser x={280} y={182} altura={24} />
                <Texto
                  x={306}
                  y={192}
                  tamanho={palco.estreito ? 15 : 13}
                  fontWeight="700"
                  className="fill-scene-ink"
                >
                  tiros
                </Texto>
              </g>
              <ActorFigure figure={actorFigure(actors, 'hero')} x={280} y={262} escala={0.75} />
            </>
          )}
        </>
      )}
    </SceneCanvas>
  )
}

const QUADRO_G = { w: 120, passo: 132, x0: 88, y: 168, h: 58 } as const
const CHEFAO_3D = { x: 280, y: 112 } as const

/**
 * A pergunta 3D (`chefao-guarda`): a patrulha, com o chefão no alto, a nave embaixo e a caixa da
 * variável `chefaoDerrotado`. Antes do teste, o placar em 15, o texto "Chefão: 1" e um laser quase
 * encostando. Depois, o chefão caiu e três quadros mostram o placar: 25, 25, 25.
 */
function ChefaoGuarda({ result }: { result: boolean }) {
  const actors = sceneNativeCast('boss-health', CHEFAO_CAST)
  const mundo = useSceneCenario(actors, 'boss-health')
  const { vida, derrotado, quadros, placar } = chefaoGuardaPlacar(result)
  const descricao = result
    ? `O chefão caiu. O placar em cada quadro: ${quadros.join(', ')}. chefaoDerrotado = verdadeiro.`
    : `Placar ${placar}. O chefão no alto, com o texto Chefão: ${vida}, e um laser quase encostando nele. chefaoDerrotado = falso.`
  return (
    <SceneCanvas cast={actors} mundo={mundo} titulo="O prêmio com a guarda" descricao={descricao}>
      {(palco) => (
        <>
          <FundoDoCenario cenario={mundo} w={560} h={300} detalhe="calmo" />
          <rect
            x={12}
            y={12}
            width={palco.estreito ? 200 : 184}
            height={54}
            rx={10}
            className="fill-scene-card stroke-scene-line"
          />
          <Texto
            x={24}
            y={33}
            tamanho={palco.estreito ? 16 : 14}
            fontWeight="700"
            className="fill-scene-ink"
          >
            Patrulha (3D)
          </Texto>
          <Texto
            data-placar={placar}
            x={24}
            y={55}
            tamanho={palco.estreito ? 14 : 12}
            className="fill-scene-ink-soft"
          >
            {`Placar: ${placar}`}
          </Texto>
          <g data-variavel="chefaoDerrotado" data-valor={derrotado ? 'verdadeiro' : 'falso'}>
            <rect
              x={palco.estreito ? 356 : 376}
              y={12}
              width={palco.estreito ? 192 : 172}
              height={54}
              rx={10}
              className={
                derrotado
                  ? 'fill-scene-card stroke-scene-alert'
                  : 'fill-scene-card stroke-scene-line'
              }
              strokeWidth={derrotado ? 3 : 2}
            />
            <Texto
              x={palco.estreito ? 368 : 388}
              y={33}
              tamanho={palco.estreito ? 15 : 13}
              fontWeight="700"
              className="fill-scene-ink"
            >
              chefaoDerrotado
            </Texto>
            <Texto
              x={palco.estreito ? 368 : 388}
              y={55}
              tamanho={palco.estreito ? 15 : 13}
              fontWeight="700"
              className={derrotado ? 'fill-scene-alert' : 'fill-scene-ink'}
            >
              {`= ${derrotado ? 'verdadeiro' : 'falso'}`}
            </Texto>
          </g>
          {result ? (
            <>
              <ChefaoCaiu x={CHEFAO_3D.x} y={CHEFAO_3D.y - 12} r={26} />
              {quadros.map((valor, i) => {
                const x0 = QUADRO_G.x0 + i * QUADRO_G.passo
                return (
                  <g
                    // biome-ignore lint/suspicious/noArrayIndexKey: a posição é o quadro depois da queda.
                    key={i}
                    data-quadro-guarda={i + 1}
                    data-placar={valor}
                  >
                    <rect
                      x={x0}
                      y={QUADRO_G.y}
                      width={QUADRO_G.w}
                      height={QUADRO_G.h}
                      rx={10}
                      className="fill-scene-card stroke-scene-line"
                      strokeWidth={2}
                    />
                    <Texto
                      x={x0 + QUADRO_G.w / 2}
                      y={QUADRO_G.y + 21}
                      tamanho={palco.estreito ? 14 : 12}
                      textAnchor="middle"
                      className="fill-scene-ink-soft"
                    >
                      {`Quadro ${i + 1}`}
                    </Texto>
                    <Texto
                      x={x0 + QUADRO_G.w / 2}
                      y={QUADRO_G.y + 46}
                      tamanho={palco.estreito ? 18 : 16}
                      fontWeight="800"
                      textAnchor="middle"
                      className="fill-scene-ink"
                    >
                      {`Placar: ${valor}`}
                    </Texto>
                  </g>
                )
              })}
            </>
          ) : (
            <>
              <g data-chefao={vida}>
                <ActorFigure
                  figure={actorFigure(actors, 'obstacle')}
                  x={CHEFAO_3D.x}
                  y={CHEFAO_3D.y}
                  escala={1.1}
                />
              </g>
              <Texto
                data-texto-chefao={vida}
                x={CHEFAO_3D.x + 42}
                y={CHEFAO_3D.y + 6}
                tamanho={palco.estreito ? 16 : 14}
                fontWeight="800"
                className="fill-scene-ink"
              >
                {`Chefão: ${vida}`}
              </Texto>
              <Laser x={CHEFAO_3D.x} y={CHEFAO_3D.y + 52} altura={22} />
              <path
                d={`M ${CHEFAO_3D.x} ${CHEFAO_3D.y + 98} L ${CHEFAO_3D.x} ${CHEFAO_3D.y + 68}`}
                fill="none"
                stroke={COR_DO_LASER}
                strokeOpacity={0.7}
                strokeWidth={2}
                strokeDasharray="6 5"
              />
            </>
          )}
          <ActorFigure figure={actorFigure(actors, 'hero')} x={280} y={262} escala={0.75} />
        </>
      )}
    </SceneCanvas>
  )
}
