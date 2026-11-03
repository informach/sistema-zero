'use client'

import { discoveryGuidance, type SceneState } from '@sistemazero/core/learning/scene'
import { ArrowUp, Ruler, TrendingUp } from 'lucide-react'
import { useId } from 'react'
import { ExperienceScene } from '../experience-scene'
import { Frame, SceneButton, useDiscovery } from '../scene-discovery-frame'
import { DicaLivre, LinhaDaIdeia, Numeros, useDescobertas } from './nave-b-comum'

/**
 * A experiência `impulse` em exploração livre (Corre Dino, Aula 3, 02/11/2026): só a IDEIA, no molde
 * das telas livres do Construtor. O impulso é a força que começa o pulo, e a gravidade é a mesma em
 * todos os saltos; o campo do bloco fica para a montagem do Estúdio. O palco é o laboratório de sempre
 * (`ExperienceScene`): a marca azul é o salto de antes, e a laranja, o deste. Quanto cada impulso sobe
 * só aparece depois do salto.
 */

const O_QUE_COMPARAR: Record<string, string> = {
  'first-height': 'Faça o Dino pular e observe a marca da altura quando o salto terminar.',
  'other-height': 'Pule com outro impulso, como 9 e 14, e compare as duas marcas.',
  compare: 'Pule com outro impulso, como 9 e 14, e compare as duas marcas.',
}

/** Os impulsos que a tela oferece: o mais baixo, o de abertura e o mais forte (o do jogo da aula). */
export const IMPULSOS = [5, 9, 14] as const

/** O botão em destaque é o gesto que a fala do Zappy pede agora. */
export type GestoDoImpulso = 'pular' | 9 | 14 | null
export function proximoGestoDoImpulso(
  fala: string | undefined,
  f: Pick<SceneState['flight'], 'force'>,
): GestoDoImpulso {
  switch (fala) {
    case 'impulse-start':
    case 'impulse-chosen':
      return 'pular'
    case 'impulse-first':
    case 'impulse-same':
    case 'impulse-small':
      return f.force === 14 ? 'pular' : 14
    case 'impulse-first-14':
    case 'impulse-same-14':
      return f.force === 9 ? 'pular' : 9
    default:
      return null
  }
}

/** A ideia: o que a marca guarda e o que outro impulso faz com ela, revelado depois dos saltos. */
function IdeiaDoImpulso({ visto }: { visto: { marca: boolean; outro: boolean } }) {
  return (
    <figure className="sz-scene-regra door-rule">
      <figcaption className="sz-scene-regra-titulo">O que o impulso muda no pulo?</figcaption>
      <div className="memory-actions">
        <LinhaDaIdeia
          icone={<Ruler size={20} />}
          caso="Um salto até o fim"
          revelado={visto.marca}
          resultado="O Dino sobe, para no alto e volta: a marca guarda a altura do salto"
        />
        <LinhaDaIdeia
          icone={<TrendingUp size={20} />}
          caso="Outro impulso, com a mesma gravidade"
          revelado={visto.outro}
          resultado="Com mais impulso, a marca fica bem mais alta: o 14 vai muito acima do 9"
        />
      </div>
    </figure>
  )
}

export function LivreImpulse() {
  const { activity, state, dispatch, instruction, setRunning } = useDiscovery()
  const f = state.flight
  const { tem, goals, completed, done } = useDescobertas(O_QUE_COMPARAR)
  const gesto = proximoGestoDoImpulso(discoveryGuidance(activity, state)?.id, f)
  const ajuda = useId()
  return (
    <Frame
      title="O que o impulso muda no pulo?"
      kind="impulso"
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
            ['Impulso', f.force],
            ['Marca deste salto', Math.round(f.peak)],
            ['Marca de antes', f.before > 0 ? Math.round(f.before) : 'nenhuma'],
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
      after={
        <IdeiaDoImpulso
          visto={{ marca: tem('first-height'), outro: tem('other-height') || tem('compare') }}
        />
      }
    >
      <fieldset className="sz-discovery-choices" aria-describedby={ajuda}>
        <legend className="frame-controls-label">Impulso do pulo</legend>
        {IMPULSOS.map((force) => (
          <SceneButton
            key={force}
            aria-pressed={f.force === force}
            tom={gesto === force ? 'gesto' : f.force === force ? 'ligado' : 'ferramenta'}
            onClick={() => dispatch({ type: 'impulse', force })}
          >
            Impulso {force}
          </SceneButton>
        ))}
      </fieldset>
      <p className="sz-discovery-small" id={ajuda}>
        O impulso vale para o próximo salto. A gravidade é a mesma em todos.
      </p>
      <div className="sz-discovery-controls free-controls">
        <SceneButton
          tom={gesto === 'pular' ? 'gesto' : 'ferramenta'}
          onClick={() => dispatch({ type: 'jump', input: 'tap' })}
        >
          <ArrowUp size={16} /> Pular
        </SceneButton>
      </div>
      <DicaLivre />
    </Frame>
  )
}
