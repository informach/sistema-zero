/**
 * Peças pequenas do planner, na régua da plataforma Kids (Canvas aprovado em 20/10/2026): o
 * ladrilho âmbar do Pensa, o Zappy, os chips, a trilha ZERO e a barra de andamento. As cores são
 * todas tokens (`--pz-*` no `pensa.css`), então o adulto herda a identidade dele.
 */
import {
  PENSA_ZERO_LABELS,
  type PensaDestination,
  type PensaTeamPerson,
  type PensaZeroStage,
} from '@sistemazero/core/pensa'
import type { ReactNode } from 'react'
import { DESTINATION_NAMES } from '../core/copy'
import type { PensaMascotPose } from '../core/types'
import { usePensaUi } from './context'
import { BulbIcon, SparkleIcon } from './icons'

export function PensaMark({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const icon = size === 'lg' ? 30 : size === 'md' ? 22 : 18
  return (
    <span aria-hidden="true" className={`pz-mark pz-mark--${size}`}>
      <BulbIcon size={icon} />
    </span>
  )
}

/** O Zappy (só no Kids, quando o host manda as imagens). Decorativo por padrão. */
export function Mascot({
  pose,
  size,
  alt = '',
  className,
}: {
  pose: PensaMascotPose
  size: number
  alt?: string
  className?: string
}) {
  const { mascot } = usePensaUi()
  const src = mascot(pose)
  if (!src) return null
  return (
    <img
      src={src}
      alt={alt}
      width={size}
      height={size}
      className={className ? `pz-mascot ${className}` : 'pz-mascot'}
    />
  )
}

export type ChipTone =
  | 'neutral'
  | 'action'
  | 'action-solid'
  | 'mint'
  | 'yellow'
  | 'strike'
  | 'lilac'
  | 'pink'
  | 'white'
  | 'red'

export function Chip({
  tone = 'neutral',
  size,
  children,
  className,
}: {
  tone?: ChipTone
  size?: 'sm' | 'lg'
  children: ReactNode
  className?: string
}) {
  return (
    <span
      className={['pz-chip', `pz-chip--${tone}`, size ? `pz-chip--${size}` : '', className ?? '']
        .filter(Boolean)
        .join(' ')}
    >
      {children}
    </span>
  )
}

/** A oficina da missão, na cor de assinatura da ferramenta. */
export function DestinationChip({
  destination,
  soft = false,
}: {
  destination: PensaDestination
  soft?: boolean
}) {
  return (
    <span className={`pz-chip pz-dest pz-dest--${destination}${soft ? ' is-soft' : ''}`}>
      {DESTINATION_NAMES[destination]}
    </span>
  )
}

/** "13 ideias hoje" (Kids) ou "13 créditos hoje" (adulto), do medidor do core. */
export function CreditsChip({ compact = false }: { compact?: boolean }) {
  const { credits, copy, kids } = usePensaUi()
  if (credits.state === 'unknown') return null
  let label: string
  if (!kids) label = credits.inline
  else if (credits.state === 'unlimited') label = 'ideias sem limite'
  else {
    const when = credits.scope === 'month' ? 'este mês' : 'hoje'
    label = `${credits.remaining} ${copy.unit(credits.remaining)} ${when}`
  }
  return (
    <span
      className={`pz-credits is-${credits.state}${compact ? ' is-compact' : ''}`}
      role="img"
      aria-label={credits.ariaLabel || label}
    >
      {kids ? <SparkleIcon size={compact ? 14 : 18} /> : null}
      {label}
    </span>
  )
}

const DONE_LABELS: Record<PensaZeroStage, string> = {
  z: 'Ideia contada',
  e: 'Plano aceito',
  r: 'Missões prontas',
  o: 'Jogo conferido',
}

/** A trilha curta do método ZERO: o que já passou, onde a criança está e o que vem. */
export function ZeroTrail({
  stage,
  variant = 'compact',
}: {
  stage: PensaZeroStage
  variant?: 'full' | 'compact'
}) {
  const order: PensaZeroStage[] = ['z', 'e', 'r', 'o']
  const current = order.indexOf(stage)
  return (
    <ol className={`pz-zero pz-zero--${variant}`} aria-label="O seu caminho no Pensa">
      {order.map((letter, index) => {
        const state = index < current ? 'done' : index === current ? 'current' : 'next'
        const label = PENSA_ZERO_LABELS[letter]
        return (
          <li
            key={letter}
            className={`pz-zero__step is-${state}`}
            aria-current={state === 'current' ? 'step' : undefined}
          >
            <span className="pz-zero__letter" aria-hidden="true">
              {letter.toUpperCase()}
            </span>
            <span className="pz-zero__text">
              <strong>{state === 'done' ? DONE_LABELS[letter] : label.title}</strong>
              {state === 'current' && variant === 'full' ? <small>{label.action}</small> : null}
            </span>
          </li>
        )
      })}
    </ol>
  )
}

export function ProgressBar({ value, total }: { value: number; total: number }) {
  const percent = total > 0 ? Math.round((value / total) * 100) : 0
  return (
    <span className="pz-progress" aria-hidden="true">
      <span style={{ width: `${percent}%` }} />
    </span>
  )
}

const AVATAR_TONES = ['yellow', 'purple', 'red', 'blue', 'green'] as const

/** A inicial de quem está na equipe (o rosto, quando o servidor manda a foto). */
export function Avatar({
  person,
  index,
  size = 'md',
}: {
  person: Pick<PensaTeamPerson, 'firstName' | 'photoUrl'>
  index: number
  size?: 'sm' | 'md'
}) {
  const tone = AVATAR_TONES[index % AVATAR_TONES.length]
  return (
    <span aria-hidden="true" className={`pz-avatar pz-avatar--${size} pz-avatar--${tone}`}>
      {person.photoUrl ? (
        <img src={person.photoUrl} alt="" />
      ) : (
        (person.firstName?.trim()[0] ?? 'C').toUpperCase()
      )}
    </span>
  )
}
