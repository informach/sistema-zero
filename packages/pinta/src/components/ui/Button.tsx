/**
 * Botão base do Pinta: alvos ≥44px (público kids), variantes por token
 * `pin-*`. CTA primário usa a pill "3D" de sombra dura (.pin-btn-3d, espelho
 * do .sz-btn-gradient do community-kids).
 */
import { clsx } from 'clsx'
import type { ButtonHTMLAttributes, JSX, Ref } from 'react'
import { type LucideIcon, Plus } from './icons'

export type ButtonVariant =
  | 'primary'
  | 'ghost'
  | 'danger'
  | 'outline'
  | 'pill'
  | 'pillPrimary'
  | 'pillSoft'
  | 'barPrimary'
  | 'barOutline'
  | 'barQuiet'

/**
 * As PÍLULAS chapadas das telas-modelo (11/09/2026): a receita `.sz-tool-pill` de
 * `@sistemazero/ui/tool-chrome.css` inteira, SEM a base de utilitárias do `Button` (altura,
 * padding, fonte e peso): utilitária vence qualquer regra em `@layer components`, e com a base a
 * pílula sairia com 44px no mouse, 16px e peso 700 em vez dos 40px, 15px e 800 da imagem. Quieta
 * (branca dentro de uma faixa), primária (o azul da marca) e suave (a creme do cartão de
 * fechamento). ⚠️ Só onde o host importa a folha (kids, playground).
 */
const PILL_CLASSES = {
  pill: 'sz-tool-pill sz-tool-pill--quiet',
  pillPrimary: 'sz-tool-pill sz-tool-pill--primary',
  pillSoft: 'sz-tool-pill sz-tool-pill--creme',
  /* A BARRA DO EDITOR (11/09/2026): as mesmas pílulas chapadas, mas nas receitas `.pin-bar-btn`
     do `pinta.css`, porque o editor roda também na aula e no admin, onde a folha compartilhada não
     existe. Azul (a ação principal), branca com o fio (as outras) e a pequena do tamanho. */
  barPrimary: 'pin-bar-btn pin-bar-btn--primary',
  barOutline: 'pin-bar-btn pin-bar-btn--outline',
  barQuiet: 'pin-bar-btn pin-bar-btn--quiet',
} as const

function isPillVariant(variant: ButtonVariant): variant is keyof typeof PILL_CLASSES {
  return variant in PILL_CLASSES
}

const VARIANT_CLASSES: Record<Exclude<ButtonVariant, keyof typeof PILL_CLASSES>, string> = {
  primary: 'pin-btn-3d disabled:hover:brightness-100',
  ghost: 'rounded-xl text-pin-text hover:bg-pin-border/40',
  outline:
    'rounded-xl border-2 border-pin-border bg-pin-surface text-pin-text hover:border-pin-accent',
  danger: 'rounded-full bg-pin-danger text-white hover:brightness-110',
  /* ⚠️ `tool` e `tool3d` (o `.sz-tool-btn` e a pílula 3D do cabeçalho de 07/09) saíram na limpeza
     de 11/09/2026 junto com as receitas da folha compartilhada: a galeria usa as pílulas
     chapadas de cima, e a folha não tem mais essas classes. */
}

export function Button({
  variant = 'outline',
  className,
  type,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant
  /** React 19 entrega o `ref` como prop: ele segue no spread até o `<button>`. */
  ref?: Ref<HTMLButtonElement>
}): JSX.Element {
  if (isPillVariant(variant)) {
    // A receita já traz foco, desabilitado e o toque; nada da base aqui.
    return (
      <button
        type={type ?? 'button'}
        className={clsx(PILL_CLASSES[variant], className)}
        {...props}
      />
    )
  }
  return (
    <button
      type={type ?? 'button'}
      className={clsx(
        'inline-flex min-h-11 items-center justify-center gap-2 px-4 text-base font-bold transition',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pin-accent',
        'disabled:cursor-not-allowed disabled:opacity-50',
        VARIANT_CLASSES[variant],
        className,
      )}
      {...props}
    />
  )
}

/** O tom de um botão só-ícone: transparente (`ghost`) ou o quadrado de fundo claro (`quiet`). */
export type IconButtonTone = 'ghost' | 'quiet'

/**
 * Botão quadrado só-ícone (toolbar). `tone="quiet"` é o quadrado de fundo claro das telas-modelo
 * (os atalhos da barra, as ferramentas da caixa, as ações dos quadros); o padrão segue
 * transparente. Ativo é o azul CHAPADO (`.pin-tool-active`).
 *
 * O alvo: 44px pelas utilitárias; DENTRO do editor (a barra e a área da ferramenta) o
 * `.pin-icon-btn` do `pinta.css` o troca por `--pin-hit`, 40px no mouse (a medida da imagem) e
 * 44px no toque. Regra sem camada vence a utilitária, por isso a troca mora lá.
 */
export function IconButton({
  active = false,
  tone = 'ghost',
  className,
  type,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  active?: boolean
  tone?: IconButtonTone
}): JSX.Element {
  return (
    <button
      type={type ?? 'button'}
      className={clsx(
        'pin-icon-btn inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl text-xl transition',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pin-accent',
        'disabled:cursor-not-allowed disabled:opacity-40',
        tone === 'quiet' && 'pin-icon-btn--quiet',
        active
          ? 'pin-tool-active bg-pin-accent text-pin-accent-fg'
          : tone === 'quiet'
            ? 'bg-pin-bg text-pin-text hover:bg-pin-border/60'
            : 'text-pin-text hover:bg-pin-border/40',
        className,
      )}
      {...props}
    />
  )
}

/**
 * O "+" das seções das colunas (11/09/2026, a tela-modelo): a bolinha azul de 26px dentro do alvo
 * inteiro (`--pin-hit`), para o botão caber na faixa de título sem pesar.
 */
export function AddDotButton({
  label,
  type,
  ...props
}: Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children' | 'aria-label' | 'title'> & {
  label: string
}): JSX.Element {
  return (
    <button
      type={type ?? 'button'}
      aria-label={label}
      title={label}
      className="pin-add-btn"
      {...props}
    >
      <span aria-hidden="true" className="pin-add-btn__dot">
        <Plus />
      </span>
    </button>
  )
}

/**
 * Botão de FERRAMENTA (lucide): o componente único dos rails do pixel, do
 * vetor e do mapa. `active` liga o visual E o aria-pressed (toggle); ações
 * pontuais (espelhar bitmap, girar…) simplesmente não passam `active`.
 *
 * `shortcut` entra SÓ na dica de tela ("Lápis (P)") — o `aria-label` segue
 * sendo o rótulo puro, que é como o leitor de tela e os testes o encontram.
 */
export function ToolButton({
  icon: Icon,
  label,
  active,
  shortcut,
  tone,
  ...props
}: Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children' | 'aria-label' | 'title'> & {
  icon: LucideIcon
  label: string
  active?: boolean
  shortcut?: string
  tone?: IconButtonTone
}): JSX.Element {
  return (
    <IconButton
      active={active ?? false}
      tone={tone}
      aria-label={label}
      aria-pressed={active}
      title={shortcut ? `${label} (${shortcut})` : label}
      {...props}
    >
      <Icon aria-hidden="true" className="size-5" />
    </IconButton>
  )
}
