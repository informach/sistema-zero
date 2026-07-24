'use client'

import { Button } from '@sistemazero/ui/button'
import { Dialog } from '@sistemazero/ui/dialog'
import { Input } from '@sistemazero/ui/input'
import { Field } from '@sistemazero/ui/label'
import { Select } from '@sistemazero/ui/select'
import { Spinner } from '@sistemazero/ui/spinner'
import { Textarea } from '@sistemazero/ui/textarea'
import { TriangleAlert } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { ImageUploader } from '@/components/media/image-uploader'
import { type ApiError, apiGet, apiSend } from '@/lib/api'
import { loadAllPages } from '@/lib/load-all-pages'
import { slugify } from '@/lib/slug'
import {
  AUDIENCE_LABELS,
  COURSE_AUDIENCES,
  COURSE_STATUSES,
  COURSE_TIER_OPTIONS,
  type CourseView,
  type Paginated,
} from '@/lib/types'

/** Pré-preenchimento ao criar um curso já mirando uma posição da carreira. */
export interface CoursePrefill {
  audience?: string
  level?: string
  track?: string
  careerSlot?: number
}

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
  track: string
  careerSlot: string
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
  // Padrão: todo curso nasce Iniciante 2D (espelha os defaults das colunas no members).
  level: 'iniciante',
  track: '2d',
  careerSlot: '',
  // Padrão LIGADO (decisão da usuária): curso novo já trava as aulas em sequência.
  sequentialLock: true,
}

/** Nº de posições da etapa: só Iniciante 2D tem 6; as demais têm 5 (espelha o CHECK 0049). */
function slotsForTier(level: string, track: string): number {
  return level === 'iniciante' && track === '2d' ? 6 : 5
}

function formFromCourse(c: CourseView): FormState {
  return {
    slug: c.slug,
    title: c.title,
    subtitle: c.subtitle ?? '',
    description: c.description ?? '',
    coverImageUrl: c.coverImageUrl ?? '',
    salesPageUrl: c.salesPageUrl ?? '',
    status: c.status,
    audience: c.audience ?? 'adult',
    level: c.level ?? 'iniciante',
    track: c.track ?? '2d',
    careerSlot: c.careerSlot == null ? '' : String(c.careerSlot),
    sequentialLock: c.sequentialLock ?? true,
  }
}

function formFromPrefill(prefill: CoursePrefill | undefined): FormState {
  if (!prefill) return EMPTY
  return {
    ...EMPTY,
    audience: prefill.audience ?? EMPTY.audience,
    level: prefill.level ?? EMPTY.level,
    track: prefill.track ?? EMPTY.track,
    careerSlot: prefill.careerSlot != null ? String(prefill.careerSlot) : '',
  }
}

/**
 * Dialog de criação/edição de curso — reusado pela listagem (`courses-client`) e
 * pelo editor do curso (`[courseId]`). Envia o payload COMPLETO sempre (o members
 * PRESERVA campos ausentes no PATCH, mas `salesPageUrl` ausente LIMPA a chave — por
 * isso mandar tudo é o contrato seguro).
 */
export function CourseFormDialog({
  open,
  onClose,
  editing,
  prefill,
  careerCourses,
  onSaved,
}: {
  open: boolean
  onClose: () => void
  /** Curso em edição; `null` = criação. */
  editing: CourseView | null
  /** Só na criação: mira uma etapa/posição da carreira (painel de prontidão). */
  prefill?: CoursePrefill
  /** Lista de cursos Kids p/ mostrar a OCUPAÇÃO das posições; buscada sozinha se ausente. */
  careerCourses?: CourseView[]
  onSaved: () => void | Promise<void>
}) {
  const [form, setForm] = useState<FormState>(EMPTY)
  const [saving, setSaving] = useState(false)
  // Slug auto do título só na CRIAÇÃO; para quando o autor edita o slug à mão.
  const [slugDirty, setSlugDirty] = useState(false)
  const [kidsCourses, setKidsCourses] = useState<CourseView[]>(careerCourses ?? [])

  // Reinicializa o formulário toda vez que o dialog abre (ou troca de alvo aberto).
  useEffect(() => {
    if (!open) return
    if (editing) {
      setForm(formFromCourse(editing))
      setSlugDirty(true)
    } else {
      setForm(formFromPrefill(prefill))
      setSlugDirty(false)
    }
  }, [open, editing, prefill])

  // Ocupação das posições: usa a lista recebida ou busca os cursos Kids ao abrir.
  useEffect(() => {
    if (!open) return
    if (careerCourses) {
      setKidsCourses(careerCourses)
      return
    }
    let cancelled = false
    void loadAllPages((pageOffset, limit) =>
      apiGet<Paginated<CourseView>>(
        `/api/members/courses?audience=kids&limit=${limit}&offset=${pageOffset}`,
      ),
    )
      .then((courses) => {
        if (!cancelled) setKidsCourses(courses)
      })
      .catch(() => {
        /* ocupação é auxiliar — silencie a falha, o Select ainda funciona */
      })
    return () => {
      cancelled = true
    }
  }, [open, careerCourses])

  const isKids = form.audience === 'kids'
  const maxSlot = slotsForTier(form.level, form.track)
  const occupantBySlot = new Map<number, CourseView>()
  for (const c of kidsCourses) {
    if (c.careerSlot != null && c.level === form.level && (c.track ?? '2d') === form.track) {
      occupantBySlot.set(c.careerSlot, c)
    }
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
        track: form.track,
        careerSlot: form.audience === 'kids' && form.careerSlot ? Number(form.careerSlot) : null,
        sequentialLock: form.sequentialLock,
      }
      if (editing) {
        await apiSend(`/api/members/courses/${editing.id}`, 'PATCH', payload)
        toast.success('Curso atualizado.')
      } else {
        await apiSend('/api/members/courses', 'POST', payload)
        toast.success('Curso criado.')
      }
      onClose()
      await onSaved()
    } catch (err) {
      toast.error((err as ApiError).message ?? 'Não foi possível salvar.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={editing ? 'Editar curso' : 'Novo curso'}
      description={editing ? editing.title : 'Cadastre um curso na área de membros.'}
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={saving}>
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
        <Field label="Título" htmlFor="title" hint="O slug é gerado automaticamente a partir dele.">
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
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                audience: e.target.value,
                // Posição na carreira só existe p/ Kids; limpa ao virar adulto.
                careerSlot: e.target.value === 'kids' ? f.careerSlot : '',
              }))
            }
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
          tooltip="Degrau do curso: dificuldade (Iniciante/Intermediário/Avançado) × eixo (2D/3D). Conta para a CARREIRA do aluno: concluir e publicar no Mural cursos de cada degrau, na ordem da escada (2D antes do 3D em cada dificuldade), faz o aluno subir de Faísca até Lenda."
        >
          {/* UM select de 6 opções que escreve os DOIS campos (level + track). */}
          <Select
            id="clevel"
            value={`${form.level}:${form.track}`}
            onChange={(e) => {
              const [level, track] = e.target.value.split(':')
              setForm((f) => {
                const nextLevel = level ?? f.level
                const nextTrack = track ?? f.track
                const max = slotsForTier(nextLevel, nextTrack)
                const slotNum = f.careerSlot ? Number(f.careerSlot) : 0
                return {
                  ...f,
                  level: nextLevel,
                  track: nextTrack,
                  // Trocar de etapa pode reduzir 6→5 posições: limpa se sobrar.
                  careerSlot: slotNum > max ? '' : f.careerSlot,
                }
              })
            }}
          >
            {COURSE_TIER_OPTIONS.map((o) => (
              <option key={`${o.level}:${o.track}`} value={`${o.level}:${o.track}`}>
                {o.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field
          label="Posição na Carreira do Criador"
          htmlFor="career-slot"
          tooltip="Ordena os cursos Kids dentro da etapa. A posição 1 é o CURSO-BASE: o aluno precisa concluí-lo e publicar no Mural para as demais posições da etapa liberarem. 'Curso bônus' fica fora da trava (aparece, mas não segura os outros)."
          hint={
            isKids
              ? '1 é o curso-base da etapa (destrava as demais posições). Deixe em bônus para cursos extras.'
              : 'Disponível apenas para cursos Kids.'
          }
        >
          <Select
            id="career-slot"
            value={form.careerSlot}
            disabled={!isKids}
            onChange={(e) => setForm((f) => ({ ...f, careerSlot: e.target.value }))}
          >
            <option value="">Nenhuma — curso bônus (fora da trava)</option>
            {Array.from({ length: maxSlot }, (_, i) => i + 1).map((slot) => {
              const occ = occupantBySlot.get(slot)
              const takenByOther = !!occ && occ.id !== editing?.id
              const base =
                slot === 1 ? '1 — Curso-base da etapa (destrava os outros)' : String(slot)
              const suffix = occ
                ? occ.id === editing?.id
                  ? ' — este curso'
                  : ` — ocupado: ${occ.title}`
                : ''
              return (
                <option key={slot} value={String(slot)} disabled={takenByOther}>
                  {base + suffix}
                </option>
              )
            })}
          </Select>
          {editing?.careerSlot === 1 &&
          editing.status === 'published' &&
          editing.hasShowcaseBlock === false ? (
            <p className="mt-1.5 flex items-start gap-1.5 text-destructive text-xs" role="alert">
              <TriangleAlert className="mt-0.5 size-3.5 shrink-0" />
              Este curso-base ainda não tem aula publicada com bloco de Estúdio com vitrine
              (Publicar no Mural). Sem isso o aluno nunca qualifica a posição 1 e a etapa não
              destrava.
            </p>
          ) : null}
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
  )
}
