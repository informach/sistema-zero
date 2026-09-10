import { cn } from '@/lib/cn'

/**
 * Baú do fim de unidade. SVG inline, e não arquivo em `public/`, por dois motivos:
 * ele herda a cor do tema da unidade (`currentColor`) e a TAMPA precisa ser um
 * elemento próprio para girar na animação de abrir. O `Gift` do lucide que estava
 * aqui é um pacote com laço: não tem tampa, e presente não é tesouro.
 */
export function ChestIcon({ open = false, className }: { open?: boolean; className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={cn('size-7', className)}
    >
      <title>Baú</title>
      {/* Corpo */}
      <path d="M5 15h22v10a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V15Z" />
      {/* Cinta central e fechadura */}
      <path d="M13 15h6v5h-6z" />
      {/* Tampa: gira em torno da dobradiça de trás na animação (`.chest-lid`). */}
      <g className="chest-lid">
        <path d="M5 15V11a5 5 0 0 1 5-5h12a5 5 0 0 1 5 5v4" />
        <path d="M5 15h22" />
      </g>
      {/* Brilho: só no aberto, e some com `prefers-reduced-motion` pelo bloco global. */}
      {open ? <path d="M16 3v2M24.5 5.5l-1.4 1.4M7.5 5.5l1.4 1.4" opacity={0.8} /> : null}
    </svg>
  )
}
