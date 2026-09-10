import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/cn'

/** Os cinco temas de cor da marca, na ordem em que a trilha os alterna. */
const TEMAS = ['kids-unit-cyan', 'kids-unit-lime', 'kids-unit-rosa', 'kids-unit-verde'] as const

/** Cor estável por DESTINO: a criança memoriza cor + forma antes de ler o rótulo. */
export function tileTheme(seed: string): string {
  let soma = 0
  for (const ch of seed) soma = (soma + ch.charCodeAt(0)) % 997
  return TEMAS[soma % TEMAS.length] as string
}

/**
 * Ladrilho colorido atrás de um ícone de traço. Generaliza o que o painel de
 * missões já fazia com emoji, e é o maior ganho de cor por linha escrita do lote:
 * o menu, a barra de abas e os cards de ferramenta passam a ter cor sem nenhum
 * asset novo.
 *
 * ⚠️ Ele ENCOLHE o ícone (24px para 20px) de propósito: quem passa a carregar a
 * presença é o ladrilho, e a restrição do lote é não engrossar nada.
 */
export function KidsIconTile({
  icon: Icon,
  seed,
  active = false,
  className,
}: {
  icon: LucideIcon
  /** Semente da cor (o href do destino, por exemplo). */
  seed: string
  active?: boolean
  className?: string
}) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'grid size-8 shrink-0 place-items-center rounded-lg transition-colors',
        tileTheme(seed),
        className,
      )}
      style={{
        backgroundColor: active
          ? 'var(--unit)'
          : 'color-mix(in oklab, var(--unit) 14%, transparent)',
        color: active ? 'var(--unit-fg)' : 'var(--unit)',
      }}
    >
      <Icon className="size-5" />
    </span>
  )
}
