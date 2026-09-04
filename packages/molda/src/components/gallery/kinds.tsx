/**
 * A cor e o selo de cada TIPO de criação (modelo azul, textura laranja, céu
 * roxo): o mesmo trio no card, no editor e no "Criar novo".
 */
import { clsx } from 'clsx'
import type { JSX } from 'react'
import { COPY } from '../../core/copy'
import type { MoldaAssetKind } from '../../core/model'

export const KIND_CHIP_CLASSES: Record<MoldaAssetKind, string> = {
  model: 'bg-mld-kind-model/15 text-mld-kind-model',
  texture: 'bg-mld-kind-texture/15 text-mld-kind-texture',
  sky: 'bg-mld-kind-sky/15 text-mld-kind-sky',
}

export const KIND_BORDER_VAR: Record<MoldaAssetKind, string> = {
  model: 'var(--color-mld-kind-model)',
  texture: 'var(--color-mld-kind-texture)',
  sky: 'var(--color-mld-kind-sky)',
}

export function KindChip({
  kind,
  className,
}: {
  kind: MoldaAssetKind
  className?: string
}): JSX.Element {
  const copy = COPY.kinds[kind]
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold',
        KIND_CHIP_CLASSES[kind],
        className,
      )}
    >
      <span aria-hidden="true">{copy.emoji}</span>
      {copy.title}
    </span>
  )
}
