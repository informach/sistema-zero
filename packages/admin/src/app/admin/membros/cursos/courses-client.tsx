'use client'

import { Button, buttonVariants } from '@sistemazero/ui/button'
import { Card } from '@sistemazero/ui/card'
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
import { Textarea } from '@sistemazero/ui/textarea'
import { Pencil, Plus, Search, SquarePen } from 'lucide-react'
import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { AdminHeader } from '@/components/admin/admin-header'
import { MembersTabs } from '@/components/admin/members-tabs'
import { StatusBadge } from '@/components/admin/status-badge'
import { TableSkeletonRows } from '@/components/admin/table-skeleton'
import { useConfirm } from '@/components/admin/use-confirm'
import { ImageUploader } from '@/components/media/image-uploader'
import { type ApiError, apiGet, apiSend } from '@/lib/api'
import { formatDate } from '@/lib/format'
import { slugify } from '@/lib/slug'
import {
  AUDIENCE_LABELS,
  COURSE_AUDIENCES,
  COURSE_LEVELS,
  COURSE_STATUSES,
  type CourseView,
  LEVEL_LABELS,
  type Paginated,
} from '@/lib/types'

const LIMIT = 20

interface FormState {
  slug: string
  title: string
  subtitle: string
  description: string
  coverImageUrl: string
  salesPageUrl: string
  status: string
  audience: string
  level: string
  sequentialLock: boolean
}

const EMPTY: FormState = {
  slug: '',
  title: '',
  subtitle: '',
  description: '',
  coverImageUrl: '',
  salesPageUrl: '',
  status: 'draft',
  audience: 'adult',
  // Padrão: todo curso nasce iniciante (espelha o default da coluna no members).
  level: 'iniciante',
  // Padrão LIGADO (decisão da usuária): curso novo já trava as aulas em sequência.
  sequentialLock: true,
}

export function CoursesClient({ currentRole }: { currentRole: string }) {
  const canWrite = currentRole === 'superadmin' || currentRole === 'admin'

  const [items, setItems] = useState<CourseView[]>([])
  const [total, setTotal] = useState(0)
  const [offset, setOffset] = useState(0)
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(true)

  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<CourseView | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY)
  const [saving, setSaving] = useState(false)
  const { confirm, confirmDialog } = useConfirm()
  // Auto-geração do slug a partir do título (só na criação): para quando o
  // usuário edita o slug manualmente (dirty), p/ não sobrescrever a escolha dele.
  const [slugDirty, setSlugDirty] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ limit: String(LIMIT), offset: String(offset) })
      if (q.trim()) params.set('q', q.trim())
      if (status) params.set('status', status)
      const page = await apiGet<Paginated<CourseView>>(`/api/members/courses?${params}`)
      setItems(page.items)
      setTotal(page.total)
    } catch (err) {
      toast.error((err as ApiError).message ?? 'Falha ao carregar cursos.')
    } finally {
      setLoading(false)
    }
  }, [offset, q, status])

  useEffect(() => {
    const t = setTimeout(load, 250)
    return () => clearTimeout(t)
  }, [load])

  function openCreate() {
    setEditing(null)
    setForm(EMPTY)
    setSlugDirty(false)
    setOpen(true)
  }
  function openEdit(c: CourseView) {
    setEditing(c)
    setSlugDirty(true)
    setForm({
      slug: c.slug,
      title: c.title,
      subtitle: c.subtitle ?? '',
      description: c.description ?? '',
      coverImageUrl: c.coverImageUrl ?? '',
      salesPageUrl: c.salesPageUrl ?? '',
      status: c.status,
      audience: c.audience ?? 'adult',
      level: c.level ?? 'iniciante',
      sequentialLock: c.sequentialLock ?? true,
    })
    setOpen(true)
  }

  async function save() {
    if (!form.title.trim() || !form.slug.trim()) {
      toast.error('Preencha slug e título.')
      return
    }
    if (form.salesPageUrl.trim() && !/^https?:\/\//i.test(form.salesPageUrl.trim())) {
      toast.error('A página de vendas precisa ser uma URL completa (começando com https://).')
      return
    }
    setSaving(true)
    try {
      const payload = {
        slug: form.slug.trim(),
        title: form.title.trim(),
        subtitle: form.subtitle.trim() ? form.subtitle.trim() : null,
        description: form.description.trim() ? form.description.trim() : null,
        coverImageUrl: form.coverImageUrl.trim() ? form.coverImageUrl.trim() : null,
        salesPageUrl: form.salesPageUrl.trim() ? form.salesPageUrl.trim() : null,
        status: form.status,
        // SEMPRE enviado (explícito > depender do preserve do members no PATCH).
        audience: form.audience,
        level: form.level,
        sequentialLock: form.sequentialLock,
      }
      if (editing) {
        await apiSend(`/api/members/courses/${editing.id}`, 'PATCH', payload)
        toast.success('Curso atualizado.')
      } else {
        await apiSend('/api/members/courses', 'POST', payload)
        toast.success('Curso criado.')
      }
      setOpen(false)
      await load()
    } catch (err) {
      toast.error((err as ApiError).message ?? 'Não foi possível salvar.')
    } finally {
      setSaving(false)
    }
  }

  function remove(c: CourseView) {
    confirm({
      title: 'Excluir curso',
      message: (
        <>
          Excluir o curso <strong className="text-foreground">{c.title}</strong>? Módulos, aulas e
          progresso serão removidos. Esta ação não pode ser desfeita.
        </>
      ),
      confirmText: 'Excluir',
      confirmVariant: 'destructive',
      onConfirm: async () => {
        try {
          await apiSend(`/api/members/courses/${c.id}`, 'DELETE')
          toast.success('Curso excluído.')
          await load()
        } catch (err) {
          toast.error((err as ApiError).message ?? 'Não foi possível excluir.')
        }
      },
    })
  }

  return (
    <div className="space-y-6">
      {confirmDialog}
      <AdminHeader
        title="Membros"
        description="Cursos da área de membros — autoria de conteúdo (módulos, aulas, blocos)."
        action={
          canWrite ? (
            <Button onClick={openCreate}>
              <Plus className="size-4" /> Novo curso
            </Button>
          ) : undefined
        }
      />
      <MembersTabs />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por título ou slug…"
            value={q}
            onChange={(e) => {
              setOffset(0)
              setQ(e.target.value)
            }}
            className="pl-8"
          />
        </div>
        <Select
          value={status}
          onChange={(e) => {
            setOffset(0)
            setStatus(e.target.value)
          }}
          className="sm:w-44"
        >
          <option value="">Todos os status</option>
          {COURSE_STATUSES.map((s) => (
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
              <TableHead>Curso</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Atualizado</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableSkeletonRows columns={4} />
            ) : items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="py-10 text-center text-muted-foreground">
                  Nenhum curso encontrado.
                </TableCell>
              </TableRow>
            ) : (
              items.map((c) => (
                <TableRow key={c.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{c.title}</span>
                      {c.audience === 'kids' ? (
                        <span className="rounded-full bg-success/15 px-2 py-0.5 text-[11px] font-medium text-success-foreground">
                          Kids
                        </span>
                      ) : null}
                    </div>
                    <div className="text-xs text-muted-foreground">{c.slug}</div>
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={c.status} />
                  </TableCell>
                  <TableCell className="text-muted-foreground">{formatDate(c.updatedAt)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Link
                        href={`/admin/membros/cursos/${c.id}`}
                        className={buttonVariants({ variant: 'ghost', size: 'sm' })}
                      >
                        <SquarePen className="size-4" /> Conteúdo
                      </Link>
                      {canWrite ? (
                        <>
                          <Button variant="ghost" size="sm" onClick={() => openEdit(c)}>
                            <Pencil className="size-4" /> Editar
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => remove(c)}>
                            Excluir
                          </Button>
                        </>
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
        title={editing ? 'Editar curso' : 'Novo curso'}
        description={editing ? editing.title : 'Cadastre um curso na área de membros.'}
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
          <Field
            label="Título"
            htmlFor="title"
            hint="O slug é gerado automaticamente a partir dele."
          >
            <Input
              id="title"
              value={form.title}
              onChange={(e) => {
                const title = e.target.value
                setForm((f) => ({
                  ...f,
                  title,
                  ...(!editing && !slugDirty ? { slug: slugify(title) } : {}),
                }))
              }}
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Slug"
              htmlFor="slug"
              tooltip="Identificador do curso na URL e nas matrículas (minúsculas-com-hifens). Preenchido sozinho a partir do título; edite antes de salvar se quiser outro."
            >
              <Input
                id="slug"
                value={form.slug}
                onChange={(e) => {
                  setSlugDirty(true)
                  setForm((f) => ({ ...f, slug: e.target.value }))
                }}
              />
            </Field>
            <Field label="Status" htmlFor="cstatus">
              <Select
                id="cstatus"
                value={form.status}
                onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
              >
                {COURSE_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <Field
            label="Audiência"
            htmlFor="caudience"
            tooltip="Em qual plataforma o curso aparece: Adulto (comunidade principal) ou Kids (plataforma infanto-juvenil). Cursos Kids ficam FORA da chave-mestra 'todos os cursos' — acesso é sempre por matrícula específica."
          >
            <Select
              id="caudience"
              value={form.audience}
              onChange={(e) => setForm((f) => ({ ...f, audience: e.target.value }))}
            >
              {COURSE_AUDIENCES.map((a) => (
                <option key={a} value={a}>
                  {AUDIENCE_LABELS[a]}
                </option>
              ))}
            </Select>
          </Field>
          <Field
            label="Nível do curso"
            htmlFor="clevel"
            tooltip="Dificuldade do curso (Iniciante/Intermediário/Avançado). Conta para o NÍVEL do aluno: concluir e publicar no Mural cursos de cada dificuldade faz o aluno subir de Faísca até Lenda."
          >
            <Select
              id="clevel"
              value={form.level}
              onChange={(e) => setForm((f) => ({ ...f, level: e.target.value }))}
            >
              {COURSE_LEVELS.map((l) => (
                <option key={l} value={l}>
                  {LEVEL_LABELS[l]}
                </option>
              ))}
            </Select>
          </Field>
          <Field
            label="Trava sequencial das aulas"
            htmlFor="csequentiallock"
            tooltip="Estilo Duolingo: o aluno só abre a próxima aula depois de concluir a anterior, na ordem. Desligado = navegação livre (pode pular entre as aulas)."
          >
            <label
              htmlFor="csequentiallock"
              className="flex items-center gap-2 text-muted-foreground text-sm"
            >
              <input
                id="csequentiallock"
                type="checkbox"
                checked={form.sequentialLock}
                onChange={(e) => setForm((f) => ({ ...f, sequentialLock: e.target.checked }))}
                className="size-4"
              />
              Liberar uma aula de cada vez (concluir a anterior destrava a próxima)
            </label>
          </Field>
          <Field label="Subtítulo" htmlFor="subtitle" hint="Opcional.">
            <Input
              id="subtitle"
              value={form.subtitle}
              onChange={(e) => setForm((f) => ({ ...f, subtitle: e.target.value }))}
            />
          </Field>
          <Field label="Descrição" htmlFor="desc" hint="Opcional.">
            <Textarea
              id="desc"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />
          </Field>
          <Field
            label="Imagem de capa"
            htmlFor="cover"
            hint="Opcional. Envie um arquivo ou cole uma URL."
          >
            <ImageUploader
              inputId="cover"
              scope="course"
              value={form.coverImageUrl}
              onChange={(url) => setForm((f) => ({ ...f, coverImageUrl: url }))}
            />
          </Field>
          <Field
            label="Página de vendas (URL)"
            htmlFor="salesPageUrl"
            tooltip='Para onde o aluno SEM acesso é levado ao clicar no curso com cadeado em "Todos os cursos" (abre em nova aba). Vazio → usa a página padrão do funil.'
          >
            <Input
              id="salesPageUrl"
              type="url"
              placeholder="https://sistemazero.com.br/oferta/..."
              value={form.salesPageUrl}
              onChange={(e) => setForm((f) => ({ ...f, salesPageUrl: e.target.value }))}
            />
          </Field>
        </div>
      </Dialog>
    </div>
  )
}
