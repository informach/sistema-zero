import { Mic } from 'lucide-react'
import { cn } from '@/lib/cn'

/**
 * "falado" (14/10/2026): a criança falou em vez de escrever e o texto foi transcrito
 * automaticamente. Serve para a equipe ler com boa vontade uma palavra estranha (erro de
 * transcrição, não da criança). A voz não fica guardada: não há áudio para ouvir aqui.
 */
export function SpokenChip({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'ml-2 inline-flex items-center gap-1 rounded-full border border-border bg-background px-1.5 py-0.5 align-middle font-normal text-[11px] text-muted-foreground',
        className,
      )}
      title="A criança falou e o texto foi transcrito automaticamente. Pode haver pequenos erros de transcrição."
    >
      <Mic className="size-3" aria-hidden="true" />
      falado
      <span className="sr-only">, transcrito automaticamente</span>
    </span>
  )
}
