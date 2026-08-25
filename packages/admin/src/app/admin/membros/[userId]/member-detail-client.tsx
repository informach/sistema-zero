'use client'

import { Button, buttonVariants } from '@sistemazero/ui/button'
import { Card } from '@sistemazero/ui/card'
import { Dialog } from '@sistemazero/ui/dialog'
import { Input } from '@sistemazero/ui/input'
import { Field } from '@sistemazero/ui/label'
import { Select } from '@sistemazero/ui/select'
import { Spinner } from '@sistemazero/ui/spinner'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@sistemazero/ui/table'
import { Textarea } from '@sistemazero/ui/textarea'
import { ArrowLeft, CreditCard, Inbox, LogIn, Mail, MailOpen, Pencil, Plus } from 'lucide-react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { AdminHeader } from '@/components/admin/admin-header'
import { GrantAccessDialog } from '@/components/admin/grant-access-dialog'
import { usePlatform } from '@/components/admin/platform-provider'
import { StatusBadge } from '@/components/admin/status-badge'
import { useConfirm } from '@/components/admin/use-confirm'
import { CourseProgressCard, ToolUsageGrid } from '@/components/members/usage-cards'
import { type ApiError, apiGet, apiSend } from '@/lib/api'
import { dateInputToSaoPauloEndOfDayIso } from '@/lib/dates'
import { entitlementBadge } from '@/lib/entitlement-status'
import { formatCentsStr, formatDate } from '@/lib/format'
import { canImpersonate, impersonationUrl } from '@/lib/impersonation'
import { createLatestAppendGuard } from '@/lib/latest-wins'
import { type LearnerSelection, resolveLearnerId } from '@/lib/learner-selection'
import { STUDENT_RANK_LABELS } from '@/lib/student-rank'
import { type MemberToolUsageView, ownedToolCards } from '@/lib/tool-usage'
import type {
  AdminEntitlementView,
  MemberActivityItemView,
  MemberActivityPage,
  MemberCertificateView,
  MemberDetail,
  MemberGamificationView,
  MemberRatingView,
  Paginated,
  PaymentRow,
} from '@/lib/types'
import { PAYMENT_METHOD_LABELS, PRODUCT_KIND_LABELS } from '@/lib/types'

const SOURCE_LABELS: Record<string, string> = {
  payment: 'Pagamento',
  subscription: 'Assinatura',
  manual: 'Manual',
}

const ACCESS_LABELS: Record<string, string> = {
  course: 'Curso',
  all_courses: 'Todos os cursos (chave-mestra)',
  all_kids_courses: 'Todos os cursos kids (chave-mestra)',
  community: 'Comunidade',
}

/** Um aprendiz da ficha: a CONTA (adulto) ou um PERFIL de criança (kids). */
interface Learner {
  id: string
  label: string
  audience: 'adult' | 'kids'
}

type Tab = 'overview' | 'gamification' | 'activity' | 'certificates' | 'ratings' | 'payments'

const TABS: { id: Tab; label: string }[] = [
  { id: 'overview', label: 'Visão geral' },
  { id: 'gamification', label: 'Gamificação' },
  { id: 'activity', label: 'Atividade' },
  { id: 'certificates', label: 'Certificados' },
  { id: 'ratings', label: 'Classificações' },
  { id: 'payments', label: 'Pagamentos' },
]

/** Abas em que o aprendiz importa (dados por perfil no kids) — inclui a Visão geral. */
const LEARNER_SCOPED: Tab[] = ['overview', 'gamification', 'activity', 'certificates', 'ratings']

export function MemberDetailClient({
  userId,
  currentUser,
}: {
  userId: string
  currentUser: { id: string; role: string }
}) {
  const canWrite = currentUser.role === 'superadmin' || currentUser.role === 'admin'
  const canMessage = canWrite || currentUser.role === 'staff'

  const [detail, setDetail] = useState<MemberDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<Tab>('overview')
  const platform = usePlatform()
  const searchParams = useSearchParams()
  // Deep-link vale na carga inicial; a seleção registra a plataforma em que foi
  // feita para não sobreviver silenciosamente a uma troca Kids ↔ Adultos.
  const [learnerSelection, setLearnerSelection] = useState<LearnerSelection>(() => ({
    platform,
    learnerId: searchParams.get('learner'),
  }))
  useEffect(() => {
    setLearnerSelection((current) =>
      current.platform === platform ? current : { platform, learnerId: null },
    )
  }, [platform])
  const [impersonating, setImpersonating] = useState(false)
  // "Entrar como": escolher a plataforma (comunidade adulta ou Kids) antes do handoff.
  const [impersonateOpen, setImpersonateOpen] = useState(false)
  const [impersonatePlatform, setImpersonatePlatform] = useState('main')

  const [grantOpen, setGrantOpen] = useState(false)
  const [recadoOpen, setRecadoOpen] = useState(false)
  const [recadoTargetId, setRecadoTargetId] = useState(userId)
  const [recadoTitle, setRecadoTitle] = useState('')
  const [recadoBody, setRecadoBody] = useState('')
  const [sendingRecado, setSendingRecado] = useState(false)

  const [extendOpen, setExtendOpen] = useState(false)
  const [extendTarget, setExtendTarget] = useState<AdminEntitlementView | null>(null)
  const [extendDate, setExtendDate] = useState('')

  const [busyId, setBusyId] = useState<string | null>(null)
  const { confirm, confirmDialog } = useConfirm()

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setDetail(await apiGet<MemberDetail>(`/api/members/${userId}`))
    } catch (err) {
      toast.error((err as ApiError).message ?? 'Falha ao carregar o membro.')
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    load()
  }, [load])

  async function manage(id: string, action: 'revoke' | 'expire' | 'extend', expiresAt?: string) {
    setBusyId(id)
    try {
      await apiSend(`/api/members/entitlements/${id}`, 'PATCH', {
        action,
        ...(expiresAt ? { expiresAt } : {}),
      })
      toast.success(
        action === 'revoke'
          ? 'Matrícula revogada.'
          : action === 'expire'
            ? 'Matrícula expirada.'
            : 'Validade atualizada.',
      )
      await load()
    } catch (err) {
      const e = err as ApiError
      if (e.status === 409) {
        toast.error('Registro alterado por outra operação. Recarregando…')
        await load()
      } else {
        toast.error(e.message ?? 'Não foi possível atualizar a matrícula.')
      }
    } finally {
      setBusyId(null)
    }
  }

  function confirmRevoke(e: AdminEntitlementView) {
    confirm({
      title: 'Revogar acesso',
      message: (
        <>
          Revogar o acesso <strong className="text-foreground">{e.name}</strong>? O aluno perde o
          acesso imediatamente.
        </>
      ),
      confirmText: 'Revogar',
      confirmVariant: 'destructive',
      onConfirm: () => manage(e.id, 'revoke'),
    })
  }
  function confirmExpire(e: AdminEntitlementView) {
    confirm({
      title: 'Expirar acesso',
      message: (
        <>
          Expirar o acesso <strong className="text-foreground">{e.name}</strong>?
        </>
      ),
      confirmText: 'Expirar',
      confirmVariant: 'destructive',
      onConfirm: () => manage(e.id, 'expire'),
    })
  }
  function openExtend(e: AdminEntitlementView) {
    setExtendTarget(e)
    setExtendDate('')
    setExtendOpen(true)
  }
  async function submitExtend() {
    if (!extendTarget) return
    const iso = dateInputToSaoPauloEndOfDayIso(extendDate)
    if (!iso) {
      toast.error('Informe uma data de validade válida.')
      return
    }
    setExtendOpen(false)
    await manage(extendTarget.id, 'extend', iso)
  }

  async function sendGeneralRecado() {
    const body = recadoBody.trim()
    const target = learners.find((item) => item.id === recadoTargetId) ?? learners[0]
    if (!body || !target || sendingRecado) return
    setSendingRecado(true)
    try {
      await apiSend('/api/members/teacher-threads', 'POST', {
        userId: target.id,
        accountId: target.audience === 'kids' ? userId : undefined,
        audience: target.audience,
        contextType: 'general',
        title: recadoTitle.trim() || undefined,
        body,
      })
      toast.success('Recado enviado.')
      setRecadoOpen(false)
      setRecadoTitle('')
      setRecadoBody('')
    } catch (err) {
      toast.error((err as ApiError).message ?? 'Não foi possível enviar o recado.')
    } finally {
      setSendingRecado(false)
    }
  }

  // "Entrar como" (suporte): pede o handoff e abre a community já logada como o aluno.
  // `platform` escolhe o app: 'main' = comunidade adulta; 'kids' = Community Kids (grade
  // de perfis das crianças). O BFF repassa `?platform=kids`; o auth resolve a `communityUrl`.
  async function impersonate(platform: string) {
    setImpersonating(true)
    setImpersonateOpen(false)
    try {
      const suffix = platform === 'kids' ? '?platform=kids' : ''
      const res = await apiSend<{ token: string; communityUrl: string }>(
        `/api/admin/users/${userId}/impersonate${suffix}`,
        'POST',
        {},
      )
      window.open(impersonationUrl(res.communityUrl, res.token), '_blank', 'noopener,noreferrer')
      toast.success('Sessão de suporte aberta.')
    } catch (err) {
      toast.error((err as ApiError).message ?? 'Não foi possível entrar como o aluno.')
    } finally {
      setImpersonating(false)
    }
  }

  const user = detail?.user ?? null
  const title = user ? `${user.firstName} ${user.lastName}` : 'Membro'
  const email = user?.email ?? userId

  // Aprendizes: a conta + cada perfil de criança (kids).
  const hasProfiles = (detail?.profiles?.length ?? 0) > 0
  const learners: Learner[] = [
    { id: userId, label: hasProfiles ? 'Conta (responsável)' : 'Conta', audience: 'adult' },
    ...(detail?.profiles ?? []).map((p) => ({
      id: p.id,
      label: p.name,
      audience: 'kids' as const,
    })),
  ]
  const learnerId = resolveLearnerId({
    accountId: userId,
    profileIds: detail?.profiles?.map((profile) => profile.id) ?? [],
    platform,
    selection: learnerSelection,
  })
  const learner = learners.find((l) => l.id === learnerId) ?? learners[0]
  const showLearnerSwitcher = learners.length > 1 && LEARNER_SCOPED.includes(tab)

  const canImpersonateUser =
    user != null &&
    canImpersonate(currentUser, { id: user.id, role: user.role, status: user.status })

  return (
    <div className="space-y-6">
      {confirmDialog}
      <Link
        href="/admin/membros"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Membros
      </Link>

      <AdminHeader
        title={title}
        description={email}
        action={
          <div className="flex flex-wrap gap-2">
            {canImpersonateUser ? (
              <Button
                variant="outline"
                onClick={() => {
                  setImpersonatePlatform('main')
                  setImpersonateOpen(true)
                }}
                disabled={impersonating}
              >
                {impersonating ? <Spinner /> : <LogIn className="size-4" />} Entrar como
              </Button>
            ) : null}
            <Link href="/admin/usuarios" className={buttonVariants({ variant: 'outline' })}>
              <Pencil className="size-4" /> Editar
            </Link>
            {canMessage ? (
              <Button variant="outline" onClick={() => setRecadoOpen(true)}>
                <Mail className="size-4" /> Enviar recado
              </Button>
            ) : null}
            {/* Filas do professor JÁ filtradas por este aprendiz (conta = família toda;
                perfil selecionado = só a criança). */}
            <Link
              href={`/admin/professor/entregas?userId=${encodeURIComponent(learner?.id ?? userId)}`}
              className={buttonVariants({ variant: 'outline' })}
            >
              <Inbox className="size-4" /> Entregas do aluno
            </Link>
            <Link
              href={`/admin/professor/recados?userId=${encodeURIComponent(learner?.id ?? userId)}`}
              className={buttonVariants({ variant: 'outline' })}
            >
              <MailOpen className="size-4" /> Recados do aluno
            </Link>
            {canWrite ? (
              <Button onClick={() => setGrantOpen(true)}>
                <Plus className="size-4" /> Conceder acesso
              </Button>
            ) : null}
          </div>
        }
      />

      {loading ? (
        <Card className="py-10 text-center text-muted-foreground">
          <Spinner className="mx-auto" />
        </Card>
      ) : !detail ? (
        <Card className="py-10 text-center text-muted-foreground">Membro não encontrado.</Card>
      ) : (
        <>
          <IdentityCard detail={detail} />

          {/* Barra de abas */}
          <div className="flex flex-wrap gap-1 border-border border-b">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={`-mb-px border-b-2 px-3 py-2 text-sm transition-colors ${
                  tab === t.id
                    ? 'border-[color:var(--primary)] font-medium text-foreground'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {showLearnerSwitcher ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-muted-foreground text-xs">Aprendiz:</span>
              {learners.map((l) => (
                <button
                  key={l.id}
                  type="button"
                  onClick={() => setLearnerSelection({ platform, learnerId: l.id })}
                  className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                    learner?.id === l.id
                      ? 'border-[color:var(--primary)] bg-[color:var(--primary)]/10 font-medium'
                      : 'border-border text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {l.label}
                </button>
              ))}
            </div>
          ) : null}

          {tab === 'overview' && learner ? (
            <OverviewTab
              detail={detail}
              userId={userId}
              learner={learner}
              canWrite={canWrite}
              busyId={busyId}
              onRevoke={confirmRevoke}
              onExpire={confirmExpire}
              onExtend={openExtend}
            />
          ) : null}
          {tab === 'gamification' && learner ? (
            <GamificationTab learnerId={learner.id} audience={learner.audience} />
          ) : null}
          {tab === 'activity' && learner ? <ActivityTab learnerId={learner.id} /> : null}
          {tab === 'certificates' && learner ? (
            <CertificatesTab learnerId={learner.id} canWrite={canWrite} />
          ) : null}
          {tab === 'ratings' && learner ? <RatingsTab learnerId={learner.id} /> : null}
          {tab === 'payments' ? <PaymentsTab email={user?.email ?? null} /> : null}
        </>
      )}

      <GrantAccessDialog
        open={grantOpen}
        userId={userId}
        onClose={() => setGrantOpen(false)}
        onGranted={load}
      />

      <Dialog
        open={recadoOpen}
        onClose={() => setRecadoOpen(false)}
        title="Enviar recado"
        description="Abre uma nova conversa privada com o aluno selecionado."
        footer={
          <>
            <Button variant="outline" onClick={() => setRecadoOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={() => void sendGeneralRecado()}
              disabled={!recadoBody.trim() || sendingRecado}
            >
              <Mail className="size-4" /> {sendingRecado ? 'Enviando…' : 'Enviar'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Destinatário" htmlFor="recado-target">
            <Select
              id="recado-target"
              value={recadoTargetId}
              onChange={(event) => setRecadoTargetId(event.target.value)}
            >
              {learners.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label} ({item.audience === 'kids' ? 'Kids' : 'Adulto'})
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Assunto (opcional)" htmlFor="recado-title">
            <Input
              id="recado-title"
              value={recadoTitle}
              maxLength={200}
              onChange={(event) => setRecadoTitle(event.target.value)}
            />
          </Field>
          <Field label="Mensagem" htmlFor="recado-body">
            <Textarea
              id="recado-body"
              value={recadoBody}
              maxLength={8000}
              rows={6}
              onChange={(event) => setRecadoBody(event.target.value)}
            />
          </Field>
        </div>
      </Dialog>

      <Dialog
        open={impersonateOpen}
        onClose={() => setImpersonateOpen(false)}
        title="Entrar como este usuário"
        description={title}
        footer={
          <>
            <Button variant="outline" onClick={() => setImpersonateOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={() => void impersonate(impersonatePlatform)}>
              <LogIn className="size-4" /> Entrar
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-3">
          <p className="text-muted-foreground text-xs">
            Abre uma sessão de suporte em nova aba, já logada como o usuário. Escolha a plataforma —
            o Kids abre na grade de perfis das crianças.
          </p>
          <Field label="Plataforma" htmlFor="impersonate-platform">
            <Select
              id="impersonate-platform"
              value={impersonatePlatform}
              onChange={(e) => setImpersonatePlatform(e.target.value)}
            >
              <option value="main">Comunidade (adulto)</option>
              <option value="kids">Community Kids</option>
            </Select>
          </Field>
        </div>
      </Dialog>

      <Dialog
        open={extendOpen}
        onClose={() => setExtendOpen(false)}
        title="Estender validade"
        description={extendTarget?.name}
        footer={
          <>
            <Button variant="outline" onClick={() => setExtendOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={submitExtend}>Salvar</Button>
          </>
        }
      >
        <Field
          label="Nova validade"
          htmlFor="extdate"
          hint="A validade só avança (reativa se expirada)."
        >
          <Input
            id="extdate"
            type="date"
            value={extendDate}
            onChange={(e) => setExtendDate(e.target.value)}
          />
        </Field>
      </Dialog>
    </div>
  )
}

/** Cartão de identidade (status/papel/telefone/cadastro). */
function IdentityCard({ detail }: { detail: MemberDetail }) {
  const u = detail.user
  if (!u) return null
  return (
    <Card className="flex flex-wrap items-center gap-x-8 gap-y-3 p-4">
      <Info label="Status">
        <StatusBadge status={u.status} />
      </Info>
      <Info label="Papel">
        <span className="text-sm capitalize">{u.role}</span>
      </Info>
      <Info label="Telefone">
        <span className="text-sm">{u.phone || '—'}</span>
      </Info>
      <Info label="Cadastro">
        <span className="text-sm">{formatDate(u.createdAt)}</span>
      </Info>
      {detail.profiles && detail.profiles.length > 0 ? (
        <Info label="Perfis">
          <span className="text-sm">{detail.profiles.length}</span>
        </Info>
      ) : null}
    </Card>
  )
}

function Info({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-0.5">
      <div className="text-muted-foreground text-xs">{label}</div>
      {children}
    </div>
  )
}

/**
 * Visão geral FOCADA no aprendiz selecionado (a conta ou UMA criança): cursos com
 * barra de progresso + cartões de USO das ferramentas/comunidades que a família
 * possui + a tabela de matrículas (sempre da FAMÍLIA inteira).
 */
function OverviewTab({
  detail,
  userId,
  learner,
  canWrite,
  busyId,
  onRevoke,
  onExpire,
  onExtend,
}: {
  detail: MemberDetail
  userId: string
  learner: Learner
  canWrite: boolean
  busyId: string | null
  onRevoke: (e: AdminEntitlementView) => void
  onExpire: (e: AdminEntitlementView) => void
  onExtend: (e: AdminEntitlementView) => void
}) {
  // Uso por ferramenta: 1 chamada por FAMÍLIA (o BFF resolve os perfis no auth).
  const owned = ownedToolCards(detail.entitlements)
  const usage = useSection<MemberToolUsageView>(
    owned.length > 0 ? `/api/members/${userId}/tool-usage` : null,
  )
  const learnerUsage = usage.data?.learners.find((l) => l.userId === learner.id) ?? null

  const profile = detail.profiles?.find((p) => p.id === learner.id) ?? null
  const progress = learner.id === userId ? detail.progress : (profile?.progress ?? [])
  const who = profile ? profile.name : 'da conta'

  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          {profile ? <ProfileAvatar name={profile.name} avatarUrl={profile.avatarUrl} /> : null}
          <h2 className="font-semibold text-muted-foreground text-sm">
            {profile ? `Cursos de ${who}` : 'Cursos da conta'}
          </h2>
        </div>
        {progress.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {progress.map((p) => (
              <CourseProgressCard key={p.courseRef} course={p} />
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground text-xs">
            Nenhum curso começado nem matrícula específica ainda.
          </p>
        )}
      </section>

      {owned.length > 0 ? (
        <section className="space-y-3">
          <h2 className="font-semibold text-muted-foreground text-sm">
            {profile ? `Ferramentas e comunidades de ${who}` : 'Ferramentas e comunidades'}
          </h2>
          {usage.loading || usage.error ? (
            <SectionState loading={usage.loading} error={usage.error} />
          ) : learnerUsage ? (
            <ToolUsageGrid usage={learnerUsage} owned={owned} />
          ) : null}
        </section>
      ) : null}

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Acesso</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Origem</TableHead>
              <TableHead>Concedido</TableHead>
              <TableHead>Validade</TableHead>
              {canWrite ? <TableHead className="text-right">Ações</TableHead> : null}
            </TableRow>
          </TableHeader>
          <TableBody>
            {detail.entitlements.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={canWrite ? 6 : 5}
                  className="py-10 text-center text-muted-foreground"
                >
                  Nenhuma matrícula.
                </TableCell>
              </TableRow>
            ) : (
              detail.entitlements.map((e) => (
                <TableRow key={e.id}>
                  <TableCell>
                    <div className="font-medium">{e.name || e.courseRef || e.productId}</div>
                    <div className="text-muted-foreground text-xs">
                      {/* Entrega `community` cobre ferramenta E comunidade — o TIPO
                          (kind do catálogo) é o rótulo honesto; o resto preserva as
                          distinções de chave-mestra do ACCESS_LABELS. */}
                      {e.accessType === 'community'
                        ? (PRODUCT_KIND_LABELS[e.productKind] ?? 'Comunidade')
                        : (ACCESS_LABELS[e.accessType] ?? e.accessType)}
                    </div>
                  </TableCell>
                  <TableCell>
                    {/* Não é `e.status` cru: a coluna diz 'active' mesmo com a
                        validade vencida (ver lib/entitlement-status.ts). */}
                    <StatusBadge status={entitlementBadge(e)} />
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {SOURCE_LABELS[e.sourceKind] ?? e.sourceKind}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{formatDate(e.grantedAt)}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {e.expiresAt ? formatDate(e.expiresAt) : 'Vitalícia'}
                  </TableCell>
                  {canWrite ? (
                    <TableCell className="text-right">
                      {busyId === e.id ? (
                        <Spinner className="ml-auto" />
                      ) : e.status === 'revoked' ? (
                        <span className="text-muted-foreground text-xs">—</span>
                      ) : (
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="sm" onClick={() => onExtend(e)}>
                            Estender
                          </Button>
                          {e.status === 'active' ? (
                            <Button variant="ghost" size="sm" onClick={() => onExpire(e)}>
                              Expirar
                            </Button>
                          ) : null}
                          <Button variant="ghost" size="sm" onClick={() => onRevoke(e)}>
                            Revogar
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  ) : null}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  )
}

/** Carregador genérico de seção (loading/erro/vazio). */
function useSection<T>(path: string | null): {
  data: T | null
  loading: boolean
  error: string | null
  reload: () => void
} {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [nonce, setNonce] = useState(0)

  // `nonce` não é lido no corpo — é só o gatilho de `reload()` (re-roda o fetch).
  // biome-ignore lint/correctness/useExhaustiveDependencies: nonce força o refetch
  useEffect(() => {
    if (!path) return
    let alive = true
    setLoading(true)
    setError(null)
    apiGet<T>(path)
      .then((d) => alive && setData(d))
      .catch((e) => alive && setError((e as ApiError).message ?? 'Falha ao carregar.'))
      .finally(() => alive && setLoading(false))
    return () => {
      alive = false
    }
  }, [path, nonce])

  return { data, loading, error, reload: () => setNonce((n) => n + 1) }
}

function SectionState({ loading, error }: { loading: boolean; error: string | null }) {
  if (loading)
    return (
      <Card className="py-10 text-center text-muted-foreground">
        <Spinner className="mx-auto" />
      </Card>
    )
  if (error) return <Card className="py-8 text-center text-destructive text-sm">{error}</Card>
  return null
}

function GamificationTab({
  learnerId,
  audience,
}: {
  learnerId: string
  audience: 'adult' | 'kids'
}) {
  const { data, loading, error } = useSection<MemberGamificationView>(
    `/api/members/${learnerId}/gamification?audience=${audience}`,
  )
  if (loading || error) return <SectionState loading={loading} error={error} />
  if (!data) return null
  const unlocked = data.badges.filter((b) => b.unlockedAt)
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label="Nível"
          value={STUDENT_RANK_LABELS[data.level.slug] ?? data.level.slug}
          hint={
            data.level.next
              ? `Próximo: ${STUDENT_RANK_LABELS[data.level.next] ?? data.level.next}`
              : undefined
          }
        />
        <Stat label="XP" value={String(data.xp)} />
        <Stat
          label="Ofensiva"
          value={`${data.streak.current} dias`}
          hint={`Recorde ${data.streak.best}`}
        />
        <Stat label="Zappy Coins" value={String(data.coins.balance)} />
      </div>
      <Card className="space-y-2 p-4">
        <div className="font-medium text-sm">
          Conquistas {unlocked.length}/{data.badges.length}
        </div>
        {unlocked.length === 0 ? (
          <p className="text-muted-foreground text-xs">Nenhuma conquista ainda.</p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {unlocked.map((b) => (
              <span
                key={b.slug}
                className="rounded-full bg-[color:var(--primary)]/10 px-2 py-0.5 text-xs"
                title={b.unlockedAt ? formatDate(b.unlockedAt) : undefined}
              >
                {BADGE_LABELS[b.slug] ?? b.slug}
              </span>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}

function Stat({
  label,
  value,
  hint,
  caps,
}: {
  label: string
  value: string
  hint?: string
  caps?: boolean
}) {
  return (
    <Card className="space-y-1 p-4">
      <div className="text-muted-foreground text-xs">{label}</div>
      <div className={`font-semibold text-lg ${caps ? 'capitalize' : ''}`}>{value}</div>
      {hint ? <div className="text-muted-foreground text-xs">{hint}</div> : null}
    </Card>
  )
}

// Rótulos de apresentação da gamificação — ESPELHAM o community-kids
// (lib/level-info.ts LEVEL_INFO + components/kids/badges.ts BADGE_INFO).
// Mudou o rótulo lá? Atualize aqui (o admin não importa do app kids).
const BADGE_LABELS: Record<string, string> = {
  'first-lesson': 'Primeiro passo',
  'first-showcase': 'Meu primeiro jogo',
  'streak-7': 'Semana em chamas',
  'streak-30': 'Mês lendário',
  'streak-60': '60 dias de fogo',
  'streak-180': 'Meio ano em chamas',
  'streak-365': 'Um ano lendário',
  'course-complete': 'Curso completo',
  'course-complete-2': 'Dupla de cursos',
  'course-complete-3': 'Trio de cursos',
  'quiz-perfect': 'Nota mil',
  'quiz-perfect-10': '10 notas mil',
  'quiz-perfect-30': '30 notas mil',
  'studio-first': 'Criador de jogos',
  'studio-master-3': 'Oficina de jogos',
  'studio-master-10': 'Mestre do Estúdio',
  'coins-saver-300': 'Cofrinho cheio',
  'coins-saver-1000': 'Magnata Zappy',
  'pensa-first-idea': 'Ideia brilhante',
  'pensa-first-launch': 'Grande lançamento',
  'pensa-creator-3': 'Cabeça de criador',
  'challenge-first': 'Desafiante do mês',
  'clube-primeiro-post': 'Voz da turma',
}

const ACTIVITY_LABELS: Record<MemberActivityItemView['kind'], string> = {
  lesson_accessed: 'Acessou a aula',
  lesson_completed: 'Concluiu a aula',
  quiz_attempt: 'Respondeu o quiz',
  studio_submission: 'Entregou no Estúdio',
  pinta_submission: 'Entregou um desenho no Pinta',
}

function ActivityTab({ learnerId }: { learnerId: string }) {
  const [items, setItems] = useState<MemberActivityItemView[]>([])
  const [offset, setOffset] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const appendGuard = useRef(createLatestAppendGuard()).current
  const LIMIT = 20

  // Reinicia ao trocar de aprendiz.
  useEffect(() => {
    let alive = true
    appendGuard.invalidate()
    setLoadingMore(false)
    setLoading(true)
    setError(null)
    setItems([])
    setOffset(0)
    apiGet<MemberActivityPage>(`/api/members/${learnerId}/activity?limit=${LIMIT}&offset=0`)
      .then((d) => {
        if (!alive) return
        setItems(d.items)
        setHasMore(d.hasMore)
      })
      .catch((e) => alive && setError((e as ApiError).message ?? 'Falha ao carregar.'))
      .finally(() => alive && setLoading(false))
    return () => {
      alive = false
      appendGuard.invalidate()
    }
  }, [learnerId, appendGuard])

  async function loadMore() {
    const ticket = appendGuard.begin()
    if (!ticket) return
    const next = offset + LIMIT
    setLoadingMore(true)
    try {
      const d = await apiGet<MemberActivityPage>(
        `/api/members/${learnerId}/activity?limit=${LIMIT}&offset=${next}`,
      )
      if (appendGuard.canPublish(ticket)) {
        setItems((prev) => [...prev, ...d.items])
        setOffset(next)
        setHasMore(d.hasMore)
      }
    } catch (e) {
      if (appendGuard.canPublish(ticket)) {
        toast.error((e as ApiError).message ?? 'Falha ao carregar mais.')
      }
    } finally {
      if (appendGuard.canPublish(ticket)) setLoadingMore(false)
      appendGuard.finish(ticket)
    }
  }

  if (loading || error) return <SectionState loading={loading} error={error} />
  if (items.length === 0)
    return <Card className="py-8 text-center text-muted-foreground text-sm">Sem atividade.</Card>

  return (
    <Card className="divide-y divide-border p-0">
      {items.map((it) => (
        <div
          key={`${it.kind}:${it.at}:${it.lessonId ?? ''}`}
          className="flex items-start justify-between gap-3 p-3"
        >
          <div className="min-w-0">
            <div className="text-sm">
              {ACTIVITY_LABELS[it.kind]}
              {it.lessonTitle ? <span className="font-medium"> · {it.lessonTitle}</span> : null}
            </div>
            <div className="text-muted-foreground text-xs">
              {it.courseTitle ?? '—'}
              {it.score != null ? ` · nota ${it.score}` : ''}
              {it.passed != null ? (it.passed ? ' · aprovado' : ' · não aprovado') : ''}
            </div>
            {it.message ? (
              <div className="mt-1 text-muted-foreground text-xs italic">“{it.message}”</div>
            ) : null}
          </div>
          <div className="shrink-0 text-muted-foreground text-xs">{formatDate(it.at)}</div>
        </div>
      ))}
      {hasMore ? (
        <div className="p-3 text-center">
          <Button variant="outline" size="sm" disabled={loadingMore} onClick={loadMore}>
            {loadingMore ? 'Carregando…' : 'Carregar mais'}
          </Button>
        </div>
      ) : null}
    </Card>
  )
}

function CertificatesTab({ learnerId, canWrite }: { learnerId: string; canWrite: boolean }) {
  const { data, loading, error, reload } = useSection<{ certificates: MemberCertificateView[] }>(
    `/api/members/${learnerId}/certificates`,
  )
  const [busyId, setBusyId] = useState<string | null>(null)
  const { confirm, confirmDialog } = useConfirm()

  function revoke(c: MemberCertificateView) {
    confirm({
      title: 'Revogar certificado',
      message: (
        <>
          Revogar o certificado <strong className="text-foreground">{c.serial}</strong>? A validação
          pública passa a inválido.
        </>
      ),
      confirmText: 'Revogar',
      confirmVariant: 'destructive',
      onConfirm: async () => {
        setBusyId(c.id)
        try {
          await apiSend(`/api/members/certificates/${c.id}/revoke`, 'POST', {})
          toast.success('Certificado revogado.')
          reload()
        } catch (e) {
          toast.error((e as ApiError).message ?? 'Não foi possível revogar.')
        } finally {
          setBusyId(null)
        }
      },
    })
  }

  if (loading || error) return <SectionState loading={loading} error={error} />
  const certs = data?.certificates ?? []
  if (certs.length === 0)
    return (
      <Card className="py-8 text-center text-muted-foreground text-sm">
        Nenhum certificado emitido.
      </Card>
    )

  return (
    <Card>
      {confirmDialog}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Curso</TableHead>
            <TableHead>Série</TableHead>
            <TableHead>Emitido</TableHead>
            <TableHead>Status</TableHead>
            {canWrite ? <TableHead className="text-right">Ações</TableHead> : null}
          </TableRow>
        </TableHeader>
        <TableBody>
          {certs.map((c) => (
            <TableRow key={c.id}>
              <TableCell className="font-medium">{c.courseTitle}</TableCell>
              <TableCell className="text-muted-foreground text-xs">{c.serial}</TableCell>
              <TableCell className="text-muted-foreground">{formatDate(c.issuedAt)}</TableCell>
              <TableCell>
                <StatusBadge status={c.revokedAt ? 'revoked' : 'active'} />
              </TableCell>
              {canWrite ? (
                <TableCell className="text-right">
                  {c.revokedAt ? (
                    <span className="text-muted-foreground text-xs">—</span>
                  ) : busyId === c.id ? (
                    <Spinner className="ml-auto" />
                  ) : (
                    <Button variant="ghost" size="sm" onClick={() => revoke(c)}>
                      Revogar
                    </Button>
                  )}
                </TableCell>
              ) : null}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  )
}

function RatingsTab({ learnerId }: { learnerId: string }) {
  const { data, loading, error } = useSection<{ ratings: MemberRatingView[] }>(
    `/api/members/${learnerId}/ratings`,
  )
  if (loading || error) return <SectionState loading={loading} error={error} />
  const ratings = data?.ratings ?? []
  if (ratings.length === 0)
    return (
      <Card className="py-8 text-center text-muted-foreground text-sm">
        Nenhuma classificação dada.
      </Card>
    )
  return (
    <div className="space-y-3">
      {ratings.map((r) => (
        <Card key={r.courseId} className="space-y-1 p-4">
          <div className="flex items-center justify-between gap-2">
            <span className="font-medium">{r.courseTitle ?? r.courseRef ?? r.courseId}</span>
            <span className="font-semibold text-sm">★ {r.rating.toFixed(1)}</span>
          </div>
          {r.comment ? <p className="text-muted-foreground text-sm">{r.comment}</p> : null}
          <div className="text-muted-foreground text-xs">{formatDate(r.updatedAt)}</div>
        </Card>
      ))}
    </div>
  )
}

function PaymentsTab({ email }: { email: string | null }) {
  const { data, loading, error } = useSection<Paginated<PaymentRow>>(
    email ? `/api/payments/transactions?q=${encodeURIComponent(email)}&limit=10` : null,
  )
  if (!email)
    return (
      <Card className="py-8 text-center text-muted-foreground text-sm">
        E-mail do aluno indisponível.
      </Card>
    )
  if (loading || error) return <SectionState loading={loading} error={error} />
  const items = data?.items ?? []
  if (items.length === 0)
    return <Card className="py-8 text-center text-muted-foreground text-sm">Sem pagamentos.</Card>
  return (
    <Card>
      <div className="flex items-center justify-between gap-2 border-border border-b p-3">
        <span className="flex items-center gap-1.5 text-muted-foreground text-xs">
          <CreditCard className="size-4" /> Pagamentos do aluno (por e-mail)
        </span>
        <Link
          href={`/admin/pagamentos/transacoes?q=${encodeURIComponent(email)}`}
          className="text-[color:var(--primary)] text-xs hover:underline"
        >
          Ver todos
        </Link>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Valor</TableHead>
            <TableHead>Método</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Data</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((p) => (
            <TableRow key={p.id}>
              <TableCell className="font-medium">{formatCentsStr(p.amountInCents)}</TableCell>
              <TableCell className="text-muted-foreground">
                {PAYMENT_METHOD_LABELS[p.method] ?? p.method}
              </TableCell>
              <TableCell>
                <StatusBadge status={p.status} />
              </TableCell>
              <TableCell className="text-muted-foreground">{formatDate(p.createdAt)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  )
}

/** Foto do perfil (estilo Netflix) ou a inicial do nome num círculo. */
function ProfileAvatar({ name, avatarUrl }: { name: string; avatarUrl: string | null }) {
  if (avatarUrl) {
    return (
      // biome-ignore lint/performance/noImgElement: avatar de R2 (URL externa arbitrária)
      <img
        src={avatarUrl}
        alt=""
        className="size-7 rounded-full border border-border object-cover"
      />
    )
  }
  return (
    <span className="flex size-7 items-center justify-center rounded-full bg-[color:var(--primary)]/15 font-semibold text-xs">
      {name.trim().charAt(0).toUpperCase() || '?'}
    </span>
  )
}
