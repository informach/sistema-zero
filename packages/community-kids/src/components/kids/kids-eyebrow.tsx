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
        // 30px de altura, a pílula das telas-modelo (11/09/2026, medida a 1440px).
        'inline-flex items-center gap-2 rounded-full bg-(--sz-kids-amarelo) px-3.5 py-[0.3125rem]',
        // Tinta MARROM do ouro, a mesma do baú: medida no modelo (#2b2000), ela é o
        // traço que o amarelo pede, e fica escura nos dois temas porque o amarelo não
        // muda de tema. Contraste 10,88:1.
        'font-extrabold text-(--kids-ouro-fg) text-sm',
        className,
      )}
    >
      {Icon ? <Icon className="size-4 shrink-0" aria-hidden /> : null}
      {children}
    </p>
  )
}
