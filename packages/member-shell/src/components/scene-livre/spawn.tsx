'use client'

import {
  decimal,
  discoveryGuidance,
  type SceneState,
  sceneFrameRate,
} from '@sistemazero/core/learning/scene'
import { ArrowDown, CloudRain, Timer } from 'lucide-react'
import { useId } from 'react'
import { SceneCenarioProvider } from '../scene-cenario-context'
import { SpawnStage } from '../scene-dino-stages'
import { Frame, SceneButton, useDiscovery } from '../scene-discovery-frame'
import {
  BotaoDoTempo,
  DicaLivre,
  LinhaDaIdeia,
  Numeros,
  useDescobertas,
  useTempo,
} from './nave-b-comum'

/**
 * A experiência `spawn` em exploração livre (Construtor, 02/11/2026): só a IDEIA, no molde dos
 * Poderes. "Uma pedra nova a cada tanto tempo": em todo quadro, ou depois de uma espera de alguns
 * quadros. O bloco que cria a pedra e o que espera ficam para a montagem do Estúdio. O que cada jeito
 * faz (a fileira colada, o espaço, a mesma queda) só aparece depois de a criança testar aquele jeito.
 */

const O_QUE_COMPARAR: Record<string, string> = {
  'every-frame': 'Deixe nascer uma pedra nova em todo quadro por 1 segundo e observe as pedras.',
  'with-timer': 'Deixe cada pedra nova esperar alguns quadros e observe até nascerem duas.',
  'same-fall': 'Compare quanto a primeira pedra desce em 60 quadros, de 40 em 40 e de 20 em 20.',
}

/** Quando nasce uma pedra nova: em todo quadro, ou de N em N quadros. */
export type JeitoDeNascer = 'todo' | 20 | 40 | 80
const JEITOS: readonly JeitoDeNascer[] = ['todo', 20, 40, 80]
const ROTULO: Record<string, string> = {
  todo: 'Em todo quadro',
  20: 'De 20 em 20 quadros',
  40: 'De 40 em 40 quadros',
  80: 'De 80 em 80 quadros',
}

const QUADROS_POR_SEGUNDO = sceneFrameRate('spawn') ?? 30

export function jeitoDeAgora(c: Pick<SceneState['crowd'], 'timer' | 'interval'>): JeitoDeNascer {
  if (!c.timer) return 'todo'
  const n = Math.round(c.interval * QUADROS_POR_SEGUNDO)
  return n === 20 || n === 80 ? n : 40
}

/**
 * O botão em destaque é o gesto que a fala do Zappy pede agora (a régua de `proximoGestoDaMemoria`):
 * escolher o jeito que a fala sugere, ou passar o tempo com ele já escolhido.
 */
export type GestoDoNascimento = JeitoDeNascer | 'passar' | null
export function proximoGestoDoNascimento(
  fala: string | undefined,
  c: Pick<SceneState['crowd'], 'timer' | 'interval'>,
): GestoDoNascimento {
  const agora = jeitoDeAgora(c)
  const escolher = (jeito: JeitoDeNascer): GestoDoNascimento => (agora === jeito ? 'passar' : jeito)
  switch (fala) {
    case 'spawn-start':
    case 'spawn-wait':
      return 'passar'
    case 'spawn-wall':
      return c.timer ? 'passar' : 40
    case 'spawn-gap':
    case 'spawn-same-wall':
      return escolher('todo')
    case 'spawn-fall':
    case 'spawn-fall-20':
      return escolher(40)
    case 'spawn-fall-40':
      return escolher(20)
    default:
      return null
  }
}

/** A ideia: os dois jeitos de nascer e a queda, cada um revelado depois do teste dele. */
function IdeiaDoNascimento({
  c,
  visto,
}: {
  c: SceneState['crowd']
  visto: { parede: boolean; espera: boolean; queda: boolean }
}) {
  const medida = (n?: number) => (n === undefined ? '?' : String(n))
  const mediu = c.fallBaseline !== undefined || c.fallComparison !== undefined
  return (
    <figure className="sz-scene-regra door-rule">
      <figcaption className="sz-scene-regra-titulo">Quando nasce uma pedra nova?</figcaption>
      <div className="memory-actions">
        <LinhaDaIdeia
          icone={<CloudRain size={20} />}
          caso="Em todo quadro"
          revelado={visto.parede}
          resultado="Umas 30 pedras em 1 segundo, uma colada na outra"
        />
        <LinhaDaIdeia
          icone={<Timer size={20} />}
          caso="Com uma espera de alguns quadros"
          revelado={visto.espera}
          resultado="Nasce uma, espera, nasce outra: sobra espaço entre elas"
        />
        <LinhaDaIdeia
          icone={<ArrowDown size={20} />}
          caso="Quanto a primeira pedra desce em 60 quadros"
          revelado={mediu}
          resultado={`De 40 em 40: ${medida(c.fallBaseline)} · De 20 em 20: ${medida(c.fallComparison)}${
            visto.queda ? '. Igual: cada pedra cai 3 por quadro, nasça quando nascer' : ''
          }`}
        />
      </div>
    </figure>
  )
}

export function LivreSpawn() {
  const { activity, state, dispatch, instruction } = useDiscovery()
  const c = state.crowd
  const { tem, goals, completed, done } = useDescobertas(O_QUE_COMPARAR)
  const gesto = proximoGestoDoNascimento(discoveryGuidance(activity, state)?.id, c)
  const tempo = useTempo(false)
  const ajuda = useId()
  const agora = jeitoDeAgora(c)
  const escolher = (jeito: JeitoDeNascer) => {
    tempo.parar()
    if (jeito === 'todo') {
      dispatch({ type: 'connect', port: 'timer', enabled: false })
      return
    }
    const segundos = jeito / QUADROS_POR_SEGUNDO
    if (!c.timer) {
      dispatch({ type: 'connect', port: 'timer', enabled: true })
      if (Math.round(c.interval * QUADROS_POR_SEGUNDO) !== jeito)
        dispatch({ type: 'interval', seconds: segundos })
    } else dispatch({ type: 'interval', seconds: segundos })
  }
  return (
    <Frame
      title="Quando nasce uma pedra nova?"
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
            ['Pedras que nasceram', c.born],
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
        <IdeiaDoNascimento
          c={c}
          visto={{
            parede: tem('every-frame'),
            espera: tem('with-timer'),
            queda: tem('same-fall'),
          }}
        />
      }
    >
      <fieldset className="sz-discovery-choices" aria-describedby={ajuda}>
        <legend className="frame-controls-label">Quando nasce uma pedra nova?</legend>
        {JEITOS.map((jeito) => (
          <SceneButton
            key={String(jeito)}
            aria-pressed={agora === jeito}
            tom={gesto === jeito ? 'gesto' : agora === jeito ? 'ligado' : 'ferramenta'}
            onClick={() => escolher(jeito)}
          >
            {ROTULO[String(jeito)]}
          </SceneButton>
        ))}
      </fieldset>
      <p className="sz-discovery-small" id={ajuda}>
        Trocar o jeito de nascer recomeça a chuva de pedras. Suas descobertas continuam marcadas.
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
