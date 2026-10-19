import { BookOpen, Gift, Lock } from 'lucide-react'
import Link from 'next/link'
import { LEVEL_INFO } from '@/lib/level-info'
import type { StudentLevelSlug } from '@/lib/types'
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

/** Read only the existing server decision's known visual identity; never derive a gate. */
export function journeyLockLevel(body: unknown): StudentLevelSlug | undefined {
  const level = (body as { careerLock?: { requiredLevel?: unknown } } | null)?.careerLock
    ?.requiredLevel
  return typeof level === 'string' && Object.hasOwn(LEVEL_INFO, level)
    ? (level as StudentLevelSlug)
    : undefined
}

/** Recado amigável para um curso travado pela jornada (etapa/curso-base/recompensa). */
export function KidsLockedCourse({
  reason,
  requiredLevel,
}: {
  reason?: JourneyLockReason
  requiredLevel?: StudentLevelSlug
}) {
  const foundationFirst = reason === 'foundation-first'
  const tierReward = reason === 'tier-reward'
  const post =
    requiredLevel && Object.hasOwn(LEVEL_INFO, requiredLevel)
      ? LEVEL_INFO[requiredLevel].label
      : null
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
          ? post
            ? `Esta aventura abre no posto ${post}. Veja as próximas aventuras na sua jornada.`
            : 'O posto necessário está indisponível no momento. Veja sua jornada e tente novamente.'
          : foundationFirst
            ? 'Tem uma aventura que vem antes desta. Na lista de aventuras, veja qual é e o que falta para continuar.'
            : post
              ? `Esta aventura abre no posto ${post}. Veja as próximas aventuras na sua jornada.`
              : 'Esta aventura abre mais adiante. Veja os próximos passos na sua jornada.'}
      </p>
    </KidsRecado>
  )
}
