import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

/**
 * Faixa de seção que pinta a LARGURA TODA e centraliza o conteúdo por dentro.
 *
 * É a peça que dá ritmo à página, no lugar do bloco branco contínuo: a primeira
 * faixa de toda página é creme, a última é lilás, e as do meio variam. A régua
 * vem das páginas de oferta, onde o creme é o descanso e a cor é a exceção.
 *
 * ⚠️ A cor sangra até a borda, mas o TEXTO não fica mais largo: o container
 * interno mantém a mesma largura de leitura de sempre. E a faixa mede a coluna à
 * direita do menu, não a janela — por isso `w-full` e nunca `100vw`, que
 * estouraria a largura da barra lateral.
 */
export type BandTone = 'creme' | 'menta' | 'ceu' | 'lilas' | 'rosa' | 'amarelo' | 'branco'

const FUNDO: Record<BandTone, string> = {
  creme: 'bg-(--band-creme)',
  menta: 'bg-(--band-menta)',
  ceu: 'bg-(--band-ceu)',
  lilas: 'bg-(--band-lilas)',
  rosa: 'bg-(--band-rosa)',
  amarelo: 'bg-(--band-amarelo)',
  branco: 'bg-card',
}

export function KidsBand({
  tone,
  children,
  className,
  innerClassName,
}: {
  tone: BandTone
  children: ReactNode
  /** Só para o fundo da faixa (decoração, `overflow`). */
  className?: string
  /** Para o container interno (espaçamento vertical da seção). */
  innerClassName?: string
}) {
  return (
    <div className={cn('w-full', FUNDO[tone], className)}>
      <div className={cn('mx-auto w-full max-w-5xl px-4 py-8 md:px-8 md:py-12', innerClassName)}>
        {children}
      </div>
    </div>
  )
}
