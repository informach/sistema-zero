import type { CSSProperties, ReactNode } from 'react'
import { cn } from '@/lib/cn'
import {
  isLegend,
  type StageBadge,
  stageColor,
  stageLabel,
  stageName,
  stageShortLabel,
} from '@/lib/journey-stage'

/**
 * As peças da cor da etapa (prancha "Perfil público e a cor da etapa", 19/10/2026). O anel em volta
 * da foto deixa reconhecer a etapa de longe, e o nome da etapa SEMPRE vem junto, escrito: ninguém
 * precisa decorar cores, e a cor nunca é a única pista. O desenho mora no `globals.css`
 * (`.sz-etapa-*`).
 */

const colorStyle = (badge: StageBadge) => ({ '--etapa-cor': stageColor(badge) }) as CSSProperties

/**
 * O anel da cor da etapa em volta de uma foto ou das iniciais. `escuro` sobre a barra do topo e as
 * faixas marinho (o contorno branco separa o anel do fundo). Sem etapa, só a foto.
 */
export function StageRing({
  badge,
  size = 'm',
  dark = false,
  className,
  children,
}: {
  badge: StageBadge | null | undefined
  size?: 'p' | 'm' | 'g'
  dark?: boolean
  className?: string
  children: ReactNode
}) {
  if (!badge) return children
  return (
    <span
      className={cn('sz-etapa-anel', className)}
      data-tamanho={size}
      data-fundo={dark ? 'escuro' : undefined}
      style={colorStyle(badge)}
    >
      {children}
    </span>
  )
}

export function StageDot({ badge, className }: { badge: StageBadge; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn('sz-etapa-ponto', className)}
      style={colorStyle(badge)}
    />
  )
}

/** "● Etapa 3 de 8 · Inventor(a)" num chip (`curto`: "● Etapa 3 de 8"). */
export function StageChip({
  badge,
  short = false,
  dark = false,
  className,
}: {
  badge: StageBadge
  short?: boolean
  dark?: boolean
  className?: string
}) {
  return (
    <span className={cn('sz-etapa-chip', className)} data-fundo={dark ? 'escuro' : undefined}>
      <StageDot badge={badge} />
      {short ? stageShortLabel(badge) : stageLabel(badge)}
    </span>
  )
}

/** "● Etapa 3 · Inventor(a)", a linha curta embaixo do nome nas listas. */
export function StageLine({ badge, className }: { badge: StageBadge; className?: string }) {
  return (
    <span className={cn('sz-etapa-linha', className)}>
      <StageDot badge={badge} />
      {isLegend(badge) ? 'Lenda' : `Etapa ${badge.position} · ${stageName(badge)}`}
    </span>
  )
}

function initialsOf(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean)
  const letters = words.length > 1 ? [words[0], words[words.length - 1]] : words
  return letters.map((word) => word?.[0]?.toUpperCase() ?? '').join('') || '?'
}

/**
 * A foto de outra pessoa (ou as iniciais) com o anel da etapa: ranking, liga, Mural e Clube. A
 * foto é decorativa: o nome da pessoa e a etapa estão escritos ao lado.
 */
export function StageFace({
  name,
  photoUrl,
  badge,
  size = 'm',
  dark = false,
  className,
}: {
  name: string
  photoUrl?: string | null
  badge?: StageBadge | null
  size?: 'p' | 'm' | 'g'
  dark?: boolean
  className?: string
}) {
  const face = cn(
    'inline-flex shrink-0 select-none items-center justify-center overflow-hidden rounded-full',
    className,
  )
  return (
    <StageRing badge={badge} size={size} dark={dark}>
      {photoUrl ? (
        <img
          src={photoUrl}
          alt=""
          className={cn(face, 'bg-(--acao-tint) object-cover')}
          loading="lazy"
        />
      ) : (
        <span
          aria-hidden="true"
          className={cn(face, 'bg-primary font-bold text-primary-foreground')}
        >
          {initialsOf(name)}
        </span>
      )}
    </StageRing>
  )
}

function ribbonDescription(badge: StageBadge): string {
  const { position, total } = badge
  if (isLegend(badge))
    return total - 1 === 1
      ? 'Jornada completa: a etapa concluída.'
      : `Jornada completa: as ${total - 1} etapas concluídas.`
  const done =
    position === 1
      ? 'nenhuma etapa concluída ainda'
      : position === 2
        ? 'etapa 1 concluída'
        : position === 3
          ? 'etapas 1 e 2 concluídas'
          : `etapas 1 a ${position - 1} concluídas`
  const ahead =
    position + 1 === total
      ? `etapa ${total}`
      : position + 2 === total
        ? `etapas ${position + 1} e ${total}`
        : `etapas ${position + 1} a ${total}`
  return `Etapa ${position} de ${total}: ${done}, etapa ${position} em andamento, ${ahead} à frente.`
}

/**
 * A fita da jornada: um trecho por posição, na cor de cada etapa. As concluídas cheias, a atual
 * preenchida até `currentShare` (0 a 1; sem o número, pela metade) e as próximas apagadas. É uma
 * imagem com a frase inteira para o leitor de tela.
 */
export function JourneyRibbon({
  badge,
  currentShare,
  dark = false,
  className,
}: {
  badge: StageBadge
  currentShare?: number
  dark?: boolean
  className?: string
}) {
  const share = Math.round(Math.min(1, Math.max(0, currentShare ?? 0.5)) * 100)
  return (
    <div
      role="img"
      aria-label={ribbonDescription(badge)}
      className={cn('sz-etapa-fita', className)}
      data-fundo={dark ? 'escuro' : undefined}
      style={{ gridTemplateColumns: `repeat(${badge.total}, minmax(0, 1fr))` }}
    >
      {Array.from({ length: badge.total }, (_, index) => {
        const position = index + 1
        const segment: StageBadge = { position, total: badge.total, title: null }
        const state =
          position < badge.position || isLegend(badge)
            ? 'feita'
            : position === badge.position
              ? 'atual'
              : 'futura'
        return (
          <span
            key={position}
            data-estado={state}
            style={{ ...colorStyle(segment), '--etapa-parte': `${share}%` } as CSSProperties}
          />
        )
      })}
    </div>
  )
}
