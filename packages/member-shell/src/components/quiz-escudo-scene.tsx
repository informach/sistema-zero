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
import { ActorFigure } from './scene-figures'
import { TimedShieldStage } from './scene-timed-shield'

/**
 * As cenas de previsão que este componente desenha. Fora da lista, ele cai no caso de fábrica em
 * silêncio: `tests/quiz-cenas-do-manifesto.test.ts` confere a lista com o `manifest-quiz.ts` do core.
 */
export const ESCUDO_QUIZ_SCENES = [
  'escudo-protege',
  'escudo-acabou',
  'escudo-renova',
  'escudo-sem-guarda',
] as const

const START = { scene: 'timed-shield' } as const
const run = (actions: SceneAction[]) =>
  actions.reduce<SceneState>((s, a) => stepScene(START, s, a), openScene(START))
const PEGAR: SceneAction = { type: 'pick-shield' }
const SEGUNDO: SceneAction = { type: 'tick-second' }
const segundos = (n: number): SceneAction[] => Array.from({ length: n }, () => SEGUNDO)

/**
 * O caso de cada pergunta 2D do Poder "Escudo temporário", rodado no MESMO motor da experiência "O
 * escudo que acaba" (`timed-shield`: as pedras batem nos segundos 2, 5, 8 e 11; a cada segundo o
 * Escudo desce 1 e DEPOIS a pedra bate).
 * - `escudo-protege`: pegou no 0, a pedra do 2 saiu, pegou de novo no 2; no segundo 4 o Escudo está
 *   em 3 e a pedra do 5 vem. Depois do teste, o Escudo desce para 2, a pedra só sai e a vida fica.
 * - `escudo-acabou`: a mesma partida (pegou no 0 e de novo no 2); no segundo 7, 5 segundos depois
 *   da última pegada, o Escudo chegou a 0. Depois do teste, a pedra do 8 tira uma vida.
 * - `escudo-renova`: pegou no 0 e, no segundo 3, o Escudo está em 2. Depois do teste, ele vai a 5.
 */
export function escudoQuizState(
  scene: 'escudo-protege' | 'escudo-acabou' | 'escudo-renova',
  revealed: boolean,
): SceneState {
  if (scene === 'escudo-renova') return run([PEGAR, ...segundos(3), ...(revealed ? [PEGAR] : [])])
  const antes = scene === 'escudo-protege' ? 2 : 5
  return run([PEGAR, ...segundos(2), PEGAR, ...segundos(antes), ...(revealed ? [SEGUNDO] : [])])
}

/** O que cada caso mostra, antes e depois do teste (a mesma frase vai ao leitor de tela). */
const DESCRICOES = {
  'escudo-protege': [
    'O Escudo está em 3 e a nave tem 3 vidas. Uma pedra está chegando: ela bate no próximo segundo.',
    'O segundo passou: o Escudo desceu para 2 e a pedra bateu. Com o Escudo maior que 0, ela só saiu. A nave continua com 3 vidas, e a bolha segue em volta dela.',
  ],
  'escudo-acabou': [
    'A nave pegou o item há 5 segundos, e o Escudo contou até 0: a bolha sumiu. A nave tem 3 vidas, e uma pedra bate no próximo segundo.',
    'A pedra bateu com o Escudo em 0. A nave perdeu uma vida e ficou com 2. O escudo não voltou sozinho.',
  ],
  'escudo-renova': [
    'O Escudo está em 2, contando para baixo. Agora a nave vai pegar outro item do escudo.',
    'A nave pegou o item de novo: o Escudo estava em 2 e foi para 5. O número antigo foi trocado por 5, não somado.',
  ],
} as const

/** A demonstração é a mesma para qualquer resposta; quem corrige é o servidor. */
export function EscudoQuizScene({ scene, result }: { scene: string; result: boolean }) {
  if (scene === 'escudo-sem-guarda') return <EscudoSemGuarda result={result} />
  const caso =
    scene === 'escudo-acabou' || scene === 'escudo-renova' ? scene : ('escudo-protege' as const)
  return (
    <div className="sz-discovery-quiz-scene" aria-live="polite">
      <SceneCenarioProvider cenario="nave">
        <TimedShieldStage state={escudoQuizState(caso, result)} />
      </SceneCenarioProvider>
      <Note label={result ? 'O que aconteceu' : 'Antes do teste'}>
        {DESCRICOES[caso][result ? 1 : 0]}
      </Note>
    </div>
  )
}

/**
 * A pergunta 3D (`escudo-sem-guarda`): sem o `Se tempoDoEscudo > 0`, o relógio continua tirando 1
 * depois do 0. O motor da experiência nunca deixa o Escudo negativo, então este caso é um desenho
 * próprio: o valor de cada segundo desde a pegada. Antes do teste, a linha vai até o 0 e um "?";
 * depois, ela chega a -3 (8 segundos depois de pegar o item).
 */
export function escudoSemGuardaLinha(revealed: boolean): (number | '?')[] {
  const desde = Array.from({ length: revealed ? 9 : 6 }, (_, segundo) => 5 - segundo)
  return revealed ? desde : [...desde, '?']
}

/** O sinal de menos tipográfico no desenho (o texto para o leitor fica com o "-" da pergunta). */
const numero = (v: number | '?') => (typeof v === 'number' ? String(v).replace('-', '−') : v)

const CELULA = { w: 48, h: 44, passo: 56, x0: 56, y: 196 } as const
const NAVE_3D = { x: 96, y: 132 } as const

function EscudoSemGuarda({ result }: { result: boolean }) {
  const actors = sceneNativeCast('timed-shield')
  const mundo = useSceneCenario(actors, 'timed-shield')
  const linha = escudoSemGuardaLinha(result)
  const agora = linha[linha.length - 1] ?? '?'
  const lista = linha.filter((v) => v !== '?').join(', ')
  const descricao = result
    ? `Sem o Se, o relógio continuou tirando 1 depois do 0: ${lista}. 8 segundos depois de pegar o item, o Escudo mostra -3.`
    : `O relógio tira 1 do Escudo a cada segundo, sem o Se tempoDoEscudo > 0. Desde que a nave pegou o item: ${lista}. O que vem depois do 0?`
  return (
    <div className="sz-discovery-quiz-scene" aria-live="polite" data-escudo-sem-guarda="">
      <SceneCanvas
        cast={actors}
        mundo={mundo}
        titulo="O relógio sem a guarda"
        descricao={`Escudo: ${typeof agora === 'number' ? agora : 'ainda não se sabe'}. Valores de cada segundo desde a pegada: ${linha.join(', ')}.`}
      >
        {(palco) => (
          <>
            <FundoDoCenario cenario={mundo} w={560} h={300} chao={270} detalhe="calmo" />
            <rect
              x={15}
              y={12}
              width={530}
              height={48}
              rx={10}
              className="fill-scene-card stroke-scene-line"
            />
            <Texto
              x={28}
              y={34}
              tamanho={palco.estreito ? 16 : 14}
              fontWeight="700"
              className="fill-scene-ink"
            >
              Sem o Se tempoDoEscudo &gt; 0
            </Texto>
            <Texto x={28} y={52} tamanho={palco.estreito ? 14 : 12} className="fill-scene-ink-soft">
              A cada segundo o relógio tira 1 do Escudo.
            </Texto>
            <ActorFigure figure={actorFigure(actors, 'hero')} x={NAVE_3D.x} y={NAVE_3D.y} />
            <g data-escudo-agora={numero(agora)}>
              <rect
                x={160}
                y={92}
                width={150}
                height={50}
                rx={12}
                className={
                  result
                    ? 'fill-scene-card stroke-scene-alert'
                    : 'fill-scene-card stroke-scene-line'
                }
                strokeWidth={3}
              />
              <Texto
                x={235}
                y={125}
                tamanho={palco.estreito ? 22 : 20}
                fontWeight="800"
                textAnchor="middle"
                className={result ? 'fill-scene-alert' : 'fill-scene-ink'}
              >
                {`Escudo: ${numero(agora)}`}
              </Texto>
            </g>
            {linha.map((valor, segundo) => {
              const x = CELULA.x0 + segundo * CELULA.passo
              const negativo = typeof valor === 'number' && valor < 0
              const ultimo = result && segundo === linha.length - 1
              return (
                <g
                  // biome-ignore lint/suspicious/noArrayIndexKey: a posição é o segundo desde a pegada.
                  key={segundo}
                  data-segundo-sem-guarda={segundo}
                  data-valor={numero(valor)}
                  data-destaque={ultimo ? '' : undefined}
                >
                  <rect
                    x={x - CELULA.w / 2}
                    y={CELULA.y}
                    width={CELULA.w}
                    height={CELULA.h}
                    rx={9}
                    strokeWidth={ultimo ? 3 : 2}
                    strokeDasharray={valor === '?' ? '5 4' : undefined}
                    className={
                      ultimo
                        ? 'fill-scene-alert stroke-scene-alert'
                        : negativo
                          ? 'fill-scene-card stroke-scene-alert'
                          : 'fill-scene-card stroke-scene-line'
                    }
                  />
                  <Texto
                    x={x}
                    y={CELULA.y + 29}
                    tamanho={palco.estreito ? 20 : 18}
                    fontWeight="800"
                    textAnchor="middle"
                    className={
                      ultimo ? 'fill-scene-card' : negativo ? 'fill-scene-alert' : 'fill-scene-ink'
                    }
                  >
                    {numero(valor)}
                  </Texto>
                  <Texto
                    x={x}
                    y={CELULA.y + CELULA.h + 18}
                    tamanho={palco.estreito ? 13 : 11}
                    textAnchor="middle"
                    className="fill-scene-ink"
                  >
                    {`${segundo} s`}
                  </Texto>
                </g>
              )
            })}
          </>
        )}
      </SceneCanvas>
      <Note label={result ? 'O que aconteceu' : 'Antes do teste'}>{descricao}</Note>
    </div>
  )
}
