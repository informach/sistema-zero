import { buttonVariants } from '@sistemazero/ui/button'
import { BookOpen, Gift, Lock } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/cn'
import { KidsMascot } from './mascot'

export type CareerLockReason = 'future-tier' | 'foundation-first' | 'tier-reward'

/** Extrai o motivo do 423 do curso (`careerLock.reason` no envelope do members). */
export function careerLockReason(body: unknown): CareerLockReason | undefined {
  const reason = (body as { careerLock?: { reason?: string } } | null)?.careerLock?.reason
  return reason === 'foundation-first' || reason === 'future-tier' || reason === 'tier-reward'
    ? reason
    : undefined
}

/** Recado amigável para um curso travado pela carreira (etapa/curso-base/recompensa). */
export function KidsLockedCourse({ reason }: { reason?: CareerLockReason }) {
  const foundationFirst = reason === 'foundation-first'
  const tierReward = reason === 'tier-reward'
  return (
    <section className="mx-auto flex w-full max-w-md flex-col items-center px-4 py-12 text-center">
      <KidsMascot expression="thinking" className="size-24" />
      <h1 className="mt-4 sz-display text-2xl">
        {tierReward
          ? 'Este curso é uma recompensa!'
          : foundationFirst
            ? 'Primeiro o curso-base!'
            : 'Esta etapa ainda está bloqueada'}
      </h1>
      <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-muted px-4 py-1.5 font-bold text-muted-foreground text-sm">
        {tierReward ? <Gift className="size-4" /> : <Lock className="size-4" />} Continue sua
        carreira
      </div>
      <p className="mt-4 text-muted-foreground">
        {tierReward
          ? 'Complete os cursos da etapa e publique os projetos no Mural. Quando a etapa terminar, este curso abre sozinho — é o seu prêmio!'
          : foundationFirst
            ? 'Este curso abre quando você concluir o curso-base da etapa e publicar o projeto dele no Mural. Ele é o primeiro passo — na lista de cursos, o cartão mostra qual é.'
            : 'Conclua os cursos da etapa atual e publique seus projetos. A próxima etapa vai abrir assim que você estiver preparado para ela.'}
      </p>
      <Link
        href="/cursos"
        className={cn(buttonVariants({ variant: 'default' }), 'mt-6 h-11 rounded-full px-6')}
      >
        <BookOpen className="size-4" /> Ver meus cursos
      </Link>
    </section>
  )
}
