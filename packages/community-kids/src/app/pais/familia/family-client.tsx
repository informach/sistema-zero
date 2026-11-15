'use client'

import type { StudyGrantView } from '@sistemazero/member-shell/lib/study-access'
import { canAddProfile, type ProfileAllowance } from '@/lib/profile-allowance'
import type { ProfileView } from '@/lib/types'
import { ArquipelagoLimitCard } from '../_components/arquipelago-limit-card'
import { AddChildCard, ChildCard } from '../_components/child-card'
import { ParentShell } from '../_components/parent-shell'
import { ParentPageTitle, ParentSection } from '../_components/parent-ui'
import { useChildrenStats } from '../_components/use-children-stats'
import { studentEntryFor } from '../parent-routes'
import { ProfileAllowanceNote } from '../profile-allowance-note'

/**
 * A Família (redesenho de 14/11/2026): os cartões dos filhos, com o acesso, os números e a
 * semana; o lugar de mais um (com o limite do plano); e as regras do Arquipélago Vagalume.
 */
export function FamilyClient({
  parentName,
  profiles,
  profileAllowance,
  avatarPhotoByProfile,
  access,
  studentDestination,
  semAreaDaCrianca = false,
}: {
  parentName?: string
  profiles: ProfileView[]
  profileAllowance: ProfileAllowance
  avatarPhotoByProfile: Record<string, string | null>
  /** Autorizações de cada filho lidas no servidor; `null` = a consulta falhou. */
  access: Record<string, StudyGrantView[] | null>
  /** A aula do link que trouxe o responsável: segue até a página do filho. */
  studentDestination?: string
  /** Quem comprou só um curso para pais: sem área da criança para abrir. */
  semAreaDaCrianca?: boolean
}) {
  const stats = useChildrenStats()
  const canCreateProfile = canAddProfile(profileAllowance, profiles.length)
  const limited = profileAllowance.kind === 'limited'
  const addNote = limited
    ? `Seu plano tem ${profileAllowance.maxProfiles} perfis. Você usa ${profiles.length}.`
    : undefined
  return (
    <ParentShell
      active="familia"
      parentName={parentName}
      studentDestination={studentEntryFor(studentDestination)}
      semAreaDaCrianca={semAreaDaCrianca}
    >
      <ParentPageTitle
        title="Família"
        text="Cada filho tem a sua página, com o que aprendeu, os aparelhos em que entra, o que fez no jogo e o perfil."
      />
      <ParentSection title="Seus filhos" id="children-title">
        <ul className="kids-grade-centrada [--grade-vao:1.25rem] md:[--grade-colunas:2] xl:[--grade-colunas:3]">
          {profiles.map((profile) => (
            <ChildCard
              key={profile.id}
              profile={profile}
              photoUrl={avatarPhotoByProfile[profile.id] ?? null}
              grants={access[profile.id]}
              stats={stats}
              studentDestination={studentDestination}
            />
          ))}
          {canCreateProfile ? <AddChildCard note={addNote} /> : null}
        </ul>
        {/* O limite do plano já mora no cartão de adicionar; o recado só aparece no limite,
            ilimitado ou quando a consulta falhou. */}
        {!canCreateProfile || !limited ? (
          <ProfileAllowanceNote allowance={profileAllowance} profilesCount={profiles.length} />
        ) : null}
      </ParentSection>
      <ArquipelagoLimitCard />
    </ParentShell>
  )
}
