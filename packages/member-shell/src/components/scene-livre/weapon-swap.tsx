'use client'

import {
  discoveryGuidance,
  type SceneState,
  weaponSwapFresh,
} from '@sistemazero/core/learning/scene'
import { Keyboard, Lock, Package, RefreshCw, RotateCcw, Send, Unlock } from 'lucide-react'
import { useId } from 'react'
import { SceneCenarioProvider } from '../scene-cenario-context'
import { Frame, SceneButton, useDiscovery } from '../scene-discovery-frame'
import { BOTOES_DA_ARMA, WeaponSwapStage } from '../scene-weapon-swap'
import { DicaLivre, LinhaDaIdeia, Numeros, useDescobertas } from './nave-b-comum'

/**
 * A troca de arma (`weapon-swap`, Poder "Troca de arma" do Construtor, Nave contra Asteroides,
 * 28/11/2026) em exploração livre: só a IDEIA, no molde do `enemy-fire`. A nave começa com o laser e
 * o plasma trancado; a criança pega o item de plasma, aperta E, aperta Espaço e começa uma Nova
 * partida. Cada linha da figura "Uma arma que muda o tiro" só se revela depois de a criança ver
 * aquele caso. Falas: `guia-livre/weapon-swap.ts` do core.
 */

const O_QUE_COMPARAR: Record<string, string> = {
  locked: 'Sem pegar o item de plasma, clique em Apertar E e olhe a Arma.',
  'unlocked-swap': 'Pegue o item de plasma, clique em Apertar E e olhe a Arma.',
  'shot-follows': 'Dispare com o laser e com o plasma e compare os dois tiros.',
  'new-match-laser': 'Com o plasma escolhido, comece uma Nova partida e olhe a Arma.',
}

type Arma = Pick<SceneState['weaponSwap'], 'weapon' | 'unlocked' | 'fired'>

/**
 * O botão em destaque é o gesto que a fala do Zappy pede agora: o controle que ainda falta para o
 * teste da fala (a Nova partida que tranca o plasma, o item, o E até a arma certa) e, pronto, o gesto
 * do teste. O teste vem do convite (`-then-<próximo>`, `-ask-<teste>`) ou do começo.
 */
export type GestoDaArma = 'pegar' | 'e' | 'espaco' | 'nova' | null
export function proximoGestoDaArma(fala: string | undefined, w: Arma): GestoDaArma {
  if (!fala || fala === 'weapon-swap-complete') return null
  const teste =
    fala === 'weapon-swap-start'
      ? 'locked'
      : fala.startsWith('weapon-swap-ask-')
        ? fala.slice('weapon-swap-ask-'.length)
        : fala.split('-then-')[1]
  switch (teste) {
    case 'locked':
    case 'relock':
      return w.unlocked ? 'nova' : 'e'
    case 'swap':
      return w.unlocked ? 'e' : 'pegar'
    case 'shots':
      if (!w.fired.includes(w.weapon)) return 'espaco'
      return w.unlocked ? 'e' : 'pegar'
    case 'newmatch':
      if (w.weapon === 'plasma') return 'nova'
      return w.unlocked ? 'e' : 'pegar'
    default:
      return null
  }
}

/** A ideia: o que cada caso da arma fez, revelado depois do teste dele. */
function IdeiaDaArma({
  visto,
}: {
  visto: { trancado: boolean; troca: boolean; tiro: boolean; nova: boolean }
}) {
  return (
    <figure className="sz-scene-regra door-rule">
      <figcaption className="sz-scene-regra-titulo">Uma arma que muda o tiro</figcaption>
      <div className="memory-actions">
        <LinhaDaIdeia
          icone={<Lock size={20} />}
          caso="O E sem o item de plasma"
          revelado={visto.trancado}
          resultado="Nada mudou: a Arma continuou laser"
        />
        <LinhaDaIdeia
          icone={<Unlock size={20} />}
          caso="O E depois do item"
          revelado={visto.troca}
          resultado="A Arma trocou de laser para plasma"
        />
        <LinhaDaIdeia
          icone={<Send size={20} />}
          caso="O Espaço com cada arma"
          revelado={visto.tiro}
          resultado="O laser saiu fino e rápido; o plasma, grande e lento"
        />
        <LinhaDaIdeia
          icone={<RefreshCw size={20} />}
          caso="Nova partida com o plasma"
          revelado={visto.nova}
          resultado="A Arma voltou para laser, e o plasma ficou trancado"
        />
      </div>
    </figure>
  )
}

export function LivreWeaponSwap() {
  const { activity, state, dispatch, instruction } = useDiscovery()
  const w = state.weaponSwap
  const { tem, goals, completed, done } = useDescobertas(O_QUE_COMPARAR)
  const gesto = proximoGestoDaArma(discoveryGuidance(activity, state)?.id, w)
  const ajuda = useId()
  const tom = (g: GestoDaArma) => (gesto === g ? 'gesto' : 'ferramenta')
  return (
    <Frame
      title="A troca de arma"
      kind="troca-de-arma"
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
            ['Arma', w.weapon],
            ['Plasma', w.unlocked ? 'liberado' : 'trancado'],
            ['Último tiro', w.shot ? `${w.shot.frames} quadros` : '—'],
          ]}
        />
      }
      stage={
        <SceneCenarioProvider cenario={activity.cenario}>
          <WeaponSwapStage state={state} cast={activity.cast} />
        </SceneCenarioProvider>
      }
      after={
        <IdeiaDaArma
          visto={{
            trancado: tem('locked'),
            troca: tem('unlocked-swap'),
            tiro: tem('shot-follows'),
            nova: tem('new-match-laser'),
          }}
        />
      }
    >
      <div className="sz-discovery-controls free-controls">
        <SceneButton
          tom={tom('pegar')}
          fechado={w.unlocked}
          onClick={() => dispatch({ type: 'weapon-pickup' })}
        >
          <Package size={15} /> {BOTOES_DA_ARMA.pegar}
        </SceneButton>
      </div>
      <p className="sz-discovery-small" id={ajuda}>
        Apertar E e Apertar Espaço são as teclas do jogo. Cada tiro sobe da nave até a pedra.
      </p>
      <div className="sz-discovery-controls free-controls" aria-describedby={ajuda}>
        <SceneButton tom={tom('e')} onClick={() => dispatch({ type: 'weapon-key-e' })}>
          <Keyboard size={15} /> {BOTOES_DA_ARMA.e}
        </SceneButton>
        <SceneButton tom={tom('espaco')} onClick={() => dispatch({ type: 'weapon-fire' })}>
          <Send size={15} /> {BOTOES_DA_ARMA.espaco}
        </SceneButton>
        <SceneButton
          tom={tom('nova')}
          fechado={weaponSwapFresh(w)}
          onClick={() => dispatch({ type: 'weapon-new-match' })}
        >
          <RotateCcw size={15} /> {BOTOES_DA_ARMA.nova}
        </SceneButton>
      </div>
      <DicaLivre />
    </Frame>
  )
}
