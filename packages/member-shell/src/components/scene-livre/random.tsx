'use client'

import { discoveryGuidance, numero, type SceneState } from '@sistemazero/core/learning/scene'
import { ArrowDownToLine, Dice5 } from 'lucide-react'
import { SceneCenarioProvider } from '../scene-cenario-context'
import { RandomStage } from '../scene-dino-numbers-stages'
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
 * A experiência `random` em exploração livre (Construtor, 02/11/2026): só a IDEIA, no molde dos
 * Poderes. "O jogo sorteia" o lugar de cada pedra; o bloco do sorteio fica para a montagem do Estúdio.
 * Que o lugar muda e que a pedra nasce acima da tela só aparece depois de a criança testar.
 * ⚠️ O sorteio é DE VERDADE e viaja no gesto (`Math.random()` do navegador), como na bancada antiga.
 */

const O_QUE_COMPARAR: Record<string, string> = {
  positions: 'Sorteie o lugar algumas vezes e compare as marquinhas na régua.',
  above: 'Deixe o tempo passar e observe de onde a pedra entra na tela.',
  repeat: 'Sorteie muitas vezes e procure um lugar que saiu duas vezes.',
  velocities: 'Sorteie a velocidade algumas vezes e compare as corridas.',
}

/** Onde a pedra para de cair no desenho: dali em diante o ▶ não tem o que mostrar. */
const FIM_DA_QUEDA = 300

/**
 * O botão em destaque é o gesto que a fala do Zappy pede agora (a régua de `proximoGestoDaMemoria`).
 */
export type GestoDoSorteio = 'sortear' | 'passar' | null
export function proximoGestoDoSorteio(fala: string | undefined): GestoDoSorteio {
  switch (fala) {
    case 'random-start':
    case 'random-once':
    case 'random-above':
      return 'sortear'
    case 'random-places':
      return 'passar'
    default:
      return null
  }
}

/** A pedra já caiu inteira: o ▶ para. */
export function pedraCaiu(s: Pick<SceneState['speed'], 'fallingY'>): boolean {
  return (s.fallingY ?? 0) >= FIM_DA_QUEDA
}

/** A ideia: o lugar sorteado e de onde a pedra entra, cada um revelado depois do teste dele. */
function IdeiaDoSorteio({ visto }: { visto: { lugares: boolean; acima: boolean } }) {
  return (
    <figure className="sz-scene-regra door-rule">
      <figcaption className="sz-scene-regra-titulo">Onde nasce cada pedra?</figcaption>
      <div className="memory-actions">
        <LinhaDaIdeia
          icone={<Dice5 size={20} />}
          caso="O lugar, de um lado ao outro (x)"
          revelado={visto.lugares}
          resultado="O jogo sorteia: cada pedra pode nascer num x diferente, entre 90 e 390"
        />
        <LinhaDaIdeia
          icone={<ArrowDownToLine size={20} />}
          caso="A altura em que ela nasce (y)"
          revelado={visto.acima}
          resultado="Acima da borda de cima, fora da tela: a pedra entra caindo"
        />
      </div>
    </figure>
  )
}

export function LivreRandom() {
  const { activity, state, dispatch, instruction } = useDiscovery()
  const sp = state.speed
  const { tem, goals, completed, done } = useDescobertas(O_QUE_COMPARAR)
  const gesto = proximoGestoDoSorteio(discoveryGuidance(activity, state)?.id)
  const tempo = useTempo(pedraCaiu(sp))
  const sorteados = sp.spots.filter((n) => n > 0).length
  return (
    <Frame
      title="Onde nasce cada pedra?"
      kind="sorteio"
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
            ['x da pedra', sp.samples.x],
            ['y da pedra', numero(Math.min(sp.fallingY ?? -30, 270))],
            ['Lugares sorteados', sorteados],
          ]}
        />
      }
      stage={
        <SceneCenarioProvider cenario={activity.cenario}>
          <RandomStage state={state} cast={activity.cast} preset={activity.setup?.preset} />
        </SceneCenarioProvider>
      }
      after={<IdeiaDoSorteio visto={{ lugares: tem('positions'), acima: tem('above') }} />}
    >
      <div className="sz-discovery-controls free-controls">
        <SceneButton
          tom={gesto === 'sortear' ? 'gesto' : 'ferramenta'}
          onClick={() => {
            tempo.parar()
            dispatch({ type: 'sample', kind: 'position', unit: Math.random(), guided: false })
          }}
        >
          <Dice5 size={16} /> Sortear um lugar
        </SceneButton>
      </div>
      <p className="sz-discovery-small">
        Cada sorteio escolhe um lugar novo para a pedra e a leva de volta ao começo da queda. A
        régua marca cada lugar que já saiu.
      </p>
      <div className="sz-discovery-controls free-controls">
        <SceneButton
          tom={gesto === 'passar' ? 'gesto' : 'ferramenta'}
          fechado={pedraCaiu(sp)}
          onClick={() => tempo.passar(1)}
        >
          Passar 1 segundo
        </SceneButton>
        <BotaoDoTempo running={tempo.running} fechado={pedraCaiu(sp)} onClick={tempo.alternar} />
      </div>
      {pedraCaiu(sp) && (
        <p className="sz-discovery-small">
          A pedra já caiu. Sorteie outro lugar para ver uma pedra nova nascer.
        </p>
      )}
      <DicaLivre />
    </Frame>
  )
}
