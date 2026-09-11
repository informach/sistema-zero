import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'
import { KidsBand } from './kids-band'
import { KidsEyebrow } from './kids-eyebrow'

/**
 * A tela de RECADO da área da criança: o produto que ainda não foi liberado, o posto da
 * carreira que falta, o curso ou a aula que abre depois, o acesso que não deu para conferir.
 * Não existe imagem-modelo dessas telas, então elas seguem a régua das que existem (11/09/2026):
 * a faixa creme, um cartão branco no meio com a arte, a pílula amarela do motivo, o título e a
 * frase, e os botões em pílula chapada. `closing` abre uma faixa lilás embaixo com o cartão de
 * fechamento (a Comunidade dos Criadores, no produto bloqueado), como toda página termina.
 *
 * Existe para as dez telas desse tipo pararem de escrever a mesma coluna à mão: quatro delas já
 * tinham drifado entre si (duas sem faixa nenhuma, três tamanhos de título, dois botões).
 */
export function KidsRecado({
  art,
  chip,
  chipIcon,
  title,
  children,
  actions,
  footnote,
  closing,
}: {
  /** A arte decorativa em cima (o Zappy ou uma cena): o texto dá o significado. */
  art?: ReactNode
  /** O motivo, na pílula amarela das telas-modelo ("Ainda não liberado"). */
  chip?: ReactNode
  chipIcon?: LucideIcon
  title: ReactNode
  /** As frases do recado (e o que mais couber entre o título e os botões). */
  children?: ReactNode
  actions?: ReactNode
  /** A letrinha miúda embaixo dos botões. */
  footnote?: ReactNode
  /** O cartão de fechamento, numa faixa lilás própria. */
  closing?: ReactNode
}) {
  return (
    <>
      <KidsBand tone="creme" innerClassName="flex justify-center">
        <section className="kids-carta flex w-full max-w-xl flex-col items-center rounded-[2rem] px-6 py-10 text-center md:px-12 md:py-12">
          {art ? <div className="mb-5 flex justify-center">{art}</div> : null}
          {chip ? (
            <KidsEyebrow icon={chipIcon} className="mb-3">
              {chip}
            </KidsEyebrow>
          ) : null}
          {/* O peso 800 vem da própria `.sz-display` (fora de camada). */}
          <h1 className="sz-display text-[clamp(1.75rem,3vw,2.25rem)]">{title}</h1>
          {children ? (
            <div
              className={cn(
                'mt-3 flex w-full flex-col items-center gap-3',
                'font-medium text-[1.0625rem] text-muted-foreground leading-[1.6]',
              )}
            >
              {children}
            </div>
          ) : null}
          {actions ? (
            <div className="mt-7 flex flex-wrap items-center justify-center gap-3">{actions}</div>
          ) : null}
          {footnote ? (
            <p className="mt-5 font-medium text-muted-foreground text-sm">{footnote}</p>
          ) : null}
        </section>
      </KidsBand>
      {closing ? <KidsBand tone="lilas">{closing}</KidsBand> : null}
    </>
  )
}
