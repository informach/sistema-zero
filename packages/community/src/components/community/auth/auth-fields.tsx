'use client'

import { Spinner } from '@sistemazero/ui/spinner'
import { AlertCircle, CheckCircle2, Info, Mail } from 'lucide-react'
import type { ReactNode } from 'react'
import { z } from 'zod'
import { cn } from '@/lib/cn'

/**
 * As peças dos formulários de entrada (direção de arte de 18/10/2026): campos de 64 px com rótulo
 * em cima, o erro escrito logo abaixo (com ícone, nunca só a cor) e avisos que ficam na tela, no
 * lugar dos toasts que somem. A senha tem "Mostrar" com texto, e a regra dos 10 caracteres
 * responde enquanto a pessoa digita.
 */

/** A menor senha que o Auth aceita. */
export const MIN_PASSWORD = 10

/**
 * A MESMA régua do BFF (`z.string().email()` nas rotas de entrada do member-shell). Uma régua mais
 * frouxa aqui deixava passar "joão@gmail.com" ou "maria@gmail.c": o BFF recusava com
 * `INVALID_INPUT` e a pessoa lia um "tente de novo" genérico, sem saber que o problema era o e-mail.
 */
const EMAIL = z.string().email()

export function looksLikeEmail(value: string): boolean {
  return EMAIL.safeParse(value.trim()).success
}

export const EMAIL_HINT_ERROR = 'Digite o e-mail completo, como nome@exemplo.com.'
export const CODE_ERROR = 'Digite os 6 números do código.'
export const NETWORK_ERROR = 'Não foi possível conectar. Confira a internet e tente de novo.'

export function inputClass(invalid?: boolean) {
  return cn(
    'block min-h-16 w-full rounded-[0.6rem] border-2 bg-card px-4 text-foreground placeholder:text-muted-foreground',
    'focus-visible:outline-3 focus-visible:outline-ring focus-visible:outline-offset-2 read-only:bg-muted',
    invalid ? 'border-destructive' : 'border-[color-mix(in_oklab,var(--foreground)_50%,white)]',
  )
}

/** Rótulo, dica, controle e erro de um campo. Os ids da dica e do erro são `<id>-dica`/`<id>-erro`. */
export function Field({
  id,
  label,
  hint,
  error,
  children,
}: {
  id: string
  label: string
  hint?: ReactNode
  error?: string
  children: ReactNode
}) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="font-bold">
        {label}
      </label>
      {hint ? (
        <span id={`${id}-dica`} className="text-muted-foreground text-xs">
          {hint}
        </span>
      ) : null}
      {children}
      {error ? <FieldError id={`${id}-erro`}>{error}</FieldError> : null}
    </div>
  )
}

export function describedBy(id: string, { hint, error }: { hint?: boolean; error?: boolean }) {
  const ids = [hint ? `${id}-dica` : null, error ? `${id}-erro` : null].filter(Boolean)
  return ids.length ? ids.join(' ') : undefined
}

export function FieldError({ id, children }: { id?: string; children: ReactNode }) {
  return (
    <span id={id} className="flex items-start gap-2 font-bold text-destructive text-xs">
      <AlertCircle aria-hidden="true" className="mt-0.5 size-5 flex-none" />
      <span>{children}</span>
    </span>
  )
}

/** Campo de senha com o botão "Mostrar"/"Esconder" dentro, com texto (não só o olho). */
export function PasswordField({
  id,
  value,
  onChange,
  visible,
  onToggle,
  autoComplete,
  invalid,
  ariaDescribedBy,
  toggleable = true,
}: {
  id: string
  value: string
  onChange: (value: string) => void
  visible: boolean
  onToggle: () => void
  autoComplete: 'current-password' | 'new-password'
  invalid?: boolean
  ariaDescribedBy?: string
  /** O segundo campo de uma senha nova segue o botão do primeiro e não tem botão próprio. */
  toggleable?: boolean
}) {
  return (
    <div className="relative">
      <input
        id={id}
        type={visible ? 'text' : 'password'}
        autoComplete={autoComplete}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={invalid || undefined}
        aria-describedby={ariaDescribedBy}
        className={cn(inputClass(invalid), toggleable && 'pr-32')}
      />
      {toggleable ? (
        <button
          type="button"
          onClick={onToggle}
          aria-controls={id}
          aria-label={visible ? 'Esconder a senha' : 'Mostrar a senha'}
          className="absolute top-1/2 right-2 inline-flex min-h-12 -translate-y-1/2 items-center rounded-[0.5rem] bg-muted px-3.5 font-bold text-foreground text-xs hover:bg-[color-mix(in_oklab,var(--foreground)_9%,var(--muted))] focus-visible:outline-3 focus-visible:outline-ring focus-visible:outline-offset-2"
        >
          {visible ? 'Esconder' : 'Mostrar'}
        </button>
      ) : null}
    </div>
  )
}

/** A regra dos 10 caracteres, que responde enquanto a pessoa digita. */
export function PasswordRule({
  id,
  length,
  attempted,
}: {
  id: string
  length: number
  attempted: boolean
}) {
  const ok = length >= MIN_PASSWORD
  return (
    <span
      id={id}
      className={cn(
        'flex items-start gap-2 font-bold text-xs',
        ok ? 'text-success' : attempted ? 'text-destructive' : 'text-muted-foreground',
      )}
    >
      {ok ? (
        <CheckCircle2 aria-hidden="true" className="mt-0.5 size-5 flex-none" />
      ) : (
        <AlertCircle aria-hidden="true" className="mt-0.5 size-5 flex-none" />
      )}
      {ok ? 'Tem 10 caracteres ou mais.' : 'Precisa de pelo menos 10 caracteres.'}
    </span>
  )
}

/** O código de 6 números, em letra de máquina e espaçado. */
export function CodeInput({
  id,
  value,
  onChange,
  invalid,
  ariaDescribedBy,
}: {
  id: string
  value: string
  onChange: (value: string) => void
  invalid?: boolean
  ariaDescribedBy?: string
}) {
  return (
    <input
      id={id}
      inputMode="numeric"
      autoComplete="one-time-code"
      maxLength={6}
      placeholder="000000"
      value={value}
      onChange={(e) => onChange(e.target.value.replace(/\D/g, '').slice(0, 6))}
      aria-invalid={invalid || undefined}
      aria-describedby={ariaDescribedBy}
      className={cn(inputClass(invalid), 'font-mono text-[1.4rem] tracking-[0.4em]')}
    />
  )
}

/** Aviso que fica na tela: erro do servidor, código enviado, informação. */
export function AuthAlert({
  tone,
  children,
  live = true,
}: {
  tone: 'error' | 'ok' | 'info'
  children: ReactNode
  /** Erros são `alert`; o resto é `status`. Falso para um aviso fixo, que não é novidade. */
  live?: boolean
}) {
  const Icon = tone === 'error' ? AlertCircle : tone === 'ok' ? Mail : Info
  return (
    <div
      role={live ? (tone === 'error' ? 'alert' : 'status') : undefined}
      className={cn(
        'flex items-start gap-3 rounded-[0.8rem] px-[1.1rem] py-4 text-[0.95rem]',
        tone === 'error' &&
          'bg-[color-mix(in_oklab,var(--destructive)_10%,white)] text-[color-mix(in_oklab,var(--destructive)_62%,black)]',
        tone === 'ok' && 'bg-(--sucesso-tint) text-(--pen-ok-texto)',
        tone === 'info' && 'bg-(--acao-tint) text-foreground',
      )}
    >
      <Icon
        aria-hidden="true"
        className={cn('mt-0.5 size-6 flex-none', tone === 'info' && 'text-(--acao-texto)')}
      />
      <div className="min-w-0">{children}</div>
    </div>
  )
}

/**
 * A região viva dos formulários de entrada: fica SEMPRE montada (uma região que nasce junto com o
 * texto não é anunciada) e diz o que mudou quando a tela troca de passo ou um código é reenviado.
 */
export function LiveMessage({ message }: { message: string }) {
  return (
    <p role="status" aria-live="polite" aria-atomic="true" className="sr-only">
      {message}
    </p>
  )
}

/** "às 14:32" (a hora do reenvio do código, para a pessoa ver que o toque funcionou). */
export function clockTime(date: Date): string {
  return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

/** O botão principal de cada formulário: largura cheia e 60 px. */
export function SubmitButton({ loading, children }: { loading: boolean; children: ReactNode }) {
  return (
    <button
      type="submit"
      disabled={loading}
      aria-busy={loading || undefined}
      className="sz-btn min-h-[3rem] w-full text-[1.05rem]"
    >
      {loading ? <Spinner /> : null}
      {children}
    </button>
  )
}

/** Ação secundária com cara de link (sublinhada), com alvo de 48 px. */
export function TextButton({
  onClick,
  disabled,
  children,
}: {
  onClick: () => void
  disabled?: boolean
  children: ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="sz-link inline-flex min-h-12 items-center bg-transparent px-1.5 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {children}
    </button>
  )
}

/** Lê o código de erro do envelope do BFF (`{ error: { code } }`). */
export async function errorCodeOf(res: Response): Promise<string> {
  const data = (await res.json().catch(() => null)) as { error?: { code?: string } } | null
  return data?.error?.code ?? ''
}

export function postJson(path: string, body: unknown): Promise<Response> {
  return fetch(path, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}
