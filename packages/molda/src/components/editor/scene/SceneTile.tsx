/**
 * O LADRILHO da casca da oficina (a tela-modelo do Modelar): o ícone em cima e o nome embaixo.
 *
 * O nome é o TEXTO do botão, e é ele o nome acessível: os testes e o e2e acham "Mover" e
 * "Caixa" pelo papel e pelo nome, então virar ladrilho não muda nenhuma consulta. `ink` pinta só
 * o ícone (a cor da forma); ligado (`pressed`), o ladrilho inteiro fica azul com a tinta clara.
 */
import { clsx } from 'clsx'
import type { ButtonHTMLAttributes, CSSProperties, JSX, Ref } from 'react'
import type { LucideIcon } from '../../ui/icons'

/** A grade dos ladrilhos: duas colunas na coluna; uma fileira só quando ela deita (abaixo de `lg`). */
export const SCENE_TILE_GRID =
  'grid gap-1.5 max-lg:auto-cols-[4.75rem] max-lg:grid-flow-col lg:grid-cols-2'

export function SceneTile({
  icon: Icon,
  label,
  ink,
  pressed,
  className,
  style,
  type,
  ...props
}: Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children' | 'aria-pressed'> & {
  icon: LucideIcon
  label: string
  /** A cor do ícone (a da forma); o ladrilho ligado usa a tinta dele. */
  ink?: string
  /** Ladrilho de ESCOLHA (uma ferramenta): liga o visual e o `aria-pressed`. */
  pressed?: boolean
  ref?: Ref<HTMLButtonElement>
}): JSX.Element {
  return (
    <button
      type={type ?? 'button'}
      aria-pressed={pressed}
      className={clsx('mld-tile', className)}
      style={ink ? ({ ...style, '--mld-tile-ink': ink } as CSSProperties) : style}
      {...props}
    >
      <Icon aria-hidden="true" />
      <span>{label}</span>
    </button>
  )
}
