'use client'

import {
  discoveryGuidance,
  numero,
  SCENE_LIMITS,
  type SceneState,
  sceneStepSeconds,
} from '@sistemazero/core/learning/scene'
import { ArrowDown, ArrowUp, NotebookPen, RotateCcw, StepForward } from 'lucide-react'
import { useId } from 'react'
import { SceneCenarioProvider } from '../scene-cenario-context'
import { VelocityStage } from '../scene-core-stages'
import { Frame, SceneButton, useDiscovery } from '../scene-discovery-frame'
import {
  BotaoDoTempo,
  DESCOBRIR,
  DicaLivre,
  Numeros,
  useDescobertas,
  useTempo,
} from './nave-b-comum'

/**
 * A experiência `velocity` em exploração livre (Construtor, 02/11/2026): só a IDEIA, no molde de
 * `Door` e `Memory` (`scene-discovery-controls.tsx`) e dos Poderes. A velocidade é "quanto o tiro
 * anda em cada quadro, e para que lado"; o campo do bloco e a montagem ficam para o Estúdio. Para que
 * lado o número negativo e o positivo levam o tiro só aparece depois de a criança testar cada um.
 */

/** O que comparar, por meta (as do Dia 2 são `up` e `down`; as outras ficam para um caso futuro). */
const O_QUE_COMPARAR: Record<string, string> = {
  up: 'Teste um número negativo na velocidade para baixo e observe o tiro e o y.',
  down: 'Teste um número positivo na velocidade para baixo e observe o tiro e o y.',
  moves: 'Escolha uma velocidade diferente de zero e deixe os quadros passarem.',
  left: 'Teste um número negativo na velocidade para o lado.',
  stopped: 'Depois de ver o tiro andar, teste a velocidade zero.',
  still: 'Depois de ver o tiro andar, teste a velocidade zero.',
}

/** Os números da velocidade para baixo que a tela oferece. */
export const VELOCIDADES_PARA_BAIXO = [-9, -3, 0, 3, 9] as const

/**
 * O botão em destaque é o gesto que a fala do Zappy pede agora (a régua de `proximoGestoDaMemoria`):
 * escolher o número do sentido que falta, ou avançar os quadros com ele já escolhido.
 */
export type GestoDaVelocidade = 'negativo' | 'positivo' | 'avancar' | null
export function proximoGestoDaVelocidade(
  fala: string | undefined,
  d: Pick<SceneState['drive'], 'vy'>,
): GestoDaVelocidade {
  switch (fala) {
    case 'velocity-start':
      return 'negativo'
    case 'velocity-negative':
    case 'velocity-positive':
      return 'avancar'
    case 'velocity-up':
      return d.vy > 0 ? 'avancar' : 'positivo'
    case 'velocity-down':
      return d.vy < 0 ? 'avancar' : 'negativo'
    default:
      return null
  }
}

/** O tiro já está no batente no sentido em que anda: o ▶ não tem mais o que mostrar. */
export function tiroNaBorda(d: Pick<SceneState['drive'], 'vy' | 'y'>): boolean {
  return (
    (d.vy < 0 && d.y <= SCENE_LIMITS.driveY.min) || (d.vy > 0 && d.y >= SCENE_LIMITS.driveY.max)
  )
}

/** A ideia: para que lado cada sinal leva o tiro, com a resposta revelada no teste daquele sinal. */
function IdeiaDaVelocidade({ vy, visto }: { vy: number; visto: { up: boolean; down: boolean } }) {
  const caso = (negativo: boolean) => {
    const revelado = negativo ? visto.up : visto.down
    const escolhido = negativo ? vy < 0 : vy > 0
    return (
      <div data-selected={escolhido} data-muted={vy !== 0 && !escolhido}>
        <span>{negativo ? 'Número negativo, como −9' : 'Número positivo, como 9'}</span>
        {revelado ? (
          negativo ? (
            <ArrowUp size={34} />
          ) : (
            <ArrowDown size={34} />
          )
        ) : (
          <b className="door-fork-unknown" aria-hidden="true">
            ?
          </b>
        )}
        <strong>
          {revelado
            ? negativo
              ? 'O y diminui em cada quadro: o tiro sobe'
              : 'O y aumenta em cada quadro: o tiro desce'
            : DESCOBRIR}
        </strong>
        <small>{escolhido ? '✓ escolhido' : 'Aguardando teste'}</small>
      </div>
    )
  }
  return (
    <figure className="sz-scene-regra door-rule">
      <figcaption className="sz-scene-regra-titulo">Para que lado o tiro anda?</figcaption>
      <div className="door-question">
        <NotebookPen size={20} />
        <strong>Em cada quadro, o y do tiro muda pela velocidade para baixo.</strong>
      </div>
      <div className="door-forks">
        {caso(true)}
        {caso(false)}
      </div>
    </figure>
  )
}

export function LivreVelocity() {
  const { activity, state, dispatch, instruction } = useDiscovery()
  const d = state.drive
  const { tem, goals, completed, done } = useDescobertas(O_QUE_COMPARAR)
  const gesto = proximoGestoDaVelocidade(discoveryGuidance(activity, state)?.id, d)
  const tempo = useTempo(tiroNaBorda(d))
  const ajuda = useId()
  const quadro = sceneStepSeconds('velocity') ?? 0.2
  const tomDoNumero = (v: number) =>
    (gesto === 'negativo' && v === -9) || (gesto === 'positivo' && v === 9)
      ? 'gesto'
      : d.vy === v
        ? 'ligado'
        : 'ferramenta'
  return (
    <Frame
      title="Para que lado o tiro anda?"
      kind="velocidade"
      activity={activity}
      state={state}
      text={instruction}
      goals={goals}
      completed={completed}
      done={done}
      reset={() => {
        tempo.parar()
        dispatch({ type: 'reset' })
      }}
      hud={
        <Numeros
          itens={[
            ['Velocidade para baixo', numero(d.vy)],
            ['y do tiro', numero(Math.round(d.y))],
            ['Quadro', d.ticks],
          ]}
        />
      }
      stage={
        <SceneCenarioProvider cenario={activity.cenario}>
          <VelocityStage state={state} cast={activity.cast} />
        </SceneCenarioProvider>
      }
      after={<IdeiaDaVelocidade vy={d.vy} visto={{ up: tem('up'), down: tem('down') }} />}
    >
      <fieldset className="sz-discovery-choices" aria-describedby={ajuda}>
        <legend className="frame-controls-label">Velocidade para baixo</legend>
        {VELOCIDADES_PARA_BAIXO.map((v) => (
          <SceneButton
            key={v}
            aria-pressed={d.vy === v}
            tom={tomDoNumero(v)}
            className="min-w-11"
            onClick={() => dispatch({ type: 'velocity', vx: d.vx, vy: v })}
          >
            {numero(v)}
          </SceneButton>
        ))}
      </fieldset>
      <p className="sz-discovery-small" id={ajuda}>
        O número diz quanto o y do tiro muda em cada quadro. Escolher um número não move o tiro:
        quem move são os quadros passando.
      </p>
      <div className="sz-discovery-controls free-controls">
        <SceneButton
          tom={gesto === 'avancar' ? 'gesto' : 'ferramenta'}
          onClick={() => tempo.passar(quadro)}
        >
          <StepForward size={16} /> Avançar 1 quadro
        </SceneButton>
        <BotaoDoTempo running={tempo.running} fechado={tiroNaBorda(d)} onClick={tempo.alternar} />
        <SceneButton
          onClick={() => {
            tempo.parar()
            dispatch({ type: 'restart-case' })
          }}
        >
          <RotateCcw size={15} /> Voltar ao começo
        </SceneButton>
      </div>
      {tiroNaBorda(d) && (
        <p className="sz-discovery-small">
          O tiro chegou à borda e não anda mais para esse lado. Escolha outro número ou volte ao
          começo; suas descobertas continuam marcadas.
        </p>
      )}
      <DicaLivre />
    </Frame>
  )
}
