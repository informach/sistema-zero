'use client'
import {
  actorFigure,
  openScene,
  type SceneAction,
  type SceneCast,
  type SceneState,
  sceneNativeCast,
  stepScene,
  type WeaponSwapWeapon,
} from '@sistemazero/core/learning/scene'
import { FundoDoCenario } from './scene-arte'
import { SceneCanvas, Texto } from './scene-canvas'
import { SceneCenarioProvider, useSceneCenario } from './scene-cenario-context'
import { Note } from './scene-discovery-frame'
import { ActorFigure } from './scene-figures'
import { WeaponSwapStage } from './scene-weapon-swap'

type ArmaScene2d = 'arma-trancada' | 'arma-plasma' | 'arma-reinicio'
type ArmaScene = ArmaScene2d | 'arma-placar'

/** O elenco da aula: a nave e o asteroide (a pedra parada no alto). */
export const ARMA_CAST: SceneCast = {
  hero: { name: 'nave', gender: 'f' },
  obstacle: { name: 'asteroide', gender: 'm' },
}

const START = { scene: 'weapon-swap' } as const
const run = (actions: SceneAction[]) =>
  actions.reduce<SceneState>((s, a) => stepScene(START, s, a), openScene(START))
const PEGAR: SceneAction = { type: 'weapon-pickup' }
const TECLA_E: SceneAction = { type: 'weapon-key-e' }
const ESPACO: SceneAction = { type: 'weapon-fire' }
const NOVA_PARTIDA: SceneAction = { type: 'weapon-new-match' }

/**
 * O caso de cada pergunta 2D do Poder "Troca de arma", rodado no MESMO motor da experiência
 * (`weapon-swap`: a arma começa no laser e o plasma trancado; o item libera, o E troca só com o
 * plasma liberado, o Espaço dispara a arma de agora e a Nova partida volta ao laser).
 * - `arma-trancada`: antes do teste, a partida nova (laser, item ainda no chão, nada apertado).
 *   Depois, o E: a arma continua laser.
 * - `arma-plasma`: antes do teste, o item pego e o E apertado (plasma, nenhum tiro). Depois, o
 *   Espaço: o plasma grande e lento, com uma marca por quadro até a pedra.
 * - `arma-reinicio`: antes do teste, o mesmo plasma. Depois, a Nova partida: laser, e o plasma
 *   trancado de novo (o item volta ao lado da nave).
 */
export function armaQuizState(scene: ArmaScene2d, revealed: boolean): SceneState {
  if (scene === 'arma-trancada') return run(revealed ? [TECLA_E] : [])
  const depois = scene === 'arma-plasma' ? ESPACO : NOVA_PARTIDA
  return run([PEGAR, TECLA_E, ...(revealed ? [depois] : [])])
}

/**
 * A pergunta 3D (`arma-placar`): o texto "Arma" só é escrito em Ao iniciar. A variável vem do
 * motor (o item pego e, depois do teste, o E); o texto da tela é o que valia na partida que abriu.
 */
export function armaPlacarEstado(revealed: boolean): {
  texto: WeaponSwapWeapon
  arma: WeaponSwapWeapon
  liberado: boolean
} {
  const texto = run([]).weaponSwap.weapon
  const agora = run([PEGAR, ...(revealed ? [TECLA_E] : [])]).weaponSwap
  return { texto, arma: agora.weapon, liberado: agora.unlocked }
}

/** O que cada caso mostra, antes e depois do teste (a mesma frase vai ao leitor de tela). */
const DESCRICOES = {
  'arma-trancada': [
    'A arma é laser, e o item de plasma ainda está ao lado da nave: plasmaLiberado é falso. Agora a tecla E vai ser apertada.',
    'A tecla E foi apertada, mas o plasma ainda estava trancado: a troca não aconteceu. A arma continua laser, e o item de plasma continua ao lado da nave.',
  ],
  'arma-plasma': [
    'A nave pegou o item de plasma, e a tecla E trocou a arma: agora ela é plasma. Ainda não saiu nenhum tiro. Agora o Espaço vai ser apertado.',
    'O Espaço perguntou a arma, e saiu o plasma: um tiro grande e lento, no grupo tirosPlasma. As marcas mostram onde ele estava a cada quadro, bem pertinho uma da outra, até chegar à pedra em 10 quadros.',
  ],
  'arma-reinicio': [
    'A nave pegou o item de plasma, e a tecla E trocou a arma: agora ela é plasma. Agora a partida vai terminar, e uma partida nova vai começar.',
    'Na partida nova, o Ao iniciar rodou de novo: a arma nasceu como laser, e plasmaLiberado como falso. O item de plasma voltou para o lado da nave, esperando ser pego de novo.',
  ],
  'arma-placar': [
    'Na patrulha, o texto Arma foi escrito em Ao iniciar e mostra Arma: laser. A nave já pegou o item de plasma, e a variável arma é laser. Agora a tecla E vai ser apertada.',
    'A tecla E trocou a variável arma para plasma, mas o texto no canto continua mostrando Arma: laser. Ele só foi escrito em Ao iniciar e não foi escrito de novo depois da troca.',
  ],
} as const

/** A demonstração é a mesma para qualquer resposta; quem corrige é o servidor. */
export function ArmaQuizScene({ scene, result }: { scene: string; result: boolean }) {
  const caso: ArmaScene =
    scene === 'arma-plasma' || scene === 'arma-reinicio' || scene === 'arma-placar'
      ? scene
      : 'arma-trancada'
  return (
    <div
      className="sz-discovery-quiz-scene"
      aria-live="polite"
      data-arma-placar={caso === 'arma-placar' ? '' : undefined}
    >
      <SceneCenarioProvider cenario="nave">
        {caso === 'arma-placar' ? (
          <ArmaPlacar result={result} />
        ) : (
          <WeaponSwapStage state={armaQuizState(caso, result)} cast={ARMA_CAST} />
        )}
      </SceneCenarioProvider>
      <Note label={result ? 'O que aconteceu' : 'Antes do teste'}>
        {DESCRICOES[caso][result ? 1 : 0]}
      </Note>
    </div>
  )
}

const NAVE_3D = { x: 280, y: 196 } as const
const PEDRA_3D = { x: 280, y: 96 } as const
const TECLA = { x: 420, y: 176, lado: 40 } as const
const CAIXA = { x: 336, y: 12, w: 212, h: 74 } as const
const HUD = { x: 16, y: 32 } as const

/**
 * A pergunta 3D (`arma-placar`): a patrulha vista de trás da nave, com o texto da tela no canto de
 * cima ("Arma: laser", escrito em Ao iniciar), a caixa das variáveis à direita e a tecla E. Antes do
 * teste, a tecla vai ser apertada e as duas coisas dizem laser. Depois, a variável é plasma, o texto
 * continua laser, e uma seta tracejada liga as duas com o recado do descompasso.
 */
function ArmaPlacar({ result }: { result: boolean }) {
  const actors = sceneNativeCast('weapon-swap', ARMA_CAST)
  const mundo = useSceneCenario(actors, 'weapon-swap')
  const { texto, arma, liberado } = armaPlacarEstado(result)
  const descompasso = texto !== arma
  const descricao = descompasso
    ? `O texto no canto mostra Arma: ${texto}, mas a variável arma é ${arma}. O texto não foi escrito de novo.`
    : `O texto no canto mostra Arma: ${texto}. A variável arma é ${arma}, e plasmaLiberado é ${liberado ? 'verdadeiro' : 'falso'}. A tecla E vai ser apertada.`
  return (
    <SceneCanvas cast={actors} mundo={mundo} titulo="O texto Arma na tela" descricao={descricao}>
      {(palco) => (
        <>
          <FundoDoCenario cenario={mundo} w={560} h={300} detalhe="calmo" />
          <g data-texto-arma={texto} data-descompasso={descompasso ? '' : undefined}>
            <rect
              x={HUD.x - 8}
              y={HUD.y - 22}
              width={palco.estreito ? 140 : 124}
              height={32}
              rx={8}
              fill="none"
              className={descompasso ? 'stroke-scene-alert' : 'stroke-scene-line'}
              strokeWidth={descompasso ? 3 : 1.5}
              strokeDasharray={descompasso ? undefined : '4 3'}
            />
            <Texto
              x={HUD.x}
              y={HUD.y}
              tamanho={palco.estreito ? 18 : 16}
              fontWeight="800"
              className="fill-scene-ink"
            >
              {`Arma: ${texto}`}
            </Texto>
          </g>
          <ActorFigure
            figure={actorFigure(actors, 'obstacle')}
            x={PEDRA_3D.x}
            y={PEDRA_3D.y}
            escala={0.55}
          />
          <ActorFigure
            figure={actorFigure(actors, 'hero')}
            x={NAVE_3D.x}
            y={NAVE_3D.y}
            escala={0.9}
          />
          <g data-variavel="arma" data-valor={arma}>
            <rect
              x={CAIXA.x}
              y={CAIXA.y}
              width={CAIXA.w}
              height={CAIXA.h}
              rx={10}
              className="fill-scene-card stroke-scene-line"
            />
            <Texto
              x={CAIXA.x + 12}
              y={CAIXA.y + 22}
              tamanho={palco.estreito ? 14 : 12}
              fontWeight="700"
              className="fill-scene-ink-soft"
            >
              Variáveis
            </Texto>
            <Texto
              data-plasma-liberado={liberado ? 'verdadeiro' : 'falso'}
              x={CAIXA.x + 12}
              y={CAIXA.y + 42}
              tamanho={palco.estreito ? 14 : 12}
              className="fill-scene-ink"
            >
              {`plasmaLiberado = ${liberado ? 'verdadeiro' : 'falso'}`}
            </Texto>
            <Texto
              x={CAIXA.x + 12}
              y={CAIXA.y + 62}
              tamanho={palco.estreito ? 15 : 13}
              fontWeight="800"
              className={descompasso ? 'fill-scene-alert' : 'fill-scene-ink'}
            >
              {`arma = "${arma}"`}
            </Texto>
          </g>
          {descompasso && (
            <g data-seta-do-descompasso>
              <path
                d={`M ${CAIXA.x - 4} ${CAIXA.y + 58} L ${HUD.x + 132} ${HUD.y - 4}`}
                fill="none"
                className="stroke-scene-alert"
                strokeWidth={2.5}
                strokeDasharray="6 4"
              />
              <path
                d={`M ${HUD.x + 132} ${HUD.y - 4} l 11 -1 m -11 1 l 7 9`}
                fill="none"
                className="stroke-scene-alert"
                strokeWidth={2.5}
                strokeLinecap="round"
              />
              <Texto
                x={HUD.x + 4}
                y={HUD.y + 58}
                tamanho={palco.estreito ? 15 : 13}
                fontWeight="700"
                className="fill-scene-alert"
              >
                o texto não foi escrito de novo
              </Texto>
            </g>
          )}
          <g data-tecla-e={result ? 'apertada' : 'vai-apertar'}>
            <rect
              x={TECLA.x}
              y={TECLA.y}
              width={TECLA.lado}
              height={TECLA.lado}
              rx={8}
              className={
                result ? 'fill-scene-ink stroke-scene-line' : 'fill-scene-card stroke-scene-line'
              }
              strokeWidth={2}
            />
            <Texto
              x={TECLA.x + TECLA.lado / 2}
              y={TECLA.y + 27}
              tamanho={palco.estreito ? 20 : 18}
              fontWeight="800"
              textAnchor="middle"
              className={result ? 'fill-scene-card' : 'fill-scene-ink'}
            >
              E
            </Texto>
            <Texto
              x={TECLA.x + TECLA.lado / 2}
              y={TECLA.y + TECLA.lado + 18}
              tamanho={palco.estreito ? 13 : 11}
              textAnchor="middle"
              className="fill-scene-ink-soft"
            >
              {result ? 'apertada' : 'vai ser apertada'}
            </Texto>
          </g>
          <rect
            x={12}
            y={238}
            width={palco.estreito ? 232 : 216}
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
            O texto Arma é escrito em Ao iniciar
          </Texto>
        </>
      )}
    </SceneCanvas>
  )
}
