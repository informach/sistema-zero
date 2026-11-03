'use client'

import { discoveryGuidance, type SceneState } from '@sistemazero/core/learning/scene'
import { ArrowDownToLine, ArrowUp, MoveUp } from 'lucide-react'
import { ExperienceScene } from '../experience-scene'
import { Frame, SceneButton, useDiscovery } from '../scene-discovery-frame'
import { DicaLivre, LinhaDaIdeia, Numeros, useDescobertas } from './nave-b-comum'

/**
 * A experiência `gravity` em exploração livre (Corre Dino, Aula 3, 02/11/2026): só a IDEIA, no molde
 * das telas livres do Construtor. A gravidade é a força que puxa o Dino para baixo um pouco em cada
 * quadro; o bloco que a aplica fica para a montagem do Estúdio. O palco é o laboratório de sempre
 * (`ExperienceScene`, a régua da altura). O tempo anda sozinho no pulo e para no pouso ou com o Dino
 * sem gravidade lá no alto (régua do core, `sceneGestureRunsClock`/`sceneClockShouldStop`). A chave
 * da gravidade fica aberta desde o começo: a criança escolhe a ordem.
 */

const O_QUE_COMPARAR: Record<string, string> = {
  floating: 'Com a gravidade desligada, faça o Dino pular e observe o número da altura.',
  landed: 'Com a gravidade ligada, com o Dino no ar ou num pulo novo, observe até o fim.',
}

/** O botão em destaque é o gesto que a fala do Zappy pede agora. */
export type GestoDaGravidade = 'pular' | 'gravidade' | null
export function proximoGestoDaGravidade(
  fala: string | undefined,
  f: Pick<SceneState['flight'], 'gravity'>,
): GestoDaGravidade {
  switch (fala) {
    case 'gravity-start':
    case 'gravity-start-on':
    case 'gravity-landed-first-off':
    case 'gravity-floating-on':
      return 'pular'
    case 'gravity-landed-first':
      return f.gravity ? 'gravidade' : 'pular'
    case 'gravity-floating':
    case 'gravity-floating-ground':
      return f.gravity ? 'pular' : 'gravidade'
    default:
      return null
  }
}

/** A ideia: o pulo sem e com a gravidade, cada um revelado depois de visto. */
function IdeiaDaGravidade({ visto }: { visto: { sem: boolean; com: boolean } }) {
  return (
    <figure className="sz-scene-regra door-rule">
      <figcaption className="sz-scene-regra-titulo">O pulo volta ao chão?</figcaption>
      <div className="memory-actions">
        <LinhaDaIdeia
          icone={<MoveUp size={20} />}
          caso="Sem gravidade"
          revelado={visto.sem}
          resultado="O número da altura só cresce: nada puxa o Dino para baixo, e o Dino não volta"
        />
        <LinhaDaIdeia
          icone={<ArrowDownToLine size={20} />}
          caso="Com gravidade"
          revelado={visto.com}
          resultado="A subida fica mais devagar, para e vira queda: o Dino volta ao chão"
        />
      </div>
    </figure>
  )
}

export function LivreGravity() {
  const { activity, state, dispatch, instruction, setRunning } = useDiscovery()
  const f = state.flight
  const { tem, goals, completed, done } = useDescobertas(O_QUE_COMPARAR)
  const gesto = proximoGestoDaGravidade(discoveryGuidance(activity, state)?.id, f)
  // Um pulo com gravidade que já pousou também mostra a volta ao chão (sem ser a meta, que compara).
  const viuVoltar = tem('landed') || (f.time === null && f.peak > 0 && f.atGravity)
  return (
    <Frame
      title="O pulo volta ao chão?"
      kind="gravidade"
      activity={activity}
      state={state}
      text={instruction}
      goals={goals}
      completed={completed}
      done={done}
      reset={() => {
        setRunning(false)
        dispatch({ type: 'reset' })
      }}
      hud={
        <Numeros
          itens={[
            ['Altura do Dino', Math.round(f.y)],
            ['Gravidade', f.gravity ? 'ligada' : 'desligada'],
          ]}
        />
      }
      stage={
        <ExperienceScene
          activity={activity}
          state={state}
          onJump={(input) => dispatch({ type: 'jump', input })}
        />
      }
      after={<IdeiaDaGravidade visto={{ sem: tem('floating'), com: viuVoltar }} />}
    >
      <div className="sz-discovery-controls free-controls">
        <SceneButton
          tom={gesto === 'pular' ? 'gesto' : 'ferramenta'}
          onClick={() => dispatch({ type: 'jump', input: 'tap' })}
        >
          <ArrowUp size={16} /> Pular
        </SceneButton>
        <SceneButton
          aria-pressed={f.gravity}
          tom={gesto === 'gravidade' ? 'gesto' : f.gravity ? 'ligado' : 'ferramenta'}
          onClick={() => dispatch({ type: 'connect', port: 'gravity', enabled: !f.gravity })}
        >
          {f.gravity ? 'Desligar a gravidade' : 'Ligar a gravidade'}
        </SceneButton>
      </div>
      <p className="sz-discovery-small">
        O número da altura diz onde o Dino está. Ligar ou desligar a gravidade com o Dino no ar vale
        a partir daquele instante.
      </p>
      <DicaLivre />
    </Frame>
  )
}
