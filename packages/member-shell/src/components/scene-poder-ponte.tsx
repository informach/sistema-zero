'use client'

import { discoveryGuidance, type SceneState } from '@sistemazero/core/learning/scene'
import { Bell, Hand, MessageCircle, NotebookPen, Timer } from 'lucide-react'
import { useId } from 'react'
import { SceneCenarioProvider } from './scene-cenario-context'
import { Frame, SceneButton, useDiscovery } from './scene-discovery-frame'
import { TimedBridgeStage } from './scene-timed-bridge'

/**
 * A experiência do Poder "A ponte apressada" em exploração livre (Faísca, 02/11/2026): só a IDEIA,
 * no molde de `Door` e `Memory` (`scene-discovery-controls.tsx`). A tela fala da alavanca, da ponte,
 * de ponteAberta e do relógio que conta 4 segundos; o bloco que espera, o Se, o então e o senão
 * ficam para a montagem do Estúdio. O que cada coisa faz só aparece depois de a criança testar.
 */

/** As descobertas, na ordem da lista. Os ids são as metas da cena (`catalog.ts`). */
export const METAS_DA_PONTE = [
  'closed-start',
  'lever-opens',
  'in-time',
  'rises-alone',
  'pull-again',
  'timer-place',
] as const
const OBJETIVOS_DA_PONTE = [
  'Vá até a ponte antes de puxar a alavanca e observe ponteAberta.',
  'Puxe a alavanca e observe a ponte e ponteAberta.',
  'Puxe a alavanca e chegue à ponte antes de o relógio chegar a 4.',
  'Puxe a alavanca, deixe o relógio chegar a 4 e observe a ponte.',
  'Quando a ponte subir sozinha, puxe a alavanca de novo.',
  'Compare o relógio começando na alavanca e junto com a partida.',
]

/**
 * O botão em destaque é o gesto que a fala do Zappy pede agora (a régua de `proximoGestoDaMemoria`):
 * com o personagem na pedra, só recomeçar a partida destrava os outros testes.
 */
export type GestoDaPonte = 'ponte' | 'alavanca' | 'esperar' | 'recomecar' | 'relogio' | null
export function proximoGestoDaPonte(
  fala: string | undefined,
  b: SceneState['bridge'],
): GestoDaPonte {
  const naPedra = b.at === 'stone'
  const seguir: GestoDaPonte = naPedra ? 'recomecar' : b.ponteAberta ? 'esperar' : 'alavanca'
  switch (fala) {
    case 'bridge-start':
      return naPedra ? 'recomecar' : 'ponte'
    case 'bridge-closed':
      return naPedra ? 'recomecar' : 'alavanca'
    case 'bridge-rose':
      return naPedra ? 'recomecar' : b.ponteAberta ? 'ponte' : 'alavanca'
    case 'bridge-clock-start':
      // Com o relógio da partida, o teste só engana se a puxada vier antes de ele chegar a 4.
      return !naPedra && b.timers.length > 0 && b.pulls === 0 ? 'esperar' : seguir
    case 'bridge-lowered':
    case 'bridge-crossed':
    case 'bridge-again':
      return seguir
    case 'bridge-place':
    case 'bridge-clock-back':
      return 'relogio'
    case 'bridge-closed-last':
      return naPedra || b.pulls > 0 ? 'recomecar' : 'ponte'
    default:
      return null
  }
}

/** A ideia da ponte: a alavanca, o relógio e a pergunta da ponte, com as respostas reveladas no teste. */
function IdeiaDaPonte({
  b,
  visto,
}: {
  b: SceneState['bridge']
  visto: { alavanca: boolean; subiu: boolean; sim: boolean; nao: boolean }
}) {
  const resposta = b.at === 'stone' ? true : b.at === 'bridge' ? false : null
  const estado = (escolhido: boolean) =>
    resposta === escolhido
      ? '✓ escolhido'
      : resposta === !escolhido
        ? 'Não foi usado'
        : 'Aguardando teste'
  const descobrir = 'Teste para descobrir'
  return (
    <figure className="sz-scene-regra door-rule bridge-idea">
      <figcaption className="sz-scene-regra-titulo">O que acontece na ponte</figcaption>
      <div className="memory-actions">
        <div data-lit={visto.alavanca}>
          <Hand size={20} />
          <span>
            Puxar a alavanca
            <small>
              {visto.alavanca ? 'A ponte baixa, e ponteAberta vira verdadeiro' : descobrir}
            </small>
          </span>
        </div>
        <div data-lit={visto.subiu}>
          <Timer size={20} />
          <span>
            O relógio chega a 4
            <small>
              {visto.subiu ? 'A ponte sobe sozinha, e ponteAberta volta a falso' : descobrir}
            </small>
          </span>
        </div>
        <div>
          <Timer size={20} />
          <span>
            O relógio começa a contar
            <small>
              {b.place === 'start' ? 'quando a partida começa' : 'quando puxa a alavanca'}
            </small>
          </span>
        </div>
      </div>
      <div className="door-question">
        <NotebookPen size={20} />
        <strong>Na ponte: ponteAberta é verdadeiro?</strong>
      </div>
      <div className="door-forks">
        <div data-selected={resposta === true} data-muted={resposta === false}>
          <span>Sim</span>
          {visto.sim ? (
            <Bell size={34} />
          ) : (
            <b className="door-fork-unknown" aria-hidden="true">
              ?
            </b>
          )}
          <strong>{visto.sim ? 'Atravessar e tocar o sino' : descobrir}</strong>
          <small>{estado(true)}</small>
        </div>
        <div data-selected={resposta === false} data-muted={resposta === true}>
          <span>Não</span>
          {visto.nao ? (
            <MessageCircle size={34} />
          ) : (
            <b className="door-fork-unknown" aria-hidden="true">
              ?
            </b>
          )}
          <strong>{visto.nao ? 'Avisar: a ponte está levantada' : descobrir}</strong>
          <small>{estado(false)}</small>
        </div>
      </div>
    </figure>
  )
}

export function PonteLivre() {
  const { activity, state, dispatch, instruction } = useDiscovery()
  const b = state.bridge
  const has = (id: string) => state.evidence.discoveries.includes(id)
  const completed = METAS_DA_PONTE.map(has)
  const gesto = proximoGestoDaPonte(discoveryGuidance(activity, state)?.id, b)
  const tom = (qual: GestoDaPonte) => (gesto === qual ? 'gesto' : 'ferramenta')
  const naPedra = b.at === 'stone'
  const ajudaDoRelogio = useId()
  const relogio = (place: 'lever' | 'start') => (
    <SceneButton
      aria-pressed={b.place === place}
      tom={
        gesto === 'relogio' && b.place !== place
          ? 'gesto'
          : b.place === place
            ? 'ligado'
            : 'ferramenta'
      }
      onClick={() => dispatch({ type: 'timer-place', place })}
    >
      {place === 'lever' ? 'Quando puxa a alavanca' : 'Quando a partida começa'}
    </SceneButton>
  )
  return (
    <Frame
      title="A ponte apressada"
      kind="ponte"
      activity={activity}
      state={state}
      text={instruction}
      goals={OBJETIVOS_DA_PONTE}
      completed={completed}
      done={completed.filter(Boolean).length}
      reset={() => dispatch({ type: 'reset' })}
      stage={
        <SceneCenarioProvider cenario="farol">
          <TimedBridgeStage state={state} />
        </SceneCenarioProvider>
      }
      // A figura fica embaixo do palco, como na `Memory`: na coluna dos controles, ela empurrava o
      // palco fixo para baixo e abria um vão em cima dele (full review de 02/11/2026).
      after={
        <IdeiaDaPonte
          b={b}
          visto={{
            alavanca: completed[1] ?? false,
            subiu: completed[3] ?? false,
            sim: (completed[2] ?? false) || naPedra,
            nao: (completed[0] ?? false) || b.at === 'bridge',
          }}
        />
      }
    >
      <div className="sz-discovery-controls free-controls">
        <SceneButton
          tom={tom('alavanca')}
          disabled={naPedra}
          onClick={() => dispatch({ type: 'pull-lever' })}
        >
          Puxar a alavanca
        </SceneButton>
        <SceneButton tom={tom('esperar')} onClick={() => dispatch({ type: 'wait-second' })}>
          Esperar 1 segundo
        </SceneButton>
        <SceneButton
          tom={tom('ponte')}
          disabled={naPedra}
          onClick={() => dispatch({ type: 'touch-bridge' })}
        >
          Encostar na ponte
        </SceneButton>
        <SceneButton tom={tom('recomecar')} onClick={() => dispatch({ type: 'restart-bridge' })}>
          Recomeçar a partida
        </SceneButton>
      </div>
      {naPedra && (
        <p className="sz-discovery-small">
          O personagem está na pedra do sino. Recomeçar a partida traz ele de volta e levanta a
          ponte; suas descobertas continuam marcadas.
        </p>
      )}
      <fieldset className="sz-discovery-choices" aria-describedby={ajudaDoRelogio}>
        <legend className="frame-controls-label">Quando o relógio começa a contar?</legend>
        {relogio('lever')}
        {relogio('start')}
      </fieldset>
      <p className="sz-discovery-small" id={ajudaDoRelogio}>
        Trocar quando o relógio começa recomeça a partida. Suas descobertas continuam marcadas.
      </p>
      <p className="sz-discovery-free-hint">
        Experimente à vontade. Os destaques sugerem um próximo teste; você escolhe a ordem.
      </p>
    </Frame>
  )
}
