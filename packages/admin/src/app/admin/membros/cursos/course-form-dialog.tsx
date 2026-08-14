'use client'

import { Button } from '@sistemazero/ui/button'
import { Dialog } from '@sistemazero/ui/dialog'
import { Input } from '@sistemazero/ui/input'
import { Field } from '@sistemazero/ui/label'
import { Select } from '@sistemazero/ui/select'
import { Spinner } from '@sistemazero/ui/spinner'
import { Textarea } from '@sistemazero/ui/textarea'
import { TriangleAlert } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { useConfirm } from '@/components/admin/use-confirm'
import { ImageUploader } from '@/components/media/image-uploader'
import { StudioBlocksPicker } from '@/components/studio/studio-blocks-picker'
import { type ApiError, apiGet, apiSend } from '@/lib/api'
import { courseSaveError } from '@/lib/course-errors'
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
  /** Blocos que este curso libera no Estúdio livre (currículo, 08/2026). */
  studioUnlockBlocks: string[]
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
  studioUnlockBlocks: [],
}

/**
 * Nº de posições da etapa: 8 por degrau (reforma 07/2026; era 6 no ini-2d e 5 nas
 * demais). Espelha o CHECK da migration `0053` e o catálogo do core. Exportada SÓ p/
 * a trava de conformance admin×core (`career-tier-conformance`).
 */
export function slotsForTier(_level: string, _track: string): number {
  return 8
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
    studioUnlockBlocks: c.studioUnlockBlocks ?? [],
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
  const router = useRouter()
  const { confirm, confirmDialog } = useConfirm()

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

  /**
   * Re-busca a ocupação das posições da API e SOBRESCREVE o estado — a prop
   * `careerCourses` é só o seed inicial (num 409 de posição a lista da prop já
   * está velha; sem o fetch o Select seguiria mentindo).
   */
  const refreshOccupancy = useCallback(async () => {
    try {
      const courses = await loadAllPages((pageOffset, limit) =>
        apiGet<Paginated<CourseView>>(
          `/api/members/courses?audience=kids&limit=${limit}&offset=${pageOffset}`,
        ),
      )
      setKidsCourses(courses)
    } catch {
      /* ocupação é auxiliar — silencie a falha, o Select ainda funciona */
    }
  }, [])

  // Ocupação das posições: usa a lista recebida (seed) ou busca os cursos Kids ao abrir.
  useEffect(() => {
    if (!open) return
    if (careerCourses) {
      setKidsCourses(careerCourses)
      return
    }
    void refreshOccupancy()
  }, [open, careerCourses, refreshOccupancy])

  const isKids = form.audience === 'kids'
  const maxSlot = slotsForTier(form.level, form.track)
  const occupantBySlot = new Map<number, CourseView>()
  for (const c of kidsCourses) {
    if (c.careerSlot != null && c.level === form.level && (c.track ?? '2d') === form.track) {
      occupantBySlot.set(c.careerSlot, c)
    }
  }

  /**
   * Avisos PRÉ-SALVAR (informar, nunca bloquear além do que o server já bloqueia):
   * checklist da TRANSIÇÃO p/ publicado + mudança de audiência com matrícula ativa.
   * Zero avisos → salva direto, sem fricção.
   */
  async function collectSaveWarnings(): Promise<string[]> {
    const warnings: string[] = []
    const publishing = form.status === 'published' && editing?.status !== 'published'
    if (publishing) {
      if (!form.coverImageUrl.trim())
        warnings.push('Curso sem imagem de capa — o card do catálogo fica sem arte.')
      if (!form.description.trim()) warnings.push('Curso sem descrição.')
      // Pré-aviso amigável do 409 NO_SHOWCASE_BLOCK (só quando dá pra saber: o campo
      // `hasShowcaseBlock` vem na listagem — aberto pelo editor ele é undefined e o
      // server cobre com o 409).
      if (form.careerSlot === '1' && editing?.hasShowcaseBlock === false) {
        warnings.push(
          'Curso-base sem aula publicada com vitrine (Publicar no Mural) — o server vai recusar a publicação.',
        )
      }
    }
    // Mudança de AUDIÊNCIA de curso publicado: avisa quando há matrícula ativa
    // (fetch falhou → avisa sempre; limitação aceita: matrícula só por chave-mestra
    // não casa o filtro por courseRef).
    if (
      editing &&
      form.audience !== (editing.audience ?? 'adult') &&
      editing.status === 'published'
    ) {
      let suffix = ''
      try {
        const res = await apiGet<{ total: number }>(
          `/api/members?courseRef=${encodeURIComponent(editing.slug)}&status=active&limit=1`,
        )
        if (res.total === 0) return warnings // sem matrícula → troca sem fricção
        suffix = ` ${res.total} conta(s) com matrícula ativa mantêm o acesso, mas`
      } catch {
        suffix = ' Alunos matriculados mantêm o acesso, mas'
      }
      warnings.push(
        `Trocar a audiência move o curso para a outra plataforma.${suffix} o curso sai da vitrine atual — e curso Kids fica fora da chave-mestra "todos os cursos".`,
      )
    }
    return warnings
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
    const warnings = await collectSaveWarnings()
    if (warnings.length > 0) {
      setSaving(false)
      confirm({
        title: form.status === 'published' ? 'Publicar mesmo assim?' : 'Salvar mesmo assim?',
        message: (
          <ul className="list-disc space-y-1 pl-5">
            {warnings.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        ),
        confirmText: 'Salvar mesmo assim',
        onConfirm: () => doSave(),
      })
      return
    }
    await doSave()
  }

  async function doSave() {
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
        // SEMPRE enviado (como os demais): o members PRESERVA quando ausente, então
        // omitir aqui esconderia uma limpeza intencional do professor.
        studioUnlockBlocks: form.studioUnlockBlocks,
      }
      if (editing) {
        // O PATCH do members EXIGE `version` (concorrência otimista → 409 se
        // defasada); o POST NÃO aceita o campo. Sem ele, o body reprovava na
        // validação do members ("on":"body") em toda edição de curso.
        await apiSend(`/api/members/courses/${editing.id}`, 'PATCH', {
          ...payload,
          version: editing.version,
        })
        toast.success('Curso atualizado.')
      } else {
        await apiSend('/api/members/courses', 'POST', payload)
        toast.success('Curso criado.')
      }
      onClose()
      await onSaved()
    } catch (err) {
      const apiErr = err as ApiError
      const mapped = courseSaveError(apiErr.code, apiErr.message ?? 'Não foi possível salvar.')
      if (mapped.hint === 'showcase' && editing) {
        // A correção acontece no editor de AULA — CTA leva ao conteúdo do curso.
        toast.error(mapped.message, {
          action: {
            label: 'Abrir conteúdo do curso',
            onClick: () => router.push(`/admin/membros/cursos/${editing.id}`),
          },
          duration: 10000,
        })
      } else {
        toast.error(mapped.message)
      }
      if (mapped.hint === 'occupancy') void refreshOccupancy()
      if (mapped.hint === 'reload') await onSaved() // a listagem re-busca por trás
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
        {confirmDialog}
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
                  // Trocar de etapa pode reduzir 6→5 posições: limpa se sobrar. Lenda
                  // é FORA da carreira → nunca tem posição.
                  careerSlot: nextLevel === 'lenda' || slotNum > max ? '' : f.careerSlot,
                }
              })
            }}
          >
            {COURSE_TIER_OPTIONS.map((o) => (
              <option key={`${o.level}:${o.track}`} value={`${o.level}:${o.track}`}>
                {o.label}
              </option>
            ))}
            {/* Lenda = categoria FORA da carreira (não é degrau; não entra em
                COURSE_TIER_OPTIONS): cursos bônus que aparecem só na trilha da Lenda. */}
            <option value="lenda:2d">👑 Lenda (curso bônus da formatura)</option>
          </Select>
        </Field>
        {form.level === 'lenda' ? (
          <p className="rounded-lg bg-muted/50 px-3 py-2 text-muted-foreground text-xs">
            👑 Curso bônus da <strong>Lenda</strong> (formatura): FORA da carreira — sem posição,
            não conta pontos e não trava. Aparece só na trilha da Lenda em <code>/cursos</code>,
            para quem já chegou ao topo.
          </p>
        ) : (
          <Field
            label="Posição na Carreira do Criador"
            htmlFor="career-slot"
            tooltip="Ordena os cursos Kids dentro da etapa. A posição 1 é o CURSO-BASE: o aluno precisa concluí-lo e publicar no Mural para as demais posições da etapa liberarem. 'Bônus' é a RECOMPENSA da etapa: abre quando o aluno completa todos os cursos com posição (etapa sem curso-base publicado não trava o bônus)."
            hint={
              isKids
                ? '1 é o curso-base da etapa (destrava as demais posições). Bônus vira recompensa: abre quando a etapa completa.'
                : 'Disponível apenas para cursos Kids.'
            }
          >
            <Select
              id="career-slot"
              value={form.careerSlot}
              disabled={!isKids}
              onChange={(e) => setForm((f) => ({ ...f, careerSlot: e.target.value }))}
            >
              <option value="">Nenhuma — bônus (recompensa: abre quando a etapa completa)</option>
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
            {/* Preventivo: já publicado OU prestes a publicar (o 409 do server cobre o resto). */}
            {editing?.hasShowcaseBlock === false &&
            form.careerSlot === '1' &&
            (editing.status === 'published' || form.status === 'published') ? (
              <p className="mt-1.5 flex items-start gap-1.5 text-destructive text-xs" role="alert">
                <TriangleAlert className="mt-0.5 size-3.5 shrink-0" />
                Este curso-base ainda não tem aula publicada com bloco de Estúdio com vitrine
                (Publicar no Mural). Sem isso o aluno nunca qualifica a posição 1 e a etapa não
                destrava.
              </p>
            ) : null}
          </Field>
        )}
        {/* Currículo do Estúdio livre (08/2026): a paleta do aluno é a UNIÃO dos blocos
            dos cursos que ele concluiu E publicou no Mural — não mais um conjunto fixo
            por nível. É o MESMO formato de lista da aula (`allowBlocks`), então o picker
            é o mesmo e a importação por JSON já recusa id inexistente e repetido. */}
        {form.audience === 'kids' && (
          <Field
            label="Ferramentas que este curso libera no Estúdio"
            tooltip="Liste os blocos que este curso usa, inclusive os fundamentos que já apareceram em cursos anteriores. A criança recebe só os que ainda não tinha, ao concluir o curso E publicar o jogo no Mural. A caixa de ferramentas dela é a soma de tudo que já conquistou, sem repetir."
          >
            <StudioBlocksPicker
              value={form.studioUnlockBlocks}
              onChange={(next) => setForm((f) => ({ ...f, studioUnlockBlocks: next }))}
            />
            <p className="mt-1.5 text-muted-foreground text-xs">
              {form.studioUnlockBlocks.length === 0
                ? 'Nenhum bloco: concluir este curso não muda a caixa de ferramentas da criança.'
                : `${form.studioUnlockBlocks.length} ${form.studioUnlockBlocks.length === 1 ? 'bloco' : 'blocos'}. As extensões saem sozinhas dos blocos escolhidos.`}
            </p>
            {/* O fluxo real da autora é subir a lista de blocos USADOS no curso, então a
                repetição dos fundamentos é o normal, não um erro. A paleta deduplica e a
                comemoração compara com o que a CRIANÇA tem: ela só festeja o que é novo
                para ela. */}
            <p className="mt-1 text-muted-foreground text-xs">
              Pode repetir blocos de outros cursos sem problema: a criança recebe só os que ainda
              não tem.
            </p>
            {/* A garantia pedida pela usuária, dita ao operador: tirar um bloco daqui muda o
                que os PRÓXIMOS alunos ganham, nunca o que os anteriores já têm. */}
            <p className="mt-1 text-muted-foreground text-xs">
              Tirar um bloco daqui vale para quem ainda não concluiu o curso. Quem já conquistou não
              perde.
            </p>
          </Field>
        )}
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
