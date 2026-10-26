'use client'
import {
  gardenStep,
  type SceneAction,
  type SceneId,
  type SceneState,
} from '@sistemazero/core/learning/scene'
import {
  ArrowDown,
  ArrowRight,
  CheckCircle2,
  Eye,
  Hand,
  Link2,
  Link2Off,
  Plus,
  RotateCcw,
} from 'lucide-react'
import { useId } from 'react'
import { SceneButton } from './exploration-stage'
/** Teaching colors explain a role, within the application's fonts, surfaces and controls. */
export function TouchRule({ enabled, chosen }: { enabled: boolean; chosen: string | null }) {
  return (
    <div className="sz-garden-rule" data-garden="rule" data-enabled={enabled}>
      <p className="sz-garden-eyebrow">A regra do jogo</p>
      <div className="sz-garden-node" data-tone="event">
        <Hand size={20} aria-hidden />
        <div>
          <span>Quando acontecer</span>
          <strong>Um toque no esconderijo</strong>
        </div>
      </div>
      <div className="sz-garden-wire" data-connected={enabled}>
        <span className="sz-garden-wire-line" aria-hidden />
        <span className="sz-garden-chosen">
          <span>Escolhido:</span> <strong>{chosen ?? 'nenhum ainda'}</strong>
        </span>
        <ArrowDown size={20} aria-hidden />
      </div>
      <div className="sz-garden-node" data-tone={enabled ? 'reaction' : 'off'}>
        <Eye size={20} aria-hidden />
        <div>
          <span>A reação</span>
          <strong>Deixar escolhido invisível</strong>
        </div>
      </div>
      <p className="sz-garden-link-status">
        {enabled ? <Link2 size={16} aria-hidden /> : <Link2Off size={16} aria-hidden />}
        <strong>{enabled ? 'Ligação ativa' : 'Reação desligada'}</strong>
      </p>
      <p className="sz-garden-caption">
        {enabled
          ? 'O toque executa a reação só no esconderijo escolhido. Os outros continuam como estavam.'
          : 'O toque pode acontecer sem revelar ninguém. Primeiro teste; depois ligue a reação.'}
      </p>
    </div>
  )
}

export type ValueUpdate = {
  before: number
  after: number
  kind: 'initial' | 'add' | 'empty' | 'repeat' | 'reset'
}
export function CounterValue({
  value,
  update,
  trace,
}: {
  value: number
  update: ValueUpdate
  trace: string
}) {
  const added = update.kind === 'add'
  return (
    <div className="sz-garden-value-group" data-garden="value">
      <div className="sz-garden-value" key={trace} data-changed={added || update.kind === 'reset'}>
        <p className="sz-garden-eyebrow">O que o jogo guarda</p>
        <strong className="sz-garden-variable-name">achados</strong>
        <output
          className="sz-garden-number sz-display"
          data-current-value
          aria-label="Valor atual de achados"
        >
          {value}
        </output>
        <span className="sz-garden-caption">um único valor atual</span>
        <div className="sz-garden-update">
          <p className="sz-garden-eyebrow">
            {added
              ? 'Última mudança'
              : update.kind === 'empty'
                ? 'Toque no vazio'
                : update.kind === 'repeat'
                  ? 'Toque repetido'
                  : update.kind === 'reset'
                    ? 'Uma nova busca'
                    : value === 0
                      ? 'No começo da busca'
                      : 'Valor guardado'}
          </p>
          {added ? (
            <div className="sz-garden-equation">
              <span>
                <small>antes</small>
                <b>{update.before}</b>
              </span>
              <span className="sz-garden-operation">
                <small>somar</small>
                <b>
                  <Plus size={16} aria-hidden />1
                </b>
              </span>
              <ArrowRight size={20} aria-hidden />
              <span>
                <small>agora</small>
                <b>{update.after}</b>
              </span>
            </div>
          ) : (
            <strong className="sz-garden-update-label">
              {update.kind === 'empty' || update.kind === 'repeat'
                ? `Nenhuma soma · continua ${value}`
                : update.kind === 'initial' && value !== 0
                  ? `achados guarda ${value}`
                  : 'achados recebe 0'}
            </strong>
          )}
          <p className="sr-only" data-trace>
            {trace}
          </p>
        </div>
      </div>
      <p className="sz-garden-readout">
        <ArrowRight size={16} aria-hidden />O placar lê este valor.
      </p>
      <div className="sz-garden-mini-rule">
        <Plus size={20} aria-hidden />
        <div>
          <span>A cada novo personagem encontrado:</span>
          <strong>somar 1 em achados</strong>
        </div>
      </div>
      <p className="sz-garden-caption">
        Recomeçar zera o valor e esconde os personagens. A regra de somar continua ligada.
      </p>
    </div>
  )
}

export function LearningRecap({ kind }: { kind: 'touch-response' | 'found-counter' }) {
  return (
    <div className="sz-garden-recap" role="status" data-recap={kind}>
      <CheckCircle2 size={24} aria-hidden />
      <div>
        <strong>
          {kind === 'touch-response'
            ? 'A regra acompanha o toque.'
            : 'Encontrar, guardar e atualizar.'}
        </strong>
        <p>
          {kind === 'touch-response'
            ? '“Escolhido” é o esconderijo que recebeu aquele toque. Os outros continuam como estavam.'
            : 'Um novo personagem soma 1. O toque vazio e o repetido mantêm o valor. Uma nova busca começa em 0.'}
        </p>
      </div>
    </div>
  )
}

export function GardenLearningControls({
  scene,
  state,
  dispatch,
}: {
  scene: SceneId
  state: SceneState
  dispatch: (action: SceneAction) => void
}) {
  const touchReasonId = useId()
  const step = gardenStep(scene, state)
  const touchLocked = !state.match.touch && !state.evidence.discoveries.includes('no-response')
  if (scene === 'touch-response')
    return (
      <div className="space-y-3">
        <div className="flex flex-wrap gap-2">
          <SceneButton
            tom={step?.primary === 'connect' ? 'gesto' : 'ferramenta'}
            className="sz-scene-acao-principal"
            aria-pressed={state.match.touch}
            fechado={touchLocked}
            aria-describedby={touchLocked ? touchReasonId : undefined}
            onClick={() =>
              dispatch({ type: 'connect', port: 'touch', enabled: !state.match.touch })
            }
          >
            {state.match.touch ? 'Desligar a reação ao toque' : 'Ligar a reação ao toque'}
          </SceneButton>
          {state.evidence.discoveries.includes('responds') && state.match.gardenRound !== 2 && (
            <SceneButton
              tom={step?.primary === 'other' ? 'gesto' : 'ferramenta'}
              className="sz-scene-acao-principal"
              onClick={() => dispatch({ type: 'other-hiding-place' })}
            >
              Testar com outro esconderijo
            </SceneButton>
          )}
        </div>
        {touchLocked && (
          <p id={touchReasonId} className="sz-garden-caption">
            Primeiro, toque no arbusto com a reação desligada.
          </p>
        )}
        <TouchRule
          enabled={state.match.touch}
          chosen={
            state.match.gardenChosen === undefined
              ? state.match.gardenRound !== 2 && state.match.screen === 'playing'
                ? 'arbusto'
                : null
              : state.match.gardenChosen === 0
                ? 'arbusto'
                : 'pedras'
          }
        />
      </div>
    )
  if (scene !== 'found-counter') return null
  const update = state.match.counterUpdate ?? {
    before: state.match.points,
    after: state.match.points,
    kind: 'initial' as const,
  }
  return (
    <div className="space-y-3">
      <CounterValue value={state.match.points} update={update} trace={state.caption} />
      <SceneButton
        className="w-full whitespace-normal"
        tom={step?.primary === 'restart' ? 'gesto' : 'ferramenta'}
        onClick={() => dispatch({ type: 'restart-search' })}
      >
        <RotateCcw size={16} aria-hidden />
        Recomeçar a busca
      </SceneButton>
    </div>
  )
}
