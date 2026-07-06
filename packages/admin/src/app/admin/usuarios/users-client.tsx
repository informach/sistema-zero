'use client'

import { Badge } from '@sistemazero/ui/badge'
import { Button, buttonVariants } from '@sistemazero/ui/button'
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
import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { AdminHeader } from '@/components/admin/admin-header'
import { GrantAccessDialog } from '@/components/admin/grant-access-dialog'
import { StatusBadge } from '@/components/admin/status-badge'
import { TableSkeletonRows } from '@/components/admin/table-skeleton'
import { useConfirm } from '@/components/admin/use-confirm'
import { type ApiError, apiGet, apiSend } from '@/lib/api'
import { dateInputToSaoPauloEndOfDayIso, dateInputToSaoPauloStartOfDayIso } from '@/lib/dates'
import { formatDate } from '@/lib/format'
import { canImpersonate, impersonationUrl } from '@/lib/impersonation'
import { mapPool } from '@/lib/pool'
import {
  type Paginated,
  PRIVILEGED_ROLES,
  USER_ROLES,
  USER_STATUSES,
  type UserView,
} from '@/lib/types'

const LIMIT = 20
/** Mínimo de senha (client hint; o auth valida de verdade — PASSWORD_MIN_LENGTH). */
const PASSWORD_MIN = 10

const ROLE_LABELS: Record<string, string> = {
  superadmin: 'Superadmin',
  admin: 'Admin',
  staff: 'Equipe',
  customer: 'Cliente',
}

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

/** Origens de cadastro conhecidas (filtro). `signupSource` é texto livre no auth. */
const SOURCE_OPTIONS = [
  { value: 'funnel', label: 'Funil' },
  { value: 'admin', label: 'Convite (admin)' },
  { value: 'web', label: 'Web' },
  { value: 'mobile', label: 'Mobile' },
]

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
      toast.success('Usuário excluído.')
      setDeletingUser(null)
      await load()
    } catch (err) {
      // Mantém o modal aberto p/ nova tentativa (a conta segue intacta se a falha
      // ocorreu antes de apagar a identidade no auth).
      toast.error((err as ApiError).message ?? 'Não foi possível excluir o usuário.')
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
      toast.error((err as ApiError).message ?? 'Falha ao carregar usuários.')
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
      toast.success('Usuário atualizado.')
      setOpen(false)
      await load()
    } catch (err) {
      const e = err as ApiError
      if (e.status === 409) {
        toast.error('Registro alterado por outra operação. Recarregando…')
        setOpen(false)
        await load()
      } else {
        toast.error(e.message ?? 'Não foi possível salvar.')
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
        toast.success('Usuário criado. Convite enviado por e-mail.')
      } else {
        toast.warning(
          'Usuário criado, mas o convite NÃO foi enviado — peça para usar "esqueci minha senha".',
        )
      }
      setCreateOpen(false)
      setCreateForm(EMPTY_CREATE)
      await load()
    } catch (err) {
      const e = err as ApiError
      toast.error(
        e.status === 409 ? 'E-mail já cadastrado.' : (e.message ?? 'Não foi possível criar.'),
      )
    } finally {
      setCreating(false)
    }
  }

  // "Entrar como" (suporte): pede o token de handoff e abre a community em nova aba
  // já logada como o usuário. O token é single-use/60s — a aba precisa abrir na hora.
  async function impersonate(u: UserView) {
    setImpersonatingId(u.id)
    try {
      const res = await apiSend<{ token: string; expiresAt: string; communityUrl: string }>(
        `/api/admin/users/${u.id}/impersonate`,
        'POST',
        {},
      )
      window.open(impersonationUrl(res.communityUrl, res.token), '_blank', 'noopener,noreferrer')
      toast.success(`Sessão de suporte aberta como ${u.firstName} ${u.lastName}.`)
    } catch (err) {
      const e = err as ApiError
      toast.error(
        e.status === 403
          ? 'Sem permissão para entrar como este usuário.'
          : (e.message ?? 'Não foi possível iniciar a sessão de suporte.'),
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
        toast.warning('Não foi possível enviar o e-mail (conta inativa ou envio indisponível).')
      }
    } catch (err) {
      toast.error((err as ApiError).message ?? 'Não foi possível reenviar o link.')
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
      toast.success('Senha definida. As sessões do cliente foram encerradas.')
      setAccessUser(null)
      await load() // reflete "acesso pendente" → definido na listagem.
    } catch (err) {
      toast.error((err as ApiError).message ?? 'Não foi possível definir a senha.')
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
      toast.error('Nenhum usuário elegível na seleção (sem permissão ou é você).')
      return
    }
    const verb = targetStatus === 'suspended' ? 'Suspender' : 'Ativar'
    confirm({
      title: `${verb} usuários`,
      message: `${verb} ${editable.length} usuário(s) selecionado(s)?`,
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
          const parts = [`${ok} ${targetStatus === 'suspended' ? 'suspenso(s)' : 'ativado(s)'}`]
          if (failed > 0) parts.push(`${failed} falhou(aram)`)
          if (skipped > 0) parts.push(`${skipped} ignorado(s)`)
          if (failed > 0) toast.warning(parts.join(' · '))
          else toast.success(parts.join(' · '))
          await load()
        } finally {
          setBulkBusy(false)
        }
      },
    })
  }

  return (
    <div className="space-y-6">
      {confirmDialog}
      <ConfirmDialog
        open={deletingUser !== null}
        onClose={() => setDeletingUser(null)}
        title="Excluir usuário"
        confirmText="Excluir definitivamente"
        confirmVariant="destructive"
        confirmDisabled={
          deleteConfirm.trim().toLowerCase() !== (deletingUser?.email ?? '').toLowerCase()
        }
        onConfirm={confirmDelete}
        message={
          <>
            Esta ação é <strong className="text-foreground">irreversível</strong>. Apaga a conta{' '}
            <strong className="text-foreground">{deletingUser?.email}</strong>, todos os perfis,
            progresso, gamificação, certificados e dados de comunidade. Pagamentos e notas fiscais
            são preservados.
          </>
        }
      >
        <div className="space-y-1.5">
          <label htmlFor="delete-confirm-email" className="font-medium text-foreground text-xs">
            Para confirmar, digite o e-mail do usuário:
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
        title="Usuários"
        description="Gerencie contas, papéis e status (suspender/bloquear) da base."
        action={
          canWrite ? (
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="size-4" /> Novo usuário
            </Button>
          ) : undefined
        }
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome ou e-mail…"
            value={q}
            onChange={(e) => {
              setOffset(0)
              setQ(e.target.value)
            }}
            className="pl-8"
          />
        </div>
        <Select
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
          value={status}
          onChange={(e) => {
            setOffset(0)
            setStatus(e.target.value)
          }}
          className="sm:w-44"
        >
          <option value="">Todos os status</option>
          {USER_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
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
            <strong>{selected.size}</strong> selecionado(s)
          </span>
          <div className="ml-auto flex flex-wrap gap-2">
            <Button size="sm" disabled={bulkBusy} onClick={() => setBulkGrantOpen(true)}>
              <KeyRound className="size-4" /> Conceder acesso
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
              Limpar
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
                    aria-label="Selecionar todos nesta página"
                    checked={allOnPageSelected}
                    onChange={toggleAllOnPage}
                    className="size-4 align-middle accent-[color:var(--primary)]"
                  />
                </TableHead>
              ) : null}
              <TableHead>Usuário</TableHead>
              <TableHead>Papel</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Criado em</TableHead>
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
                  Nenhum usuário encontrado.
                </TableCell>
              </TableRow>
            ) : (
              items.map((u) => (
                <TableRow key={u.id}>
                  {canWrite ? (
                    <TableCell>
                      <input
                        type="checkbox"
                        aria-label={`Selecionar ${u.firstName} ${u.lastName}`}
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
                    {u.passwordSet ? null : (
                      <Badge
                        variant="outline"
                        className="mt-1 border-amber-500/50 text-amber-600 dark:text-amber-400"
                        title="A conta ainda não definiu a senha — o login por código fica bloqueado até o 1º acesso."
                      >
                        Acesso pendente
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={roleVariant(u.role)}>{ROLE_LABELS[u.role] ?? u.role}</Badge>
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={u.status} />
                  </TableCell>
                  <TableCell className="text-muted-foreground">{formatDate(u.createdAt)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      {canWrite ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          title="Conceder acesso a conteúdo (cortesia/teste)"
                          onClick={() => setGrantUserId(u.id)}
                        >
                          <KeyRound className="size-4" /> Conceder acesso
                        </Button>
                      ) : null}
                      <Link
                        href={`/admin/membros/${u.id}`}
                        title="Ver matrículas do usuário"
                        className={buttonVariants({ variant: 'ghost', size: 'sm' })}
                      >
                        <GraduationCap className="size-4" /> Matrículas
                      </Link>
                      {canImpersonate(currentUser, u) ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          title="Entrar na área do aluno como este usuário (suporte)"
                          disabled={impersonatingId === u.id}
                          onClick={() => impersonate(u)}
                        >
                          {impersonatingId === u.id ? <Spinner /> : <LogIn className="size-4" />}{' '}
                          Entrar como
                        </Button>
                      ) : null}
                      {canEdit(u) && u.id !== currentUser.id ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          title="Reenviar o link de acesso ou definir a senha (cliente preso)"
                          onClick={() => openAccess(u)}
                        >
                          <LockKeyhole className="size-4" /> Acesso
                        </Button>
                      ) : null}
                      {canEdit(u) ? (
                        <Button variant="ghost" size="sm" onClick={() => openEdit(u)}>
                          <Pencil className="size-4" /> Editar
                        </Button>
                      ) : null}
                      {canDelete(u) ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          title="Excluir o usuário e todos os seus dados (irreversível)"
                          className="text-destructive hover:text-destructive"
                          onClick={() => askDelete(u)}
                        >
                          <Trash2 className="size-4" /> Excluir
                        </Button>
                      ) : null}
                    </div>
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
        title="Editar usuário"
        description={editing?.email}
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
              hint={isSelf ? 'Você não pode alterar o próprio papel.' : undefined}
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
              label="Status"
              htmlFor="ustatus"
              hint={isSelf ? 'Você não pode alterar o próprio status.' : undefined}
            >
              <Select
                id="ustatus"
                value={form.status}
                disabled={isSelf}
                onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
              >
                {USER_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          {!isSelf && (form.status === 'suspended' || form.status === 'blocked') ? (
            <p className="text-xs text-muted-foreground">
              Suspender/bloquear encerra as sessões ativas do usuário (não poderá renovar o acesso).
            </p>
          ) : null}
        </div>
      </Dialog>

      <Dialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Novo usuário"
        description="Convite por e-mail: a pessoa recebe um link para definir a própria senha."
        footer={
          <>
            <Button variant="outline" onClick={() => setCreateOpen(false)} disabled={creating}>
              Cancelar
            </Button>
            <Button onClick={create} disabled={creating}>
              {creating ? <Spinner /> : null}
              Criar e enviar convite
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
          <Field label="E-mail" htmlFor="c-email" hint="Destino do convite de definição de senha.">
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
            label="Plataforma do convite"
            htmlFor="c-platform"
            tooltip="Para onde o link do e-mail de convite aponta: a comunidade principal ou a plataforma Kids. Não muda a conta — só o destino do primeiro acesso."
          >
            <Select
              id="c-platform"
              value={createForm.platform}
              onChange={(e) => setCreateForm((f) => ({ ...f, platform: e.target.value }))}
            >
              <option value="main">Principal (comunidade)</option>
              <option value="kids">Kids</option>
            </Select>
          </Field>
        </div>
      </Dialog>

      <Dialog
        open={accessUser !== null}
        onClose={() => setAccessUser(null)}
        title="Acesso e senha"
        description={accessUser?.email}
        footer={
          <Button variant="outline" onClick={() => setAccessUser(null)}>
            Fechar
          </Button>
        }
      >
        <div className="flex flex-col gap-5">
          {accessUser && !accessUser.passwordSet ? (
            <p className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-amber-700 text-xs dark:text-amber-300">
              Esta conta ainda <strong>não definiu a senha</strong> (convite/compra pendente). O
              login por código fica bloqueado até o primeiro acesso.
            </p>
          ) : (
            <p className="text-muted-foreground text-xs">Esta conta já definiu a própria senha.</p>
          )}

          <div className="flex flex-col gap-2">
            <div className="font-medium text-sm">Reenviar link de acesso</div>
            <p className="text-muted-foreground text-xs">
              Gera um novo link de primeiro acesso (vale 14 dias) e reenvia por e-mail. O cliente
              define a própria senha.
            </p>
            <div className="flex items-end gap-2">
              <Field label="Plataforma" htmlFor="access-platform" className="flex-1">
                <Select
                  id="access-platform"
                  value={accessPlatform}
                  onChange={(e) => setAccessPlatform(e.target.value)}
                >
                  <option value="main">Principal (comunidade)</option>
                  <option value="kids">Kids</option>
                </Select>
              </Field>
              <Button variant="outline" onClick={resendAccess} disabled={resending}>
                {resending ? <Spinner /> : <Mail className="size-4" />} Reenviar link
              </Button>
            </div>
          </div>

          <div className="flex flex-col gap-2 border-t pt-4">
            <div className="font-medium text-sm">Definir senha manualmente</div>
            <p className="text-muted-foreground text-xs">
              Você cria a senha e informa o cliente. As sessões atuais dele serão encerradas.
            </p>
            <Field label="Nova senha" htmlFor="access-password">
              <Input
                id="access-password"
                type="text"
                autoComplete="off"
                value={accessPassword}
                placeholder={`mínimo ${PASSWORD_MIN} caracteres`}
                onChange={(e) => setAccessPassword(e.target.value)}
              />
            </Field>
            <div className="flex justify-end">
              <Button
                onClick={submitSetPassword}
                disabled={settingPassword || accessPassword.trim().length < PASSWORD_MIN}
              >
                {settingPassword ? <Spinner /> : <LockKeyhole className="size-4" />} Definir senha
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
