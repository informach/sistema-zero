import { BookOpen, Gift, Lock } from 'lucide-react'
import Link from 'next/link'
import { KidsRecado } from './kids-recado'
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
    <KidsRecado
      art={<KidsMascot expression="sleeping" className="kid-float size-24" />}
      chip="Continue sua carreira"
      chipIcon={tierReward ? Gift : Lock}
      title={
        tierReward
          ? 'Este curso é um prêmio!'
          : foundationFirst
            ? 'Tem um curso antes deste'
            : 'Este curso abre mais pra frente'
      }
      actions={
        <Link href="/cursos" className="sz-btn-gradient">
          <BookOpen className="size-4" aria-hidden /> Ver meus cursos
        </Link>
      }
    >
      <p>
        {/* ⚠️ Sem "curso-base" nem "etapa": são termos de quem monta o curso. A criança
            precisa saber o que fazer, não como a gente organiza o catálogo. */}
        {tierReward
          ? 'Termine os cursos desta trilha e publique os seus jogos no Mural. Quando você fechar a trilha, este abre sozinho. É o seu prêmio!'
          : foundationFirst
            ? 'Tem um curso que vem antes deste. Termine ele e publique o seu jogo no Mural, e aí este aqui abre. Na lista de cursos, o cartão mostra qual é.'
            : 'Continue a sua jornada! Este curso abre quando você chegar nesta parte do mapa.'}
      </p>
    </KidsRecado>
  )
}
