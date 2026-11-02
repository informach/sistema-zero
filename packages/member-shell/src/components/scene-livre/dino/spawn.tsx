'use client'

import {
  decimal,
  discoveryGuidance,
  type SceneState,
  sceneFrameRate,
} from '@sistemazero/core/learning/scene'
import { CloudRain, Timer } from 'lucide-react'
import { useId } from 'react'
import { SceneCenarioProvider } from '../../scene-cenario-context'
import { SpawnStage } from '../../scene-dino-stages'
import { Frame, SceneButton, useDiscovery } from '../../scene-discovery-frame'
import {
  BotaoDoTempo,
  DicaLivre,
  LinhaDaIdeia,
  Numeros,
  useDescobertas,
  useTempo,
} from '../nave-b-comum'

/**
 * A `spawn` do Corre Dino em exploração livre (Aula 5, 02/11/2026): só a IDEIA, no molde da tela da
 * Nave (`scene-livre/spawn.tsx`). "Um cacto novo a cada tanto tempo": em todo quadro, ou esperando um
 * tempo no relógio, em segundos (o caso `cacto-segundos`, com o 1,4 s do projeto da aula). O bloco
 * que cria o cacto e o relógio do Estúdio ficam para a montagem. O que cada jeito faz (a parede, o
 * espaço) só aparece depois de a criança testar aquele jeito.
 */

const O_QUE_COMPARAR: Record<string, string> = {
  'every-frame': 'Deixe nascer um cacto novo em todo quadro por 1 segundo e observe os cactos.',
  'with-timer': 'Deixe cada cacto novo esperar um tempo no relógio e observe até nascerem dois.',
}

/** Quando nasce um cacto novo: em todo quadro, ou a cada N segundos (os tempos do caso). */
export type JeitoDoCacto = 'todo' | 0.5 | 1 | 1.4 | 2
const JEITOS: readonly JeitoDoCacto[] = ['todo', 0.5, 1, 1.4, 2]
export const ROTULO_DO_JEITO: Record<string, string> = {
  todo: 'Em todo quadro',
  0.5: 'A cada 0,5 segundo',
  1: 'A cada 1 segundo',
  1.4: 'A cada 1,4 segundo',
  2: 'A cada 2 segundos',
}

const QUADROS_POR_SEGUNDO = sceneFrameRate('spawn') ?? 30

export function jeitoDoCacto(c: Pick<SceneState['crowd'], 'timer' | 'interval'>): JeitoDoCacto {
  if (!c.timer) return 'todo'
  return JEITOS.find((j) => j !== 'todo' && Math.abs(j - c.interval) < 1e-6) ?? 1
}

/**
 * O botão em destaque é o gesto que a fala do Zappy pede agora: escolher o jeito que a fala sugere,
 * ou passar o tempo com ele já escolhido.
 */
export type GestoDoCacto = JeitoDoCacto | 'passar' | null
export function proximoGestoDoCacto(
  fala: string | undefined,
  c: Pick<SceneState['crowd'], 'timer' | 'interval'>,
): GestoDoCacto {
  switch (fala) {
    case 'spawn-dino-start':
    case 'spawn-dino-wait':
      return 'passar'
    case 'spawn-dino-wall':
      return c.timer ? 'passar' : 1.4
    case 'spawn-dino-gap':
      return c.timer ? 'todo' : 'passar'
    default:
      return null
  }
}

export function LivreSpawnDino() {
  const { activity, state, dispatch, instruction } = useDiscovery()
  const c = state.crowd
  const { tem, goals, completed, done } = useDescobertas(O_QUE_COMPARAR)
  const gesto = proximoGestoDoCacto(discoveryGuidance(activity, state)?.id, c)
  const tempo = useTempo(false)
  const ajuda = useId()
  const agora = jeitoDoCacto(c)
  const escolher = (jeito: JeitoDoCacto) => {
    tempo.parar()
    if (jeito === agora) return
    if (jeito === 'todo') {
      dispatch({ type: 'connect', port: 'timer', enabled: false })
      return
    }
    if (!c.timer) {
      dispatch({ type: 'connect', port: 'timer', enabled: true })
      if (Math.abs(c.interval - jeito) > 1e-6) dispatch({ type: 'interval', seconds: jeito })
    } else dispatch({ type: 'interval', seconds: jeito })
  }
  return (
    <Frame
      title="Quando nasce um cacto novo?"
      kind="nascimento"
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
            ['Cactos que nasceram', c.born],
            ['Tempo', `${decimal(Math.round(c.elapsed * 10) / 10)} s`],
            ['Quadros', Math.round(c.elapsed * QUADROS_POR_SEGUNDO)],
          ]}
        />
      }
      stage={
        <SceneCenarioProvider cenario={activity.cenario}>
          <SpawnStage state={state} cast={activity.cast} preset={activity.setup?.preset} />
        </SceneCenarioProvider>
      }
      after={
        <figure className="sz-scene-regra door-rule">
          <figcaption className="sz-scene-regra-titulo">Quando nasce um cacto novo?</figcaption>
          <div className="memory-actions">
            <LinhaDaIdeia
              icone={<CloudRain size={20} />}
              caso="Em todo quadro"
              revelado={tem('every-frame')}
              resultado="Uns 30 cactos em 1 segundo, um colado no outro, como uma parede"
            />
            <LinhaDaIdeia
              icone={<Timer size={20} />}
              caso="Esperando um tempo no relógio"
              revelado={tem('with-timer')}
              resultado="Nasce um, espera, nasce outro: sobra espaço para o Dino pular"
            />
          </div>
        </figure>
      }
    >
      <fieldset className="sz-discovery-choices" aria-describedby={ajuda}>
        <legend className="frame-controls-label">Quando nasce um cacto novo?</legend>
        {JEITOS.map((jeito) => (
          <SceneButton
            key={String(jeito)}
            aria-pressed={agora === jeito}
            tom={gesto === jeito ? 'gesto' : agora === jeito ? 'ligado' : 'ferramenta'}
            onClick={() => escolher(jeito)}
          >
            {ROTULO_DO_JEITO[String(jeito)]}
          </SceneButton>
        ))}
      </fieldset>
      <p className="sz-discovery-small" id={ajuda}>
        Trocar o jeito de nascer recomeça a pista. Suas descobertas continuam marcadas.
      </p>
      <div className="sz-discovery-controls free-controls">
        <SceneButton
          tom={gesto === 'passar' ? 'gesto' : 'ferramenta'}
          onClick={() => tempo.passar(1)}
        >
          Passar 1 segundo
        </SceneButton>
        <BotaoDoTempo running={tempo.running} onClick={tempo.alternar} />
      </div>
      <DicaLivre />
    </Frame>
  )
}
