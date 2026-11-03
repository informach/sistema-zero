'use client'

import { discoveryGuidance, numero, type SceneState } from '@sistemazero/core/learning/scene'
import { Dice5, Gauge, Repeat } from 'lucide-react'
import { SceneCenarioProvider } from '../../scene-cenario-context'
import { RandomStage } from '../../scene-dino-numbers-stages'
import { Frame, SceneButton, useDiscovery } from '../../scene-discovery-frame'
import { DicaLivre, LinhaDaIdeia, Numeros, useDescobertas } from '../nave-b-comum'

/**
 * A `random` do Corre Dino em exploração livre (Aula 12, 02/11/2026): só a IDEIA, no molde da tela da
 * Nave (`scene-livre/random.tsx`), no caso `cacto-direita`: o lugar onde cada cacto nasce, depois da
 * borda da direita (a régua de 500 a 560), e a velocidade dele (−5 ou −6, nas raias). O bloco do
 * sorteio fica para a montagem do Estúdio. Que os lugares mudam, que um lugar repete e que o −6 chega
 * mais longe só aparece depois de a criança testar. A criança escolhe a ordem: a velocidade não espera
 * o lugar repetir (a bancada antiga a fechava até lá).
 * ⚠️ O sorteio é DE VERDADE e viaja no gesto (`Math.random()` do navegador). Sem ▶: o tempo da corrida
 * mora no gesto da velocidade (o cacto corre um segundo na raia dele).
 */

const O_QUE_COMPARAR: Record<string, string> = {
  positions: 'Sorteie o lugar algumas vezes e compare as marquinhas na régua.',
  repeat: 'Sorteie o lugar muitas vezes e procure um lugar que saiu mais de uma vez.',
  velocities: 'Sorteie a velocidade algumas vezes e compare as raias.',
}

/** O botão em destaque é o gesto que a fala do Zappy pede agora. */
export type GestoDoSorteioDino = 'lugar' | 'velocidade' | null
export function proximoGestoDoSorteioDino(fala: string | undefined): GestoDoSorteioDino {
  switch (fala) {
    case 'random-dino-start':
    case 'random-dino-once':
    case 'random-dino-places':
    case 'random-dino-repeat-first':
    case 'random-dino-speeds':
      return 'lugar'
    case 'random-dino-repeat':
    case 'random-dino-speed-once':
      return 'velocidade'
    default:
      return null
  }
}

/** A ideia: o lugar, a repetição e a velocidade, cada um revelado depois do teste dele. */
function IdeiaDoSorteio({
  visto,
}: {
  visto: { lugares: boolean; repete: boolean; velocidades: boolean }
}) {
  return (
    <figure className="sz-scene-regra door-rule">
      <figcaption className="sz-scene-regra-titulo">O que o jogo sorteia?</figcaption>
      <div className="memory-actions">
        <LinhaDaIdeia
          icone={<Dice5 size={20} />}
          caso="O lugar onde o cacto nasce (x)"
          revelado={visto.lugares}
          resultado="Cada sorteio pode dar um lugar diferente, sempre entre 500 e 560, depois da borda da tela"
        />
        <LinhaDaIdeia
          icone={<Repeat size={20} />}
          caso="O mesmo lugar, de novo"
          revelado={visto.repete}
          resultado="Pode sair: num sorteio, um resultado pode repetir"
        />
        <LinhaDaIdeia
          icone={<Gauge size={20} />}
          caso="A velocidade do cacto"
          revelado={visto.velocidades}
          resultado="Sai −5 ou −6: o cacto −6 anda mais em cada quadro e chega mais longe"
        />
      </div>
    </figure>
  )
}

export function LivreRandomDino() {
  const { activity, state, dispatch, instruction } = useDiscovery()
  const sp: SceneState['speed'] = state.speed
  const { tem, goals, completed, done } = useDescobertas(O_QUE_COMPARAR)
  const gesto = proximoGestoDoSorteioDino(discoveryGuidance(activity, state)?.id)
  const sorteados = sp.spots.reduce((soma, n) => soma + n, 0)
  return (
    <Frame
      title="O que o jogo sorteia?"
      kind="sorteio"
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
            ['x do cacto', sp.samples.x],
            ['Velocidade', numero(sp.samples.velocity)],
            ['Sorteios do lugar', sorteados],
          ]}
        />
      }
      stage={
        <SceneCenarioProvider cenario={activity.cenario}>
          <RandomStage state={state} cast={activity.cast} preset={activity.setup?.preset} />
        </SceneCenarioProvider>
      }
      after={
        <IdeiaDoSorteio
          visto={{
            lugares: tem('positions'),
            repete: tem('repeat'),
            velocidades: tem('velocities'),
          }}
        />
      }
    >
      <div className="sz-discovery-controls free-controls">
        <SceneButton
          tom={gesto === 'lugar' ? 'gesto' : 'ferramenta'}
          onClick={() =>
            dispatch({ type: 'sample', kind: 'position', unit: Math.random(), guided: false })
          }
        >
          <Dice5 size={16} /> Sortear um lugar
        </SceneButton>
        <SceneButton
          tom={gesto === 'velocidade' ? 'gesto' : 'ferramenta'}
          onClick={() =>
            dispatch({ type: 'sample', kind: 'velocity', unit: Math.random(), guided: false })
          }
        >
          <Gauge size={16} /> Sortear uma velocidade
        </SceneButton>
      </div>
      <p className="sz-discovery-small">
        Cada sorteio de lugar ganha uma marquinha na régua. Cada sorteio de velocidade faz um cacto
        correr um segundo na raia dele.
      </p>
      <DicaLivre />
    </Frame>
  )
}
