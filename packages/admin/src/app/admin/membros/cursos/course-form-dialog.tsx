'use client'

import { type CourseModality, courseModalityOf } from '@sistemazero/core/course/modality'
import { pythonCourseUnlockIssue } from '@sistemazero/studio/python-course-unlocks'
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
import { AdultCourseAccessContract } from '@/components/admin/adult-course-access-contract'
import {
  CourseCurriculumPlacement,
  CurriculumLoadNotice,
  useCreatorCurriculum,
} from '@/components/admin/course-curriculum-placement'
import { statusLabel } from '@/components/admin/status-badge'
import { useConfirm } from '@/components/admin/use-confirm'
import { ImageUploader } from '@/components/media/image-uploader'
import { StudioCourseBlocksPicker } from '@/components/studio/studio-course-blocks-picker'
import { type ApiError, apiGet, apiSend } from '@/lib/api'
import { courseSaveError } from '@/lib/course-errors'
import { LIVE_MODALITY_HINT, modalityChangeWarning } from '@/lib/course-modality'
import { loadAllPages } from '@/lib/load-all-pages'
import { COMMUNITY_NAMES } from '@/lib/platform'
import { slugify } from '@/lib/slug'
import {
  COURSE_AUDIENCES,
  COURSE_MODALITY_LABELS,
  COURSE_STATUSES,
  COURSE_TIER_OPTIONS,
  type CourseView,
  type Paginated,
} from '@/lib/types'

/** Pré-preenchimento ao criar um curso já mirando uma posição da jornada. */
export interface CoursePrefill {
  audience?: string
  /** Oficinas ao vivo: "Criar curso ao vivo" abre o formulário já em Ao vivo. */
  modality?: CourseModality
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
  /** Gravado ou ao vivo. Ao vivo não ocupa posição na Jornada. */
  modality: CourseModality
  level: string
  track: string
  careerSlot: string
  journeyRole: 'positioned' | 'reward' | 'extra'
  sequentialLock: boolean
  /** A atividade da seção abre depois do vídeo (cursos de quem está começando). */
  videoBeforeActivity: boolean
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
  // A operação hoje é Kids-first; Adult continua disponível no seletor.
  audience: 'kids',
  // Padrão GRAVADO: o curso ao vivo é escolhido de propósito (ou pelo atalho das Oficinas).
  modality: 'recorded',
  // Padrão: todo curso nasce Iniciante 2D (espelha os defaults das colunas no members).
  level: 'iniciante',
  track: '2d',
  careerSlot: '',
  journeyRole: 'reward',
  // Padrão LIGADO (decisão da usuária): curso novo já trava as aulas em sequência.
  sequentialLock: true,
  // Padrão DESLIGADO: só os cursos de quem está começando ligam (decisão da usuária 03/10).
  videoBeforeActivity: false,
  studioUnlockBlocks: [],
}

/**
 * Nº de posições da etapa: **8 em todo degrau, exceto o de ENTRADA**, que tem 1 (o curso
 * que a Faísca faz). Espelha o CHECK do banco e o catálogo do core. Exportada SÓ p/ a
 * trava de conformance admin×core (`journey-tier-conformance`).
 */
// ⚠️ `_track` fica na assinatura de propósito: o degrau do core é o PAR (nível, trilha), e a
// conformance chama esta função com os dois. Hoje só o nível decide; se um degrau 3D voltar a
// ter regra própria, o parâmetro já está aqui.
export function slotsForTier(level: string, _track: string): number {
  // ⚠️ O Iniciante 2D teve 7 por um dia (14/08 a 15/08): quando o curso-base saiu dele para
  // o degrau de entrada, encolheram o degrau para o total da jornada continuar 48. A
  // usuária desfez — o total é 49 e todo degrau que não é a entrada tem 8. O número vem do
  // core, e o `journey-tier-conformance.test.ts` compara esta função com ele.
  if (level === 'primeiros-passos') return 1
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
    modality: courseModalityOf(c.modality),
    level: c.level ?? 'iniciante',
    track: c.track ?? '2d',
    careerSlot: c.careerSlot == null ? '' : String(c.careerSlot),
    journeyRole: c.journeyRole ?? (c.careerSlot == null ? 'reward' : 'positioned'),
    sequentialLock: c.sequentialLock ?? true,
    videoBeforeActivity: c.videoBeforeActivity ?? false,
    studioUnlockBlocks: c.studioUnlockBlocks ?? [],
  }
}

function formFromPrefill(prefill: CoursePrefill | undefined): FormState {
  if (!prefill) return EMPTY
  return {
    ...EMPTY,
    audience: prefill.audience ?? EMPTY.audience,
    modality: prefill.modality ?? EMPTY.modality,
    level: prefill.level ?? EMPTY.level,
    track: prefill.track ?? EMPTY.track,
    careerSlot: prefill.careerSlot != null ? String(prefill.careerSlot) : '',
    journeyRole: prefill.careerSlot != null ? 'positioned' : 'reward',
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
  journeyCourses,
  onSaved,
}: {
  open: boolean
  onClose: () => void
  /** Curso em edição; `null` = criação. */
  editing: CourseView | null
  /** Só na criação: mira uma etapa/posição da jornada (painel de prontidão). */
  prefill?: CoursePrefill
  /** Lista de cursos Kids p/ mostrar a OCUPAÇÃO das posições; buscada sozinha se ausente. */
  journeyCourses?: CourseView[]
  /** Recebe o curso salvo quando o servidor o devolve (as Oficinas levam ao editor dele). */
  onSaved: (saved?: CourseView) => void | Promise<void>
}) {
  const [form, setForm] = useState<FormState>(EMPTY)
  const [saving, setSaving] = useState(false)
  // Slug auto do título só na CRIAÇÃO; para quando o autor edita o slug à mão.
  const [slugDirty, setSlugDirty] = useState(false)
  const [kidsCourses, setKidsCourses] = useState<CourseView[]>(journeyCourses ?? [])
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
   * `journeyCourses` é só o seed inicial (num 409 de posição a lista da prop já
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
    if (journeyCourses) {
      setKidsCourses(journeyCourses)
      return
    }
    void refreshOccupancy()
  }, [open, journeyCourses, refreshOccupancy])

  const isKids = form.audience === 'kids'
  const curriculumState = useCreatorCurriculum(form.audience, open)
  const curriculumActive = Boolean(curriculumState.curriculum)
  // Curso ao vivo não entra na Jornada: sem posição e sem trava sequencial de aula.
  const isLive = form.modality === 'live'
  const studioUnlockRule = isLive
    ? 'A conclusão da oficina concede estes blocos, sem exigir publicação no Mural. O uso no Estúdio Completo depende do acesso ao produto.'
    : !isKids
      ? 'O aluno adulto recebe estes blocos ao concluir o curso. A criação livre também verifica a etapa e a licença da ferramenta.'
      : form.journeyRole === 'positioned' && !curriculumActive
        ? 'Curso da jornada: a criança recebe as ferramentas quando conclui o curso e publica no Mural.'
        : 'A criança recebe as ferramentas quando conclui todas as aulas.'
  const maxSlot = slotsForTier(form.level, form.track)
  const occupantBySlot = new Map<number, CourseView>()
  for (const c of kidsCourses) {
    if (
      c.careerSlot != null &&
      courseModalityOf(c.modality) === 'recorded' &&
      c.level === form.level &&
      (c.track ?? '2d') === form.track
    ) {
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
    const modalityWarning = editing
      ? modalityChangeWarning(courseModalityOf(editing.modality), form.modality)
      : null
    if (modalityWarning) warnings.push(modalityWarning)
    const publishing = form.status === 'published' && editing?.status !== 'published'
    if (publishing) {
      if (!form.coverImageUrl.trim())
        warnings.push('O curso está sem imagem de capa: o cartão dele no catálogo fica sem arte.')
      if (!form.description.trim()) warnings.push('O curso está sem descrição.')
      // Pré-aviso amigável do 409 NO_SHOWCASE_BLOCK (só quando dá pra saber: o campo
      // `hasShowcaseBlock` vem na listagem — aberto pelo editor ele é undefined e o
      // server cobre com o 409).
      if (
        !isLive &&
        !curriculumActive &&
        form.careerSlot === '1' &&
        editing?.hasShowcaseBlock === false
      ) {
        warnings.push(
          'O curso de entrada ainda não tem aula publicada com um Estúdio que deixa publicar no Mural dos Criadores. A publicação vai ser recusada.',
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
        suffix =
          res.total === 1
            ? ' A conta que tem matrícula continua com acesso, mas'
            : ` As ${res.total} contas que têm matrícula continuam com acesso, mas`
      } catch {
        suffix = ' Quem tem matrícula continua com acesso, mas'
      }
      warnings.push(
        `Trocar a comunidade leva o curso para a outra.${suffix} ele sai do catálogo de agora. Curso da Comunidade dos Criadores fica fora do acesso a "todos os cursos".`,
      )
    }
    return warnings
  }

  async function save() {
    if (!isLive && curriculumState.status !== 'ready') {
      toast.error('Carregue a política da jornada antes de salvar este curso.')
      return
    }
    const rewardIssue = pythonCourseUnlockIssue(form.studioUnlockBlocks)
    if (rewardIssue) {
      toast.error(rewardIssue)
      return
    }
    if (!form.title.trim() || !form.slug.trim()) {
      toast.error('Preencha o título e o endereço do curso.')
      return
    }
    if (form.salesPageUrl.trim() && !/^https?:\/\//i.test(form.salesPageUrl.trim())) {
      toast.error('A página de vendas precisa ser um endereço completo, começando com https://.')
      return
    }
    if (
      !isLive &&
      !curriculumActive &&
      form.audience === 'kids' &&
      form.journeyRole === 'positioned' &&
      !form.careerSlot
    ) {
      toast.error('Escolha a posição do curso na Jornada do Criador.')
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
      const journey = isLive
        ? // ⚠️ Curso ao vivo NUNCA leva posição nem papel na Jornada (o members recusa os dois):
          // `careerSlot: null` limpa e `journeyRole` fica de fora.
          { careerSlot: null }
        : {
            careerSlot:
              form.audience === 'kids' && form.careerSlot ? Number(form.careerSlot) : null,
            journeyRole: form.audience === 'kids' ? form.journeyRole : 'reward',
          }
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
        // SEMPRE enviado: o members antigo descarta o campo; o novo só recusa a TROCA de
        // modalidade de um curso que já tem turma (409 com o recado, mostrado no toast).
        modality: form.modality,
        level: form.level,
        track: form.track,
        ...journey,
        sequentialLock: form.sequentialLock,
        videoBeforeActivity: form.videoBeforeActivity,
        // SEMPRE enviado (como os demais): o members PRESERVA quando ausente, então
        // omitir aqui esconderia uma limpeza intencional do professor.
        studioUnlockBlocks: form.studioUnlockBlocks,
      }
      let saved: CourseView | undefined
      if (editing) {
        // O PATCH do members EXIGE `version` (concorrência otimista → 409 se
        // defasada); o POST NÃO aceita o campo. Sem ele, o body reprovava na
        // validação do members ("on":"body") em toda edição de curso.
        saved = await apiSend<CourseView>(`/api/members/courses/${editing.id}`, 'PATCH', {
          ...payload,
          version: editing.version,
        })
        toast.success('Curso atualizado.')
      } else {
        saved = await apiSend<CourseView>('/api/members/courses', 'POST', payload)
        toast.success('Curso criado.')
      }
      onClose()
      await onSaved(saved && typeof saved === 'object' && 'id' in saved ? saved : undefined)
    } catch (err) {
      const apiErr = err as ApiError
      const mapped = courseSaveError(
        apiErr.code,
        apiErr.message ?? 'Não foi possível salvar o curso. Tente de novo.',
      )
      if (mapped.hint === 'showcase' && editing) {
        // A correção acontece no editor de AULA — CTA leva ao conteúdo do curso.
        toast.error(mapped.message, {
          action: {
            label: 'Abrir o curso',
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
      title={editing ? 'Editar dados do curso' : 'Novo curso'}
      description={
        editing ? editing.title : 'O curso nasce como rascunho. Os módulos e as aulas vêm depois.'
      }
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button
            onClick={save}
            disabled={saving || (!isLive && curriculumState.status !== 'ready')}
          >
            {saving ? <Spinner /> : null}
            Salvar
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {confirmDialog}
        <Field label="Título" htmlFor="title" hint="O endereço sai do título sozinho.">
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
            label="Endereço"
            htmlFor="slug"
            hint="Aparece no link do curso (/cursos/endereço) e nas matrículas. Só letras minúsculas, números e hífens."
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
          <Field label="Situação" htmlFor="cstatus">
            <Select
              id="cstatus"
              value={form.status}
              onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
            >
              {COURSE_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {statusLabel(s, 'catalog')}
                </option>
              ))}
            </Select>
            {editing?.creatorPlanning ? (
              <p className="mt-2 text-sm text-muted-foreground">
                {editing.creatorPlanning.requiredLessonCount === null
                  ? 'Revise o planejamento deste curso antes de publicar.'
                  : `Publique as ${editing.creatorPlanning.requiredLessonCount} aulas planejadas antes de liberar este curso. Nas missões, isso inclui as aplicações 2D e 3D.`}
              </p>
            ) : null}
          </Field>
        </div>
        <Field
          label="Comunidade"
          htmlFor="caudience"
          hint="Onde o curso aparece. Curso da Comunidade dos Criadores fica fora do acesso a todos os cursos: cada criança entra pela matrícula dele."
        >
          <Select
            id="caudience"
            value={form.audience}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                audience: e.target.value,
                // Posição na jornada só existe p/ Kids; limpa ao virar adulto.
                careerSlot: e.target.value === 'kids' ? f.careerSlot : '',
                journeyRole: e.target.value === 'kids' ? f.journeyRole : 'reward',
              }))
            }
          >
            {COURSE_AUDIENCES.map((a) => (
              <option key={a} value={a}>
                {COMMUNITY_NAMES[a]}
              </option>
            ))}
          </Select>
        </Field>
        <Field
          label="Modalidade"
          htmlFor="cmodality"
          hint={
            editing
              ? `${LIVE_MODALITY_HINT} Trocar depois só vale enquanto o curso não tem turma.`
              : LIVE_MODALITY_HINT
          }
        >
          <Select
            id="cmodality"
            value={form.modality}
            onChange={(e) => {
              const modality: CourseModality = e.target.value === 'live' ? 'live' : 'recorded'
              setForm((f) => ({
                ...f,
                modality,
                // Ao vivo não ocupa posição na Jornada: limpa ao trocar.
                careerSlot: modality === 'live' ? '' : f.careerSlot,
                journeyRole: modality === 'live' ? 'reward' : f.journeyRole,
              }))
            }}
          >
            <option value="recorded">{COURSE_MODALITY_LABELS.recorded}</option>
            <option value="live">{COURSE_MODALITY_LABELS.live}</option>
          </Select>
        </Field>
        <Field
          label="Nível do curso"
          htmlFor="clevel"
          tooltip="A dificuldade (Iniciante, Intermediário, Avançado) e o tipo de jogo (2D ou 3D). Na Comunidade dos Criadores, terminar e publicar no Mural os cursos de cada nível, na ordem (2D antes do 3D), faz a criança subir de posto, da Faísca até a Lenda."
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
                  // é FORA da jornada → nunca tem posição.
                  careerSlot: nextLevel === 'lenda' || slotNum > max ? '' : f.careerSlot,
                  journeyRole: nextLevel === 'lenda' || slotNum > max ? 'reward' : f.journeyRole,
                }
              })
            }}
          >
            {COURSE_TIER_OPTIONS.map((o) => (
              <option key={`${o.level}:${o.track}`} value={`${o.level}:${o.track}`}>
                {o.label}
              </option>
            ))}
            {/* Lenda = categoria FORA da jornada (não é degrau; não entra em
                COURSE_TIER_OPTIONS): cursos bônus que aparecem só na trilha da Lenda. */}
            <option value="lenda:2d">
              {curriculumActive
                ? 'Lenda (classificação histórica)'
                : 'Lenda (curso bônus da formatura)'}
            </option>
          </Select>
        </Field>
        {isLive ? null : curriculumState.curriculum ? (
          <CourseCurriculumPlacement
            curriculum={curriculumState.curriculum}
            courseId={editing?.id}
            audience={form.audience}
          />
        ) : !curriculumState.loaded ? (
          <CurriculumLoadNotice state={curriculumState} />
        ) : form.level === 'lenda' ? (
          <p className="rounded-lg bg-muted/50 px-3 py-2 text-muted-foreground text-xs">
            Curso bônus da <strong>Lenda</strong> (formatura): fica fora da Jornada, sem posição,
            não conta pontos e não tranca nada. Aparece só na Trilha Lenda, para quem já chegou ao
            topo.
          </p>
        ) : (
          <Field
            label="Posição na Jornada do Criador"
            htmlFor="journey-slot"
            hint={
              isKids
                ? 'Extra abre para quem tem matrícula. Bônus abre quando a criança completa a trilha. Com posição, o curso segue a ordem da trilha, e a posição 1 é o curso de entrada.'
                : 'Só para cursos da Comunidade dos Criadores.'
            }
          >
            <Select
              id="journey-slot"
              value={form.journeyRole === 'positioned' ? form.careerSlot : form.journeyRole}
              disabled={!isKids}
              onChange={(e) =>
                setForm((f) =>
                  e.target.value === 'reward' || e.target.value === 'extra'
                    ? { ...f, journeyRole: e.target.value as 'reward' | 'extra', careerSlot: '' }
                    : { ...f, journeyRole: 'positioned', careerSlot: e.target.value },
                )
              }
            >
              <option value="reward">Sem posição: bônus (prêmio da trilha)</option>
              {isKids && form.level !== 'lenda' ? (
                <option value="extra">Sem posição: curso extra (abre com a matrícula)</option>
              ) : null}
              {Array.from({ length: maxSlot }, (_, i) => i + 1).map((slot) => {
                const occ = occupantBySlot.get(slot)
                const takenByOther = !!occ && occ.id !== editing?.id
                const base =
                  slot === 1 ? 'Posição 1: curso de entrada (abre os outros)' : `Posição ${slot}`
                const suffix = occ
                  ? occ.id === editing?.id
                    ? ' (este curso)'
                    : ` (já tem: ${occ.title})`
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
                Este curso de entrada ainda não tem aula publicada com um Estúdio que deixa publicar
                no Mural dos Criadores. Sem isso, a criança não completa a posição 1 e o resto da
                trilha não abre.
              </p>
            ) : null}
          </Field>
        )}
        {!isKids ? (
          <AdultCourseAccessContract
            slug={form.slug}
            live={isLive}
            blocks={form.studioUnlockBlocks.length}
          />
        ) : null}
        {/* Cursos e oficinas concedem os IDs configurados. A conclusão ao vivo não
            exige Mural nem altera a elegibilidade dos cursos gravados. */}
        <Field
          label="Ferramentas que este curso libera no Estúdio"
          tooltip={`Liste os blocos que este curso usa, inclusive os fundamentos que já apareceram em cursos anteriores. ${studioUnlockRule} A caixa de ferramentas soma tudo que ${isKids ? 'ela' : 'o aluno'} já conquistou, sem repetir.`}
        >
          <StudioCourseBlocksPicker
            key={editing ? `${editing.id}:${editing.version}` : 'new-course'}
            value={form.studioUnlockBlocks}
            onChange={(next) => setForm((f) => ({ ...f, studioUnlockBlocks: next }))}
          />
          <p className="mt-1.5 text-muted-foreground text-xs">{studioUnlockRule}</p>
          <p className="mt-1 text-muted-foreground text-xs">
            {form.studioUnlockBlocks.length === 0
              ? isKids
                ? 'Nenhum bloco: este curso não muda a caixa de ferramentas da criança.'
                : 'Nenhum bloco: este curso não acrescenta ferramentas à paleta do aluno.'
              : `${form.studioUnlockBlocks.length} ${form.studioUnlockBlocks.length === 1 ? 'bloco' : 'blocos'}. As extensões saem sozinhas dos blocos escolhidos.`}
          </p>
          {/* O fluxo real da autora é subir a lista de blocos USADOS no curso, então a
                repetição dos fundamentos é o normal, não um erro. A paleta deduplica e a
                comemoração compara com o que a CRIANÇA tem: ela só festeja o que é novo
                para ela. */}
          <p className="mt-1 text-muted-foreground text-xs">
            {isKids
              ? 'Pode repetir blocos de outros cursos sem problema: a criança recebe só os que ainda não tem.'
              : 'Pode repetir blocos de outros cursos: o aluno recebe apenas os que ainda não tem.'}
          </p>
          {/* A garantia pedida pela usuária, dita ao operador: tirar um bloco daqui muda o
                que recebe quem ainda não ganhou a ferramenta, nunca revoga um grant existente. */}
          <p className="mt-1 text-muted-foreground text-xs">
            Tirar um bloco daqui vale para quem ainda não recebeu a ferramenta. Quem já recebeu não
            perde.
          </p>
        </Field>
        {/* No curso ao vivo a aula abre pela vaga na turma e pela data do encontro: a trava
            sequencial e o "vídeo antes da atividade" (não há bloco de vídeo) não se aplicam. */}
        {isLive ? null : (
          <>
            <Field
              label="Aulas em ordem"
              htmlFor="csequentiallock"
              hint="Cada aula abre quando a anterior termina. Desligado, dá para pular entre as aulas."
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
                Abrir uma aula de cada vez
              </label>
            </Field>
            <Field
              label="Ver o vídeo antes de fazer a parte"
              htmlFor="cvideobeforeactivity"
              hint="Bom para quem está começando. Na parte que tem vídeo e um jogo pronto ou uma experiência, a atividade abre depois que o vídeo é visto até o fim uma vez. Parte só com Estúdio ou Pinta não tranca: dá para montar junto com o vídeo. A equipe e a prévia veem tudo aberto."
            >
              <label
                htmlFor="cvideobeforeactivity"
                className="flex items-center gap-2 text-muted-foreground text-sm"
              >
                <input
                  id="cvideobeforeactivity"
                  type="checkbox"
                  checked={form.videoBeforeActivity}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, videoBeforeActivity: e.target.checked }))
                  }
                  className="size-4"
                />
                Trancar a atividade até o vídeo ser visto
              </label>
            </Field>
          </>
        )}
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
          hint="Opcional. Envie um arquivo ou cole o link de uma imagem."
        >
          <ImageUploader
            inputId="cover"
            scope="course"
            value={form.coverImageUrl}
            onChange={(url) => setForm((f) => ({ ...f, coverImageUrl: url }))}
          />
        </Field>
        <Field
          label="Página de vendas"
          htmlFor="salesPageUrl"
          hint='Para onde vai quem ainda não tem acesso e clica no curso trancado em "Todos os cursos". Em branco, vai para a página de vendas de sempre.'
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
