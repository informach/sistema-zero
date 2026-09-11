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
 * interno tem régua própria. E a faixa mede a coluna à direita do menu, não a
 * janela — por isso `w-full` e nunca `100vw`, que estouraria a largura da barra
 * lateral.
 *
 * A régua é a das telas-modelo (11/09/2026), medida a 1440px: a coluna à direita do
 * menu de 268px tem 1172px (`73.25rem`) e o conteúdo fica a 64px das bordas dela,
 * o que dá 1044px de linha útil. Em tela maior a régua para ali e centraliza.
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
    <div
      className={cn(
        'w-full',
        // A ÚLTIMA faixa vai até o fim: cresce até o pé da janela quando a página é curta
        // (o `<main>` é `flex-col`) e desce por baixo da barra de abas do celular. O
        // `<main>` reserva 96px (`pb-24`) para a barra fixa, e sem isto esse vão aparecia
        // como uma tira do fundo da página abaixo do lilás: a margem negativa devolve o
        // espaço e o padding pinta a cor nele; o conteúdo continua acima da barra.
        'last:grow last:-mb-24 last:pb-24 md:last:mb-0 md:last:pb-0',
        FUNDO[tone],
        className,
      )}
    >
      <div
        className={cn(
          // 48px de respiro vertical: o chip do cabeçalho e o primeiro cartão das faixas
          // ficam a essa distância do topo nas telas-modelo (medido).
          'mx-auto w-full max-w-[73.25rem] px-5 py-10 md:px-10 md:py-12 lg:px-16',
          innerClassName,
        )}
      >
        {children}
      </div>
    </div>
  )
}
