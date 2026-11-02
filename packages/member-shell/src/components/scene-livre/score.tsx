'use client'

import { discoveryGuidance, type SceneState, sceneTargets } from '@sistemazero/core/learning/scene'
import {
  CirclePlay,
  Flag,
  Home,
  MessageCircleQuestion,
  Pause,
  StepForward,
  Timer,
  Zap,
} from 'lucide-react'
import { SceneCenarioProvider } from '../scene-cenario-context'
import { ScoreStage } from '../scene-dino-numbers-stages'
import { Frame, SceneButton, useDiscovery } from '../scene-discovery-frame'
import { DicaLivre, LinhaDaIdeia, Numeros, useDescobertas } from './nave-b-comum'

/**
 * A experiência `score` em exploração livre (Corre Dino, aula 11, 02/11/2026): só a IDEIA. O ponto
 * soma a cada quadro ou a cada segundo, e a qualquer hora ou só quando a pergunta "estamos jogando
 * agora?" responde sim. Nada de "Somar ponto", "A cada quadro do jogo", Se nem "o estado do jogo é
 * jogando": os blocos ficam para a montagem do Estúdio.
 *
 * ⚠️ O tempo é o botão "Passar 1 segundo" (`advance` de 1 s, um quadro da cena, que conta um
 * segundo inteiro): o mesmo gesto dá o mesmo placar, e o destaque fica exato.
 * ⚠️ Trocar quando o ponto soma ou a pergunta zera o placar (o motor recomeça a fileira das telas).
 * ⚠️ O "esperando" do placar só aparece depois de a criança ver o início esperar (`semEspera`).
 */

const O_QUE_COMPARAR: Record<string, string> = {
  'score-runaway': 'Com o ponto a cada quadro e sem a pergunta, passe 1 segundo e conte os pontos.',
  'score-idle-wrong':
    'Com o ponto a cada segundo e sem a pergunta, passe 1 segundo na tela de início e observe.',
  'score-start': 'Com a pergunta ligada, passe 1 segundo na tela de início e compare.',
  'score-waiting': 'Com a pergunta ligada, passe 1 segundo na tela de início e observe.',
  'score-playing': 'Com a pergunta ligada, comece a partida, passe 1 segundo e compare.',
  'score-end': 'Com a pergunta ligada, termine a partida, passe 1 segundo e compare.',
  'score-kept': 'Com a pergunta ligada, termine a partida, passe 1 segundo e compare.',
}

type Relogio = 'frame' | 'second'
const relogioDe = (m: Pick<SceneState['match'], 'scoreClock'>): Relogio =>
  m.scoreClock === 'frame' ? 'frame' : 'second'

/** O botão em destaque é o gesto que a fala do Zappy pede agora (a régua de `proximoGestoDaMemoria`). */
export type GestoDoPlacar =
  | 'quadro'
  | 'segundo'
  | 'pergunta'
  | 'passar'
  | 'comecar'
  | 'terminar'
  | 'inicio'
  | null
export function proximoGestoDoPlacar(
  fala: string | undefined,
  m: Pick<SceneState['match'], 'scoreClock' | 'guarded' | 'screen'>,
): GestoDoPlacar {
  const relogio = relogioDe(m)
  switch (fala) {
    case 'score-start':
      if (m.guarded) return 'pergunta'
      return relogio === 'frame' ? 'passar' : 'quadro'
    case 'score-solto':
    case 'score-solto-first':
      if (relogio !== 'second') return 'segundo'
      if (m.guarded) return 'pergunta'
      return m.screen === 'start' ? 'passar' : 'inicio'
    case 'score-espera':
      if (!m.guarded) return 'pergunta'
      return m.screen === 'start' ? 'passar' : 'inicio'
    case 'score-jogando':
    case 'score-jogando-first':
      if (!m.guarded) return 'pergunta'
      if (m.screen === 'end') return 'inicio'
      return m.screen === 'start' ? 'comecar' : 'passar'
    case 'score-fim':
      if (!m.guarded) return 'pergunta'
      if (m.screen === 'start') return 'comecar'
      return m.screen === 'playing' ? 'terminar' : 'passar'
    default:
      return null
  }
}

/** A ideia: quando o ponto soma em cada caso, revelado depois do teste dele. */
function IdeiaDoPlacar({ metas, tem }: { metas: readonly string[]; tem: (m: string) => boolean }) {
  const pede = (...ids: string[]) => ids.some((id) => metas.includes(id))
  const viu = (...ids: string[]) => ids.some(tem)
  return (
    <figure className="sz-scene-regra door-rule">
      <figcaption className="sz-scene-regra-titulo">Quando o ponto soma</figcaption>
      <div className="memory-actions">
        {pede('score-runaway') && (
          <LinhaDaIdeia
            icone={<Zap size={20} />}
            caso="A cada quadro, sem a pergunta"
            revelado={tem('score-runaway')}
            resultado="60 pontos em um segundo: o placar dispara"
          />
        )}
        {pede('score-idle-wrong') && (
          <LinhaDaIdeia
            icone={<Timer size={20} />}
            caso="A cada segundo, sem a pergunta, na tela de início"
            revelado={tem('score-idle-wrong')}
            resultado="O placar cresce antes de a partida começar"
          />
        )}
        {pede('score-start', 'score-waiting') && (
          <LinhaDaIdeia
            icone={<Pause size={20} />}
            caso="Com a pergunta, na tela de início"
            revelado={viu('score-start', 'score-waiting')}
            resultado="A resposta é não: o placar espera"
          />
        )}
        {pede('score-playing') && (
          <LinhaDaIdeia
            icone={<CirclePlay size={20} />}
            caso="Com a pergunta, jogando"
            revelado={tem('score-playing')}
            resultado="A resposta é sim: entra um ponto a cada segundo"
          />
        )}
        {pede('score-end', 'score-kept') && (
          <LinhaDaIdeia
            icone={<Flag size={20} />}
            caso="Com a pergunta, no fim da partida"
            revelado={viu('score-end', 'score-kept')}
            resultado="A resposta é não: o placar para no valor da partida"
          />
        )}
      </div>
    </figure>
  )
}

export function LivreScore() {
  const { activity, state, dispatch, instruction, setRunning } = useDiscovery()
  const m = state.match
  const relogio = relogioDe(m)
  const { tem, goals, completed, done } = useDescobertas(O_QUE_COMPARAR)
  const gesto = proximoGestoDoPlacar(discoveryGuidance(activity, state)?.id, m)
  const tom = (qual: Exclude<GestoDoPlacar, null>) => (gesto === qual ? 'gesto' : 'ferramenta')
  const lugar = (clock: Relogio, guarded: boolean) =>
    dispatch({ type: 'score-place', clock, guarded })
  const tela = m.screen === 'start' ? 'início' : m.screen === 'playing' ? 'jogando' : 'fim'
  return (
    <Frame
      title="Quando o placar cresce?"
      kind="placar"
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
            ['Tela', tela],
            ['Placar', m.points],
            ['O ponto soma', relogio === 'frame' ? 'a cada quadro' : 'a cada segundo'],
            ['Pergunta', m.guarded ? 'ligada' : 'desligada'],
          ]}
        />
      }
      stage={
        <SceneCenarioProvider cenario={activity.cenario}>
          <ScoreStage
            state={state}
            cast={activity.cast}
            semEspera={!tem('score-start') && !tem('score-waiting')}
          />
        </SceneCenarioProvider>
      }
      after={<IdeiaDoPlacar metas={sceneTargets(activity)} tem={tem} />}
    >
      <fieldset className="sz-discovery-choices">
        <legend className="frame-controls-label">Quando o ponto soma</legend>
        <SceneButton
          aria-pressed={relogio === 'frame'}
          tom={gesto === 'quadro' ? 'gesto' : relogio === 'frame' ? 'ligado' : 'ferramenta'}
          onClick={() => lugar('frame', m.guarded)}
        >
          A cada quadro
        </SceneButton>
        <SceneButton
          aria-pressed={relogio === 'second'}
          tom={gesto === 'segundo' ? 'gesto' : relogio === 'second' ? 'ligado' : 'ferramenta'}
          onClick={() => lugar('second', m.guarded)}
        >
          A cada segundo
        </SceneButton>
      </fieldset>
      <div className="sz-discovery-controls free-controls">
        <SceneButton
          aria-pressed={m.guarded}
          tom={gesto === 'pergunta' ? 'gesto' : m.guarded ? 'ligado' : 'ferramenta'}
          onClick={() => lugar(relogio, !m.guarded)}
        >
          <MessageCircleQuestion size={16} />{' '}
          {m.guarded ? 'Desligar a pergunta' : 'Ligar a pergunta'}
        </SceneButton>
        <span className="sz-discovery-small">A pergunta: estamos jogando agora?</span>
      </div>
      <div className="sz-discovery-controls free-controls">
        <SceneButton
          tom={tom('passar')}
          onClick={() => {
            setRunning(false)
            dispatch({ type: 'advance', seconds: 1 })
          }}
        >
          <StepForward size={16} /> Passar 1 segundo
        </SceneButton>
        <SceneButton
          tom={tom('comecar')}
          fechado={m.screen !== 'start'}
          onClick={() => dispatch({ type: 'start', input: 'tap' })}
        >
          <CirclePlay size={16} /> Começar a partida
        </SceneButton>
        <SceneButton
          tom={tom('terminar')}
          fechado={m.screen !== 'playing'}
          onClick={() => dispatch({ type: 'collide' })}
        >
          <Flag size={16} /> Terminar a partida
        </SceneButton>
        <SceneButton
          tom={tom('inicio')}
          fechado={m.screen === 'start'}
          onClick={() => dispatch({ type: 'home' })}
        >
          <Home size={16} /> Voltar à tela de início
        </SceneButton>
      </div>
      <p className="sz-discovery-small">
        Trocar quando o ponto soma, ou ligar e desligar a pergunta, zera o placar; suas descobertas
        continuam marcadas.
      </p>
      <DicaLivre />
    </Frame>
  )
}
