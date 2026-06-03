'use client'

import { Pencil, Search } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { AdminHeader } from '@/components/admin/admin-header'
import { StatusBadge } from '@/components/admin/status-badge'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Dialog } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Field } from '@/components/ui/label'
import { Pagination } from '@/components/ui/pagination'
import { Select } from '@/components/ui/select'
import { Spinner } from '@/components/ui/spinner'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { type ApiError, apiGet, apiSend } from '@/lib/api'
import { formatDate } from '@/lib/format'
import {
  type Paginated,
  PRIVILEGED_ROLES,
  USER_ROLES,
  USER_STATUSES,
  type UserView,
} from '@/lib/types'

const LIMIT = 20

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

export function UsersClient({ currentUser }: { currentUser: { id: string; role: string } }) {
  const [items, setItems] = useState<UserView[]>([])
  const [total, setTotal] = useState(0)
  const [offset, setOffset] = useState(0)
  const [q, setQ] = useState('')
  const [role, setRole] = useState('')
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(true)

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

  const isSuper = currentUser.role === 'superadmin'
  const isAdmin = currentUser.role === 'admin'
  const canWrite = isSuper || isAdmin
  // admin não edita contas admin/superadmin; superadmin edita qualquer uma. staff é só leitura.
  const canEdit = (u: UserView): boolean =>
    canWrite && (isSuper || !PRIVILEGED_ROLES.includes(u.role))
  // admin só pode atribuir staff/customer (não promove a admin/superadmin).
  const assignableRoles = isSuper
    ? USER_ROLES
    : USER_ROLES.filter((r) => !PRIVILEGED_ROLES.includes(r))

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ limit: String(LIMIT), offset: String(offset) })
      if (q.trim()) params.set('q', q.trim())
      if (role) params.set('role', role)
      if (status) params.set('status', status)
      const page = await apiGet<Paginated<UserView>>(`/api/admin/users?${params}`)
      setItems(page.items)
      setTotal(page.total)
    } catch (err) {
      toast.error((err as ApiError).message ?? 'Falha ao carregar usuários.')
    } finally {
      setLoading(false)
    }
  }, [offset, q, role, status])

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

  const isSelf = editing?.id === currentUser.id

  return (
    <div className="space-y-6">
      <AdminHeader
        title="Usuários"
        description="Gerencie contas, papéis e status (suspender/bloquear) da base."
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

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Usuário</TableHead>
              <TableHead>Papel</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Criado em</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                  <Spinner className="mx-auto" />
                </TableCell>
              </TableRow>
            ) : items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                  Nenhum usuário encontrado.
                </TableCell>
              </TableRow>
            ) : (
              items.map((u) => (
                <TableRow key={u.id}>
                  <TableCell>
                    <div className="font-medium">
                      {u.firstName} {u.lastName}
                      {u.id === currentUser.id ? (
                        <span className="ml-2 text-xs text-muted-foreground">(você)</span>
                      ) : null}
                    </div>
                    <div className="text-xs text-muted-foreground">{u.email}</div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={roleVariant(u.role)}>{ROLE_LABELS[u.role] ?? u.role}</Badge>
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={u.status} />
                  </TableCell>
                  <TableCell className="text-muted-foreground">{formatDate(u.createdAt)}</TableCell>
                  <TableCell className="text-right">
                    {canEdit(u) ? (
                      <Button variant="ghost" size="sm" onClick={() => openEdit(u)}>
                        <Pencil className="size-4" /> Editar
                      </Button>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
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
    </div>
  )
}
