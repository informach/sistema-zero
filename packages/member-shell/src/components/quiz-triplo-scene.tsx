'use client'
import {
  actorFigure,
  openScene,
  type SceneAction,
  type SceneState,
  SPREAD_SHOT,
  sceneNativeCast,
  spreadShotArrived,
  spreadShotHits,
  stepScene,
} from '@sistemazero/core/learning/scene'
import { FundoDoCenario } from './scene-arte'
import { SceneCanvas, Texto } from './scene-canvas'
import { SceneCenarioProvider, useSceneCenario } from './scene-cenario-context'
import { Note } from './scene-discovery-frame'
import { ActorFigure } from './scene-figures'
import { SpreadShotStage } from './scene-spread-shot'

type TriploScene = 'triplo-juntos' | 'triplo-leque' | 'triplo-um' | 'triplo-grupos'

const START = { scene: 'spread-shot' } as const
const run = (actions: SceneAction[]) =>
  actions.reduce<SceneState>((s, a) => stepScene(START, s, a), openScene(START))
const TRIPLO: SceneAction = { type: 'spread-triple', on: true }
const DISPARAR: SceneAction = { type: 'spread-fire' }
const CHEGAR: SceneAction = { type: 'spread-arrive' }

/**
 * O caso de cada pergunta do Poder "Tiro triplo", rodado no MESMO motor da experiência "O leque de
 * tiros" (`spread-shot`: três pedras paradas no alto, a nave embaixo no meio; o Disparar cria a
 * rajada e "Ver os lasers chegarem" anda os quadros). Antes do teste, a rajada acabou de sair;
 * depois, ela chegou.
 * - `triplo-juntos`: Tiro triplo com desvio 0. Os três lasers sobem no mesmo caminho: só a pedra do
 *   meio é acertada (o primeiro a chegar leva a pedra; os outros dois seguem até o alto).
 * - `triplo-leque`: Tiro triplo com desvio 2 (vx −2, 0 e 2): as três pedras são acertadas.
 * - `triplo-um`: o Triplo chegou a 0, então o tiro é o simples (o Tiro triplo desligado, como abre a
 *   cena): um laser só, que acerta a pedra do meio. Antes do teste a nave ainda não disparou (a
 *   pergunta é quantos lasers saem).
 * - `triplo-grupos` (3D): as três cópias no grupo `tiros` andam com a velocidade do grupo, que sobe
 *   reto. É a rajada de desvio 0, desenhada com o grupo em volta das cópias.
 */
export function triploQuizState(scene: TriploScene, revealed: boolean): SceneState {
  const escolhas: SceneAction[] =
    scene === 'triplo-um'
      ? []
      : scene === 'triplo-leque'
        ? [TRIPLO, { type: 'spread-deviation', deviation: 2 }]
        : [TRIPLO]
  // No triplo-um a pergunta é quantos lasers saem: antes do teste, a nave ainda não disparou.
  if (scene === 'triplo-um') return run(revealed ? [DISPARAR, CHEGAR] : [])
  return run([...escolhas, DISPARAR, ...(revealed ? [CHEGAR] : [])])
}

/** O que cada caso mostra, antes e depois do teste (a mesma frase vai ao leitor de tela). */
const DESCRICOES = {
  'triplo-juntos': [
    'O tiro triplo está ligado, e os três lasers têm vx 0. A nave acabou de disparar: os três lasers saíram um em cima do outro, na ponta da nave. Há três pedras no alto: à esquerda, no meio e à direita.',
    'Os três lasers subiram juntos, no mesmo caminho, e pareciam um só. Só a pedra do meio foi acertada; a da esquerda e a da direita continuam no lugar.',
  ],
  'triplo-leque': [
    'Os três lasers têm vx −2, 0 e 2. A nave acabou de disparar: os três estão na ponta da nave, com as mesmas três pedras no alto.',
    'Cada laser seguiu o seu caminho: o de vx −2 foi para a esquerda, o de vx 0 subiu reto e o de vx 2 foi para a direita. As três pedras foram acertadas.',
  ],
  'triplo-um': [
    'O Triplo chegou a 0, e a nave vai apertar Espaço. Ainda não há laser no ar; há três pedras no alto: à esquerda, no meio e à direita.',
    'Com o Triplo em 0, valeu o senão: saiu um laser só, o de sempre. Ele subiu reto e acertou a pedra do meio. O tiro não sumiu: só voltou a ser simples.',
  ],
  'triplo-grupos': [
    'Na patrulha, o Triplo está ligado e o Espaço criou três cópias do laser, as três no grupo tiros. Elas estão juntas, na ponta da nave.',
    'As cópias pegaram a velocidade do grupo tiros, que sobe reto. As três subiram juntas, no mesmo caminho, e chegaram juntas à pedra do meio. As pedras dos lados continuam no lugar.',
  ],
} as const

/** A demonstração é a mesma para qualquer resposta; quem corrige é o servidor. */
export function TriploQuizScene({ scene, result }: { scene: string; result: boolean }) {
  const caso: TriploScene =
    scene === 'triplo-leque' || scene === 'triplo-um' || scene === 'triplo-grupos'
      ? scene
      : 'triplo-juntos'
  return (
    <div
      className="sz-discovery-quiz-scene"
      aria-live="polite"
      data-triplo-grupos={caso === 'triplo-grupos' ? '' : undefined}
    >
      <SceneCenarioProvider cenario="nave">
        {caso === 'triplo-grupos' ? (
          <TriploGrupos result={result} />
        ) : (
          <SpreadShotStage state={triploQuizState(caso, result)} />
        )}
      </SceneCenarioProvider>
      <Note label={result ? 'O que aconteceu' : 'Antes do teste'}>
        {DESCRICOES[caso][result ? 1 : 0]}
      </Note>
    </div>
  )
}

/** A mesma tela do jogo dentro do palco que o `SpreadShotStage` usa (800 por 480, escala 0,6). */
const ESCALA = 0.6
const px = (x: number) => 40 + x * ESCALA
const py = (y: number) => 10 + y * ESCALA
const NAVE = { x: px(SPREAD_SHOT.ship.x), y: py(SPREAD_SHOT.ship.y) } as const
const COR_DO_LASER = '#ff6b6b'
/** As três cópias lado a lado dentro da caixa do grupo (no jogo elas estão no mesmo lugar). */
const AFASTAMENTO = 8
const LASER = 18
const CAIXA = { w: 40, h: 30 } as const

/**
 * A pergunta 3D (`triplo-grupos`): na patrulha, as três cópias do laser criadas no grupo `tiros`.
 * A conta é a do motor da experiência (a rajada do tiro triplo com desvio 0); o desenho põe a caixa
 * do grupo em volta das três cópias, com o nome dele. Antes do teste, a caixa está na ponta da nave;
 * depois, ela chegou à pedra do meio, com o caminho reto tracejado.
 */
function TriploGrupos({ result }: { result: boolean }) {
  const actors = sceneNativeCast('spread-shot')
  const mundo = useSceneCenario(actors, 'spread-shot')
  const sp = triploQuizState('triplo-grupos', result).spreadShot
  const chegou = spreadShotArrived(sp)
  const acertada = spreadShotHits(sp)[0]
  const fim = sp.volley?.ends.find((end) => end.rock !== null)
  const copias = sp.volley?.vx.length ?? 0
  // O centro da caixa do grupo: na ponta da nave, ou onde a primeira cópia acertou a pedra.
  const centro = chegou && fim ? { x: px(fim.x), y: py(fim.y) + 12 } : { x: NAVE.x, y: NAVE.y - 38 }
  const descricao = chegou
    ? `O grupo tiros chegou à pedra do meio com as ${copias} cópias juntas. ${sp.rocks.filter(Boolean).length} pedras continuam no lugar.`
    : `A nave embaixo, com as ${copias} cópias do laser juntas na ponta, dentro do grupo tiros. Três pedras no alto.`
  return (
    <SceneCanvas
      cast={actors}
      mundo={mundo}
      titulo="As cópias no grupo tiros"
      descricao={descricao}
    >
      {(palco) => (
        <>
          <FundoDoCenario cenario={mundo} w={560} h={300} detalhe="calmo" />
          {SPREAD_SHOT.rocks.map((x, rock) =>
            sp.rocks[rock] ? (
              <ActorFigure
                key={`pedra-${x}`}
                figure={actorFigure(actors, 'obstacle')}
                x={px(x)}
                y={py(SPREAD_SHOT.rockY)}
                escala={0.6}
              />
            ) : (
              <circle
                key={`pedra-${x}`}
                data-pedra-acertada={rock}
                cx={px(x)}
                cy={py(SPREAD_SHOT.rockY)}
                r={(SPREAD_SHOT.rockSize / 2) * ESCALA}
                fill="none"
                stroke={COR_DO_LASER}
                strokeWidth={2}
                strokeDasharray="4 3"
              />
            ),
          )}
          {chegou && (
            <line
              data-caminho-do-grupo={acertada === undefined ? 'saiu' : `pedra-${acertada}`}
              x1={NAVE.x}
              y1={NAVE.y}
              x2={centro.x}
              y2={centro.y + CAIXA.h / 2}
              stroke={COR_DO_LASER}
              strokeOpacity={0.7}
              strokeWidth={2}
              strokeDasharray="6 5"
            />
          )}
          <ActorFigure figure={actorFigure(actors, 'hero')} x={NAVE.x} y={NAVE.y} escala={0.75} />
          <g data-grupo="tiros" data-copias={copias} data-chegou={chegou ? '' : undefined}>
            <rect
              x={centro.x - CAIXA.w / 2}
              y={centro.y - CAIXA.h / 2}
              width={CAIXA.w}
              height={CAIXA.h}
              rx={8}
              className="fill-scene-card stroke-scene-line"
              fillOpacity={0.85}
              strokeWidth={2}
              strokeDasharray="5 3"
            />
            {(sp.volley?.vx ?? []).map((vx, i) => {
              const x = centro.x + (i - (copias - 1) / 2) * AFASTAMENTO
              return (
                <line
                  // biome-ignore lint/suspicious/noArrayIndexKey: a posição é a ordem da cópia.
                  key={i}
                  data-copia={i}
                  data-vx={vx}
                  x1={x}
                  y1={centro.y - LASER / 2}
                  x2={x}
                  y2={centro.y + LASER / 2}
                  stroke={COR_DO_LASER}
                  strokeWidth={4}
                  strokeLinecap="round"
                />
              )
            })}
            <rect
              x={centro.x + CAIXA.w / 2 + 6}
              y={centro.y - 12}
              width={palco.estreito ? 60 : 52}
              height={24}
              rx={8}
              className="fill-scene-card stroke-scene-line"
            />
            <Texto
              x={centro.x + CAIXA.w / 2 + 6 + (palco.estreito ? 30 : 26)}
              y={centro.y + 5}
              tamanho={palco.estreito ? 15 : 13}
              fontWeight="700"
              textAnchor="middle"
              className="fill-scene-ink"
            >
              tiros
            </Texto>
          </g>
          <rect
            x={12}
            y={238}
            width={216}
            height={54}
            rx={10}
            className="fill-scene-card stroke-scene-line"
          />
          <Texto
            x={24}
            y={259}
            tamanho={palco.estreito ? 16 : 14}
            fontWeight="700"
            className="fill-scene-ink"
          >
            Patrulha (3D)
          </Texto>
          <Texto x={24} y={281} tamanho={palco.estreito ? 14 : 12} className="fill-scene-ink-soft">
            {chegou ? 'O grupo tiros sobe reto' : '3 cópias no grupo tiros'}
          </Texto>
        </>
      )}
    </SceneCanvas>
  )
}
