import { cloneElement, isValidElement, type ReactNode } from 'react'
import { cn } from '@/lib/cn'

/** A caixa de texto da pele adulta (56 px, borda de 2 px) sobre o `Input` do `@sistemazero/ui`. */
export const FIELD_CONTROL =
  'h-[2.8rem] rounded-[0.6rem] border-2 border-border bg-card px-3.5 text-base shadow-none'

/**
 * A mesma caixa para o `PasswordInput`, que não repassa `className` ao campo: o estilo chega pelos
 * filhos, e o botão do olho ganha alvo de 48 px.
 */
export const PASSWORD_CONTROL =
  '[&_input]:h-[2.8rem] [&_input]:rounded-[0.6rem] [&_input]:border-2 [&_input]:border-border [&_input]:bg-card [&_input]:pl-3.5 [&_input]:pr-12 [&_input]:text-base [&_input]:shadow-none [&_button]:w-12 [&_button_svg]:size-5'

/**
 * Rótulo, campo e dica (ou erro) no vocabulário adulto. Como o `Field` do `ui`, liga a mensagem ao
 * campo por `aria-describedby` e marca `aria-invalid` no erro; o rótulo continua só o nome do campo
 * (é o que o leitor de tela e os testes chamam).
 */
export function ProfileField({
  id,
  label,
  hint,
  error,
  children,
  className,
}: {
  id: string
  label: string
  hint?: ReactNode
  error?: string
  children: ReactNode
  className?: string
}) {
  const messageId = error ? `${id}-error` : hint ? `${id}-hint` : undefined
  const control =
    messageId && isValidElement<Record<string, unknown>>(children)
      ? cloneElement(children, {
          'aria-describedby': messageId,
          ...(error ? { 'aria-invalid': true } : {}),
        })
      : children
  return (
    <div className={cn('flex min-w-0 flex-col gap-2', className)}>
      <label htmlFor={id} className="sz-label">
        {label}
      </label>
      {control}
      {error ? (
        <p id={messageId} role="alert" className="text-[0.85rem] text-destructive">
          {error}
        </p>
      ) : hint ? (
        <p id={messageId} className="text-[0.85rem] text-muted-foreground">
          {hint}
        </p>
      ) : null}
    </div>
  )
}
