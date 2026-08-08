import { buttonVariants } from '@sistemazero/ui/button'
import { Lock } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/cn'
import { KidsMascot } from './mascot'

/**
 * Recado gentil quando a criança tenta abrir uma aula travada (members → 423):
 * a trilha libera uma aula de cada vez (estilo Duolingo). Sem erro feio — mascote
 * + botão de volta pra trilha.
 */
export function KidsLockedLesson({ courseSlug }: { courseSlug: string }) {
  return (
    <div className="mx-auto flex w-full max-w-md flex-col items-center px-4 py-12 text-center">
      <KidsMascot expression="thinking" className="mx-auto size-24" />
      <h1 className="mt-4 [font-family:var(--font-display)] font-bold text-2xl">Aula bloqueada</h1>
      {/* Copy DESCRITIVA, não uma ordem: quando a aula anterior tem o bloco "em breve"
          ela ainda não pode ser concluída, e um "conclua a aula anterior" mandaria a
          criança fazer algo impossível — que lê como "eu fiz alguma coisa errada". */}
      <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-muted px-4 py-1.5 font-bold text-muted-foreground text-sm">
        <Lock className="size-4" /> Uma aula de cada vez
      </div>
      <p className="mt-4 text-muted-foreground">
        Esta aula abre quando a anterior for concluída. 🚀 Dá uma olhadinha nela!
      </p>
      <Link
        href={`/cursos/${encodeURIComponent(courseSlug)}`}
        className={cn(buttonVariants({ variant: 'default' }), 'mt-6 h-11 rounded-full px-6')}
      >
        Voltar ao curso
      </Link>
    </div>
  )
}
