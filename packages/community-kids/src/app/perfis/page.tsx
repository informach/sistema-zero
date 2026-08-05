import { redactProfilesForProfileSession } from '@sistemazero/member-shell/lib/profile-redaction'
import { redirect } from 'next/navigation'
import { ProfilesNotIncluded, ProfilesUnavailable } from '@/components/kids/profiles-unavailable'
import { resolveProfileAllowance } from '@/lib/profile-allowance'
import { getProfileAllowanceReadonly, listAvatarsByProfileIdsReadonly } from '@/server/members'
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
export default async function PerfisPage({
  searchParams,
}: {
  searchParams: Promise<{ manage?: string }>
}) {
  const session = await getSession()
  if (!session) redirect('/login')
  // Perfis + teto da conta (p/ a área dos pais travar o "Adicionar" e mostrar "X de Y").
  const [res, allowanceRes] = await Promise.all([listReadonly(), getProfileAllowanceReadonly()])
  // Falha da API não é uma conta vazia. Manter os estados separados evita abrir o
  // onboarding e sugerir a criação de um perfil que pode já existir.
  if (res.status !== 200) return <ProfilesUnavailable />
  const isProfileSession = Boolean(session.activeProfile)
  const profiles = redactProfilesForProfileSession(
    res.body?.profiles ?? [],
    isProfileSession ? session.id : null,
  )
  const profileAllowance = resolveProfileAllowance({
    status: allowanceRes.status,
    maxProfiles: allowanceRes.body?.maxProfiles,
  })
  // Sem perfis, esses estados terminam aqui. Uma falha de leitura nunca vira uma
  // conta vazia com botão "+"; zero é ausência real de matrícula, com CTA próprio.
  if (profiles.length === 0 && profileAllowance.kind === 'unavailable') {
    return <ProfilesUnavailable reason="allowance" />
  }
  if (profiles.length === 0 && profileAllowance.kind === 'none') {
    return <ProfilesNotIncluded />
  }
  // Sessão da conta com o portão já aberto (senha verificada há pouco) → a Área
  // dos pais abre sem re-pedir a senha (ex.: logo após sair de um perfil).
  const parentVerified = !isProfileSession && (await isParentVerifiedFor(session.id))
  // Rostinhos da grade = SNAPSHOT do avatar 3D (24/07 — a ÚNICA fonte da cara da
  // criança; a foto enviada pelos pais MORREU). Lote no members, best-effort:
  // members fora → tiles caem na inicial do nome.
  const avatarsRes =
    profiles.length > 0
      ? await listAvatarsByProfileIdsReadonly(profiles.map((p) => p.id)).catch(() => null)
      : null
  const avatarPhotoByProfile = Object.fromEntries(
    Object.entries(avatarsRes?.status === 200 ? (avatarsRes.body?.avatars ?? {}) : {}).map(
      ([id, view]) => [id, view.photoUrl ?? null],
    ),
  )
  // Logo após sair de um perfil pela "Área dos pais", o reload volta com `?manage=1`
  // e o portão aberto → já entra direto na GESTÃO (sem exigir um 2º clique no botão).
  const { manage } = await searchParams
  const startManaging = parentVerified && manage === '1'
  return (
    <PerfisClient
      initialProfiles={profiles}
      avatarPhotoByProfile={avatarPhotoByProfile}
      isProfileSession={isProfileSession}
      parentVerified={parentVerified}
      startManaging={startManaging}
      profileAllowance={profileAllowance}
      // Tutorial guiado dos PAIS: keyado na CONTA (em sessão de conta, `session.id`
      // É a conta). Em sessão de perfil (criança trocando de irmão) fica nulo — o
      // guia nunca aparece para a criança.
      guideKey={isProfileSession ? null : session.id}
    />
  )
}
