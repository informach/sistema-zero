import { BookOpen, Gift, Lock } from 'lucide-react'
import Link from 'next/link'
import { KidsRecado } from './kids-recado'
import { KidsMascot } from './mascot'

export type JourneyLockReason = 'future-tier' | 'foundation-first' | 'tier-reward'

/** Extrai o motivo do 423 do curso (`careerLock.reason` no envelope do members). */
export function journeyLockReason(body: unknown): JourneyLockReason | undefined {
  const reason = (body as { careerLock?: { reason?: string } } | null)?.careerLock?.reason
  return reason === 'foundation-first' || reason === 'future-tier' || reason === 'tier-reward'
    ? reason
    : undefined
}

/** Recado amigável para um curso travado pela jornada (etapa/curso-base/recompensa). */
export function KidsLockedCourse({ reason }: { reason?: JourneyLockReason }) {
  const foundationFirst = reason === 'foundation-first'
  const tierReward = reason === 'tier-reward'
  return (
    <KidsRecado
      art={<KidsMascot expression="sleeping" className="kid-float size-24" />}
      chip="Continue sua jornada"
      chipIcon={tierReward ? Gift : Lock}
      title={
        tierReward
          ? 'Esta aventura é um prêmio!'
          : foundationFirst
            ? 'Tem uma aventura antes desta'
            : 'Esta aventura abre mais pra frente'
      }
      actions={
        <Link href="/cursos" className="sz-btn-gradient">
          <BookOpen className="size-4" aria-hidden /> Ver minhas aventuras
        </Link>
      }
    >
      <p>
        {/* ⚠️ Sem "curso-base" nem "etapa": são termos de quem monta o curso. A criança
            precisa saber o que fazer, não como a gente organiza o catálogo. */}
        {tierReward
          ? 'Termine as aventuras desta trilha e publique os seus jogos no Mural. Quando você fechar a trilha, esta abre sozinha. É o seu prêmio!'
          : foundationFirst
            ? 'Tem uma aventura que vem antes desta. Termine ela e publique o seu jogo no Mural, e aí esta aqui abre. Na lista de aventuras, o cartão mostra qual é.'
            : 'Esta aventura abre quando você chegar nesta parte do mapa.'}
      </p>
    </KidsRecado>
  )
}
