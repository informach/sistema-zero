'use client'

import {
  castText,
  discoveryGuidance,
  numero,
  SCENE_LIMITS,
  type SceneState,
  sceneStepSeconds,
} from '@sistemazero/core/learning/scene'
import { ArrowLeft, ArrowRight, NotebookPen, Pause, RotateCcw, StepForward } from 'lucide-react'
import { useId } from 'react'
import { SceneCenarioProvider } from '../../scene-cenario-context'
import { VelocityStage } from '../../scene-core-stages'
import { Frame, SceneButton, useDiscovery } from '../../scene-discovery-frame'
import {
  BotaoDoTempo,
  DESCOBRIR,
  DicaLivre,
  Numeros,
  useDescobertas,
  useTempo,
} from '../nave-b-comum'

/**
 * A `velocity` do Corre Dino em exploração livre (Aula 5, 02/11/2026): só a IDEIA, no molde da tela da
 * Nave (`scene-livre/velocity.tsx`), agora no eixo do LADO. A velocidade para o lado é "quanto o x do
 * cacto muda em cada quadro", e o sinal escolhe a direção; o campo do bloco e a montagem ficam para o
 * Estúdio. Para que lado o 5, o −5 e o 0 levam o cacto só aparece depois de a criança testar cada um.
 * Os textos dizem "o cacto" para o elenco vestir (o bloco da Aula 5 tem o cacto como personagem).
 */

const O_QUE_COMPARAR: Record<string, string> = {
  moves: 'Teste um número positivo na velocidade para o lado e observe o cacto e o x.',
  left: 'Teste um número negativo na velocidade para o lado e observe o cacto e o x.',
  stopped: 'Depois de ver o cacto andar, teste a velocidade 0 e observe o cacto e o x.',
  still: 'Depois de ver o cacto andar, teste a velocidade 0 e observe o cacto e o x.',
}

/** Os números da velocidade para o lado que a tela oferece (o −5 é o dos cactos do jogo). */
export const VELOCIDADES_PARA_O_LADO = [-5, 0, 5] as const

/**
 * O botão em destaque é o gesto que a fala do Zappy pede agora: escolher o número que a fala sugere,
 * ou avançar os quadros com ele já escolhido.
 */
export type GestoDaVelocidadeDino = 'positivo' | 'negativo' | 'zero' | 'avancar' | null
export function proximoGestoDaVelocidadeDino(
  fala: string | undefined,
  d: Pick<SceneState['drive'], 'vx'>,
): GestoDaVelocidadeDino {
  const escolher = (qual: 'positivo' | 'negativo' | 'zero'): GestoDaVelocidadeDino => {
    const ja = qual === 'positivo' ? d.vx > 0 : qual === 'negativo' ? d.vx < 0 : d.vx === 0
    return ja ? 'avancar' : qual
  }
  switch (fala) {
    case 'velocity-dino-start':
      return 'positivo'
    case 'velocity-dino-positive':
    case 'velocity-dino-negative':
      return 'avancar'
    case 'velocity-dino-right':
    case 'velocity-dino-stopped':
      return escolher('negativo')
    case 'velocity-dino-left':
      return escolher('positivo')
    case 'velocity-dino-zero':
      return escolher('zero')
    default:
      return null
  }
}

/** O cacto está no batente no sentido em que anda: o ▶ não tem mais o que mostrar. */
export function cactoNaBorda(d: Pick<SceneState['drive'], 'vx' | 'x'>): boolean {
  return (
    (d.vx < 0 && d.x <= SCENE_LIMITS.driveX.min) || (d.vx > 0 && d.x >= SCENE_LIMITS.driveX.max)
  )
}

/** A ideia: para que lado cada número leva o cacto, revelado no teste daquele número. */
function IdeiaDaVelocidade({
  vx,
  visto,
  vestir,
}: {
  vx: number
  visto: { direita: boolean; esquerda: boolean; parado: boolean }
  vestir: (texto: string) => string
}) {
  const casos = [
    {
      chave: 'positivo',
      rotulo: 'Número positivo, como 5',
      escolhido: vx > 0,
      revelado: visto.direita,
      icone: <ArrowRight size={34} />,
      resultado: vestir('O x aumenta em cada quadro: o cacto vai para a direita'),
    },
    {
      chave: 'negativo',
      rotulo: 'Número negativo, como −5',
      escolhido: vx < 0,
      revelado: visto.esquerda,
      icone: <ArrowLeft size={34} />,
      resultado: vestir('O x diminui em cada quadro: o cacto vai para a esquerda'),
    },
    {
      chave: 'zero',
      rotulo: 'Zero',
      escolhido: vx === 0,
      revelado: visto.parado,
      icone: <Pause size={34} />,
      resultado: vestir('Somar zero não muda o x: o cacto fica parado'),
    },
  ]
  return (
    <figure className="sz-scene-regra door-rule">
      <figcaption className="sz-scene-regra-titulo">
        {vestir('Para que lado o cacto anda?')}
      </figcaption>
      <div className="door-question">
        <NotebookPen size={20} />
        <strong>{vestir('Em cada quadro, o x do cacto muda pela velocidade para o lado.')}</strong>
      </div>
      <div className="door-forks">
        {casos.map((caso) => (
          <div key={caso.chave} data-selected={caso.escolhido} data-muted={!caso.escolhido}>
            <span>{caso.rotulo}</span>
            {caso.revelado ? (
              caso.icone
            ) : (
              <b className="door-fork-unknown" aria-hidden="true">
                ?
              </b>
            )}
            <strong>{caso.revelado ? caso.resultado : DESCOBRIR}</strong>
            <small>{caso.escolhido ? '✓ escolhido' : 'Aguardando teste'}</small>
          </div>
        ))}
      </div>
    </figure>
  )
}

export function LivreVelocityDino() {
  const { activity, state, dispatch, instruction } = useDiscovery()
  const d = state.drive
  const { tem, goals, completed, done } = useDescobertas(O_QUE_COMPARAR)
  const gesto = proximoGestoDaVelocidadeDino(discoveryGuidance(activity, state)?.id, d)
  const tempo = useTempo(cactoNaBorda(d))
  const ajuda = useId()
  const quadro = sceneStepSeconds('velocity') ?? 0.2
  const vestir = (texto: string) => castText(texto, activity.cast)
  const tomDoNumero = (v: number) =>
    (gesto === 'positivo' && v === 5) ||
    (gesto === 'negativo' && v === -5) ||
    (gesto === 'zero' && v === 0)
      ? 'gesto'
      : d.vx === v
        ? 'ligado'
        : 'ferramenta'
  return (
    <Frame
      title={vestir('Para que lado o cacto anda?')}
      kind="velocidade"
      activity={activity}
      state={state}
      text={instruction}
      goals={goals.map(vestir)}
      completed={completed}
      done={done}
      reset={() => {
        tempo.parar()
        dispatch({ type: 'reset' })
      }}
      hud={
        <Numeros
          itens={[
            ['Velocidade para o lado', numero(d.vx)],
            [vestir('x do cacto'), numero(Math.round(d.x))],
            ['Quadro', d.ticks],
          ]}
        />
      }
      stage={
        <SceneCenarioProvider cenario={activity.cenario}>
          <VelocityStage state={state} cast={activity.cast} />
        </SceneCenarioProvider>
      }
      after={
        <IdeiaDaVelocidade
          vx={d.vx}
          vestir={vestir}
          visto={{ direita: tem('moves'), esquerda: tem('left'), parado: tem('stopped') }}
        />
      }
    >
      <fieldset className="sz-discovery-choices" aria-describedby={ajuda}>
        <legend className="frame-controls-label">Velocidade para o lado</legend>
        {VELOCIDADES_PARA_O_LADO.map((v) => (
          <SceneButton
            key={v}
            aria-pressed={d.vx === v}
            tom={tomDoNumero(v)}
            className="min-w-11"
            // A velocidade para baixo fica em 0: a ideia de hoje é só o lado.
            onClick={() => dispatch({ type: 'velocity', vx: v, vy: 0 })}
          >
            {numero(v)}
          </SceneButton>
        ))}
      </fieldset>
      <p className="sz-discovery-small" id={ajuda}>
        {vestir(
          'O número diz quanto o x do cacto muda em cada quadro. Escolher um número não move o cacto: quem move são os quadros passando.',
        )}
      </p>
      <div className="sz-discovery-controls free-controls">
        <SceneButton
          tom={gesto === 'avancar' ? 'gesto' : 'ferramenta'}
          onClick={() => tempo.passar(quadro)}
        >
          <StepForward size={16} /> Avançar 1 quadro
        </SceneButton>
        <BotaoDoTempo running={tempo.running} fechado={cactoNaBorda(d)} onClick={tempo.alternar} />
        <SceneButton
          onClick={() => {
            tempo.parar()
            dispatch({ type: 'restart-case' })
          }}
        >
          <RotateCcw size={15} /> Voltar ao começo
        </SceneButton>
      </div>
      {cactoNaBorda(d) && (
        <p className="sz-discovery-small">
          {vestir(
            'O cacto chegou à borda e não anda mais para esse lado. Escolha outro número ou volte ao começo; suas descobertas continuam marcadas.',
          )}
        </p>
      )}
      <DicaLivre />
    </Frame>
  )
}
