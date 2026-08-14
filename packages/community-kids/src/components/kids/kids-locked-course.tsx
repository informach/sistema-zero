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
          ? 'Este curso é um prêmio!'
          : foundationFirst
            ? 'Tem um curso antes deste'
            : 'Este curso abre mais pra frente'}
      </h1>
      <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-muted px-4 py-1.5 font-bold text-muted-foreground text-sm">
        {tierReward ? <Gift className="size-4" /> : <Lock className="size-4" />} Continue sua
        carreira
      </div>
      <p className="mt-4 text-muted-foreground">
        {/* ⚠️ Sem "curso-base" nem "etapa": são termos de quem monta o curso. A criança
            precisa saber o que fazer, não como a gente organiza o catálogo. */}
        {tierReward
          ? 'Termine os outros cursos e publique os seus jogos no Mural. Quando você fechar todos, este abre sozinho. É o seu prêmio!'
          : foundationFirst
            ? 'Tem um curso que vem antes deste. Termine ele e publique o seu jogo no Mural, e aí este aqui abre. Na lista de cursos, o cartão mostra qual é.'
            : 'Continue a sua jornada! Este curso abre quando você chegar nesta parte do mapa.'}
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
