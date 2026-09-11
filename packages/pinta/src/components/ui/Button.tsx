/**
 * Botão base do Pinta: alvos ≥44px (público kids), variantes por token
 * `pin-*`. CTA primário usa a pill "3D" de sombra dura (.pin-btn-3d, espelho
 * do .sz-btn-gradient do community-kids).
 */
import { clsx } from 'clsx'
import type { ButtonHTMLAttributes, JSX, Ref } from 'react'
import type { LucideIcon } from './icons'

export type ButtonVariant =
  | 'primary'
  | 'ghost'
  | 'danger'
  | 'outline'
  | 'tool'
  | 'tool3d'
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
  /* O chrome COMPARTILHADO das ferramentas (`@sistemazero/ui/tool-chrome.css`, 07/09/2026), só
     para o cabeçalho da galeria: o secundário com borda 2px e sombra dura (o mesmo "Importar" do
     Estúdio) e a pílula 3D. ⚠️ Só onde o host importa a folha (kids, playground); os diálogos e
     as barras do editor, que rodam também no admin/adulto, seguem nas variantes de cima. */
  tool: 'sz-tool-btn',
  tool3d: 'sz-tool-btn-3d px-5 disabled:hover:brightness-100',
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

/**
 * Botão quadrado só-ícone (toolbar), mesmo alvo mínimo de 44px. `tone="quiet"` é o quadrado
 * de fundo claro das telas-modelo (o dos atalhos, na barra do editor); o padrão segue
 * transparente, como os botões das caixas de ferramenta.
 */
export function IconButton({
  active = false,
  tone = 'ghost',
  className,
  type,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  active?: boolean
  tone?: 'ghost' | 'quiet'
}): JSX.Element {
  return (
    <button
      type={type ?? 'button'}
      className={clsx(
        'inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl text-xl transition',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pin-accent',
        'disabled:cursor-not-allowed disabled:opacity-40',
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
  ...props
}: Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children' | 'aria-label' | 'title'> & {
  icon: LucideIcon
  label: string
  active?: boolean
  shortcut?: string
}): JSX.Element {
  return (
    <IconButton
      active={active ?? false}
      aria-label={label}
      aria-pressed={active}
      title={shortcut ? `${label} (${shortcut})` : label}
      {...props}
    >
      <Icon aria-hidden="true" className="size-5" />
    </IconButton>
  )
}
