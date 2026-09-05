'use client'

import { Button } from '@sistemazero/ui/button'
import { Dialog } from '@sistemazero/ui/dialog'
import { Plus, Receipt, RefreshCw } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { KidsMascot } from '@/components/kids/mascot'
import { ParentGateDialog } from '@/components/kids/parent-gate-dialog'
import {
  GuideBalloon,
  GuideReopenButton,
  GuideTargetItem,
  GuideWelcomeDialog,
  ParentConcludeTarget,
} from '@/components/kids/parent-guide'
import {
  ParentPasswordChange,
  ProfileForm,
  ProfileTile,
} from '@/components/kids/profile-management'
import {
  ProfileLogoutButton,
  ProfilesNotIncluded,
  ProfilesUnavailable,
} from '@/components/kids/profiles-unavailable'
import {
  clearGuideFlag,
  guideDismissedKey,
  guideWelcomeSeenKey,
  parentWelcomeSteps,
  readGuideFlag,
  resolveParentGuideStep,
  writeGuideFlag,
} from '@/lib/guide'
import { COMUNIDADE_OFERTA_URL } from '@/lib/links'
import { trackOnboardingEvent } from '@/lib/onboarding-telemetry'
import { PROFILE_AGE_ERROR_MESSAGE } from '@/lib/profile-age'
import { canAddProfile, type ProfileAllowance } from '@/lib/profile-allowance'
import type { ProfileView } from '@/lib/types'
import { ChildrenDashboard, FamilyAiCredits, ParentSupportCard } from './parent-dashboard'
import { PurchasesView } from './purchases-view'

const JSON_HEADERS = { 'content-type': 'application/json' }

type Editing = { mode: 'create' } | { mode: 'edit'; profile: ProfileView } | null

/**
 * Grade de perfis estilo Netflix. **Selecionar** entra no perfil (1 clique, sem
 * PIN) → emite a sessão de perfil e recarrega a home. **Área dos pais** SEMPRE pede
 * a SENHA do responsável (decisão 06/2026 — a criança pode estar numa sessão da
 * conta): numa sessão de perfil o submit SAI do perfil (`/api/profile-session/exit`)
 * e recarrega JÁ na gestão (`?manage=1` → `startManaging`, sem exigir um 2º clique);
 * numa sessão da conta VERIFICA a senha (`/api/parents/verify`) e abre o portão. Se
 * o portão já está aberto (`parentVerified`), gerencia direto. O limite de perfis é
 * do plano — criar acima dele devolve 409 (toast).
 */
export function PerfisClient({
  initialProfiles,
  avatarPhotoByProfile,
  isProfileSession,
  parentVerified,
  startManaging = false,
  profileAllowance,
  guideKey = null,
}: {
  initialProfiles: ProfileView[]
  /** profileId → snapshot do avatar 3D (a ÚNICA fonte da cara da criança, 24/07). */
  avatarPhotoByProfile: Record<string, string | null>
  isProfileSession: boolean
  parentVerified: boolean
  startManaging?: boolean
  /** Direito CONFIRMADO pelo members; falha de leitura nunca libera um "+" otimista. */
  profileAllowance: ProfileAllowance
  /**
   * Chave do tutorial guiado dos pais (o id da CONTA) — `null` em sessão de
   * PERFIL (criança trocando de irmão), quando o guia nunca aparece.
   */
  guideKey?: string | null
}) {
  const [profiles, setProfiles] = useState(initialProfiles)
  const [managing, setManaging] = useState(startManaging)
  // Portão verificado nesta sessão (cookie de 15 min). `parentVerified` é prop CONGELADA do
  // servidor; sem rastrear localmente, verificar a senha e reabrir a Área dos pais (sem reload)
  // pedia a senha DE NOVO mesmo com o portão aberto.
  const [verified, setVerified] = useState(parentVerified)
  const [busy, setBusy] = useState(false)
  const [gate, setGate] = useState(false) // modal de senha (abrir a área dos pais)
  const [changingPassword, setChangingPassword] = useState(false) // modal: trocar senha da conta
  const [editing, setEditing] = useState<Editing>(null)
  const [showPurchases, setShowPurchases] = useState(false) // sub-tela "Minhas compras"
  const [removing, setRemoving] = useState<ProfileView | null>(null) // confirmação de remover perfil
  const [profileCreatedDuringGuide, setProfileCreatedDuringGuide] = useState(false)
  const parentAreaRef = useRef<HTMLButtonElement>(null)
  const firstProfileRef = useRef<HTMLButtonElement>(null)
  const focusAfterWelcomeRef = useRef(false)

  const maxProfiles = profileAllowance.kind === 'limited' ? profileAllowance.maxProfiles : null
  const unlimitedProfiles = profileAllowance.kind === 'unlimited'
  const atProfileLimit = maxProfiles != null && profiles.length >= maxProfiles
  const canCreateProfile = canAddProfile(profileAllowance, profiles.length)

  // ---- Tutorial guiado dos pais (04/08/2026) ----
  // O guia SEGUE O ESTADO (conta sem perfil = primeiro acesso), mas "Entendi" e
  // "Pular" encerram o fluxo inteiro neste navegador. As leituras de
  // localStorage acontecem em efeito pós-mount — SSR e 1º render do cliente
  // concordam em "sem guia" (lição de hidratação do focus-mode, 03/08).
  const [guideDismissed, setGuideDismissed] = useState(true)
  const [welcomeOpen, setWelcomeOpen] = useState(false)
  useEffect(() => {
    if (!guideKey) return
    const welcomeSeen = readGuideFlag(guideWelcomeSeenKey(guideKey))
    const tourComplete = readGuideFlag(guideDismissedKey(guideKey))
    // Famílias que já tinham perfil antes deste onboarding não devem receber um
    // arremate órfão. Elas iniciam conscientemente por "Como funciona?". Se o
    // modal já foi visto, porém, o guia estava em andamento e pode ser retomado.
    const existingFamilyDidNotStart = initialProfiles.length > 0 && !welcomeSeen
    setGuideDismissed(tourComplete || existingFamilyDidNotStart)
    // Auto-abre o modal uma vez por conta neste navegador, e só na tela que ele
    // descreve (grade sem perfil, fora da gestão).
    if (initialProfiles.length === 0 && !startManaging && !welcomeSeen) {
      setWelcomeOpen(true)
      trackOnboardingEvent({ audience: 'parent', action: 'welcome_opened', step: 'welcome' })
    }
  }, [guideKey, initialProfiles.length, startManaging])

  const guideStep = guideKey
    ? resolveParentGuideStep({
        profilesCount: profiles.length,
        managing,
        canCreateProfile,
        profileCreated: profileCreatedDuringGuide,
        creatingOpen: editing?.mode === 'create',
        dismissed: guideDismissed,
        isProfileSession,
      })
    : null
  const visibleGuideStep = welcomeOpen ? null : guideStep
  const welcomeSteps = useMemo(
    () => parentWelcomeSteps({ profilesCount: profiles.length, canCreateProfile }),
    [profiles.length, canCreateProfile],
  )

  useEffect(() => {
    if (welcomeOpen || !focusAfterWelcomeRef.current) return
    focusAfterWelcomeRef.current = false
    const target = profiles.length === 0 ? parentAreaRef.current : firstProfileRef.current
    target?.focus()
  }, [welcomeOpen, profiles.length])

  function completeGuide() {
    if (guideKey) writeGuideFlag(guideDismissedKey(guideKey))
    setGuideDismissed(true)
    trackOnboardingEvent({ audience: 'parent', action: 'tour_completed', step: 'tile' })
  }

  function closeWelcome(action: 'welcome_completed' | 'welcome_dismissed') {
    if (guideKey) writeGuideFlag(guideWelcomeSeenKey(guideKey))
    focusAfterWelcomeRef.current = true
    setWelcomeOpen(false)
    trackOnboardingEvent({ audience: 'parent', action, step: 'welcome' })
  }

  function skipGuide() {
    if (guideKey) {
      writeGuideFlag(guideWelcomeSeenKey(guideKey))
      writeGuideFlag(guideDismissedKey(guideKey))
    }
    focusAfterWelcomeRef.current = true
    setWelcomeOpen(false)
    setGuideDismissed(true)
    trackOnboardingEvent({ audience: 'parent', action: 'tour_skipped', step: 'welcome' })
  }

  function reopenGuide() {
    if (guideKey) clearGuideFlag(guideDismissedKey(guideKey))
    setGuideDismissed(false)
    setWelcomeOpen(true)
    trackOnboardingEvent({ audience: 'parent', action: 'guide_reopened', step: 'welcome' })
    trackOnboardingEvent({ audience: 'parent', action: 'welcome_opened', step: 'welcome' })
  }

  function concludeManaging() {
    setManaging(false)
    setProfileCreatedDuringGuide(false)
  }

  // Entrou na gestão pelo `?manage=1` (logo após "Área dos pais" sair de um perfil):
  // limpa o parâmetro da URL p/ um refresh depois de "Concluir" não reabrir sozinho.
  useEffect(() => {
    if (startManaging) window.history.replaceState(null, '', '/perfis')
  }, [startManaging])

  async function selectProfile(id: string) {
    if (busy) return
    setBusy(true)
    try {
      const res = await fetch(`/api/profiles/${id}/select`, { method: 'POST' })
      if (res.ok) {
        window.location.replace('/') // full reload: o servidor passa a ver a sessão de perfil
        return
      }
      toast.error('Não foi possível entrar nesse perfil. Tente de novo.')
    } catch {
      toast.error('Falha de rede. Verifique a conexão e tente entrar novamente.')
    } finally {
      setBusy(false)
    }
  }

  function openParentArea() {
    // Portão já aberto (senha verificada há pouco) → gerencia direto.
    if (verified) {
      setManaging(true)
      return
    }
    // Caso contrário, SEMPRE pede a senha (a criança pode estar logada na conta).
    setGate(true)
  }

  async function exitToParent(password: string) {
    setBusy(true)
    try {
      const res = await fetch('/api/profile-session/exit', {
        method: 'POST',
        headers: JSON_HEADERS,
        body: JSON.stringify({ password }),
      })
      if (res.ok) {
        // recarrega como sessão da conta (portão aberto); `?manage=1` já abre a gestão.
        window.location.replace('/perfis?manage=1')
        return
      }
      toast.error(
        res.status === 401 ? 'Senha incorreta.' : 'Não foi possível abrir a área dos pais.',
      )
    } catch {
      toast.error('Falha de rede. Verifique a conexão e tente novamente.')
    } finally {
      setBusy(false)
    }
  }

  async function verifyParent(password: string) {
    setBusy(true)
    try {
      const res = await fetch('/api/parents/verify', {
        method: 'POST',
        headers: JSON_HEADERS,
        body: JSON.stringify({ password }),
      })
      if (res.ok) {
        setGate(false)
        setVerified(true) // portão aberto no servidor (cookie) — não pedir a senha de novo nesta sessão
        setManaging(true) // portão aberto no servidor (cookie) → libera a gestão
        return
      }
      toast.error(
        res.status === 401 ? 'Senha incorreta.' : 'Não foi possível abrir a área dos pais.',
      )
    } catch {
      toast.error('Falha de rede. Verifique a conexão e tente novamente.')
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
    setBusy(true)
    // Campos parent-only: o auth recusa birthDate/publicProfileEnabled em sessão de perfil.
    // Desde 04/08 o CREATE também leva o opt-in de perfil público (o pai decide no
    // primeiro preenchimento; auth/shell aceitam o campo no mesmo lote).
    try {
      const payload = { name, birthDate, publicProfileEnabled }
      const res = existing
        ? await fetch(`/api/profiles/${existing.id}`, {
            method: 'PATCH',
            headers: JSON_HEADERS,
            body: JSON.stringify(payload),
          })
        : await fetch('/api/profiles', {
            method: 'POST',
            headers: JSON_HEADERS,
            body: JSON.stringify(payload),
          })
      const body = (await res.json().catch(() => null)) as {
        profile?: ProfileView
        error?: { code?: string }
      } | null
      if (res.ok && body?.profile) {
        const saved = body.profile
        setProfiles((prev) =>
          existing ? prev.map((p) => (p.id === saved.id ? saved : p)) : [...prev, saved],
        )
        if (!existing) {
          setProfileCreatedDuringGuide(true)
          if (guideKey && !guideDismissed) {
            trackOnboardingEvent({ audience: 'parent', action: 'profile_created', step: 'profile' })
          }
        }
        setEditing(null)
        return
      }
      if (res.status === 409) toast.error('Você atingiu o limite de perfis do seu plano.')
      else if (res.status === 403) toast.error('Abra a área dos pais para gerenciar os perfis.')
      else if (body?.error?.code === 'PROFILE_AGE_RESTRICTED') {
        toast.error(
          `${PROFILE_AGE_ERROR_MESSAGE} Para conhecer a comunidade de adultos, fale com a gente no Instagram @criecomhelenaejulio.`,
        )
      } else toast.error('Não foi possível salvar o perfil.')
    } catch {
      toast.error('Falha de rede. O perfil não foi salvo; tente novamente.')
    } finally {
      setBusy(false)
    }
  }

  // Remoção em DOIS passos: o botão abre um modal de confirmação (Dialog acessível — sem
  // `window.confirm`, que é off-brand, não anunciado e suprimível pelo navegador).
  async function confirmArchive() {
    const p = removing
    if (!p) return
    setBusy(true)
    try {
      const res = await fetch(`/api/profiles/${p.id}`, { method: 'DELETE' })
      if (res.ok) {
        setRemoving(null)
        setProfiles((prev) => prev.filter((x) => x.id !== p.id))
        setEditing(null)
        return
      }
      toast.error('Não foi possível remover o perfil.')
    } catch {
      toast.error('Falha de rede. O perfil não foi removido; tente novamente.')
    } finally {
      setBusy(false)
    }
  }

  // A lista muda no cliente após arquivar. Reaplicar aqui as mesmas fronteiras do
  // Server Component impede uma tela vazia e um passo `plus` sem botão disponível.
  if (profiles.length === 0 && profileAllowance.kind === 'unavailable') {
    return <ProfilesUnavailable reason="allowance" />
  }
  if (profiles.length === 0 && profileAllowance.kind === 'none') {
    return <ProfilesNotIncluded />
  }

  if (editing) {
    return (
      <>
        <ProfileForm
          editing={editing}
          busy={busy}
          showGuideHint={visibleGuideStep === 'form'}
          onCancel={() => setEditing(null)}
          onSave={saveProfile}
          onArchive={(p) => setRemoving(p)}
        />
        <Dialog
          open={removing !== null}
          onClose={() => {
            if (!busy) setRemoving(null)
          }}
          title="Remover perfil"
          footer={
            <>
              <Button variant="secondary" onClick={() => setRemoving(null)} disabled={busy}>
                Cancelar
              </Button>
              <Button variant="destructive" onClick={() => void confirmArchive()} disabled={busy}>
                {busy ? 'Removendo…' : 'Remover'}
              </Button>
            </>
          }
        >
          <p className="text-muted-foreground text-sm">
            Remover o perfil de <strong className="text-foreground">{removing?.name}</strong>? O
            progresso fica guardado.
          </p>
        </Dialog>
      </>
    )
  }

  if (showPurchases) {
    return <PurchasesView onBack={() => setShowPurchases(false)} />
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-5xl flex-col items-center justify-center gap-8 px-4 py-12">
      <div className="flex flex-col items-center gap-3 text-center">
        <KidsMascot expression="happy" className="size-20" />
        <h1 className="sz-display text-3xl text-foreground sm:text-4xl">
          {managing ? 'Gerenciar perfis' : 'Quem vai aprender hoje?'}
        </h1>
      </div>

      <ul className="flex flex-wrap items-start justify-center gap-6">
        {profiles.map((p, index) => (
          <GuideTargetItem key={p.id}>
            <ProfileTile
              profile={p}
              photoUrl={avatarPhotoByProfile[p.id] ?? null}
              managing={managing}
              disabled={busy}
              onSelect={() => selectProfile(p.id)}
              onEdit={() => setEditing({ mode: 'edit', profile: p })}
              buttonRef={index === 0 ? firstProfileRef : undefined}
              ariaDescribedBy={
                visibleGuideStep === 'tile' && index === 0 ? 'parent-profile-tile-guide' : undefined
              }
            />
            {visibleGuideStep === 'tile' && index === 0 ? (
              <GuideBalloon
                arrow="up"
                onDismiss={completeGuide}
                mobileFloating
                descriptionId="parent-profile-tile-guide"
              >
                Tudo pronto! Quando <strong>{p.name}</strong> for estudar, é só tocar nesta bolinha.
                😉
              </GuideBalloon>
            ) : null}
          </GuideTargetItem>
        ))}
        {managing && canCreateProfile ? (
          <GuideTargetItem>
            <button
              type="button"
              aria-describedby={
                visibleGuideStep === 'plus' ? 'parent-add-profile-guide' : undefined
              }
              disabled={busy}
              onClick={() => setEditing({ mode: 'create' })}
              className="kid-pop flex w-28 flex-col items-center gap-2 rounded-2xl p-2 disabled:opacity-50"
            >
              <span className="flex size-20 items-center justify-center rounded-full border-2 border-border border-dashed text-muted-foreground">
                <Plus className="size-8" />
              </span>
              <span className="font-semibold text-muted-foreground text-sm">Adicionar</span>
            </button>
            {visibleGuideStep === 'plus' ? (
              <GuideBalloon arrow="up" mobileFloating descriptionId="parent-add-profile-guide">
                Toque em <strong>Adicionar</strong> para criar o perfil da criança.
              </GuideBalloon>
            ) : null}
          </GuideTargetItem>
        ) : null}
      </ul>

      {/* Limite do plano: feedback claro na área dos pais (a trava real é o servidor). */}
      {managing && unlimitedProfiles ? (
        <p className="text-center text-muted-foreground text-sm">Perfis ilimitados neste acesso.</p>
      ) : managing && maxProfiles != null ? (
        <p className="text-center text-muted-foreground text-sm">
          {atProfileLimit ? (
            <>
              Você usou todos os <strong>{maxProfiles}</strong>{' '}
              {maxProfiles === 1 ? 'perfil' : 'perfis'} do seu plano. Para liberar mais,{' '}
              <a
                href={COMUNIDADE_OFERTA_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-primary underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2"
              >
                amplie o seu acesso
              </a>
              .
            </>
          ) : (
            <>
              {profiles.length} de {maxProfiles} {maxProfiles === 1 ? 'perfil' : 'perfis'} do seu
              plano.
            </>
          )}
        </p>
      ) : managing && profileAllowance.kind === 'none' ? (
        <p className="text-center text-muted-foreground text-sm">
          Seu acesso atual não inclui novos perfis.{' '}
          <a
            href={COMUNIDADE_OFERTA_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-primary underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2"
          >
            Conheça a Comunidade dos Criadores
          </a>
          .
        </p>
      ) : managing && profileAllowance.kind === 'unavailable' ? (
        <div className="flex flex-col items-center gap-2 text-center text-muted-foreground text-sm">
          <p>Não foi possível verificar novas vagas agora.</p>
          <Button variant="ghost" size="sm" onClick={() => window.location.reload()}>
            <RefreshCw className="size-4" /> Tentar de novo
          </Button>
        </div>
      ) : null}

      {managing ? <ChildrenDashboard avatarPhotoByProfile={avatarPhotoByProfile} /> : null}
      {/* IRMÃO do dashboard, não filho: aquele some quando não há filhos, e a
          ajuda de IA é da CONTA — precisa aparecer de qualquer jeito. */}
      {managing ? <FamilyAiCredits /> : null}
      {managing ? <ParentSupportCard /> : null}

      <div className="flex flex-wrap items-end justify-center gap-3">
        {managing ? (
          <>
            <Button variant="ghost" onClick={() => setShowPurchases(true)} disabled={busy}>
              <Receipt className="size-4" /> Minhas compras
            </Button>
            {/* Senha É da CONTA (não do perfil): só aqui, na sessão do responsável. */}
            <Button variant="ghost" onClick={() => setChangingPassword(true)} disabled={busy}>
              Alterar senha do responsável
            </Button>
            <ParentConcludeTarget
              created={visibleGuideStep === 'conclude-created'}
              showGuide={visibleGuideStep === 'conclude' || visibleGuideStep === 'conclude-created'}
              busy={busy}
              onConclude={concludeManaging}
            />
          </>
        ) : (
          <div className="flex w-36 shrink-0 flex-col items-center gap-3">
            {visibleGuideStep === 'welcome-area' ? (
              <GuideBalloon arrow="down" mobileFloating descriptionId="parent-area-guide">
                Toque em <strong>Área dos pais</strong> e digite a sua senha para criar o perfil da
                criança.
              </GuideBalloon>
            ) : null}
            {/* `outline` (não `ghost`): é a ação da tela e precisa parecer botão. */}
            <Button
              ref={parentAreaRef}
              variant="outline"
              onClick={openParentArea}
              disabled={busy}
              aria-describedby={
                visibleGuideStep === 'welcome-area' ? 'parent-area-guide' : undefined
              }
            >
              Área dos pais
            </Button>
          </div>
        )}
        {/* Reabre o tutorial a qualquer momento (precedente: "📋 Combinados" do Clube). */}
        {guideKey && !managing ? <GuideReopenButton onClick={reopenGuide} /> : null}
        {/* Sempre disponível: evita ficar preso na grade sem saber a senha dos pais. */}
        <ProfileLogoutButton disabled={busy} onLoggingChange={setBusy} />
      </div>

      {gate ? (
        // Sessão de perfil → sai do perfil (volta à conta, valida a senha no auth);
        // sessão de conta → verifica a senha e abre o portão sem recarregar.
        <ParentGateDialog
          busy={busy}
          onCancel={() => setGate(false)}
          onConfirm={isProfileSession ? exitToParent : verifyParent}
        />
      ) : null}
      {changingPassword ? (
        <ParentPasswordChange onCancel={() => setChangingPassword(false)} />
      ) : null}
      <GuideWelcomeDialog
        open={welcomeOpen}
        onClose={() => closeWelcome('welcome_dismissed')}
        onContinue={() => closeWelcome('welcome_completed')}
        onSkip={skipGuide}
        title="Que bom ter você aqui!"
        description={
          profiles.length === 0
            ? 'Em três passos a criança já começa a estudar:'
            : 'Veja como escolher e acompanhar as crianças:'
        }
        steps={welcomeSteps}
      />
    </main>
  )
}
