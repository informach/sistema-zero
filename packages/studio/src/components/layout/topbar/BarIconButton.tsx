import type { JSX, ReactNode } from 'react'

/**
 * O botão REDONDO só-ícone da barra (o olho da prévia; desfazer e refazer usam o mesmo): o
 * círculo quieto da tela-modelo, 40px no mouse e 44px no toque. Ligado (`aria-pressed`) = a
 * tinta do acento. O `title` é a dica do mouse.
 */
export function BarIconButton({
  label,
  onClick,
  pressed,
  disabled,
  children,
}: {
  label: string
  onClick: () => void
  pressed?: boolean
  disabled?: boolean
  children: ReactNode
}): JSX.Element {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={pressed}
      disabled={disabled}
      onClick={onClick}
      className="sz-bar-icon-btn"
    >
      {children}
    </button>
  )
}
