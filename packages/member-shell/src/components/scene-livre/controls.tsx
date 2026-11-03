'use client'

import { discoveryGuidance, type SceneState, sceneTargets } from '@sistemazero/core/learning/scene'
import { Hand, Home, Keyboard, Smartphone } from 'lucide-react'
import { SceneCenarioProvider } from '../scene-cenario-context'
import { ControlsStage } from '../scene-dino-stages'
import { Frame, SceneButton, useDiscovery } from '../scene-discovery-frame'
import { DicaLivre, LinhaDaIdeia, Numeros, useDescobertas } from './nave-b-comum'

/**
 * A experiência `controls` em exploração livre (Corre Dino, aula 8, 02/11/2026): só a IDEIA. Para
 * começar a partida, o jogo ESCUTA alguma coisa: só o Enter, ou qualquer tecla ou toque. O que cada
 * jeito faz só aparece depois de a criança testá-lo. Nada de "Quando apertar a tecla", evento, Se
 * nem bloco: os blocos ficam para a montagem do Estúdio.
 *
 * ⚠️ O palco continua sendo o botão do toque (`ControlsStage` com `dispatch`), e cada tentativa deixa
 * o selo dela ("✋ tocou: nada aconteceu"), que é o resultado do teste, DEPOIS do gesto.
 */

const O_QUE_COMPARAR: Record<string, string> = {
  'missing-touch': 'Escutando só o Enter, toque na tela de início e observe.',
  'start-key': 'Na tela de início, use o Enter e observe.',
  'start-tap': 'Escutando qualquer tecla ou toque, toque na tela de início e compare.',
}

/** O botão em destaque é o gesto que a fala do Zappy pede agora (a régua de `proximoGestoDaMemoria`). */
export type GestoDoConvite = 'so-enter' | 'tudo' | 'tocar' | 'enter' | 'inicio' | null
export function proximoGestoDoConvite(
  fala: string | undefined,
  m: Pick<SceneState['match'], 'touch' | 'screen'>,
): GestoDoConvite {
  const naTela = m.screen === 'start'
  switch (fala) {
    case 'controls-start':
      if (m.touch) return 'so-enter'
      return naTela ? 'tocar' : 'inicio'
    case 'controls-enter':
    case 'controls-enter-first':
      return naTela ? 'enter' : 'inicio'
    case 'controls-toque':
    case 'controls-toque-first':
      if (!naTela) return 'inicio'
      return m.touch ? 'tocar' : 'tudo'
    default:
      return null
  }
}

/** A ideia: o que cada jeito faz na tela de início, revelado só depois do teste dele. */
function IdeiaDoConvite({ metas, tem }: { metas: readonly string[]; tem: (m: string) => boolean }) {
  return (
    <figure className="sz-scene-regra door-rule">
      <figcaption className="sz-scene-regra-titulo">O que começa a partida</figcaption>
      <div className="memory-actions">
        {metas.includes('missing-touch') && (
          <LinhaDaIdeia
            icone={<Hand size={20} />}
            caso="Um toque, com o jogo escutando só o Enter"
            revelado={tem('missing-touch')}
            resultado="Nada acontece: o jogo não ouve o toque"
          />
        )}
        {metas.includes('start-key') && (
          <LinhaDaIdeia
            icone={<Keyboard size={20} />}
            caso="O Enter"
            revelado={tem('start-key')}
            resultado="A partida começa"
          />
        )}
        {metas.includes('start-tap') && (
          <LinhaDaIdeia
            icone={<Smartphone size={20} />}
            caso="Um toque, com o jogo escutando qualquer tecla ou toque"
            revelado={tem('start-tap')}
            resultado="A partida começa: quem joga no celular, sem teclado, consegue começar"
          />
        )}
      </div>
    </figure>
  )
}

export function LivreControls() {
  const { activity, state, dispatch, instruction } = useDiscovery()
  const m = state.match
  const { tem, goals, completed, done } = useDescobertas(O_QUE_COMPARAR)
  const gesto = proximoGestoDoConvite(discoveryGuidance(activity, state)?.id, m)
  const tom = (qual: Exclude<GestoDoConvite, null>) => (gesto === qual ? 'gesto' : 'ferramenta')
  const inicio = m.screen === 'start'
  const escutar = (tudo: boolean) => dispatch({ type: 'connect', port: 'touch', enabled: tudo })
  return (
    <Frame
      title="O que começa a partida?"
      kind="convite"
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
            ['Tela', inicio ? 'início' : 'jogando'],
            ['O jogo escuta', m.touch ? 'qualquer tecla ou toque' : 'só o Enter'],
          ]}
        />
      }
      stage={
        <SceneCenarioProvider cenario={activity.cenario}>
          <ControlsStage state={state} cast={activity.cast} dispatch={dispatch} />
        </SceneCenarioProvider>
      }
      after={<IdeiaDoConvite metas={sceneTargets(activity)} tem={tem} />}
    >
      <fieldset className="sz-discovery-choices">
        <legend className="frame-controls-label">O que o jogo escuta para começar a partida</legend>
        <SceneButton
          aria-pressed={!m.touch}
          tom={gesto === 'so-enter' ? 'gesto' : !m.touch ? 'ligado' : 'ferramenta'}
          onClick={() => escutar(false)}
        >
          Só o Enter
        </SceneButton>
        <SceneButton
          aria-pressed={m.touch}
          tom={gesto === 'tudo' ? 'gesto' : m.touch ? 'ligado' : 'ferramenta'}
          onClick={() => escutar(true)}
        >
          Qualquer tecla ou toque
        </SceneButton>
      </fieldset>
      <div className="sz-discovery-controls free-controls">
        <SceneButton
          tom={tom('tocar')}
          fechado={!inicio}
          onClick={() => dispatch({ type: 'start', input: 'tap' })}
        >
          <Hand size={16} /> Tocar na tela
        </SceneButton>
        <SceneButton
          tom={tom('enter')}
          fechado={!inicio}
          onClick={() => dispatch({ type: 'start', input: 'key' })}
        >
          <Keyboard size={16} /> Apertar Enter
        </SceneButton>
        <SceneButton
          tom={tom('inicio')}
          fechado={inicio}
          onClick={() => dispatch({ type: 'home' })}
        >
          <Home size={16} /> Voltar à tela de início
        </SceneButton>
      </div>
      <p className="sz-discovery-small">
        Você também pode tocar direto na tela de início, no desenho do jogo. Trocar o que o jogo
        escuta não muda a tela; suas descobertas continuam marcadas.
      </p>
      <DicaLivre />
    </Frame>
  )
}
