'use client'

import { UserAvatar } from '@sistemazero/member-shell/components/user-avatar'
import { Button } from '@sistemazero/ui/button'
import { Dialog } from '@sistemazero/ui/dialog'
import { Input } from '@sistemazero/ui/input'
import { Field } from '@sistemazero/ui/label'
import { PasswordInput } from '@sistemazero/ui/password-input'
import { Skeleton } from '@sistemazero/ui/skeleton'
import { Spinner } from '@sistemazero/ui/spinner'
import {
  ArrowLeft,
  Award,
  BookOpenCheck,
  Flame,
  Pencil,
  Plus,
  Receipt,
  Sparkles,
  Star,
  Trash2,
  Trophy,
} from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { KidsMascot } from '@/components/kids/mascot'
import { apiGet } from '@/lib/api'
import { formatCentsStr, formatDate } from '@/lib/format'
import {
  type ChildDashboardView,
  PAYMENT_METHOD_LABELS,
  PAYMENT_STATUS_LABELS,
  type Paginated,
  type PaymentView,
  type ProfileView,
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
  isProfileSession,
  parentVerified,
  startManaging = false,
  maxProfiles,
}: {
  initialProfiles: ProfileView[]
  isProfileSession: boolean
  parentVerified: boolean
  startManaging?: boolean
  /** Teto de perfis do plano (matrícula kids). `null` = desconhecido → não trava a UI. */
  maxProfiles: number | null
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

  // Atingiu o teto do plano? (`maxProfiles` nulo = desconhecido → não trava a UI; o
  // servidor segue como rede de segurança, 409 ao salvar.)
  const atProfileLimit = maxProfiles != null && profiles.length >= maxProfiles

  // Entrou na gestão pelo `?manage=1` (logo após "Área dos pais" sair de um perfil):
  // limpa o parâmetro da URL p/ um refresh depois de "Concluir" não reabrir sozinho.
  useEffect(() => {
    if (startManaging) window.history.replaceState(null, '', '/perfis')
  }, [startManaging])

  async function selectProfile(id: string) {
    if (busy) return
    setBusy(true)
    const res = await fetch(`/api/profiles/${id}/select`, { method: 'POST' })
    if (res.ok) {
      window.location.replace('/') // full reload: o servidor passa a ver a sessão de perfil
      return
    }
    setBusy(false)
    toast.error('Não foi possível entrar nesse perfil. Tente de novo.')
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
    const res = await fetch('/api/profile-session/exit', {
      method: 'POST',
      headers: JSON_HEADERS,
      body: JSON.stringify({ password }),
    })
    setBusy(false)
    if (res.ok) {
      // recarrega como sessão da conta (portão aberto); `?manage=1` já abre a gestão.
      window.location.replace('/perfis?manage=1')
      return
    }
    toast.error(res.status === 401 ? 'Senha incorreta.' : 'Não foi possível abrir a área dos pais.')
  }

  async function verifyParent(password: string) {
    setBusy(true)
    const res = await fetch('/api/parents/verify', {
      method: 'POST',
      headers: JSON_HEADERS,
      body: JSON.stringify({ password }),
    })
    setBusy(false)
    if (res.ok) {
      setGate(false)
      setVerified(true) // portão aberto no servidor (cookie) — não pedir a senha de novo nesta sessão
      setManaging(true) // portão aberto no servidor (cookie) → libera a gestão
      return
    }
    toast.error(res.status === 401 ? 'Senha incorreta.' : 'Não foi possível abrir a área dos pais.')
  }

  async function saveProfile(
    name: string,
    birthDate: string | null,
    publicProfileEnabled: boolean,
    existing?: ProfileView,
  ) {
    setBusy(true)
    // Campos parent-only: o auth recusa birthDate/publicProfileEnabled em sessão de perfil.
    const payload = existing ? { name, birthDate, publicProfileEnabled } : { name, birthDate }
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
    setBusy(false)
    if (res.ok && body?.profile) {
      const saved = body.profile
      setProfiles((prev) =>
        existing ? prev.map((p) => (p.id === saved.id ? saved : p)) : [...prev, saved],
      )
      setEditing(null)
      return
    }
    if (res.status === 409) toast.error('Você atingiu o limite de perfis do seu plano.')
    else if (res.status === 403) toast.error('Abra a área dos pais para gerenciar os perfis.')
    else toast.error('Não foi possível salvar o perfil.')
  }

  // Remoção em DOIS passos: o botão abre um modal de confirmação (Dialog acessível — sem
  // `window.confirm`, que é off-brand, não anunciado e suprimível pelo navegador).
  async function confirmArchive() {
    const p = removing
    if (!p) return
    setBusy(true)
    const res = await fetch(`/api/profiles/${p.id}`, { method: 'DELETE' })
    setBusy(false)
    setRemoving(null)
    if (res.ok) {
      setProfiles((prev) => prev.filter((x) => x.id !== p.id))
      setEditing(null)
      return
    }
    toast.error('Não foi possível remover o perfil.')
  }

  async function uploadAvatar(p: ProfileView, file: File) {
    setBusy(true)
    const form = new FormData()
    form.append('file', file)
    const res = await fetch(`/api/profiles/${p.id}/avatar`, { method: 'POST', body: form })
    const body = (await res.json().catch(() => null)) as { url?: string } | null
    setBusy(false)
    if (res.ok && body?.url) {
      const url = body.url
      setProfiles((prev) => prev.map((x) => (x.id === p.id ? { ...x, avatarUrl: url } : x)))
      setEditing((e) =>
        e?.mode === 'edit' && e.profile.id === p.id
          ? { mode: 'edit', profile: { ...e.profile, avatarUrl: url } }
          : e,
      )
      return
    }
    toast.error('Não foi possível trocar a foto.')
  }

  if (editing) {
    return (
      <>
        <ProfileForm
          editing={editing}
          busy={busy}
          onCancel={() => setEditing(null)}
          onSave={saveProfile}
          onArchive={(p) => setRemoving(p)}
          onAvatar={uploadAvatar}
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

      <ul className="flex flex-wrap justify-center gap-6">
        {profiles.map((p) => (
          <li key={p.id}>
            <ProfileTile
              profile={p}
              managing={managing}
              disabled={busy}
              onSelect={() => selectProfile(p.id)}
              onEdit={() => setEditing({ mode: 'edit', profile: p })}
            />
          </li>
        ))}
        {managing && !atProfileLimit ? (
          <li>
            <button
              type="button"
              disabled={busy}
              onClick={() => setEditing({ mode: 'create' })}
              className="kid-pop flex w-28 flex-col items-center gap-2 rounded-2xl p-2 disabled:opacity-50"
            >
              <span className="flex size-20 items-center justify-center rounded-full border-2 border-border border-dashed text-muted-foreground">
                <Plus className="size-8" />
              </span>
              <span className="font-semibold text-muted-foreground text-sm">Adicionar</span>
            </button>
          </li>
        ) : null}
      </ul>

      {/* Limite do plano: feedback claro na área dos pais (a trava real é o servidor). */}
      {managing && maxProfiles != null ? (
        <p className="text-center text-muted-foreground text-sm">
          {atProfileLimit ? (
            <>
              Você usou todos os <strong>{maxProfiles}</strong>{' '}
              {maxProfiles === 1 ? 'perfil' : 'perfis'} do seu plano. Para liberar mais, fale com a
              gente ou amplie o seu plano.
            </>
          ) : (
            <>
              {profiles.length} de {maxProfiles} {maxProfiles === 1 ? 'perfil' : 'perfis'} do seu
              plano.
            </>
          )}
        </p>
      ) : null}

      {managing ? <ChildrenDashboard /> : null}

      <div className="flex flex-wrap items-center justify-center gap-3">
        {managing ? (
          <>
            <Button variant="ghost" onClick={() => setShowPurchases(true)} disabled={busy}>
              <Receipt className="size-4" /> Minhas compras
            </Button>
            {/* Senha É da CONTA (não do perfil): só aqui, na sessão do responsável. */}
            <Button variant="ghost" onClick={() => setChangingPassword(true)} disabled={busy}>
              Alterar senha do responsável
            </Button>
            <Button variant="secondary" onClick={() => setManaging(false)} disabled={busy}>
              Concluir
            </Button>
          </>
        ) : (
          // `outline` (não `ghost`): a "Área dos pais" é a ação da tela e precisa PARECER
          // botão (borda + fundo), não texto solto.
          <Button variant="outline" onClick={openParentArea} disabled={busy}>
            Área dos pais
          </Button>
        )}
      </div>

      {gate ? (
        // Sessão de perfil → sai do perfil (volta à conta, valida a senha no auth);
        // sessão de conta → verifica a senha e abre o portão sem recarregar.
        <ParentGate
          busy={busy}
          onCancel={() => setGate(false)}
          onConfirm={isProfileSession ? exitToParent : verifyParent}
        />
      ) : null}
      {changingPassword ? (
        <ParentPasswordChange onCancel={() => setChangingPassword(false)} />
      ) : null}
    </main>
  )
}

/**
 * Resumo de progresso de cada filho (área dos pais). Busca `/api/parents/children-stats`
 * ao montar — só renderiza no modo gestão, atrás do portão de senha. Esqueleto no load;
 * falha é best-effort (some sem quebrar a gestão de perfis).
 */
function ChildrenDashboard() {
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
          : children.map((c) => <ChildStatsCard key={c.profileId} child={c} />)}
      </div>
    </section>
  )
}

/** Card de stats de um filho (XP/ofensiva/medalhas/projetos/cursos + ranking). */
function ChildStatsCard({ child }: { child: ChildDashboardView }) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border-2 border-border bg-card p-4">
      <div className="flex items-center gap-3">
        <UserAvatar avatarUrl={child.avatarUrl} firstName={child.name} size="lg" />
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
function ProfileTile({
  profile,
  managing,
  disabled,
  onSelect,
  onEdit,
}: {
  profile: ProfileView
  managing: boolean
  disabled: boolean
  onSelect: () => void
  onEdit: () => void
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={managing ? onEdit : onSelect}
      className="kid-pop group flex w-28 flex-col items-center gap-2 rounded-2xl p-2 disabled:opacity-50"
    >
      <span className="relative">
        <UserAvatar
          avatarUrl={profile.avatarUrl}
          firstName={profile.name}
          size="xl"
          className="size-20 ring-2 ring-transparent transition group-hover:ring-primary"
        />
        {managing ? (
          <span className="absolute inset-0 flex items-center justify-center rounded-full bg-foreground/40 text-background">
            <Pencil className="size-6" />
          </span>
        ) : null}
      </span>
      <span className="line-clamp-1 max-w-full font-semibold text-foreground text-sm">
        {profile.name}
      </span>
    </button>
  )
}

/** Formulário de criar/editar perfil (nome + foto + remover). */
function ProfileForm({
  editing,
  busy,
  onCancel,
  onSave,
  onArchive,
  onAvatar,
}: {
  editing: { mode: 'create' } | { mode: 'edit'; profile: ProfileView }
  busy: boolean
  onCancel: () => void
  onSave: (
    name: string,
    birthDate: string | null,
    publicProfileEnabled: boolean,
    existing?: ProfileView,
  ) => void
  onArchive: (p: ProfileView) => void
  onAvatar: (p: ProfileView, file: File) => void
}) {
  const isEdit = editing.mode === 'edit'
  const profile = isEdit ? editing.profile : null
  const [name, setName] = useState(profile?.name ?? '')
  const [birthDate, setBirthDate] = useState(profile?.birthDate ?? '')
  const [publicProfileEnabled, setPublicProfileEnabled] = useState(
    profile?.publicProfileEnabled ?? false,
  )
  const fileRef = useRef<HTMLInputElement>(null)
  // `max` do seletor = hoje (nascimento não pode ser no futuro).
  const today = new Date().toISOString().slice(0, 10)

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-6 px-4 py-12">
      <h1 className="sz-display text-2xl text-foreground">
        {isEdit ? 'Editar perfil' : 'Novo perfil'}
      </h1>

      {profile ? (
        <div className="flex items-center gap-4">
          <UserAvatar
            avatarUrl={profile.avatarUrl}
            firstName={profile.name || name}
            size="xl"
            className="size-20"
          />
          <div>
            <Button variant="secondary" disabled={busy} onClick={() => fileRef.current?.click()}>
              Trocar foto
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              hidden
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) onAvatar(profile, file)
                e.target.value = ''
              }}
            />
            <p className="mt-1 text-muted-foreground text-xs">PNG, JPG ou WebP, até 5MB.</p>
          </div>
        </div>
      ) : null}

      <Field label="Nome do perfil" htmlFor="profileName">
        <Input
          id="profileName"
          value={name}
          maxLength={60}
          placeholder="Ex.: Sofia"
          onChange={(e) => setName(e.target.value)}
        />
      </Field>

      <Field label="Data de nascimento da criança" htmlFor="profileBirthDate">
        <Input
          id="profileBirthDate"
          type="date"
          value={birthDate}
          max={today}
          onChange={(e) => setBirthDate(e.target.value)}
        />
        <p className="mt-1 text-muted-foreground text-xs">
          Só os responsáveis editam. Ajuda a gente a cuidar da idade certa. 💙
        </p>
      </Field>

      {profile ? (
        <label className="flex items-start gap-3 rounded-2xl border-2 border-border bg-card p-4">
          <input
            type="checkbox"
            checked={publicProfileEnabled}
            onChange={(e) => setPublicProfileEnabled(e.target.checked)}
            className="mt-1 size-4 accent-primary"
          />
          <span className="flex flex-col gap-1">
            <span className="font-semibold text-sm">Perfil público na comunidade kids</span>
            <span className="text-muted-foreground text-xs">
              Mostra nome, avatar, conquistas e quarto para outras crianças. Nunca mostra e-mail,
              telefone ou nascimento.
            </span>
          </span>
        </label>
      ) : null}

      <div className="flex items-center justify-between gap-3">
        {profile ? (
          <Button
            variant="ghost"
            disabled={busy}
            onClick={() => onArchive(profile)}
            className="text-destructive"
          >
            <Trash2 className="size-4" /> Remover
          </Button>
        ) : (
          <span />
        )}
        <div className="flex gap-3">
          <Button variant="secondary" onClick={onCancel} disabled={busy}>
            Cancelar
          </Button>
          <Button
            onClick={() =>
              onSave(name.trim(), birthDate || null, publicProfileEnabled, profile ?? undefined)
            }
            disabled={busy || name.trim().length === 0}
          >
            {busy ? <Spinner className="size-4" /> : 'Salvar'}
          </Button>
        </div>
      </div>
    </main>
  )
}

/**
 * Troca a senha da CONTA do responsável (Área dos pais — sessão da conta). É da
 * CONTA, não do perfil: por isso fica aqui e NÃO na página "Meu perfil" da criança.
 * Trocar a senha revoga TODAS as sessões no auth → re-login (navegação de documento).
 */
function ParentPasswordChange({ onCancel }: { onCancel: () => void }) {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const formId = 'parentPasswordChangeForm'

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (newPassword.length < 10) {
      setError('A nova senha precisa de ao menos 10 caracteres.')
      return
    }
    if (newPassword !== confirm) {
      setError('As senhas não coincidem.')
      return
    }
    setError(null)
    setSaving(true)
    try {
      const res = await fetch('/api/auth/me/password', {
        method: 'POST',
        headers: JSON_HEADERS,
        body: JSON.stringify({ currentPassword, newPassword }),
      })
      if (res.ok) {
        toast.success('Senha alterada! Entre novamente com a nova senha.')
        window.location.replace('/login')
        return
      }
      const data = (await res.json().catch(() => null)) as { error?: { code?: string } } | null
      setError(
        data?.error?.code === 'INVALID_CREDENTIALS'
          ? 'Senha atual incorreta.'
          : 'Não foi possível alterar a senha.',
      )
    } catch {
      setError('Falha de rede. Tente novamente.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog
      open
      onClose={() => {
        if (!saving) onCancel()
      }}
      title="Alterar senha do responsável"
      description="Por segurança, você será desconectado de todos os dispositivos."
      className="max-w-sm rounded-2xl"
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onCancel} disabled={saving}>
            Cancelar
          </Button>
          <Button type="submit" form={formId} disabled={saving || !currentPassword || !newPassword}>
            {saving ? <Spinner className="size-4" /> : 'Alterar'}
          </Button>
        </>
      }
    >
      <form id={formId} className="flex flex-col gap-4" onSubmit={onSubmit}>
        <Field label="Senha atual" htmlFor="currentPassword">
          <PasswordInput
            id="currentPassword"
            autoComplete="current-password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
          />
        </Field>
        <Field label="Nova senha" htmlFor="newPassword">
          <PasswordInput
            id="newPassword"
            autoComplete="new-password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
        </Field>
        <Field label="Confirmar nova senha" htmlFor="confirmPassword" error={error ?? undefined}>
          <PasswordInput
            id="confirmPassword"
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />
        </Field>
      </form>
    </Dialog>
  )
}

/** Gate da "área dos pais": pede a senha do responsável para sair do perfil. */
function ParentGate({
  busy,
  onCancel,
  onConfirm,
}: {
  busy: boolean
  onCancel: () => void
  onConfirm: (password: string) => void
}) {
  const [password, setPassword] = useState('')
  const formId = 'parentGateForm'
  return (
    <Dialog
      open
      onClose={() => {
        if (!busy) onCancel()
      }}
      title="Área dos pais"
      description="Digite a senha do responsável para gerenciar os perfis."
      className="max-w-sm rounded-2xl"
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onCancel} disabled={busy}>
            Cancelar
          </Button>
          <Button type="submit" form={formId} disabled={busy || password.length === 0}>
            {busy ? <Spinner className="size-4" /> : 'Entrar'}
          </Button>
        </>
      }
    >
      <form
        id={formId}
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault()
          if (password) onConfirm(password)
        }}
      >
        <Field label="Senha do responsável" htmlFor="parentPassword">
          <PasswordInput
            id="parentPassword"
            value={password}
            autoComplete="current-password"
            onChange={(e) => setPassword(e.target.value)}
          />
        </Field>
      </form>
    </Dialog>
  )
}
