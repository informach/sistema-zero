'use client'
import {
  actorFigure,
  openScene,
  type SceneAction,
  type SceneState,
  sceneNativeCast,
  stepScene,
} from '@sistemazero/core/learning/scene'
import { FundoDoCenario } from './scene-arte'
import { SceneCanvas, Texto } from './scene-canvas'
import { SceneCenarioProvider, useSceneCenario } from './scene-cenario-context'
import { Note } from './scene-discovery-frame'
import { EnemyFireStage } from './scene-enemy-fire'
import { ActorFigure } from './scene-figures'

/**
 * As cenas de previsão que este componente desenha. Fora da lista, ele cai no caso de fábrica em
 * silêncio: `tests/quiz-cenas-do-manifesto.test.ts` confere a lista com o `manifest-quiz.ts` do core.
 */
export const INIMIGO_QUIZ_SCENES = [
  'inimigo-meio',
  'inimigo-segue',
  'inimigo-acerta',
  'inimigo-limpeza',
] as const
type InimigoScene = (typeof INIMIGO_QUIZ_SCENES)[number]
type InimigoScene2d = Exclude<InimigoScene, 'inimigo-limpeza'>

const START = { scene: 'enemy-fire' } as const
const run = (actions: SceneAction[]) =>
  actions.reduce<SceneState>((s, a) => stepScene(START, s, a), openScene(START))
const MEIO_SEGUNDO: SceneAction = { type: 'enemy-tick' }
const PROXIMO_TIRO: SceneAction = { type: 'enemy-next-shot' }
const NA_INIMIGA: SceneAction = { type: 'enemy-origin', origin: 'enemy' }
const vezes = (n: number, action: SceneAction): SceneAction[] =>
  Array.from({ length: n }, () => action)

/**
 * O caso de cada pergunta 2D do Poder "Inimigo que atira", rodado no MESMO motor da experiência
 * (`enemy-fire`: a inimiga anda um passo do caminho 300, 400, 500, 600, 500, 400, 300, 200 por
 * tique, atira a cada 3 tiques e o tiro desce 90 por tique, chegando à fileira da nave em 4).
 *
 * ⚠️ A inimiga atira no MESMO tique em que chega ao lugar do tiro, e todo tiro fica 5 tiques no ar:
 * fora da abertura (tiques 0 a 2), sempre há um tiro antigo no ar. Por isso as duas perguntas de
 * origem abrem na partida nova, sem tiro nenhum, para a tela não entregar a resposta.
 * - `inimigo-meio`: origem no meio (a do começo) e a nave à direita, longe da coluna do meio. Antes
 *   do teste, a partida nova (inimiga em 300, à esquerda, sem tiro). Depois, cinco "Avançar até o
 *   próximo tiro" (tique 15): a inimiga chegou à ponta esquerda (200) e atirou; o tiro nasceu no
 *   meio (400), longe dela, e o tiro de antes desce na mesma coluna.
 * - `inimigo-segue`: origem na inimiga. Antes do teste, dois meios segundos (inimiga em 500, indo
 *   para a ponta direita, sem tiro). Depois, mais um (tique 3): a inimiga está em 600 e o tiro nasce
 *   embaixo dela.
 * - `inimigo-acerta`: origem na inimiga e a nave à direita (600). Dois tiros (tique 6): o do tique 3
 *   saiu da ponta direita e está logo acima da nave, com 3 vidas; o novo saiu à esquerda. Depois,
 *   meio segundo: o tiro encosta, sai e a nave fica com 2 vidas.
 */
export function inimigoQuizState(scene: InimigoScene2d, revealed: boolean): SceneState {
  if (scene === 'inimigo-meio')
    return run([{ type: 'enemy-ship', x: 600 }, ...(revealed ? vezes(5, PROXIMO_TIRO) : [])])
  if (scene === 'inimigo-segue') return run([NA_INIMIGA, ...vezes(revealed ? 3 : 2, MEIO_SEGUNDO)])
  return run([
    NA_INIMIGA,
    { type: 'enemy-ship', x: 600 },
    ...vezes(2, PROXIMO_TIRO),
    ...(revealed ? [MEIO_SEGUNDO] : []),
  ])
}

/** A patrulha (3D) da Aula 2: a inimiga atira a cada 1,5 segundo; o tiro passa da nave com 3. */
export const LIMPEZA = { intervalo: 1.5, passa: 3, antes: 3, depois: 9 } as const

/**
 * A pergunta 3D (`inimigo-limpeza`): sem o bloco que tira do grupo os tiros que passaram da nave,
 * todo tiro que a inimiga criou continua no grupo `tirosInimigos`. Antes do teste, 3 segundos (dois
 * tiros vindo); depois, 9 segundos: seis tiros, quatro deles já atrás da câmera.
 */
export function inimigoLimpezaGrupo(revealed: boolean): {
  segundos: number
  tiros: { saiu: number; idade: number; passou: boolean }[]
} {
  const segundos = revealed ? LIMPEZA.depois : LIMPEZA.antes
  const quantos = Math.floor(segundos / LIMPEZA.intervalo)
  const tiros = Array.from({ length: quantos }, (_, i) => {
    const saiu = (i + 1) * LIMPEZA.intervalo
    const idade = segundos - saiu
    return { saiu, idade, passou: idade >= LIMPEZA.passa }
  })
  return { segundos, tiros }
}

/** O que cada caso mostra, antes e depois do teste (a mesma frase vai ao leitor de tela). */
const DESCRICOES = {
  'inimigo-meio': [
    'O x do tiro é 395, um número fixo: a origem está no meio. A inimiga patrulha o alto pelo caminho tracejado e agora está à esquerda. A partida acabou de começar, e ainda não há tiro no ar.',
    'A inimiga chegou à ponta esquerda e atirou. O tiro nasceu no meio da tela, longe dela, na mesma coluna do tiro de antes: com o x fixo em 395, todo tiro sai do mesmo lugar.',
  ],
  'inimigo-segue': [
    'Agora o x do tiro é o centro x da inimiga menos 5: a origem está na inimiga. A inimiga está à direita, indo para a ponta direita, e ainda não atirou.',
    'A inimiga chegou à ponta direita e atirou. O tiro nasceu embaixo dela, na ponta direita: o centro x da inimiga foi lido na hora em que o tiro nasceu.',
  ],
  'inimigo-acerta': [
    'A nave tem 3 vidas e está embaixo, à direita. Um tiro da inimiga está logo acima da nave e chega a ela no próximo meio segundo. Lá no alto, outro tiro acabou de sair, à esquerda.',
    'O tiro encostou na nave e saiu do grupo tirosInimigos. A nave ficou com 2 vidas, e a partida continua. O outro tiro segue descendo, longe da nave.',
  ],
  'inimigo-limpeza': [
    'Na patrulha, a inimiga atira a cada 1,5 segundo, e falta o bloco que tira do grupo os tiros que passam da nave. Com 3 segundos, dois tiros estão vindo, os dois no grupo tirosInimigos.',
    'Depois de 9 segundos, a inimiga atirou seis vezes, e os seis tiros estão no grupo tirosInimigos. Dois ainda estão vindo. Os outros quatro já passaram da nave e continuam no grupo, atrás da câmera, onde ninguém vê.',
  ],
} as const

/** A demonstração é a mesma para qualquer resposta; quem corrige é o servidor. */
export function InimigoQuizScene({ scene, result }: { scene: string; result: boolean }) {
  const caso: InimigoScene =
    scene === 'inimigo-segue' || scene === 'inimigo-acerta' || scene === 'inimigo-limpeza'
      ? scene
      : 'inimigo-meio'
  return (
    <div
      className="sz-discovery-quiz-scene"
      aria-live="polite"
      data-inimigo-limpeza={caso === 'inimigo-limpeza' ? '' : undefined}
    >
      <SceneCenarioProvider cenario="nave">
        {caso === 'inimigo-limpeza' ? (
          <InimigoLimpeza result={result} />
        ) : (
          <EnemyFireStage state={inimigoQuizState(caso, result)} />
        )}
      </SceneCenarioProvider>
      <Note label={result ? 'O que aconteceu' : 'Antes do teste'}>
        {DESCRICOES[caso][result ? 1 : 0]}
      </Note>
    </div>
  )
}

const COR_DA_INIMIGA = '#b04cff'
const COR_DO_TIRO = '#ff4d6d'
/** A coluna da patrulha no palco de 560 por 300: a inimiga longe, no alto; a nave perto, embaixo. */
const COLUNA = 290
const INIMIGA_Y = 40
const NAVE_Y = 192
const CAMERA_Y = 224
/** Onde está um tiro que ainda vem, pela idade: nasce embaixo da inimiga e chega à nave com 3 s. */
const tiroY = (idade: number) => 62 + (idade / LIMPEZA.passa) * (NAVE_Y - 30 - 62)
/** Os tiros que passaram ficam atrás da câmera, dois a dois (o mais antigo mais longe). */
const ATRAS = [
  { x: COLUNA - 14, y: 274 },
  { x: COLUNA + 14, y: 274 },
  { x: COLUNA - 14, y: 246 },
  { x: COLUNA + 14, y: 246 },
] as const

/** A inimiga vista de longe, no alto da patrulha (o mesmo disco do palco 2D, menor). */
function InimigaAoLonge() {
  return (
    <g data-inimiga-3d transform={`translate(${COLUNA} ${INIMIGA_Y})`}>
      <ellipse cx={0} cy={-5} rx={9} ry={7} fill="#e9d5ff" stroke="#3b0764" strokeWidth={2} />
      <ellipse
        cx={0}
        cy={2}
        rx={21}
        ry={7}
        fill={COR_DA_INIMIGA}
        stroke="#3b0764"
        strokeWidth={2}
      />
      <rect x={-2.5} y={7} width={5} height={7} rx={2} fill="#3b0764" />
    </g>
  )
}

/**
 * A pergunta 3D (`inimigo-limpeza`): a patrulha vista de lado, com a inimiga longe e a nave perto
 * da câmera. A caixa tracejada do grupo `tirosInimigos` envolve TODOS os tiros do grupo, os que vêm
 * e os que já passaram da câmera (desbotados e tracejados), com a contagem ao lado.
 */
function InimigoLimpeza({ result }: { result: boolean }) {
  const actors = sceneNativeCast('enemy-fire')
  const mundo = useSceneCenario(actors, 'enemy-fire')
  const { segundos, tiros } = inimigoLimpezaGrupo(result)
  const vindo = tiros.filter((t) => !t.passou)
  const passaram = tiros.filter((t) => t.passou)
  const caixa = {
    x: COLUNA - 36,
    y: 52,
    w: 72,
    h: (passaram.length > 0 ? 292 : NAVE_Y - 18) - 52,
  }
  const descricao =
    passaram.length > 0
      ? `${segundos} segundos depois: ${tiros.length} tiros no grupo tirosInimigos. ${vindo.length} ainda vêm da inimiga; ${passaram.length} já passaram da nave e estão atrás da câmera.`
      : `A inimiga longe, no alto, e a nave perto da câmera. ${vindo.length} tiros vêm da inimiga, dentro do grupo tirosInimigos.`
  return (
    <SceneCanvas
      cast={actors}
      mundo={mundo}
      titulo="Os tiros no grupo tirosInimigos"
      descricao={descricao}
    >
      {(palco) => (
        <>
          <FundoDoCenario cenario={mundo} w={560} h={300} detalhe="calmo" />
          <InimigaAoLonge />
          <line
            data-camera
            x1={150}
            y1={CAMERA_Y}
            x2={430}
            y2={CAMERA_Y}
            className="stroke-scene-line"
            strokeWidth={2}
            strokeDasharray="8 6"
          />
          <Texto
            x={436}
            y={CAMERA_Y + 5}
            tamanho={palco.estreito ? 14 : 12}
            className="fill-scene-ink-soft"
          >
            câmera
          </Texto>
          <ActorFigure figure={actorFigure(actors, 'hero')} x={COLUNA} y={NAVE_Y} escala={0.75} />
          <g data-grupo="tirosInimigos" data-no-grupo={tiros.length}>
            <rect
              x={caixa.x}
              y={caixa.y}
              width={caixa.w}
              height={caixa.h}
              rx={10}
              fill="none"
              className="stroke-scene-line"
              strokeWidth={2}
              strokeDasharray="6 4"
            />
            {vindo.map((tiro) => (
              <rect
                key={`vindo-${tiro.saiu}`}
                data-tiro-3d="vindo"
                x={COLUNA - 3}
                y={tiroY(tiro.idade) - 9}
                width={6}
                height={18}
                rx={3}
                fill={COR_DO_TIRO}
                stroke="#7f1d1d"
                strokeWidth={1}
              />
            ))}
            {passaram.map((tiro, i) => {
              const lugar = ATRAS[i % ATRAS.length] ?? ATRAS[0]
              return (
                <rect
                  key={`atras-${tiro.saiu}`}
                  data-tiro-3d="atras-da-camera"
                  x={lugar.x - 3}
                  y={lugar.y - 9}
                  width={6}
                  height={18}
                  rx={3}
                  fill={COR_DO_TIRO}
                  fillOpacity={0.3}
                  stroke={COR_DO_TIRO}
                  strokeOpacity={0.8}
                  strokeWidth={1.5}
                  strokeDasharray="3 2"
                />
              )
            })}
            <rect
              x={caixa.x + caixa.w + 8}
              y={caixa.y}
              width={palco.estreito ? 132 : 116}
              height={50}
              rx={8}
              className="fill-scene-card stroke-scene-line"
            />
            <Texto
              x={caixa.x + caixa.w + 18}
              y={caixa.y + 20}
              tamanho={palco.estreito ? 15 : 13}
              fontWeight="700"
              className="fill-scene-ink"
            >
              tirosInimigos
            </Texto>
            <Texto
              data-contagem
              x={caixa.x + caixa.w + 18}
              y={caixa.y + 40}
              tamanho={palco.estreito ? 15 : 13}
              className="fill-scene-ink"
            >
              {`no grupo: ${tiros.length}`}
            </Texto>
          </g>
          {passaram.length > 0 && (
            <Texto
              data-atras-da-camera
              x={caixa.x + caixa.w + 8}
              y={266}
              tamanho={palco.estreito ? 15 : 13}
              fontWeight="700"
              className="fill-scene-ink"
            >
              atrás da câmera
            </Texto>
          )}
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
          <Texto x={24} y={55} tamanho={palco.estreito ? 14 : 12} className="fill-scene-ink-soft">
            {`Tempo: ${String(segundos).replace('.', ',')} segundos`}
          </Texto>
        </>
      )}
    </SceneCanvas>
  )
}
