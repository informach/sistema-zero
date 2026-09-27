import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'
import { KidsBand } from './kids-band'

/**
 * A faixa de uma tela INTEIRA fora do grupo `(app)` (a grade de perfis, a área dos pais, o
 * atendimento): sem a barra de abas do celular, a última faixa não pode descer por baixo dela
 * (o `last:-mb-24 last:pb-24` da `KidsBand` abriria 96px de rolagem à toa), e o conteúdo
 * fica no meio da altura, como era antes das faixas.
 */
export const KIDS_SCREEN_BAND = 'flex flex-col justify-center last:mb-0 last:pb-0'

/**
 * Tela inteira fora do `(app)` no desenho das telas-modelo (11/09/2026): uma faixa creme de
 * cima a baixo com a régua de sempre. É `KidsBand` por baixo, então a cor segue as faixas do
 * resto do app (quem troca a paleta troca aqui junto).
 */
export function KidsScreen({
  children,
  innerClassName,
  align = 'center',
}: {
  children: ReactNode
  /** Para o container interno (a largura e o espaçamento da tela). */
  innerClassName?: string
  /**
   * `start` para as telas de LISTA (o acompanhamento, o atendimento): com pouco conteúdo
   * elas ficam no alto, como qualquer página, em vez de boiar no meio da altura.
   */
  align?: 'center' | 'start'
}) {
  return (
    <main className="flex min-h-dvh flex-col">
      <KidsBand
        tone="creme"
        className={cn(KIDS_SCREEN_BAND, align === 'start' && 'justify-start')}
        innerClassName={cn(innerClassName)}
      >
        {children}
      </KidsBand>
    </main>
  )
}
