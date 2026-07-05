import { redactProfilesForProfileSession } from '@sistemazero/member-shell/lib/profile-redaction'
import { redirect } from 'next/navigation'
import { getProfileAllowanceReadonly } from '@/server/members'
import { isParentVerifiedFor } from '@/server/parent-gate'
import { listReadonly } from '@/server/profiles'
import { getSession } from '@/server/session'
import { PerfisClient } from './perfis-client'

export const dynamic = 'force-dynamic'

/** Teto máximo de um plano REAL no catálogo (`OfferContent.maxProfiles` 1..50). Acima
 * disso só existe o sentinela ilimitado da equipe interna (`Number.MAX_SAFE_INTEGER`). */
const MAX_REAL_PROFILES = 50

/**
 * Grade de perfis (estilo Netflix): a CONTA escolhe qual perfil de criança usar.
 * Fica FORA do grupo `(app)` (sem a sidebar/chrome kids) — é o "quem vai aprender
 * hoje?". O proxy garante a sessão (conta OU perfil) e isenta esta rota do gate de
 * perfil. Selecionar um perfil emite a sessão de perfil e leva à home.
 */
export default async function PerfisPage({
  searchParams,
}: {
  searchParams: Promise<{ manage?: string }>
}) {
  const session = await getSession()
  if (!session) redirect('/login')
  // Perfis + teto da conta (p/ a área dos pais travar o "Adicionar" e mostrar "X de Y").
  const [res, allowanceRes] = await Promise.all([listReadonly(), getProfileAllowanceReadonly()])
  const isProfileSession = Boolean(session.activeProfile)
  const profiles =
    res.status === 200
      ? redactProfilesForProfileSession(
          res.body?.profiles ?? [],
          isProfileSession ? session.id : null,
        )
      : []
  // O members devolve `Number.MAX_SAFE_INTEGER` como teto p/ a EQUIPE interna (perfis
  // ilimitados). Planos reais são limitados a 50 pelo catálogo, então qualquer valor
  // acima disso é o sentinela "sem teto" — não é um número p/ mostrar cru na tela.
  const rawMaxProfiles =
    allowanceRes.status === 200 ? (allowanceRes.body?.maxProfiles ?? null) : null
  const unlimitedProfiles = rawMaxProfiles != null && rawMaxProfiles > MAX_REAL_PROFILES
  const maxProfiles = unlimitedProfiles ? null : rawMaxProfiles
  // Sessão da conta com o portão já aberto (senha verificada há pouco) → a Área
  // dos pais abre sem re-pedir a senha (ex.: logo após sair de um perfil).
  const parentVerified = !isProfileSession && (await isParentVerifiedFor(session.id))
  // Logo após sair de um perfil pela "Área dos pais", o reload volta com `?manage=1`
  // e o portão aberto → já entra direto na GESTÃO (sem exigir um 2º clique no botão).
  const { manage } = await searchParams
  const startManaging = parentVerified && manage === '1'
  return (
    <PerfisClient
      initialProfiles={profiles}
      isProfileSession={isProfileSession}
      parentVerified={parentVerified}
      startManaging={startManaging}
      maxProfiles={maxProfiles}
      unlimitedProfiles={unlimitedProfiles}
    />
  )
}
