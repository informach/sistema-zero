'use client'

import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/cn'

/**
 * Abas em pastilha, no desenho das telas-modelo (11/09/2026, medido no Ranking a
 * 1440px): uma trilha BRANCA de 56px com 6px de respiro, e a aba ativa como pílula
 * cheia da marca de 44px. As abas têm a largura do rótulo (40px de cada lado), não a
 * metade da trilha, e o rótulo é Nunito extra-negrito de 15px, cinza na que não está
 * escolhida. No celular as duas dividem a linha, para caberem nos 335px.
 *
 * A cor da ativa é a da marca (`.kids-marca`), que carrega o par do tema junto. A
 * trilha é o cartão (`bg-card`), com o fio que só aparece no escuro
 * (`--borda-carta`), onde o cartão e a faixa têm claridade parecida.
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
        // O fio do escuro é `ring` (sombra), e não `border`: a trilha mede os 56px do
        // modelo nos dois temas, sem o pixel da borda transparente do claro.
        'flex w-full rounded-full bg-card p-1.5 ring-(--borda-carta) ring-1 sm:inline-flex sm:w-auto',
        className,
      )}
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
              'inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-full px-4 font-extrabold text-[0.9375rem] sm:flex-none sm:px-10',
              'transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
              ativa ? 'kids-marca' : 'text-muted-foreground hover:bg-muted hover:text-(--tinta)',
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
