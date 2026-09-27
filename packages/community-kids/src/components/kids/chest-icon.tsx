import { cn } from '@/lib/cn'

/** SVG ilustrado para o primeiro quadro e para a queda segura do Rive na trilha. */
export const CHEST_CLOSED_FALLBACK_SRC = '/kids/chest-closed.svg'

/**
 * A arte colorida fornecida para o baú fechado. Ela é decorativa: quem dá o nome
 * e a instrução ao baú é o contêiner acessível da trilha.
 */
export function ChestClosedFallback({ className }: { className?: string }) {
  return (
    <img
      src={CHEST_CLOSED_FALLBACK_SRC}
      alt=""
      aria-hidden="true"
      width={32}
      height={32}
      className={cn('size-8 object-contain', className)}
    />
  )
}

/**
 * Ícone compacto do baú aberto e das superfícies genéricas. A ilustração fechada
 * da trilha fica em `ChestClosedFallback`; este SVG continua inline para herdar a
 * cor do tema (`currentColor`). O `Gift` do lucide que estava aqui é um pacote com
 * laço: não tem tampa, e presente não é tesouro.
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
      {/* Tampa */}
      <g>
        <path d="M5 15V11a5 5 0 0 1 5-5h12a5 5 0 0 1 5 5v4" />
        <path d="M5 15h22" />
      </g>
      {/* Brilho: só no aberto, e some com `prefers-reduced-motion` pelo bloco global. */}
      {open ? <path d="M16 3v2M24.5 5.5l-1.4 1.4M7.5 5.5l1.4 1.4" opacity={0.8} /> : null}
    </svg>
  )
}
