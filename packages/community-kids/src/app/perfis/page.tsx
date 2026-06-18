import { redirect } from 'next/navigation'
import { isParentVerifiedFor } from '@/server/parent-gate'
import { listReadonly } from '@/server/profiles'
import { getSession } from '@/server/session'
import { PerfisClient } from './perfis-client'

export const dynamic = 'force-dynamic'

/**
 * Grade de perfis (estilo Netflix): a CONTA escolhe qual perfil de criança usar.
 * Fica FORA do grupo `(app)` (sem a sidebar/chrome kids) — é o "quem vai aprender
 * hoje?". O proxy garante a sessão (conta OU perfil) e isenta esta rota do gate de
 * perfil. Selecionar um perfil emite a sessão de perfil e leva à home.
 */
export default async function PerfisPage() {
  const session = await getSession()
  if (!session) redirect('/login')
  const res = await listReadonly()
  const profiles = res.status === 200 ? (res.body?.profiles ?? []) : []
  const isProfileSession = Boolean(session.activeProfile)
  // Sessão da conta com o portão já aberto (senha verificada há pouco) → a Área
  // dos pais abre sem re-pedir a senha (ex.: logo após sair de um perfil).
  const parentVerified = !isProfileSession && (await isParentVerifiedFor(session.id))
  return (
    <PerfisClient
      initialProfiles={profiles}
      isProfileSession={isProfileSession}
      parentVerified={parentVerified}
    />
  )
}
