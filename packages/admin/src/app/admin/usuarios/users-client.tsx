'use client'

import { Badge } from '@sistemazero/ui/badge'
import { Button } from '@sistemazero/ui/button'
import { Card } from '@sistemazero/ui/card'
import { ConfirmDialog } from '@sistemazero/ui/confirm-dialog'
import { Dialog } from '@sistemazero/ui/dialog'
import { Input } from '@sistemazero/ui/input'
import { Field } from '@sistemazero/ui/label'
import { Pagination } from '@sistemazero/ui/pagination'
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
import {
  GraduationCap,
  KeyRound,
  LockKeyhole,
  LogIn,
  Mail,
  Pencil,
  Plus,
  Search,
  Trash2,
} from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { AdminHeader } from '@/components/admin/admin-header'
import { GrantAccessDialog } from '@/components/admin/grant-access-dialog'
import { ReadOnlyNotice } from '@/components/admin/read-only-notice'
import { StatusBadge, statusLabel } from '@/components/admin/status-badge'
import { TableSkeletonRows } from '@/components/admin/table-skeleton'
import { useConfirm } from '@/components/admin/use-confirm'
import { type ApiError, apiGet, apiSend } from '@/lib/api'
import { dateInputToSaoPauloEndOfDayIso, dateInputToSaoPauloStartOfDayIso } from '@/lib/dates'
import { formatDate } from '@/lib/format'
import { canImpersonate, impersonationUrl } from '@/lib/impersonation'
import { COMMUNITY_NAMES } from '@/lib/platform'
import { mapPool } from '@/lib/pool'
import {
  type Paginated,
  PRIVILEGED_ROLES,
  ROLE_LABELS,
  USER_ROLES,
  USER_STATUSES,
  type UserView,
} from '@/lib/types'
import { type RowActionItem, RowActionsMenu } from './row-actions-menu'

const LIMIT = 20
/** Mínimo de senha (client hint; o auth valida de verdade — PASSWORD_MIN_LENGTH). */
const PASSWORD_MIN = 10

function roleVariant(role: string): 'default' | 'outline' | 'muted' {
  if (PRIVILEGED_ROLES.includes(role)) return 'default'
  return role === 'staff' ? 'outline' : 'muted'
}

interface FormState {
  firstName: string
  lastName: string
  phone: string
  role: string
  status: string
}

interface CreateFormState {
  firstName: string
  lastName: string
  email: string
  phone: string
  role: string
  /** Plataforma de destino do convite (link do e-mail): `main` | `kids`. */
  platform: string
}

const EMPTY_CREATE: CreateFormState = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  role: 'customer',
  platform: 'main',
}

/**
 * Origens de cadastro conhecidas (filtro). `signupSource` é texto livre no auth: `funnel` vem
 * da compra na página de vendas, `admin` do convite feito aqui, `web`/`mobile` do cadastro
 * direto no site ou no app do celular.
 */
const SOURCE_OPTIONS = [
  { value: 'funnel', label: 'Página de vendas' },
  { value: 'admin', label: 'Convite da equipe' },
  { value: 'web', label: 'Site' },
  { value: 'mobile', label: 'Celular' },
]

/** As duas comunidades, com o nome que as famílias leem. `main` é a adulta no auth. */
const COMMUNITY_OPTIONS = [
  { value: 'main', label: COMMUNITY_NAMES.adult },
  { value: 'kids', label: COMMUNITY_NAMES.kids },
]

function fullName(u: { firstName: string; lastName: string }): string {
  return `${u.firstName} ${u.lastName}`.trim()
}

export function UsersClient({ currentUser }: { currentUser: { id: string; role: string } }) {
  const [items, setItems] = useState<UserView[]>([])
  const [total, setTotal] = useState(0)
  const [offset, setOffset] = useState(0)
  const [q, setQ] = useState('')
  const [role, setRole] = useState('')
  const [status, setStatus] = useState('')
  const [source, setSource] = useState('')
  const [createdFrom, setCreatedFrom] = useState('')
  const [createdTo, setCreatedTo] = useState('')
  const [loading, setLoading] = useState(true)

  // Seleção em lote (ids da página atual). Limpa ao recarregar/trocar filtro.
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [bulkGrantOpen, setBulkGrantOpen] = useState(false)
  const [bulkBusy, setBulkBusy] = useState(false)
  const { confirm, confirmDialog } = useConfirm()

  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<UserView | null>(null)
  const [form, setForm] = useState<FormState>({
    firstName: '',
    lastName: '',
    phone: '',
    role: 'customer',
    status: 'active',
  })
  const [saving, setSaving] = useState(false)

  const [createOpen, setCreateOpen] = useState(false)
  const [createForm, setCreateForm] = useState<CreateFormState>(EMPTY_CREATE)
  const [creating, setCreating] = useState(false)

  const [grantUserId, setGrantUserId] = useState<string | null>(null)
  const [impersonatingId, setImpersonatingId] = useState<string | null>(null)
  // Diálogo "Entrar como": escolher a plataforma (comunidade adulta ou Kids) antes do handoff.
  const [impersonateUser, setImpersonateUser] = useState<UserView | null>(null)
  const [impersonatePlatform, setImpersonatePlatform] = useState('main')

  // Acesso e senha (cliente com link expirado / preso sem senha).
  const [accessUser, setAccessUser] = useState<UserView | null>(null)
  const [accessPlatform, setAccessPlatform] = useState('main')
  const [accessPassword, setAccessPassword] = useState('')
  const [resending, setResending] = useState(false)
  const [settingPassword, setSettingPassword] = useState(false)

  const isSuper = currentUser.role === 'superadmin'
  const isAdmin = currentUser.role === 'admin'
  const canWrite = isSuper || isAdmin
  // admin não edita contas admin/superadmin; superadmin edita qualquer uma. staff é só leitura.
  const canEdit = (u: UserView): boolean =>
    canWrite && (isSuper || !PRIVILEGED_ROLES.includes(u.role))
  // Exclusão (destrutiva, cascata): SÓ superadmin, nunca a si mesmo nem contas
  // admin/superadmin (o gateway e o auth re-checam — isto é só o gating de UX).
  const canDelete = (u: UserView): boolean =>
    isSuper && u.id !== currentUser.id && !PRIVILEGED_ROLES.includes(u.role)

  // Exclusão com dupla confirmação (digitar o e-mail).
  const [deletingUser, setDeletingUser] = useState<UserView | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState('')

  function askDelete(u: UserView) {
    setDeleteConfirm('')
    setDeletingUser(u)
  }
  async function confirmDelete() {
    if (!deletingUser) return
    try {
      await apiSend(`/api/admin/users/${deletingUser.id}`, 'DELETE')
      toast.success('Conta excluída.')
      setDeletingUser(null)
      await load()
    } catch (err) {
      // Mantém o modal aberto p/ nova tentativa idempotente. A preparação pode já
      // ter bloqueado a conta e alguma purga pode ter concluído, mas nenhum passo
      // volta a liberar escrita nem impede o retry seguro.
      toast.error((err as ApiError).message ?? 'A conta não foi excluída. Tente de novo.')
    }
  }
  // admin só pode atribuir staff/customer (não promove a admin/superadmin).
  const assignableRoles = isSuper
    ? USER_ROLES
    : USER_ROLES.filter((r) => !PRIVILEGED_ROLES.includes(r))

  const load = useCallback(async () => {
    setLoading(true)
    setSelected(new Set()) // a seleção é por-visão; troca de filtro/página zera.
    try {
      const params = new URLSearchParams({ limit: String(LIMIT), offset: String(offset) })
      if (q.trim()) params.set('q', q.trim())
      if (role) params.set('role', role)
      if (status) params.set('status', status)
      if (source) params.set('source', source)
      const fromIso = createdFrom ? dateInputToSaoPauloStartOfDayIso(createdFrom) : null
      const toIso = createdTo ? dateInputToSaoPauloEndOfDayIso(createdTo) : null
      if (fromIso) params.set('createdFrom', fromIso)
      if (toIso) params.set('createdTo', toIso)
      const page = await apiGet<Paginated<UserView>>(`/api/admin/users?${params}`)
      setItems(page.items)
      setTotal(page.total)
    } catch (err) {
      toast.error((err as ApiError).message ?? 'A lista de contas não carregou. Tente de novo.')
    } finally {
      setLoading(false)
    }
  }, [offset, q, role, status, source, createdFrom, createdTo])

  // Debounce da busca + recarga ao mudar filtros/página.
  useEffect(() => {
    const t = setTimeout(load, 250)
    return () => clearTimeout(t)
  }, [load])

  function openEdit(u: UserView) {
    setEditing(u)
    setForm({
      firstName: u.firstName,
      lastName: u.lastName,
      phone: u.phone ?? '',
      role: u.role,
      status: u.status,
    })
    setOpen(true)
  }

  async function save() {
    if (!editing) return
    if (!form.firstName.trim() || !form.lastName.trim()) {
      toast.error('Preencha nome e sobrenome.')
      return
    }
    setSaving(true)
    try {
      const isSelf = editing.id === currentUser.id
      const changes: Record<string, unknown> = {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        phone: form.phone.trim() ? form.phone.trim() : null,
        version: editing.version,
      }
      // Papel/status só quando NÃO é a própria conta (anti-lockout; o auth também barra).
      if (!isSelf) {
        changes.role = form.role
        changes.status = form.status
      }
      await apiSend(`/api/admin/users/${editing.id}`, 'PATCH', changes)
      toast.success('Conta atualizada.')
      setOpen(false)
      await load()
    } catch (err) {
      const e = err as ApiError
      if (e.status === 409) {
        toast.error('Outra pessoa mudou esta conta agora. A lista vai recarregar.')
        setOpen(false)
        await load()
      } else {
        toast.error(e.message ?? 'Não deu para salvar. Tente de novo.')
      }
    } finally {
      setSaving(false)
    }
  }

  async function create() {
    if (!createForm.firstName.trim() || !createForm.lastName.trim() || !createForm.email.trim()) {
      toast.error('Preencha nome, sobrenome e e-mail.')
      return
    }
    setCreating(true)
    try {
      const res = await apiSend<{ user: UserView; inviteSent: boolean }>(
        '/api/admin/users',
        'POST',
        {
          email: createForm.email.trim(),
          firstName: createForm.firstName.trim(),
          lastName: createForm.lastName.trim(),
          phone: createForm.phone.trim() ? createForm.phone.trim() : null,
          role: createForm.role,
          platform: createForm.platform,
        },
      )
      if (res.inviteSent) {
        toast.success('Convite enviado por e-mail.')
      } else {
        toast.warning(
          'A conta foi criada, mas o e-mail do convite não saiu. Peça para a pessoa usar "esqueci minha senha".',
        )
      }
      setCreateOpen(false)
      setCreateForm(EMPTY_CREATE)
      await load()
    } catch (err) {
      const e = err as ApiError
      toast.error(
        e.status === 409
          ? 'Esse e-mail já tem conta.'
          : (e.message ?? 'O convite não saiu. Tente de novo.'),
      )
    } finally {
      setCreating(false)
    }
  }

  // "Entrar como" (suporte): pede o token de handoff e abre a community em nova aba
  // já logada como o usuário. O token é single-use/60s — a aba precisa abrir na hora.
  // `platform` decide o app do handoff: 'main' = comunidade adulta; 'kids' = Community
  // Kids (o auth resolve a `communityUrl` de cada uma; o BFF repassa `?platform=kids`).
  async function impersonate(u: UserView, platform: string) {
    setImpersonatingId(u.id)
    setImpersonateUser(null)
    try {
      const suffix = platform === 'kids' ? '?platform=kids' : ''
      const res = await apiSend<{ token: string; expiresAt: string; communityUrl: string }>(
        `/api/admin/users/${u.id}/impersonate${suffix}`,
        'POST',
        {},
      )
      window.open(impersonationUrl(res.communityUrl, res.token), '_blank', 'noopener,noreferrer')
      toast.success(`Abrimos uma aba como ${fullName(u)}.`)
    } catch (err) {
      const e = err as ApiError
      toast.error(
        e.status === 403
          ? 'Você não tem permissão para entrar como esta pessoa.'
          : (e.message ?? 'Não deu para entrar como esta pessoa. Tente de novo.'),
      )
    } finally {
      setImpersonatingId(null)
    }
  }

  // ── Acesso e senha ───────────────────────────────────────────────────────
  // O operador destrava um cliente preso (link de 1º acesso expirado / nunca
  // definiu a senha) de dois jeitos: reenviando o link (o cliente cria a senha)
  // ou definindo a senha na mão (e informando o cliente).
  function openAccess(u: UserView) {
    setAccessUser(u)
    setAccessPlatform('main')
    setAccessPassword('')
  }

  async function resendAccess() {
    if (!accessUser) return
    setResending(true)
    try {
      const suffix = accessPlatform === 'kids' ? '?platform=kids' : ''
      const res = await apiSend<{ sent: boolean }>(
        `/api/admin/users/${accessUser.id}/resend-invite${suffix}`,
        'POST',
        {},
      )
      if (res.sent) {
        toast.success('Link de acesso reenviado por e-mail.')
      } else {
        toast.warning(
          'O e-mail não saiu. A conta pode estar parada ou o envio está fora do ar agora.',
        )
      }
    } catch (err) {
      toast.error((err as ApiError).message ?? 'O link não foi reenviado. Tente de novo.')
    } finally {
      setResending(false)
    }
  }

  async function submitSetPassword() {
    if (!accessUser) return
    if (accessPassword.trim().length < PASSWORD_MIN) {
      toast.error(`A senha precisa de pelo menos ${PASSWORD_MIN} caracteres.`)
      return
    }
    setSettingPassword(true)
    try {
      await apiSend(`/api/admin/users/${accessUser.id}/set-password`, 'POST', {
        password: accessPassword,
      })
      toast.success('Senha criada. A pessoa precisa entrar de novo em todos os aparelhos.')
      setAccessUser(null)
      await load() // reflete "convite sem resposta" → definido na listagem.
    } catch (err) {
      toast.error((err as ApiError).message ?? 'A senha não foi criada. Tente de novo.')
    } finally {
      setSettingPassword(false)
    }
  }

  const isSelf = editing?.id === currentUser.id

  // ── Seleção em lote ──────────────────────────────────────────────────────
  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }
  const allOnPageSelected = items.length > 0 && items.every((u) => selected.has(u.id))
  function toggleAllOnPage() {
    setSelected((prev) => {
      if (items.every((u) => prev.has(u.id))) {
        const next = new Set(prev)
        for (const u of items) next.delete(u.id)
        return next
      }
      const next = new Set(prev)
      for (const u of items) next.add(u.id)
      return next
    })
  }

  /** Suspender/ativar em lote: itera o PATCH por usuário (cada um auditado no gateway). */
  function bulkSetStatus(targetStatus: 'suspended' | 'active') {
    // Só contas que o operador PODE editar e que não são a própria (anti-lockout).
    const editable = items.filter(
      (u) => selected.has(u.id) && canEdit(u) && u.id !== currentUser.id,
    )
    const skipped = selected.size - editable.length
    if (editable.length === 0) {
      toast.error('Nenhuma conta da seleção pode mudar: falta permissão ou é a sua.')
      return
    }
    const verb = targetStatus === 'suspended' ? 'Suspender' : 'Ativar'
    confirm({
      title: `${verb} contas`,
      message:
        editable.length === 1
          ? `${verb} 1 conta selecionada?`
          : `${verb} ${editable.length} contas selecionadas?`,
      confirmText: verb,
      confirmVariant: targetStatus === 'suspended' ? 'destructive' : 'default',
      onConfirm: async () => {
        setBulkBusy(true)
        try {
          const results = await mapPool(editable, async (u) => {
            try {
              await apiSend(`/api/admin/users/${u.id}`, 'PATCH', {
                status: targetStatus,
                version: u.version,
              })
              return 'ok' as const
            } catch {
              return 'error' as const
            }
          })
          const ok = results.filter((r) => r === 'ok').length
          const failed = results.length - ok
          const parts = [`${ok} ${targetStatus === 'suspended' ? 'suspensas' : 'ativadas'}`]
          if (failed > 0) parts.push(`${failed} não mudaram`)
          if (skipped > 0) parts.push(`${skipped} ficaram de fora`)
          if (failed > 0) toast.warning(`Contas: ${parts.join(', ')}.`)
          else toast.success(`Contas: ${parts.join(', ')}.`)
          await load()
        } finally {
          setBulkBusy(false)
        }
      },
    })
  }

  /** O menu "Ações" de uma linha: as mesmas permissões dos antigos botões de ícone. */
  function rowActions(u: UserView): RowActionItem[] {
    const actions: RowActionItem[] = [
      {
        key: 'aluno',
        // Aluno é quem compra (Cliente); para a equipe, a mesma ficha é "da conta".
        label: u.role === 'customer' ? 'Ver a ficha do aluno' : 'Ver a ficha da conta',
        icon: <GraduationCap className="size-4" aria-hidden />,
        href: `/admin/membros/${u.id}`,
      },
    ]
    if (canWrite) {
      actions.push({
        key: 'conceder',
        label: 'Conceder acesso',
        icon: <KeyRound className="size-4" aria-hidden />,
        onSelect: () => setGrantUserId(u.id),
      })
    }
    if (canEdit(u) && u.id !== currentUser.id) {
      actions.push({
        key: 'acesso',
        label: 'Acesso e senha',
        icon: <LockKeyhole className="size-4" aria-hidden />,
        onSelect: () => openAccess(u),
      })
    }
    if (canImpersonate(currentUser, u)) {
      actions.push({
        key: 'entrar',
        label: `Entrar como ${u.firstName || fullName(u)}`,
        icon: impersonatingId === u.id ? <Spinner /> : <LogIn className="size-4" aria-hidden />,
        disabled: impersonatingId === u.id,
        onSelect: () => {
          setImpersonatePlatform('main')
          setImpersonateUser(u)
        },
      })
    }
    if (canEdit(u)) {
      actions.push({
        key: 'editar',
        label: 'Editar conta',
        icon: <Pencil className="size-4" aria-hidden />,
        onSelect: () => openEdit(u),
      })
    }
    if (canDelete(u)) {
      actions.push({
        key: 'excluir',
        label: 'Excluir conta e dados',
        icon: <Trash2 className="size-4" aria-hidden />,
        destructive: true,
        separatorBefore: true,
        onSelect: () => askDelete(u),
      })
    }
    return actions
  }

  return (
    <div className="space-y-6">
      {confirmDialog}
      <ConfirmDialog
        open={deletingUser !== null}
        onClose={() => setDeletingUser(null)}
        title="Excluir conta"
        confirmText="Excluir conta e dados"
        confirmVariant="destructive"
        confirmDisabled={
          deleteConfirm.trim().toLowerCase() !== (deletingUser?.email ?? '').toLowerCase()
        }
        onConfirm={confirmDelete}
        message={
          <>
            Você vai apagar a conta de{' '}
            <strong className="text-foreground">
              {deletingUser ? fullName(deletingUser) : ''}
            </strong>{' '}
            ({deletingUser?.email}), com todos os perfis, o progresso, as conquistas, os
            certificados e o que ela escreveu na comunidade. Pagamentos e notas fiscais ficam
            guardados. <strong className="text-foreground">Não dá para desfazer.</strong>
          </>
        }
      >
        <div className="space-y-1.5">
          <label htmlFor="delete-confirm-email" className="font-medium text-foreground text-xs">
            Para confirmar, digite o e-mail da conta:
          </label>
          <Input
            id="delete-confirm-email"
            value={deleteConfirm}
            placeholder={deletingUser?.email}
            autoComplete="off"
            onChange={(e) => setDeleteConfirm(e.target.value)}
          />
        </div>
      </ConfirmDialog>
      <AdminHeader
        title="Contas"
        description="Todas as contas da casa: responsáveis, alunos e equipe. Aqui muda papel, situação e acesso."
        action={
          <Button onClick={() => setCreateOpen(true)} disabled={!canWrite}>
            <Plus className="size-4" aria-hidden /> Convidar pessoa
          </Button>
        }
      />
      {canWrite ? null : <ReadOnlyNotice />}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome ou e-mail"
            aria-label="Buscar por nome ou e-mail"
            value={q}
            onChange={(e) => {
              setOffset(0)
              setQ(e.target.value)
            }}
            className="pl-8"
          />
        </div>
        <Select
          aria-label="Papel"
          value={role}
          onChange={(e) => {
            setOffset(0)
            setRole(e.target.value)
          }}
          className="sm:w-44"
        >
          <option value="">Todos os papéis</option>
          {USER_ROLES.map((r) => (
            <option key={r} value={r}>
              {ROLE_LABELS[r]}
            </option>
          ))}
        </Select>
        <Select
          aria-label="Situação"
          value={status}
          onChange={(e) => {
            setOffset(0)
            setStatus(e.target.value)
          }}
          className="sm:w-44"
        >
          <option value="">Todas as situações</option>
          {USER_STATUSES.map((s) => (
            <option key={s} value={s}>
              {statusLabel(s, 'account')}
            </option>
          ))}
        </Select>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <label className="space-y-1 text-sm sm:w-44">
          <span className="text-muted-foreground text-xs">Origem do cadastro</span>
          <Select
            value={source}
            onChange={(e) => {
              setOffset(0)
              setSource(e.target.value)
            }}
          >
            <option value="">Todas as origens</option>
            {SOURCE_OPTIONS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </Select>
        </label>
        <label className="space-y-1 text-sm">
          <span className="text-muted-foreground text-xs">Cadastro de</span>
          <Input
            type="date"
            value={createdFrom}
            onChange={(e) => {
              setOffset(0)
              setCreatedFrom(e.target.value)
            }}
          />
        </label>
        <label className="space-y-1 text-sm">
          <span className="text-muted-foreground text-xs">até</span>
          <Input
            type="date"
            value={createdTo}
            onChange={(e) => {
              setOffset(0)
              setCreatedTo(e.target.value)
            }}
          />
        </label>
      </div>

      {canWrite && selected.size > 0 ? (
        <Card className="flex flex-wrap items-center gap-2 p-3">
          <span className="text-sm">
            <strong>{selected.size}</strong>{' '}
            {selected.size === 1 ? 'conta selecionada' : 'contas selecionadas'}
          </span>
          <div className="ml-auto flex flex-wrap gap-2">
            <Button size="sm" disabled={bulkBusy} onClick={() => setBulkGrantOpen(true)}>
              <KeyRound className="size-4" aria-hidden /> Conceder acesso
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={bulkBusy}
              onClick={() => bulkSetStatus('suspended')}
            >
              {bulkBusy ? <Spinner /> : null} Suspender
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={bulkBusy}
              onClick={() => bulkSetStatus('active')}
            >
              Ativar
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setSelected(new Set())}>
              Limpar seleção
            </Button>
          </div>
        </Card>
      ) : null}

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              {canWrite ? (
                <TableHead className="w-8">
                  <input
                    type="checkbox"
                    aria-label="Selecionar todas as contas desta página"
                    checked={allOnPageSelected}
                    onChange={toggleAllOnPage}
                    className="size-4 align-middle accent-[color:var(--primary)]"
                  />
                </TableHead>
              ) : null}
              <TableHead>Conta</TableHead>
              <TableHead>Papel</TableHead>
              <TableHead>Situação</TableHead>
              <TableHead>Desde</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableSkeletonRows columns={canWrite ? 6 : 5} />
            ) : items.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={canWrite ? 6 : 5}
                  className="py-10 text-center text-muted-foreground"
                >
                  Nenhuma conta com esses filtros.
                </TableCell>
              </TableRow>
            ) : (
              items.map((u) => (
                <TableRow key={u.id}>
                  {canWrite ? (
                    <TableCell>
                      <input
                        type="checkbox"
                        aria-label={`Selecionar ${fullName(u)}`}
                        checked={selected.has(u.id)}
                        onChange={() => toggle(u.id)}
                        className="size-4 align-middle accent-[color:var(--primary)]"
                      />
                    </TableCell>
                  ) : null}
                  <TableCell>
                    <div className="font-medium">
                      {u.firstName} {u.lastName}
                      {u.id === currentUser.id ? (
                        <span className="ml-2 text-xs text-muted-foreground">(você)</span>
                      ) : null}
                    </div>
                    <div className="text-xs text-muted-foreground">{u.email}</div>
                    {/* Só numa conta ATIVA: a conta pendente já diz "Ativação pendente". */}
                    {u.passwordSet || u.status !== 'active' ? null : (
                      <Badge
                        variant="outline"
                        className="mt-1 border-amber-500/50 text-amber-600 dark:text-amber-400"
                        title="A pessoa ainda não criou a senha. O login por código fica bloqueado até o primeiro acesso."
                      >
                        Convite sem resposta
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={roleVariant(u.role)}>{ROLE_LABELS[u.role] ?? u.role}</Badge>
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={u.status} kind="account" />
                  </TableCell>
                  <TableCell className="text-muted-foreground">{formatDate(u.createdAt)}</TableCell>
                  <TableCell className="text-right">
                    <RowActionsMenu label={`Ações para ${fullName(u)}`} items={rowActions(u)} />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      <Pagination total={total} limit={LIMIT} offset={offset} onChange={setOffset} />

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="Editar conta"
        description={editing ? `${fullName(editing)}, ${editing.email}` : undefined}
        footer={
          <>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button onClick={save} disabled={saving}>
              {saving ? <Spinner /> : null}
              Salvar
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nome" htmlFor="firstName">
              <Input
                id="firstName"
                value={form.firstName}
                onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))}
              />
            </Field>
            <Field label="Sobrenome" htmlFor="lastName">
              <Input
                id="lastName"
                value={form.lastName}
                onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))}
              />
            </Field>
          </div>
          <Field label="Telefone" htmlFor="phone" hint="Opcional.">
            <Input
              id="phone"
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Papel"
              htmlFor="role"
              hint={isSelf ? 'Você não pode mudar o próprio papel.' : undefined}
            >
              <Select
                id="role"
                value={form.role}
                disabled={isSelf}
                onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
              >
                {assignableRoles.map((r) => (
                  <option key={r} value={r}>
                    {ROLE_LABELS[r]}
                  </option>
                ))}
              </Select>
            </Field>
            <Field
              label="Situação"
              htmlFor="ustatus"
              hint={isSelf ? 'Você não pode mudar a situação da própria conta.' : undefined}
            >
              <Select
                id="ustatus"
                value={form.status}
                disabled={isSelf}
                onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
              >
                {USER_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {statusLabel(s, 'account')}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          {!isSelf && (form.status === 'suspended' || form.status === 'blocked') ? (
            <p className="text-xs text-muted-foreground">
              Suspender ou bloquear tira a pessoa de todos os aparelhos. Ela não consegue entrar de
              novo enquanto a conta estiver assim.
            </p>
          ) : null}
        </div>
      </Dialog>

      <Dialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Convidar pessoa"
        description="A pessoa recebe um e-mail com um link para criar a própria senha."
        footer={
          <>
            <Button variant="outline" onClick={() => setCreateOpen(false)} disabled={creating}>
              Cancelar
            </Button>
            <Button onClick={create} disabled={creating}>
              {creating ? <Spinner /> : null}
              Enviar convite
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nome" htmlFor="c-firstName">
              <Input
                id="c-firstName"
                value={createForm.firstName}
                onChange={(e) => setCreateForm((f) => ({ ...f, firstName: e.target.value }))}
              />
            </Field>
            <Field label="Sobrenome" htmlFor="c-lastName">
              <Input
                id="c-lastName"
                value={createForm.lastName}
                onChange={(e) => setCreateForm((f) => ({ ...f, lastName: e.target.value }))}
              />
            </Field>
          </div>
          <Field label="E-mail" htmlFor="c-email" hint="O convite vai para este e-mail.">
            <Input
              id="c-email"
              type="email"
              value={createForm.email}
              onChange={(e) => setCreateForm((f) => ({ ...f, email: e.target.value }))}
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Telefone" htmlFor="c-phone" hint="Opcional.">
              <Input
                id="c-phone"
                value={createForm.phone}
                onChange={(e) => setCreateForm((f) => ({ ...f, phone: e.target.value }))}
              />
            </Field>
            <Field label="Papel" htmlFor="c-role">
              <Select
                id="c-role"
                value={createForm.role}
                onChange={(e) => setCreateForm((f) => ({ ...f, role: e.target.value }))}
              >
                {assignableRoles.map((r) => (
                  <option key={r} value={r}>
                    {ROLE_LABELS[r]}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <Field
            label="Comunidade"
            htmlFor="c-platform"
            tooltip="Em qual comunidade o link do convite abre. A conta é a mesma, muda só onde a pessoa entra pela primeira vez."
          >
            <Select
              id="c-platform"
              value={createForm.platform}
              onChange={(e) => setCreateForm((f) => ({ ...f, platform: e.target.value }))}
            >
              {COMMUNITY_OPTIONS.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </Select>
          </Field>
        </div>
      </Dialog>

      <Dialog
        open={impersonateUser !== null}
        onClose={() => setImpersonateUser(null)}
        title={impersonateUser ? `Entrar como ${fullName(impersonateUser)}` : 'Entrar como'}
        description={impersonateUser?.email}
        footer={
          <>
            <Button variant="outline" onClick={() => setImpersonateUser(null)}>
              Cancelar
            </Button>
            <Button
              onClick={() => {
                if (impersonateUser) void impersonate(impersonateUser, impersonatePlatform)
              }}
            >
              <LogIn className="size-4" aria-hidden /> Entrar
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-3">
          <p className="text-muted-foreground text-xs">
            Abre uma aba nova já entrando como esta pessoa, para você ver o que ela vê. Escolha a
            comunidade: a dos Criadores abre na tela de perfis das crianças.
          </p>
          <Field label="Comunidade" htmlFor="impersonate-platform">
            <Select
              id="impersonate-platform"
              value={impersonatePlatform}
              onChange={(e) => setImpersonatePlatform(e.target.value)}
            >
              {COMMUNITY_OPTIONS.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </Select>
          </Field>
        </div>
      </Dialog>

      <Dialog
        open={accessUser !== null}
        onClose={() => setAccessUser(null)}
        title="Acesso e senha"
        description={accessUser ? `${fullName(accessUser)}, ${accessUser.email}` : undefined}
        footer={
          <Button variant="outline" onClick={() => setAccessUser(null)}>
            Fechar
          </Button>
        }
      >
        <div className="flex flex-col gap-5">
          {accessUser && !accessUser.passwordSet ? (
            <p className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-amber-700 text-xs dark:text-amber-300">
              Esta pessoa <strong>ainda não criou a senha</strong>: o convite ou a compra ficou sem
              resposta. O login por código fica bloqueado até o primeiro acesso.
            </p>
          ) : (
            <p className="text-muted-foreground text-xs">Esta pessoa já criou a própria senha.</p>
          )}

          <div className="flex flex-col gap-2">
            <div className="font-medium text-sm">Reenviar link de acesso</div>
            <p className="text-muted-foreground text-xs">
              Manda por e-mail um link novo de primeiro acesso, que vale 14 dias. A pessoa cria a
              própria senha.
            </p>
            <div className="flex items-end gap-2">
              <Field label="Comunidade" htmlFor="access-platform" className="flex-1">
                <Select
                  id="access-platform"
                  value={accessPlatform}
                  onChange={(e) => setAccessPlatform(e.target.value)}
                >
                  {COMMUNITY_OPTIONS.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </Select>
              </Field>
              <Button variant="outline" onClick={resendAccess} disabled={resending}>
                {resending ? <Spinner /> : <Mail className="size-4" aria-hidden />} Reenviar link
              </Button>
            </div>
          </div>

          <div className="flex flex-col gap-2 border-t pt-4">
            <div className="font-medium text-sm">Criar a senha pela pessoa</div>
            <p className="text-muted-foreground text-xs">
              Você cria a senha e conta para a pessoa. Ela sai de todos os aparelhos e entra de novo
              com a senha nova.
            </p>
            <Field label="Nova senha" htmlFor="access-password">
              <Input
                id="access-password"
                type="text"
                autoComplete="off"
                value={accessPassword}
                placeholder={`Pelo menos ${PASSWORD_MIN} caracteres`}
                onChange={(e) => setAccessPassword(e.target.value)}
              />
            </Field>
            <div className="flex justify-end">
              <Button
                onClick={submitSetPassword}
                disabled={settingPassword || accessPassword.trim().length < PASSWORD_MIN}
              >
                {settingPassword ? <Spinner /> : <LockKeyhole className="size-4" aria-hidden />}{' '}
                Criar senha
              </Button>
            </div>
          </div>
        </div>
      </Dialog>

      <GrantAccessDialog
        open={grantUserId !== null}
        userId={grantUserId ?? ''}
        onClose={() => setGrantUserId(null)}
      />

      <GrantAccessDialog
        open={bulkGrantOpen}
        userIds={[...selected]}
        onClose={() => setBulkGrantOpen(false)}
        onGranted={() => {
          setBulkGrantOpen(false)
          setSelected(new Set())
        }}
      />
    </div>
  )
}
