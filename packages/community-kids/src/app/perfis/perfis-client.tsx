'use client'

import { type AiCreditsView, diaCivilPorExtenso } from '@sistemazero/core/ai-credits'
import { UserAvatar } from '@sistemazero/member-shell/components/user-avatar'
import { Button } from '@sistemazero/ui/button'
import { Dialog } from '@sistemazero/ui/dialog'
import { Skeleton } from '@sistemazero/ui/skeleton'
import { Spinner } from '@sistemazero/ui/spinner'
import {
  ArrowLeft,
  Award,
  BookOpenCheck,
  Flame,
  Gamepad2,
  Plus,
  QrCode,
  Receipt,
  RefreshCw,
  Sparkles,
  Star,
  Trophy,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { GameCardDialog } from '@/components/kids/game-card-dialog'
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
import { apiGet, apiSend } from '@/lib/api'
import { formatCentsStr, formatDate } from '@/lib/format'
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
import { canAddProfile, type ProfileAllowance } from '@/lib/profile-allowance'
import {
  type ChildDashboardView,
  type ChildWeekGameView,
  type ChildWeekStatsView,
  type MySubscriptionView,
  nextChargeDate,
  PAYMENT_METHOD_LABELS,
  PAYMENT_STATUS_LABELS,
  type Paginated,
  type ParentReportPrefsView,
  type PaymentView,
  type ProfileView,
  SUBSCRIPTION_STATUS_LABELS,
} from '@/lib/types'

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
      const body = (await res.json().catch(() => null)) as { profile?: ProfileView } | null
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
      else toast.error('Não foi possível salvar o perfil.')
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

/**
 * Resumo de progresso de cada filho (área dos pais). Busca `/api/parents/children-stats`
 * ao montar — só renderiza no modo gestão, atrás do portão de senha. Esqueleto no load;
 * falha é best-effort (some sem quebrar a gestão de perfis).
 */
/**
 * Quanta ajuda de IA a família já usou no mês. Fica na área dos pais porque é
 * quem paga a conta e quem media a briga de irmão — a criança vê o próprio
 * medidor dentro do Zappy/Pensa.
 *
 * NÃO quebra por criança de propósito: o pote é um só (a quota é da CONTA), e
 * inventar um recorte por perfil seria mentira. Best-effort como o dashboard:
 * falhou, o bloco some.
 */
function FamilyAiCredits() {
  const [view, setView] = useState<AiCreditsView | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let alive = true
    fetch('/api/parents/ai-credits')
      .then((res) => (res.ok ? res.json() : Promise.reject(res)))
      .then((data: { credits: AiCreditsView | null }) => {
        if (alive && data.credits) setView(data.credits)
        else if (alive) setFailed(true)
      })
      .catch(() => {
        if (alive) setFailed(true)
      })
    return () => {
      alive = false
    }
  }, [])

  if (failed || !view) return null
  // Equipe não tem teto: um painel de consumo aqui não diria nada.
  if (view.unlimited) return null

  const usadoMes = view.monthLimit - view.monthRemaining
  const usadoHoje = view.dayLimit - view.dayRemaining
  const pct = Math.min(100, Math.round((usadoMes / view.monthLimit) * 100))
  return (
    <section className="w-full max-w-2xl">
      <h2 className="sz-display mb-3 text-center text-foreground text-xl">Ajuda da IA neste mês</h2>
      <div className="rounded-2xl border-2 border-border bg-card p-4">
        <div
          className="sz-progress"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={view.monthLimit}
          aria-valuenow={usadoMes}
          aria-label={`${usadoMes} de ${view.monthLimit} usados neste mês`}
        >
          <span style={{ width: `${pct}%` }} />
        </div>
        <p className="mt-2 font-bold text-foreground text-sm tabular-nums">
          {usadoMes} de {view.monthLimit}
        </p>
        <p className="text-muted-foreground text-xs">
          Renova em {diaCivilPorExtenso(view.monthRenewsOn)} · Hoje: {usadoHoje} de {view.dayLimit}
        </p>
        <p className="mt-1 text-muted-foreground text-xs">
          As crianças da família dividem o mesmo total.
        </p>
      </div>
    </section>
  )
}

function ChildrenDashboard({
  avatarPhotoByProfile,
}: {
  avatarPhotoByProfile: Record<string, string | null>
}) {
  const [children, setChildren] = useState<ChildDashboardView[] | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let alive = true
    fetch('/api/parents/children-stats')
      .then((res) => (res.ok ? res.json() : Promise.reject(res)))
      .then((data: { children: ChildDashboardView[] }) => {
        if (alive) setChildren(data.children)
      })
      .catch(() => {
        if (alive) setFailed(true)
      })
    return () => {
      alive = false
    }
  }, [])

  if (failed) return null
  if (children !== null && children.length === 0) return null

  return (
    <section className="w-full max-w-2xl">
      <h2 className="sz-display mb-3 text-center text-foreground text-xl">Progresso dos filhos</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        {children === null
          ? [0, 1].map((i) => <Skeleton key={i} className="h-32 rounded-2xl" />)
          : children.map((c) => (
              <ChildStatsCard
                key={c.profileId}
                child={c}
                photoUrl={avatarPhotoByProfile[c.profileId] ?? null}
              />
            ))}
      </div>
      <WeeklyReportToggle />
    </section>
  )
}

/**
 * Opt-out do resumo semanal por e-mail (toda sexta no fim da tarde). A preferência
 * vive no members por CONTA (`/api/parents/report-prefs`, atrás do portão de senha).
 * Falha ao carregar → o bloco some (best-effort, como o resto do dashboard).
 */
function WeeklyReportToggle() {
  const [prefs, setPrefs] = useState<ParentReportPrefsView | null>(null)
  const [failed, setFailed] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let alive = true
    fetch('/api/parents/report-prefs')
      .then((res) => (res.ok ? res.json() : Promise.reject(res)))
      .then((data: ParentReportPrefsView) => {
        if (alive) setPrefs(data)
      })
      .catch(() => {
        if (alive) setFailed(true)
      })
    return () => {
      alive = false
    }
  }, [])

  async function toggle(receive: boolean) {
    setSaving(true)
    try {
      const res = await fetch('/api/parents/report-prefs', {
        method: 'PUT',
        headers: JSON_HEADERS,
        body: JSON.stringify({ disabled: !receive }),
      })
      if (!res.ok) throw new Error('save failed')
      setPrefs((await res.json()) as ParentReportPrefsView)
    } catch {
      toast.error('Não foi possível salvar. Tente de novo.')
    } finally {
      setSaving(false)
    }
  }

  if (failed || prefs === null) return null

  return (
    <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-2xl border-2 border-border bg-card p-4">
      <input
        type="checkbox"
        checked={!prefs.disabled}
        disabled={saving}
        onChange={(e) => void toggle(e.target.checked)}
        className="mt-0.5 size-5 accent-[color:var(--primary)]"
      />
      <span className="min-w-0">
        <span className="block font-semibold text-foreground text-sm">
          Receber o resumo da semana por e-mail
        </span>
        <span className="block text-muted-foreground text-xs">
          Toda sexta no fim da tarde enviamos como foi a semana das crianças.
        </span>
      </span>
    </label>
  )
}

/** Card de stats de um filho (XP/ofensiva/medalhas/projetos/cursos + ranking). */
function ChildStatsCard({
  child,
  photoUrl,
}: {
  child: ChildDashboardView
  photoUrl: string | null
}) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border-2 border-border bg-card p-4">
      <div className="flex items-center gap-3">
        <UserAvatar avatarUrl={photoUrl} firstName={child.name} size="lg" />
        <div className="min-w-0">
          <p className="truncate font-semibold text-foreground">{child.name}</p>
          {child.rankingPosition !== null ? (
            <p className="flex items-center gap-1 text-muted-foreground text-xs">
              <Trophy className="size-3.5 text-[color:var(--sz-hot)]" />
              {child.rankingPosition}º no ranking kids
            </p>
          ) : null}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
        <Stat icon={<Star className="size-4 text-primary" />} label="XP" value={child.xp} />
        <Stat
          icon={<Flame className="size-4 text-[color:var(--sz-hot)]" />}
          label="dias de ofensiva"
          value={child.streak.current}
        />
        <Stat
          icon={<Award className="size-4 text-primary" />}
          label="medalhas"
          value={child.badgesCount}
        />
        <Stat
          icon={<Sparkles className="size-4 text-primary" />}
          label="projetos"
          value={child.projectsCount}
        />
        <Stat
          icon={<BookOpenCheck className="size-4 text-primary" />}
          label="cursos concluídos"
          value={child.coursesCompleted}
        />
        <Stat
          icon={<BookOpenCheck className="size-4 text-muted-foreground" />}
          label="em andamento"
          value={child.coursesInProgress}
        />
      </div>
      {child.week ? <ChildWeekBlock week={child.week} games={child.games ?? null} /> : null}
    </div>
  )
}

/**
 * "Esta semana" do filho (semana corrente parcial, seg até agora): destaques em uma
 * linha + jogos publicados no Mural com o cartão QR imprimível. `games` nulo = hub
 * indisponível na hora (o bloco degrada só para os números).
 */
function ChildWeekBlock({
  week,
  games,
}: {
  week: ChildWeekStatsView
  games: ChildWeekGameView[] | null
}) {
  const [cardGame, setCardGame] = useState<ChildWeekGameView | null>(null)

  const parts: string[] = []
  if (week.xpEarned > 0) parts.push(`+${week.xpEarned} XP`)
  if (week.lessonsCompleted > 0)
    parts.push(
      week.lessonsCompleted === 1
        ? '1 aula concluída'
        : `${week.lessonsCompleted} aulas concluídas`,
    )
  if (week.quizzesPassed > 0)
    parts.push(
      week.quizzesPassed === 1 ? '1 quiz aprovado' : `${week.quizzesPassed} quizzes aprovados`,
    )
  if (week.badgesUnlocked > 0)
    parts.push(
      week.badgesUnlocked === 1 ? '1 medalha nova' : `${week.badgesUnlocked} medalhas novas`,
    )
  if (week.projectsSubmitted > 0)
    parts.push(
      week.projectsSubmitted === 1
        ? '1 projeto enviado'
        : `${week.projectsSubmitted} projetos enviados`,
    )

  const weekGames = games ?? []

  return (
    <div className="rounded-xl border border-border bg-background/60 p-3">
      <p className="mb-1 font-bold text-foreground text-xs uppercase tracking-wide">Esta semana</p>
      {parts.length > 0 ? (
        <p className="text-foreground text-sm">{parts.join(' · ')}</p>
      ) : (
        <p className="text-muted-foreground text-sm">Sem novidades por enquanto.</p>
      )}
      {weekGames.length > 0 ? (
        <ul className="mt-2 flex flex-col gap-1.5">
          {weekGames.map((g) => (
            <li key={`${g.playId ?? g.title}:${g.publishedAt}`} className="flex items-center gap-2">
              <Gamepad2 className="size-4 shrink-0 text-primary" />
              <span className="min-w-0 flex-1 truncate text-foreground text-sm">{g.title}</span>
              {g.playId ? (
                <button
                  type="button"
                  onClick={() => setCardGame(g)}
                  className="inline-flex min-h-8 items-center gap-1 rounded-full border border-border px-2.5 font-semibold text-muted-foreground text-xs"
                >
                  <QrCode className="size-3.5" /> Cartão
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
      {cardGame?.playId ? (
        <GameCardDialog
          title={cardGame.title}
          playUrl={`/jogar/${cardGame.playId}`}
          onClose={() => setCardGame(null)}
        />
      ) : null}
    </div>
  )
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="flex items-center gap-2">
      {icon}
      <span className="font-bold text-foreground">{value}</span>
      <span className="text-muted-foreground text-xs">{label}</span>
    </div>
  )
}

/**
 * "Minhas compras" do RESPONSÁVEL (área dos pais). Lista paginada por "Carregar mais"
 * (busca `/api/payments/my`, gateada pela senha no shim). É da CONTA — fica aqui, não
 * no menu da criança.
 */
function PurchasesView({ onBack }: { onBack: () => void }) {
  const [items, setItems] = useState<PaymentView[] | null>(null)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)

  const load = useCallback(async (offset: number) => {
    setLoading(true)
    try {
      const page = await apiGet<Paginated<PaymentView>>(
        `/api/payments/my?limit=20&offset=${offset}`,
      )
      setItems((prev) => (offset === 0 ? page.items : [...(prev ?? []), ...page.items]))
      setTotal(page.total)
    } catch {
      toast.error('Não foi possível carregar as compras.')
      setItems((prev) => prev ?? [])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load(0)
  }, [load])

  return (
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col gap-6 px-4 py-12">
      <div>
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft className="size-4" /> Voltar
        </Button>
      </div>
      <div>
        <h1 className="sz-display text-2xl text-foreground">Minhas compras</h1>
        <p className="mt-1 text-muted-foreground text-sm">
          Histórico das compras feitas com o e-mail desta conta.
        </p>
      </div>

      <ParentSubscriptions />

      {items === null ? (
        <div className="flex flex-col gap-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-20 rounded-2xl" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-2xl border-2 border-border border-dashed py-12 text-center">
          <Receipt className="size-8 text-muted-foreground" />
          <p className="font-semibold text-foreground">Nenhuma compra ainda</p>
          <p className="text-muted-foreground text-sm">
            As compras feitas com o e-mail desta conta aparecem aqui.
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {items.map((p) => (
            <PurchaseCard key={p.id} payment={p} />
          ))}
        </ul>
      )}

      {items && items.length < total ? (
        <Button variant="secondary" onClick={() => void load(items.length)} disabled={loading}>
          {loading ? <Spinner className="size-4" /> : 'Carregar mais'}
        </Button>
      ) : null}
    </main>
  )
}

/**
 * Assinaturas do RESPONSÁVEL (área dos pais): status, valor por período, próxima
 * cobrança derivada e cancelamento com confirmação — o acesso continua até o fim
 * do período já pago (o texto deixa claro). Some quando não há assinaturas.
 */
function ParentSubscriptions() {
  const [subs, setSubs] = useState<MySubscriptionView[]>([])
  const [confirming, setConfirming] = useState<MySubscriptionView | null>(null)
  const [canceling, setCanceling] = useState(false)

  const load = useCallback(async () => {
    try {
      const data = await apiGet<{ items: MySubscriptionView[] }>('/api/payments/my/subscriptions')
      setSubs(data.items)
    } catch {
      // Sem assinaturas em falha — o histórico de compras segue útil.
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  async function cancel(sub: MySubscriptionView) {
    setCanceling(true)
    try {
      await apiSend(`/api/payments/my/subscriptions/${sub.id}`, 'DELETE')
      toast.success('Assinatura cancelada. O acesso continua até o fim do período já pago.')
      setConfirming(null)
      await load()
    } catch {
      toast.error('Não foi possível cancelar. Tente novamente.')
    } finally {
      setCanceling(false)
    }
  }

  if (subs.length === 0) return null

  return (
    <section className="flex flex-col gap-3">
      <h2 className="font-semibold text-foreground text-sm">Assinaturas</h2>
      <ul className="flex flex-col gap-3">
        {subs.map((sub) => {
          const next = nextChargeDate(sub)
          const suffix = sub.intervalMonths === 12 ? '/ano' : sub.intervalMonths === 1 ? '/mês' : ''
          return (
            <li
              key={sub.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border-2 border-border bg-card p-4"
            >
              <div className="min-w-0">
                <p className="font-semibold text-foreground">{sub.description ?? 'Assinatura'}</p>
                <p className="mt-0.5 text-muted-foreground text-sm">
                  <span className="sz-display">
                    {formatCentsStr(sub.amountInCents)}
                    {suffix}
                  </span>
                  {' · '}
                  {sub.card.brand.toUpperCase()} •••• {sub.card.last4}
                  {next ? ` · próxima cobrança ~${formatDate(next.toISOString())}` : null}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`font-semibold text-sm ${sub.status === 'ACTIVE' ? 'text-primary' : 'text-muted-foreground'}`}
                >
                  {SUBSCRIPTION_STATUS_LABELS[sub.status] ?? sub.status}
                </span>
                {sub.status === 'ACTIVE' ? (
                  <Button variant="outline" size="sm" onClick={() => setConfirming(sub)}>
                    Cancelar
                  </Button>
                ) : null}
              </div>
            </li>
          )
        })}
      </ul>

      {confirming ? (
        <Dialog
          open
          onClose={() => (canceling ? null : setConfirming(null))}
          title="Cancelar assinatura?"
          description={confirming.description ?? undefined}
          footer={
            <>
              <Button variant="outline" onClick={() => setConfirming(null)} disabled={canceling}>
                Manter assinatura
              </Button>
              <Button
                variant="destructive"
                onClick={() => void cancel(confirming)}
                disabled={canceling}
              >
                {canceling ? 'Cancelando…' : 'Cancelar assinatura'}
              </Button>
            </>
          }
        >
          <p className="text-muted-foreground text-sm">
            Você não será cobrado de novo, e o{' '}
            <strong>acesso continua até o fim do período já pago</strong>. Depois disso, a
            plataforma fica indisponível até uma nova assinatura.
          </p>
        </Dialog>
      ) : null}
    </section>
  )
}

const STATUS_TONE: Record<string, string> = {
  PAID: 'text-primary',
  PENDING: 'text-[color:var(--sz-hot)]',
  FAILED: 'text-destructive',
  EXPIRED: 'text-destructive',
  CANCELED: 'text-muted-foreground',
  REFUNDED: 'text-muted-foreground',
}

/** Card de uma compra (descrição + data/método + valor + status). */
function PurchaseCard({ payment }: { payment: PaymentView }) {
  return (
    <li className="flex items-center justify-between gap-3 rounded-2xl border-2 border-border bg-card p-4">
      <div className="min-w-0">
        <p className="truncate font-semibold text-foreground">{payment.description ?? 'Compra'}</p>
        <p className="text-muted-foreground text-xs">
          {formatDate(payment.paidAt ?? payment.createdAt)} ·{' '}
          {PAYMENT_METHOD_LABELS[payment.method] ?? payment.method}
        </p>
      </div>
      <div className="shrink-0 text-right">
        <p className="sz-display text-foreground">{formatCentsStr(payment.amountInCents)}</p>
        <span
          className={`font-semibold text-xs ${STATUS_TONE[payment.status] ?? 'text-muted-foreground'}`}
        >
          {PAYMENT_STATUS_LABELS[payment.status] ?? payment.status}
        </span>
      </div>
    </li>
  )
}

/** Um rostinho da grade: selecionar (modo normal) ou editar (modo gestão). */
