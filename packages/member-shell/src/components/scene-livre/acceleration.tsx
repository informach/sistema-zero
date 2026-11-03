'use client'

import {
  discoveryGuidance,
  numero,
  type SceneState,
  sceneTargets,
} from '@sistemazero/core/learning/scene'
import {
  Dices,
  Flag,
  History,
  MessageCircleQuestion,
  RotateCcw,
  Timer,
  TrendingDown,
} from 'lucide-react'
import { SceneCenarioProvider } from '../scene-cenario-context'
import { AccelerationStage } from '../scene-dino-numbers-stages'
import { Frame, SceneButton, useDiscovery } from '../scene-discovery-frame'
import { DicaLivre, LinhaDaIdeia, Numeros, useDescobertas } from './nave-b-comum'

/**
 * A experiência `acceleration` em exploração livre (Corre Dino, aula 13, 02/11/2026): só a IDEIA. A
 * cada 5 segundos a base (a velocidade dos cactos novos) ganha −1 e nasce um cacto com ela, mais um
 * sorteio; a pergunta "a base é maior que −9?" decide se a base continua diminuindo. Nada de Se,
 * "condição" nem bloco: os blocos ficam para a montagem do Estúdio.
 *
 * ⚠️ O sorteio é DE VERDADE e viaja no gesto (`Math.random()`), como na bancada antiga.
 * ⚠️ Sem a trava da chave (a bancada antiga fechava a condição até o −10): desligar a pergunta antes
 * leva a base para baixo do −9, e o "Voltar ao começo" (`restart-case`, que guarda a pergunta como
 * ficou) resolve. ⚠️ A conta do palco mostra só a pergunta e a resposta (`soAPergunta`); o que a
 * resposta faz com a base é o resultado do próximo "Passar 5 segundos".
 */

const O_QUE_COMPARAR: Record<string, string> = {
  'old-speed': 'Passe 5 segundos algumas vezes e compare o número de cada cacto com a base.',
  'base-limit': 'Com a pergunta ligada, passe 5 segundos até a base chegar no -9 e continue.',
  'variation-limit':
    'Com a base parada no -9, passe mais 5 segundos e observe o número de cada cacto novo.',
  'spawned-ten':
    'Com a base parada no -9, passe mais 5 segundos e observe o número de cada cacto novo.',
  'past-limit': 'Sem a pergunta, passe 5 segundos algumas vezes e compare até onde a base vai.',
}

/** O botão em destaque é o gesto que a fala do Zappy pede agora (a régua de `proximoGestoDaMemoria`). */
export type GestoDaAceleracao = 'passar' | 'pergunta' | 'voltar' | null
export function proximoGestoDaAceleracao(
  fala: string | undefined,
  v: Pick<SceneState['speed'], 'base' | 'limited'>,
): GestoDaAceleracao {
  switch (fala) {
    case 'acceleration-start':
      return 'passar'
    case 'acceleration-para':
    case 'acceleration-para-first':
    case 'acceleration-sorteio':
      if (!v.limited) return 'pergunta'
      // A pergunta não puxa a base de volta: abaixo do −9, só recomeçando.
      return v.base < -9 ? 'voltar' : 'passar'
    case 'acceleration-sem':
    case 'acceleration-sem-first':
      return v.limited ? 'pergunta' : 'passar'
    default:
      return null
  }
}

/** A ideia: o que a base e os cactos fazem em cada caso, revelado depois do teste. */
function IdeiaDaAceleracao({
  metas,
  tem,
}: {
  metas: readonly string[]
  tem: (m: string) => boolean
}) {
  const pede = (...ids: string[]) => ids.some((id) => metas.includes(id))
  return (
    <figure className="sz-scene-regra door-rule">
      <figcaption className="sz-scene-regra-titulo">A base e os cactos</figcaption>
      <div className="memory-actions">
        {pede('old-speed') && (
          <LinhaDaIdeia
            icone={<History size={20} />}
            caso="Os cactos que já nasceram, quando a base muda"
            revelado={tem('old-speed')}
            resultado="Guardam o número deles: só os novos nascem com a base nova"
          />
        )}
        {pede('base-limit') && (
          <LinhaDaIdeia
            icone={<Flag size={20} />}
            caso="Com a pergunta, a base no -9"
            revelado={tem('base-limit')}
            resultado="A resposta é não, e a base para no -9"
          />
        )}
        {pede('variation-limit', 'spawned-ten') && (
          <LinhaDaIdeia
            icone={<Dices size={20} />}
            caso="Com a base parada no -9, um cacto novo"
            revelado={tem('variation-limit') || tem('spawned-ten')}
            resultado="Pode nascer com -10: o sorteio vem depois da base"
          />
        )}
        {pede('past-limit') && (
          <LinhaDaIdeia
            icone={<TrendingDown size={20} />}
            caso="Sem a pergunta"
            revelado={tem('past-limit')}
            resultado="A base passa do -9 e não para mais"
          />
        )}
      </div>
    </figure>
  )
}

export function LivreAcceleration() {
  const { activity, state, dispatch, instruction } = useDiscovery()
  const v = state.speed
  const { tem, goals, completed, done } = useDescobertas(O_QUE_COMPARAR)
  const gesto = proximoGestoDaAceleracao(discoveryGuidance(activity, state)?.id, v)
  return (
    <Frame
      title="A base que acelera"
      kind="aceleracao"
      activity={activity}
      state={state}
      text={instruction}
      goals={goals}
      completed={completed}
      done={done}
      reset={() => dispatch({ type: 'reset' })}
      hud={
        <Numeros
          itens={[
            ['Base', numero(v.base)],
            ['Pergunta', v.limited ? 'ligada' : 'desligada'],
            ['Cactos', state.crowd.born],
          ]}
        />
      }
      stage={
        <SceneCenarioProvider cenario={activity.cenario}>
          <AccelerationStage state={state} cast={activity.cast} soAPergunta />
        </SceneCenarioProvider>
      }
      after={<IdeiaDaAceleracao metas={sceneTargets(activity)} tem={tem} />}
    >
      <div className="sz-discovery-controls free-controls">
        <SceneButton
          tom={gesto === 'passar' ? 'gesto' : 'ferramenta'}
          onClick={() =>
            // "Passar 5 segundos": a base anda e UM cacto nasce, com o sorteio de agora.
            dispatch({ type: 'sample', kind: 'velocity', unit: Math.random(), guided: false })
          }
        >
          <Timer size={16} /> Passar 5 segundos
        </SceneButton>
        <SceneButton
          aria-pressed={v.limited}
          tom={gesto === 'pergunta' ? 'gesto' : v.limited ? 'ligado' : 'ferramenta'}
          onClick={() => dispatch({ type: 'connect', port: 'limit', enabled: !v.limited })}
        >
          <MessageCircleQuestion size={16} />{' '}
          {v.limited ? 'Desligar a pergunta' : 'Ligar a pergunta'}
        </SceneButton>
        <SceneButton
          tom={gesto === 'voltar' ? 'gesto' : 'ferramenta'}
          onClick={() => dispatch({ type: 'restart-case' })}
        >
          <RotateCcw size={15} /> Voltar ao começo
        </SceneButton>
      </div>
      <p className="sz-discovery-small">
        Com a pergunta ligada, a cada 5 segundos o jogo pergunta: a base é maior que -9? Voltar ao
        começo leva a base ao -5, tira os cactos e guarda a pergunta como está; suas descobertas
        continuam marcadas.
      </p>
      <DicaLivre />
    </Frame>
  )
}
