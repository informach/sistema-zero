/**
 * Mapa da criação: trilha horizontal dos 4 nós (Z/E/R/O) + baú final.
 * Nó feito = check colorido (token pz-stage-*), atual = pulsante (a animação
 * respeita prefers-reduced-motion no pensa.css; sem ela sobra o anel estático),
 * futuro = cadeado. Puro CSS/SVG inline — sem imagens externas.
 */
import { clsx } from 'clsx'
import type { CSSProperties, JSX } from 'react'
import { getCopy, type PensaCopyMode } from '../../core/copy'
import { isStageDone, type PensaPlanStage, STAGE_ORDER, stageIndex } from '../../core/stages'
import type { PensaCycleView } from '../../core/types'
import { STAGE_BG_CLASS, STAGE_COLOR_VAR } from './stageColors'

type NodeState = 'done' | 'current' | 'locked'

function nodeState(cycle: PensaCycleView, stage: PensaPlanStage): NodeState {
  if (isStageDone(cycle, stage) || stageIndex(cycle.stage) > stageIndex(stage)) return 'done'
  if (cycle.stage === stage) return 'current'
  return 'locked'
}

function CheckIcon(): JSX.Element {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-6 w-6" fill="none">
      <path
        d="M5 12.5 10 17.5 19 7"
        stroke="currentColor"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function LockIcon(): JSX.Element {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
      <path d="M12 3a5 5 0 0 0-5 5v2H6a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2h-1V8a5 5 0 0 0-5-5Zm-3 7V8a3 3 0 1 1 6 0v2H9Zm3 4a1.5 1.5 0 0 1 .75 2.8V18a.75.75 0 0 1-1.5 0v-1.2A1.5 1.5 0 0 1 12 14Z" />
    </svg>
  )
}

const STATE_TEXT: Record<NodeState, string> = {
  done: 'etapa concluída',
  current: 'etapa atual',
  locked: 'etapa ainda bloqueada',
}

export function CreationMap({
  cycle,
  mode,
}: {
  cycle: PensaCycleView
  mode: PensaCopyMode
}): JSX.Element {
  const copy = getCopy(mode)
  const launched = cycle.stage === 'done'

  return (
    <ol aria-label={copy.project.mapLabel} className="flex items-start overflow-x-auto py-3">
      {STAGE_ORDER.map((stage, index) => {
        const state = nodeState(cycle, stage)
        const reached = stageIndex(cycle.stage) >= stageIndex(stage)
        return (
          <li
            key={stage}
            data-stage={stage}
            data-state={state}
            className="relative flex w-24 shrink-0 flex-col items-center gap-1.5"
          >
            {index > 0 ? (
              <span
                aria-hidden="true"
                className={clsx(
                  'absolute top-6 right-1/2 h-1.5 w-full -translate-y-1/2 rounded-full',
                  reached ? STAGE_BG_CLASS[stage] : 'bg-pz-border',
                )}
              />
            ) : null}
            <span
              className={clsx(
                'relative z-10 flex h-12 w-12 items-center justify-center rounded-full border-2',
                state === 'done' &&
                  clsx(STAGE_BG_CLASS[stage], 'border-transparent text-pz-surface'),
                state === 'current' && 'pz-stage-pulse border-current bg-pz-surface font-extrabold',
                state === 'locked' && 'border-pz-border bg-pz-surface text-pz-muted',
              )}
              style={
                state === 'current'
                  ? ({
                      color: STAGE_COLOR_VAR[stage],
                      '--pz-pulse-color': STAGE_COLOR_VAR[stage],
                    } as CSSProperties)
                  : undefined
              }
            >
              {state === 'done' ? <CheckIcon /> : null}
              {state === 'current' ? (
                <span aria-hidden="true" className="text-lg uppercase">
                  {stage}
                </span>
              ) : null}
              {state === 'locked' ? <LockIcon /> : null}
            </span>
            <span
              className={clsx(
                'px-1 text-center text-xs leading-tight font-semibold',
                state === 'locked' ? 'text-pz-muted' : 'text-pz-text',
              )}
            >
              {copy.stages[stage].name}
            </span>
            <span className="sr-only">{STATE_TEXT[state]}</span>
          </li>
        )
      })}
      <li
        data-stage="chest"
        data-state={launched ? 'done' : 'locked'}
        className="relative flex w-24 shrink-0 flex-col items-center gap-1.5"
      >
        <span
          aria-hidden="true"
          className={clsx(
            'absolute top-6 right-1/2 h-1.5 w-full -translate-y-1/2 rounded-full',
            launched ? 'bg-pz-warn' : 'bg-pz-border',
          )}
        />
        <span
          className={clsx(
            'relative z-10 flex h-12 w-12 items-center justify-center rounded-full border-2 text-2xl',
            launched ? 'border-pz-warn bg-pz-surface' : 'border-pz-border bg-pz-surface grayscale',
          )}
        >
          <span aria-hidden="true">🎁</span>
        </span>
        <span
          className={clsx(
            'px-1 text-center text-xs leading-tight font-semibold',
            launched ? 'text-pz-text' : 'text-pz-muted',
          )}
        >
          {copy.project.chestLabel}
        </span>
        <span className="sr-only">{launched ? 'aberto' : 'ainda fechado'}</span>
      </li>
    </ol>
  )
}
