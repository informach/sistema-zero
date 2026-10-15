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
export const SCENE_TILE_GRID = 'mld-tool-tiles grid grid-cols-1 gap-1.5'

export function SceneTile({
  icon: Icon,
  label,
  ink,
  tint = false,
  keyHint,
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
  /** Fundo claro na cor de `ink` (as formas de "Adicionar"). */
  tint?: boolean
  /**
   * A tecla do atalho, desenhada no canto (só com mouse). Só para atalhos que EXISTEM: o
   * `aria-keyshortcuts` continua sendo o anúncio para quem usa leitor de tela.
   */
  keyHint?: string
  /** Ladrilho de ESCOLHA (uma ferramenta): liga o visual e o `aria-pressed`. */
  pressed?: boolean
  ref?: Ref<HTMLButtonElement>
}): JSX.Element {
  return (
    <button
      type={type ?? 'button'}
      aria-pressed={pressed}
      data-tint={tint && ink ? '' : undefined}
      className={clsx('mld-tile', className)}
      style={ink ? ({ ...style, '--mld-tile-ink': ink } as CSSProperties) : style}
      {...props}
    >
      <Icon aria-hidden="true" />
      <span>{label}</span>
      {keyHint && (
        <span aria-hidden="true" className="mld-tile-key">
          {keyHint}
        </span>
      )}
    </button>
  )
}
