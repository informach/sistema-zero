import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { PublicTopBar } from './public-top-bar'

/**
 * A tela inteira de recado (direção de arte de 18/10/2026; no palco desde o "Estúdio à noite",
 * 25/10/2026): a barra escura só com a logo (serve a quem está ou não logado) e o recado no meio,
 * com os caminhos para seguir. Usada pela página não
 * encontrada e pela página de erro.
 */
export function StatusScreen({
  big,
  icon: Icon,
  art,
  title,
  text,
  children,
}: {
  /** Um número grande decorativo (o 404). */
  big?: string
  icon?: LucideIcon
  /** Uma figura decorativa no lugar do ícone (o monitor em pixel da página de erro). */
  art?: ReactNode
  title: string
  text: ReactNode
  /** Os botões. */
  children: ReactNode
}) {
  return (
    // O recado inteiro no palco (Estúdio à noite): a barra com a logo e o número grande em pixel.
    <div className="sz-palco flex min-h-dvh flex-col">
      <PublicTopBar href="/" label="Comunidade Sistema Zero: ir para o início" />
      <main className="sz-page flex flex-1 items-center justify-center py-14">
        <section
          aria-labelledby="recado-titulo"
          className="flex max-w-[36rem] flex-col items-center gap-4 text-center"
        >
          {big ? (
            <span
              aria-hidden="true"
              className="text-(--cta) text-[6.5rem] leading-none [font-family:var(--font-pixel)] [text-shadow:0.3rem_0.3rem_0_var(--cta-degrau)]"
            >
              {big}
            </span>
          ) : null}
          {art ? <span aria-hidden="true">{art}</span> : null}
          {Icon ? (
            <span
              aria-hidden="true"
              className="inline-flex size-16 items-center justify-center rounded-2xl bg-(--aviso-tint) text-(--aviso-texto)"
            >
              <Icon className="size-8" />
            </span>
          ) : null}
          <h1 id="recado-titulo" className="sz-h1-sm">
            {title}
          </h1>
          <p className="sz-lead">{text}</p>
          <div className="mt-2 flex flex-wrap justify-center gap-3">{children}</div>
        </section>
      </main>
    </div>
  )
}
