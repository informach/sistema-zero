import type { JSX } from 'react'
import { cn, IconAlert, IconCheck, IconDot } from '#ui'

export type SaveTone = 'ok' | 'warn' | 'danger'

const SAVE_ICON: Record<SaveTone, typeof IconCheck> = {
  ok: IconCheck,
  warn: IconDot,
  danger: IconAlert,
}

const SAVE_DOT_CLASS: Record<SaveTone, string> = {
  ok: 'bg-sz-success',
  warn: 'bg-sz-warn',
  danger: 'bg-sz-error',
}

/**
 * O estado do salvamento LOCAL ("Salvo" / "Alterações não salvas" / "Erro ao salvar"). No largo
 * e no estreito é a pílula da tela-modelo (menta com o visto quando está tudo salvo), SEM
 * `role`, como sempre foi ali. No compacto vira a BOLINHA com `role="status"` e o texto no
 * `aria-label` (o e2e a 390px procura o status "Salvo").
 *
 * ⚠️ `smoke.spec.ts` usa `getByText('Salvo')` estrito: nada mais na barra pode conter "Salvo".
 */
export function SavePill({
  tone,
  label,
  error,
  dot,
}: {
  tone: SaveTone
  label: string
  /** A mensagem do erro de gravação, quando houver (vira o `title`). */
  error: string | null
  dot: boolean
}): JSX.Element {
  if (dot) {
    return (
      <span
        role="status"
        aria-label={label}
        title={error ?? label}
        className={cn('inline-block h-2.5 w-2.5 shrink-0 rounded-full', SAVE_DOT_CLASS[tone])}
      />
    )
  }
  const Icon = SAVE_ICON[tone]
  return (
    <span className={`sz-bar-seal sz-bar-seal--${tone}`} title={error ?? undefined}>
      <Icon />
      {label}
    </span>
  )
}
