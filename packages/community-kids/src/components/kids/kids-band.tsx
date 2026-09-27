import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

/**
 * Faixa de seção que pinta a LARGURA TODA e centraliza o conteúdo por dentro.
 *
 * Desde a paleta do Pen (11/09/2026) a página tem UM fundo só: toda faixa é o chão
 * (`--chao`), e a de FECHAMENTO, que por convenção é a `lilas`, é o chão alternativo
 * (`--chao-alt`), como a última faixa das telas do Pen. Os tons `creme`, `menta`,
 * `ceu`, `rosa` e `amarelo` ficaram no tipo para as páginas não mudarem: todos viram o
 * chão. O ritmo da página agora vem do respiro e dos cartões brancos, não da cor.
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
  creme: 'bg-(--chao)',
  menta: 'bg-(--chao)',
  ceu: 'bg-(--chao)',
  rosa: 'bg-(--chao)',
  amarelo: 'bg-(--chao)',
  lilas: 'bg-(--chao-alt)',
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
