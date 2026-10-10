'use client'

import { UserAvatar } from '@sistemazero/member-shell/components/user-avatar'
import { sessionFetch } from '@sistemazero/member-shell/lib/session-fetch'
import type { StudyGrantView } from '@sistemazero/member-shell/lib/study-access'
import { Button } from '@sistemazero/ui/button'
import { Dialog } from '@sistemazero/ui/dialog'
import { ArrowLeft, KeyRound, Monitor, Plus, Receipt } from 'lucide-react'
import Link from 'next/link'
import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { KidsScreen } from '@/components/kids/kids-screen'
import { GuideBalloon } from '@/components/kids/parent-guide'
import { ParentPasswordChange, ProfileForm } from '@/components/kids/profile-management'
import { ProfileLogoutButton } from '@/components/kids/profiles-unavailable'
import { StudentAreaButton } from '@/components/kids/student-area-button'
import { StudyDeviceManager } from '@/components/kids/study-device-manager'
import {
  guideDismissedKey,
  parentWelcomeSteps,
  readGuideFlag,
  resolveParentGuideStep,
  writeGuideFlag,
} from '@/lib/guide'
import { trackOnboardingEvent } from '@/lib/onboarding-telemetry'
import { PROFILE_AGE_ERROR_MESSAGE } from '@/lib/profile-age'
import { canAddProfile, type ProfileAllowance } from '@/lib/profile-allowance'
import { StudyRequestError, studyErrorMessage, studyRequest } from '@/lib/study-access-client'
import { familyAccessReady } from '@/lib/study-access-view'
import type { ProfileView } from '@/lib/types'
import { AmbassadorCard } from '../perfis/ambassador-card'
import { ChildrenDashboard, FamilyAiCredits, ParentSupportCard } from '../perfis/parent-dashboard'
import { PurchasesView } from '../perfis/purchases-view'
import { ChildAccessStatus } from './child-access-status'
import { ProfileAllowanceNote } from './profile-allowance-note'

/** Os botões da área dos pais em pílula de 44px (o ui desenha 32px com cantos de 8px). */
const PILL_BUTTONS = '[&_button]:min-h-11 [&_button]:rounded-full'

type FocusTarget = { kind: 'panel' } | { kind: 'card'; id: string }

export function ParentsClient({
  accountId,
  parentName,
  initialProfiles,
  avatarPhotoByProfile,
  profileAllowance,
  initialAccess = {},
  studentDestination,
  initialSelected,
}: {
  accountId: string
  parentName?: string
  initialProfiles: ProfileView[]
  avatarPhotoByProfile: Record<string, string | null>
  profileAllowance: ProfileAllowance
  /** Autorizações de cada criança lidas no servidor; `null` = a consulta falhou. */
  initialAccess?: Record<string, StudyGrantView[] | null>
  /** A fase do link que trouxe o responsável: abre depois da troca para a criança. */
  studentDestination?: string
  initialSelected?: string
}) {
  const [profiles, setProfiles] = useState(initialProfiles)
  const [selectedId, setSelectedId] = useState<string | null>(initialSelected ?? null)
  const [editing, setEditing] = useState<
    { mode: 'create' } | { mode: 'edit'; profile: ProfileView } | null
  >(null)
  const [removing, setRemoving] = useState<ProfileView | null>(null)
  const [busy, setBusy] = useState(false)
  const [purchases, setPurchases] = useState(false)
  const [password, setPassword] = useState(false)
  const [guideOpen, setGuideOpen] = useState(false)
  const [access, setAccess] = useState(initialAccess)
  const selected = profiles.find((profile) => profile.id === selectedId) ?? null
  const canCreateProfile = canAddProfile(profileAllowance, profiles.length)
  // O estado REAL da família (todas as crianças), e não só o painel aberto: recarregar a
  // página não "desprepara" um acesso que existe. Criança sem leitura conta como "não sei".
  const accessReady = familyAccessReady(
    Object.fromEntries(profiles.map((profile) => [profile.id, access[profile.id] ?? null])),
  )
  const guideKey = guideDismissedKey(accountId)
  const guideStep = resolveParentGuideStep({
    profilesCount: profiles.length,
    canCreateProfile,
    accessReady: accessReady === true,
    dismissed: !guideOpen,
  })
  const steps = parentWelcomeSteps({ profilesCount: profiles.length, canCreateProfile })
  const studentEntry = studentDestination
    ? `/login/aluno?next=${encodeURIComponent(studentDestination)}`
    : '/perfis'
  const initial = useRef({
    profiles: initialProfiles.length,
    allowance: profileAllowance,
    ready: accessReady,
  })
  const previousReady = useRef(accessReady)
  const focusTarget = useRef<FocusTarget | null>(null)
  useEffect(() => {
    // Abre sozinho só quando há um passo a fazer: quem já preparou o acesso (ou quando não
    // dá para saber) não lê "Vamos preparar o acesso?". "Como preparar o acesso" reabre.
    if (readGuideFlag(guideKey)) return
    const start = initial.current
    const actionable = start.profiles ? start.ready === false : canAddProfile(start.allowance, 0)
    if (!actionable) return
    setGuideOpen(true)
    trackOnboardingEvent({ audience: 'parent', action: 'welcome_opened', step: 'welcome' })
  }, [guideKey])
  useEffect(() => {
    if (previousReady.current === false && accessReady === true)
      trackOnboardingEvent({ audience: 'parent', action: 'access_prepared', step: 'access' })
    previousReady.current = accessReady
  }, [accessReady])
  useEffect(() => {
    // Abrir o painel leva o foco ao título dele; fechar devolve ao botão que abriu.
    const target = focusTarget.current
    if (!target) return
    focusTarget.current = null
    const element = selectedId
      ? document.getElementById('device-title')
      : target.kind === 'card'
        ? document.querySelector<HTMLElement>(`[data-access-for="${target.id}"]`)
        : null
    element?.focus()
  }, [selectedId])
  const onGrants = useCallback((profileId: string, grants: StudyGrantView[]) => {
    setAccess((previous) => ({ ...previous, [profileId]: grants }))
  }, [])
  function openPanel(profileId: string) {
    focusTarget.current = { kind: 'panel' }
    setSelectedId(profileId)
  }
  function closePanel() {
    if (selectedId) focusTarget.current = { kind: 'card', id: selectedId }
    setSelectedId(null)
  }
  function reopenGuide() {
    setGuideOpen(true)
    trackOnboardingEvent({ audience: 'parent', action: 'guide_reopened', step: 'welcome' })
    trackOnboardingEvent({ audience: 'parent', action: 'welcome_opened', step: 'welcome' })
  }
  function dismissGuide() {
    setGuideOpen(false)
    writeGuideFlag(guideKey)
    trackOnboardingEvent(
      accessReady === true
        ? { audience: 'parent', action: 'tour_completed', step: 'access' }
        : accessReady === false || !profiles.length
          ? {
              audience: 'parent',
              action: 'tour_skipped',
              step: profiles.length ? 'access' : 'profile',
            }
          : { audience: 'parent', action: 'welcome_dismissed', step: 'welcome' },
    )
  }
  async function run(action: () => Promise<void>) {
    setBusy(true)
    try {
      await action()
    } catch (error) {
      // ⚠️ Arquivar, mudar o nascimento e ligar o perfil público pedem login de até 15 min
      // (`PARENT_REAUTH_REQUIRED`, full review de 10/10/2026): sem o atalho, o responsável lia
      // o recado e ficava sem caminho. A entrada dos responsáveis volta para cá (`next=/pais`).
      if (error instanceof StudyRequestError && error.code === 'PARENT_REAUTH_REQUIRED') {
        toast.error('Por segurança, entre de novo para salvar essa mudança.', {
          action: {
            label: 'Entrar de novo',
            onClick: () => window.location.assign('/login/responsavel?next=%2Fpais'),
          },
        })
        return
      }
      toast.error(studyErrorMessage(error))
    } finally {
      setBusy(false)
    }
  }
  async function saveProfile(
    name: string,
    birthDate: string | null,
    publicProfileEnabled: boolean,
    existing?: ProfileView,
  ) {
    await run(async () => {
      try {
        const result = await studyRequest<{ profile: ProfileView }>(
          existing ? `/api/profiles/${existing.id}` : '/api/profiles',
          { name, birthDate, publicProfileEnabled },
          existing ? 'PATCH' : 'POST',
        )
        setProfiles((previous) =>
          existing
            ? previous.map((profile) => (profile.id === existing.id ? result.profile : profile))
            : [...previous, result.profile],
        )
        if (!existing) {
          setAccess((previous) => ({ ...previous, [result.profile.id]: [] }))
          trackOnboardingEvent({ audience: 'parent', action: 'profile_created', step: 'profile' })
        }
        setEditing(null)
        openPanel(result.profile.id)
      } catch (error) {
        if (error instanceof StudyRequestError && error.code === 'PROFILE_AGE_RESTRICTED')
          throw new StudyRequestError(error.code, PROFILE_AGE_ERROR_MESSAGE)
        throw error
      }
    })
  }
  if (purchases) return <PurchasesView onBack={() => setPurchases(false)} />
  return (
    <>
      {editing ? (
        <ProfileForm
          editing={editing}
          busy={busy}
          showGuideHint={guideOpen && editing.mode === 'create'}
          onCancel={() => setEditing(null)}
          onSave={saveProfile}
          onArchive={setRemoving}
        />
      ) : (
        <KidsScreen align="start" innerClassName="flex max-w-5xl flex-col gap-7">
          <header className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm font-bold text-primary">Comunidade dos Criadores</p>
              <h1 className="sz-display mt-1 text-3xl sm:text-4xl">Área dos pais</h1>
              {parentName ? (
                <p className="mt-2 text-sm text-muted-foreground">Você entrou como {parentName}.</p>
              ) : null}
              <p className="mt-2 text-muted-foreground">
                Prepare o acesso e acompanhe as descobertas dos seus filhos.
              </p>
            </div>
            <ProfileLogoutButton disabled={busy} className="min-h-11 rounded-full" />
          </header>
          {studentDestination ? (
            <section role="status" className="kids-carta p-5">
              <h2 className="sz-display text-xl">Esse link abre na área do aluno</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                A aula do link é da criança, não do responsável. Confira se o acesso dela está
                preparado neste computador e clique em Ir para a área do aluno: a criança escolhe o
                perfil e a aula abre em seguida.
              </p>
            </section>
          ) : null}
          <nav aria-label="Ações do responsável" className={`flex flex-wrap gap-2 ${PILL_BUTTONS}`}>
            <StudentAreaButton destination={studentEntry} disabled={busy} />
            <Button variant="ghost" onClick={() => setPurchases(true)}>
              <Receipt className="size-4" />
              Compras
            </Button>
            <Button variant="ghost" onClick={() => setPassword(true)}>
              <KeyRound className="size-4" />
              Trocar senha
            </Button>
            <Button variant="ghost" onClick={reopenGuide}>
              Como preparar o acesso
            </Button>
          </nav>
          {guideStep ? (
            <div className={`rounded-2xl border-2 border-primary bg-card p-5 ${PILL_BUTTONS}`}>
              <h2 className="sz-display text-xl">
                {guideStep === 'ready'
                  ? 'O acesso está preparado'
                  : profiles.length
                    ? 'Seu filho já tem perfil. Vamos preparar o acesso?'
                    : 'Vamos preparar a primeira entrada?'}
              </h2>
              <ol className="mt-3 grid gap-4 text-sm sm:grid-cols-3">
                {steps.map((step) => (
                  <li key={step.id}>
                    <strong className="block">{step.title}</strong>
                    {step.text}
                  </li>
                ))}
              </ol>
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <Link
                  href="/ajuda/entrar"
                  className="inline-flex min-h-11 items-center text-sm underline underline-offset-4"
                >
                  Ver o passo a passo
                </Link>
                <button
                  type="button"
                  onClick={dismissGuide}
                  className="px-2 text-sm font-bold underline underline-offset-4"
                >
                  {guideStep === 'ready' ? 'Entendi' : 'Fechar orientação'}
                </button>
              </div>
            </div>
          ) : null}
          {selected ? (
            <div className={`kids-carta space-y-5 p-5 sm:p-7 ${PILL_BUTTONS}`}>
              <Button variant="ghost" onClick={closePanel}>
                <ArrowLeft className="size-4" />
                Voltar aos filhos
              </Button>
              <StudyDeviceManager
                key={selected.id}
                profileId={selected.id}
                name={selected.name}
                accountId={accountId}
                onGrants={onGrants}
                studentDestination={studentEntry}
              />
            </div>
          ) : (
            <section aria-labelledby="children-title" className={PILL_BUTTONS}>
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <h2 id="children-title" className="sz-display text-2xl">
                  Seus filhos
                </h2>
                {canCreateProfile ? (
                  <Button onClick={() => setEditing({ mode: 'create' })}>
                    <Plus className="size-4" />
                    Adicionar criança
                  </Button>
                ) : null}
              </div>
              {profiles.length === 0 ? (
                <GuideBalloon arrow="none">
                  Comece em <strong>Adicionar criança</strong>. Depois você escolhe em qual aparelho
                  ela poderá entrar.
                </GuideBalloon>
              ) : (
                <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {profiles.map((profile) => (
                    <li
                      key={profile.id}
                      className="kids-carta flex flex-col items-center gap-4 p-5 text-center"
                    >
                      <UserAvatar
                        avatarUrl={avatarPhotoByProfile[profile.id] ?? null}
                        firstName={profile.name}
                        size="xl"
                      />
                      <h3 className="sz-display break-words text-2xl">{profile.name}</h3>
                      <ChildAccessStatus grants={access[profile.id]} />
                      <Button
                        className="w-full"
                        data-access-for={profile.id}
                        onClick={() => openPanel(profile.id)}
                      >
                        <Monitor className="size-4" />
                        Acesso nos aparelhos
                      </Button>
                      <Button variant="ghost" onClick={() => setEditing({ mode: 'edit', profile })}>
                        Editar perfil
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
              <ProfileAllowanceNote allowance={profileAllowance} profilesCount={profiles.length} />
            </section>
          )}
          <div className="flex flex-col items-center gap-6">
            <Link href="/responsavel" className="sz-btn-gradient px-6">
              Abrir acompanhamento da família
            </Link>
            <ChildrenDashboard avatarPhotoByProfile={avatarPhotoByProfile} />
            <FamilyAiCredits />
            <ParentSupportCard />
            <AmbassadorCard />
          </div>
        </KidsScreen>
      )}
      <Dialog
        open={removing !== null}
        onClose={() => {
          if (!busy) setRemoving(null)
        }}
        title="Remover perfil"
        footer={
          <div className={`flex flex-wrap justify-end gap-2 ${PILL_BUTTONS}`}>
            <Button variant="secondary" disabled={busy} onClick={() => setRemoving(null)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              disabled={busy}
              onClick={() =>
                void run(async () => {
                  if (!removing) return
                  const response = await sessionFetch(`/api/profiles/${removing.id}`, {
                    method: 'DELETE',
                  })
                  if (!response.ok)
                    throw new StudyRequestError(
                      'PROFILE_REMOVE_FAILED',
                      'Não foi possível remover o perfil.',
                    )
                  setProfiles((previous) =>
                    previous.filter((profile) => profile.id !== removing.id),
                  )
                  setAccess((previous) =>
                    Object.fromEntries(
                      Object.entries(previous).filter(([id]) => id !== removing.id),
                    ),
                  )
                  setRemoving(null)
                  setEditing(null)
                  setSelectedId(null)
                })
              }
            >
              Remover
            </Button>
          </div>
        }
      >
        <p>
          Remover o perfil de {removing?.name}? Os acessos dessa criança serão encerrados. O
          progresso fica guardado.
        </p>
      </Dialog>
      {password ? <ParentPasswordChange onCancel={() => setPassword(false)} /> : null}
    </>
  )
}
