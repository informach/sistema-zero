'use client'

import {
  discoveryGuidance,
  type SceneState,
  TIMED_SHIELD,
  timedShieldNextRock,
  timedShieldOver,
} from '@sistemazero/core/learning/scene'
import { RefreshCw, RotateCcw, Shield, ShieldOff, StepForward, Timer } from 'lucide-react'
import { useId } from 'react'
import { SceneCenarioProvider } from '../scene-cenario-context'
import { Frame, SceneButton, useDiscovery } from '../scene-discovery-frame'
import { BOTOES_DO_ESCUDO, TimedShieldStage } from '../scene-timed-shield'
import { DicaLivre, LinhaDaIdeia, Numeros, useDescobertas } from './nave-b-comum'

/**
 * O escudo temporário (`timed-shield`, Poder "Escudo temporário" do Construtor, Nave contra
 * Asteroides, 28/11/2026) em exploração livre: só a IDEIA, no molde do `invincibility`. Pegar o item
 * liga o Escudo em 5, ele conta para trás um segundo de cada vez, e a pedra só tira vida com o Escudo
 * em 0. Cada linha da figura "O escudo com prazo" só se revela depois de a criança ver aquele caso.
 * Falas: `guia-livre/timed-shield.ts` do core.
 */

const O_QUE_COMPARAR: Record<string, string> = {
  'hit-costs': 'Sem pegar o item, deixe uma pedra bater e olhe as vidas.',
  'shield-protects': 'Com o Escudo ligado, deixe uma pedra bater e olhe as vidas.',
  'shield-ends': 'Deixe o Escudo chegar a 0 e olhe o que a próxima pedra faz.',
  'shield-renews': 'Com o Escudo entre 1 e 4, pegue o item de novo e olhe o número.',
}

type Escudo = Pick<SceneState['timedShield'], 'second' | 'lives' | 'shield' | 'shieldBefore'>

/**
 * O botão em destaque é o gesto que a fala do Zappy pede agora (a régua de `proximoGestoDaProtecao`):
 * o convite depois de um teste (`-then-<próximo>`) ou a fala do próximo teste, lidos com o Escudo e a
 * partida de agora.
 */
export type GestoDoEscudo = 'pegar' | 'segundo' | 'pedra' | 'voltar' | null
export function proximoGestoDoEscudo(fala: string | undefined, t: Escudo): GestoDoEscudo {
  if (!fala || fala === 'timed-shield-complete') return null
  if (timedShieldOver(t)) return 'voltar'
  const pegou = t.shieldBefore !== null
  const entre1e4 = t.shield > 0 && t.shield < TIMED_SHIELD.shield
  const proximo = fala.split('-then-')[1]
  switch (proximo ?? fala) {
    case 'hit':
    case 'restart':
    case 'timed-shield-ask-hit-restart':
    case 'timed-shield-restart':
      return 'voltar'
    case 'protects':
      return t.shield > 0 ? 'pedra' : 'pegar'
    case 'ends':
      return t.shield > 0 ? 'segundo' : pegou ? 'pedra' : 'pegar'
    case 'renews':
    case 'timed-shield-ask-renew':
      return entre1e4 || t.shield === 0 ? 'pegar' : 'segundo'
    case 'timed-shield-start':
    case 'timed-shield-ask-hit':
    case 'timed-shield-shield-on':
    case 'timed-shield-zero':
      return 'pedra'
    case 'timed-shield-ask-protects':
    case 'timed-shield-ask-ends':
    case 'timed-shield-renew-ready':
      return 'pegar'
    case 'timed-shield-ends-wait':
      return 'segundo'
    default:
      return null
  }
}

/** A ideia: o que cada caso do escudo fez, revelado depois do teste dele. */
function IdeiaDoEscudo({
  visto,
}: {
  visto: { sem: boolean; com: boolean; acaba: boolean; deNovo: boolean }
}) {
  return (
    <figure className="sz-scene-regra door-rule">
      <figcaption className="sz-scene-regra-titulo">O escudo com prazo</figcaption>
      <div className="memory-actions">
        <LinhaDaIdeia
          icone={<ShieldOff size={20} />}
          caso="Sem escudo"
          revelado={visto.sem}
          resultado="A pedra bateu e a nave perdeu uma vida"
        />
        <LinhaDaIdeia
          icone={<Shield size={20} />}
          caso="Com o Escudo maior que 0"
          revelado={visto.com}
          resultado="A pedra só saiu: as vidas ficaram iguais"
        />
        <LinhaDaIdeia
          icone={<Timer size={20} />}
          caso="Quando o Escudo chega a 0"
          revelado={visto.acaba}
          resultado="A pedra voltou a tirar uma vida"
        />
        <LinhaDaIdeia
          icone={<RefreshCw size={20} />}
          caso="Pegar o item de novo"
          revelado={visto.deNovo}
          resultado="O Escudo voltou a 5 e recomeçou a contar"
        />
      </div>
    </figure>
  )
}

export function LivreTimedShield() {
  const { activity, state, dispatch, instruction } = useDiscovery()
  const t = state.timedShield
  const { tem, goals, completed, done } = useDescobertas(O_QUE_COMPARAR)
  const gesto = proximoGestoDoEscudo(discoveryGuidance(activity, state)?.id, t)
  const acabou = timedShieldOver(t)
  const semPedra = timedShieldNextRock(t.second) === null
  const ajuda = useId()
  const tom = (g: GestoDoEscudo) => (gesto === g ? 'gesto' : 'ferramenta')
  return (
    <Frame
      title="O escudo que acaba"
      kind="escudo"
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
            ['Segundo', t.second],
            ['Vidas', t.lives],
            ['Escudo', t.shield],
          ]}
        />
      }
      stage={
        <SceneCenarioProvider cenario={activity.cenario}>
          <TimedShieldStage state={state} cast={activity.cast} />
        </SceneCenarioProvider>
      }
      after={
        <IdeiaDoEscudo
          visto={{
            sem: tem('hit-costs'),
            com: tem('shield-protects'),
            acaba: tem('shield-ends'),
            deNovo: tem('shield-renews'),
          }}
        />
      }
    >
      <p className="sz-discovery-small" id={ajuda}>
        As pedras batem nos segundos 2, 5, 8 e 11. O Escudo conta para trás, um segundo de cada vez.
      </p>
      <div className="sz-discovery-controls free-controls" aria-describedby={ajuda}>
        <SceneButton
          tom={tom('pegar')}
          fechado={acabou}
          onClick={() => dispatch({ type: 'pick-shield' })}
        >
          <Shield size={15} /> {BOTOES_DO_ESCUDO.pegar}
        </SceneButton>
        <SceneButton
          tom={tom('segundo')}
          fechado={acabou}
          onClick={() => dispatch({ type: 'tick-second' })}
        >
          <StepForward size={16} /> {BOTOES_DO_ESCUDO.segundo}
        </SceneButton>
        <SceneButton
          tom={tom('pedra')}
          fechado={acabou || semPedra}
          onClick={() => dispatch({ type: 'next-rock' })}
        >
          {BOTOES_DO_ESCUDO.pedra}
        </SceneButton>
        <SceneButton tom={tom('voltar')} onClick={() => dispatch({ type: 'restart-case' })}>
          <RotateCcw size={15} /> {BOTOES_DO_ESCUDO.voltar}
        </SceneButton>
      </div>
      <DicaLivre />
    </Frame>
  )
}
