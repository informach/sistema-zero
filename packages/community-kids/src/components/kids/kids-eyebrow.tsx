import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/cn'

/**
 * A pílula de contexto que abre toda página ("Sua oficina de criação",
 * "Comunidade · Recados do professor").
 *
 * Ela existia como um `<p>` de texto azul solto, e era uma das coisas que faziam
 * a plataforma parecer mais séria que o funil. Agora é pílula cheia, em âmbar,
 * com ícone: a criança encontra onde está antes de ler o título.
 */
export function KidsEyebrow({
  icon: Icon,
  children,
  className,
}: {
  icon?: LucideIcon
  children: React.ReactNode
  className?: string
}) {
  return (
    <p
      className={cn(
        'inline-flex items-center gap-2 rounded-full bg-(--sz-kids-amarelo) px-4 py-1.5',
        // Tinta escura sobre o âmbar: medido 8,73:1. Branco daria 1,48 e sumiria.
        'font-bold text-(--sz-kids-tinta) text-sm',
        className,
      )}
    >
      {Icon ? <Icon className="size-4 shrink-0" aria-hidden /> : null}
      {children}
    </p>
  )
}
