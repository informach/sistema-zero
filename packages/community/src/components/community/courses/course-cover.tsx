import { Gamepad2 } from 'lucide-react'
import { cn } from '@/lib/cn'

/**
 * A capa de um curso ou jogo (direção de arte de 18/10/2026). Preenche o recipiente: quem usa dá a
 * proporção ou a altura. Sem capa, o quadriculado escuro da barra do topo com um controle de jogo,
 * para o cartão não ficar com um buraco cinza. A capa é decorativa: o título está ao lado.
 */
export function CourseCover({ src, className }: { src: string | null; className?: string }) {
  if (src)
    return (
      // Capa da autoria é URL externa arbitrária: `<img>` simples, sem `next/image`.
      <img
        src={src}
        alt=""
        loading="lazy"
        className={cn('h-full w-full object-cover', className)}
      />
    )
  return (
    <div
      aria-hidden
      className={cn(
        'flex h-full w-full items-center justify-center bg-(--topo) text-(--sz-community-action-light)',
        className,
      )}
      style={{
        backgroundImage:
          'linear-gradient(color-mix(in oklab, var(--topo-texto) 9%, transparent) 1px, transparent 1px), linear-gradient(90deg, color-mix(in oklab, var(--topo-texto) 9%, transparent) 1px, transparent 1px)',
        backgroundSize: '1.6rem 1.6rem',
      }}
    >
      <Gamepad2 className="size-12 opacity-90" strokeWidth={1.6} />
    </div>
  )
}

/**
 * A barra de progresso da pele adulta, com o valor para leitor de tela. ⚠️ Com utilitárias, não com
 * `.sz-bar`: o CSS do Estúdio (importado no mesmo pipeline) já tem uma `.sz-bar`, a barra de
 * ferramentas dele, e as duas se somavam numa pílula de 4 rem.
 */
export function ProgressBar({
  value,
  label,
  done = false,
  className,
}: {
  value: number
  label: string
  done?: boolean
  className?: string
}) {
  const percent = Math.max(0, Math.min(100, Math.round(value)))
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={percent}
      className={cn(
        'h-[0.7rem] overflow-hidden rounded-full bg-[color-mix(in_oklab,var(--foreground)_10%,var(--card))]',
        className,
      )}
    >
      <span
        className={cn('block h-full rounded-full', done ? 'bg-(--pen-sucesso)' : 'bg-primary')}
        style={{ width: `${percent}%` }}
      />
    </div>
  )
}
