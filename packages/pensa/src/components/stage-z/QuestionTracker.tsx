/**
 * Placar das 5 perguntas da etapa Z: estrelas que ACENDEM conforme o
 * `zState.answered` (who/problem/action/screens/success) com rótulos curtos.
 * O pop de acender (pz-star-pop) respeita prefers-reduced-motion no pensa.css.
 */
import { clsx } from 'clsx'
import type { JSX } from 'react'
import { getCopy, type PensaCopyMode } from '../../core/copy'
import type { PensaZState } from '../../core/types'

const QUESTION_ORDER = ['who', 'problem', 'action', 'screens', 'success'] as const

function StarIcon({ filled }: { filled: boolean }): JSX.Element {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-6 w-6"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth="2"
      strokeLinejoin="round"
    >
      <path d="M12 2.5 15 8.7l6.6 1-4.8 4.7 1.1 6.6L12 17.9 6.1 21l1.1-6.6L2.4 9.7l6.6-1L12 2.5Z" />
    </svg>
  )
}

export function QuestionTracker({
  zState,
  mode,
}: {
  zState: PensaZState | null
  mode: PensaCopyMode
}): JSX.Element {
  const copy = getCopy(mode)
  const answered = zState?.answered
  const count = QUESTION_ORDER.filter((key) => answered?.[key] === true).length

  return (
    <div
      role="img"
      aria-label={`${count} de ${QUESTION_ORDER.length} perguntas respondidas`}
      className="flex items-start gap-1.5"
    >
      {QUESTION_ORDER.map((key) => {
        const lit = answered?.[key] === true
        return (
          <span
            key={key}
            data-question={key}
            data-lit={lit}
            className="flex w-12 flex-col items-center gap-0.5"
          >
            <span
              className={clsx(
                'transition-colors duration-300 motion-reduce:transition-none',
                lit ? 'pz-star-pop text-pz-warn' : 'text-pz-border',
              )}
            >
              <StarIcon filled={lit} />
            </span>
            <span
              className={clsx(
                'text-center text-[10px] leading-tight font-semibold',
                lit ? 'text-pz-text' : 'text-pz-muted',
              )}
            >
              {copy.chat.tracker[key]}
            </span>
          </span>
        )
      })}
    </div>
  )
}
