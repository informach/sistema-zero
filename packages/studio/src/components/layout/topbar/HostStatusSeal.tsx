import type { JSX } from 'react'
import { cn } from '#ui'
import { HOST_STATUS_DOT_CLASS, type StudioHostChromeStatus } from '../../../studio/host-chrome'
import { HOST_STATUS_ICON } from '../hostStatusIcons'

/**
 * O selo da nuvem do host ("Guardado na sua conta"), ao lado do "Salvo". Em REPOUSO (tom `ok`)
 * ele é só o ícone da nuvem na pílula menta: a tela-modelo não mostra frase nenhuma com nada
 * acontecendo, e duas pílulas verdes seguidas diriam a mesma coisa duas vezes. Quando algo
 * acontece (guardando, sem internet, erro) volta a frase curta. Abaixo do largo é a BOLINHA
 * (a barra não quebra linha, e o selo do host cede espaço antes do "Salvo").
 *
 * O nome do status vem do `title` (que também é a dica do mouse); a bolinha mantém o
 * `aria-label` de antes. Quem ANUNCIA offline/erro é a região viva do host (`aria-live="off"`).
 */
export function HostStatusSeal({
  status,
  dot,
}: {
  status: StudioHostChromeStatus
  dot: boolean
}): JSX.Element {
  if (dot) {
    return (
      <span
        role="status"
        aria-live="off"
        aria-label={status.text}
        title={status.text}
        className={cn(
          'inline-block h-2.5 w-2.5 shrink-0 rounded-full',
          HOST_STATUS_DOT_CLASS[status.tone],
        )}
      />
    )
  }
  const Icon = HOST_STATUS_ICON[status.icon]
  if (status.tone === 'ok') {
    return (
      <span
        role="status"
        aria-live="off"
        title={status.text}
        className="sz-bar-seal sz-bar-seal--ok sz-bar-seal--icon"
      >
        <Icon />
      </span>
    )
  }
  return (
    <span
      role="status"
      aria-live="off"
      title={status.text}
      className={`sz-bar-seal sz-bar-seal--${status.tone}`}
    >
      <Icon />
      {status.label}
    </span>
  )
}
