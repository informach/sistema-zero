'use client'

import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/cn'

/**
 * Abas em pastilha, no molde da referência: uma trilha clara e a aba ativa como
 * pílula cheia da marca. Substitui os pares de botões escritos à mão (o
 * "Ranking geral / Minha liga", as visões do Mural), que já divergiam entre si.
 *
 * A cor da ativa é a da marca (`.kids-marca`), que carrega o par do tema junto —
 * a mesma razão do chip: preenchida com cor de unidade, o rótulo de 14px reprovava
 * AA em três das quatro unidades.
 */
export function KidsTabs<T extends string>({
  value,
  onChange,
  options,
  label,
  className,
}: {
  value: T
  onChange: (next: T) => void
  options: { value: T; label: string; icon?: LucideIcon }[]
  /** Rótulo do grupo, para quem navega por leitor de tela. */
  label: string
  className?: string
}) {
  return (
    // ⚠️ São BOTÕES com `aria-pressed`, e não `role="tab"`. Uma tablist de verdade
    // exige `aria-controls` apontando para um `role="tabpanel"` e navegação por
    // setas; sem esse par, o papel `tab` promete ao leitor de tela um padrão que
    // não existe e fica PIOR que o botão simples. O `aria-pressed` diz a mesma
    // coisa que interessa aqui — qual está escolhida — sem prometer nada.
    <div
      role="group"
      aria-label={label}
      className={cn(
        'grid gap-1.5 rounded-full border-(--linha-carta) border-2 bg-card p-1.5',
        className,
      )}
      style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
    >
      {options.map((option) => {
        const ativa = option.value === value
        const Icone = option.icon
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={ativa}
            onClick={() => onChange(option.value)}
            className={cn(
              'sz-display inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-4',
              'transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
              ativa ? 'kids-marca' : 'text-muted-foreground hover:bg-muted hover:text-foreground',
            )}
          >
            {Icone ? <Icone className="size-4 shrink-0" aria-hidden /> : null}
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
