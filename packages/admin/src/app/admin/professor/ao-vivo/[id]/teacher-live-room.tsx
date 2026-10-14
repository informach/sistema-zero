'use client'

import {
  isLegacyLessonLayout,
  type LessonDraftDocument,
  type LessonSection,
} from '@sistemazero/core/learning'
import { LessonBlocks } from '@sistemazero/member-shell/components/lesson-blocks'
import { LessonCopyProvider } from '@sistemazero/member-shell/components/lesson-copy-context'
import { LessonSections } from '@sistemazero/member-shell/components/lesson-sections'
import { LiveClassroom } from '@sistemazero/member-shell/components/live/live-classroom'
import { LiveBlockWorkspace } from '@sistemazero/member-shell/components/live/live-workspace'
import { ADULT_LESSON_COPY } from '@sistemazero/member-shell/lib/lesson-copy'
import { KIDS_LESSON_COPY } from '@sistemazero/member-shell/lib/lesson-copy-kids'
import type { LiveLessonSlotProps } from '@sistemazero/member-shell/lib/live/lesson-slot'
import type {
  LessonBlockView,
  LessonDetailView,
  MaterialItem,
  StudioBlock,
} from '@sistemazero/member-shell/lib/types'
import { sanitizePintaAsset } from '@sistemazero/pinta/assets'
import type { PintaHandle } from '@sistemazero/pinta/lesson'
import { StickyNote } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { PintaEmbed } from '@/components/pinta/pinta-embed'
import { apiGet } from '@/lib/api'

type PublishedDocument = LessonDraftDocument<{ kind: string } & Record<string, unknown>>

/**
 * A sala da PROFESSORA (cursos ao vivo, 14/10/2026). O Admin não tem as rotas de aula do aluno,
 * então a aula do encontro é montada a partir do documento PUBLICADO
 * (`GET /members/admin/lessons/:id/draft/published`), em modo prévia (como o ensaio da autoria),
 * com a transmissão no alto da coluna da esquerda e as anotações dela na parte que está na tela.
 * O bloco Estúdio mostra o PROJETO AO VIVO da criança que ela escolher acompanhar.
 */
export function TeacherLiveRoom({ sessionId }: { sessionId: string }) {
  const renderLesson = useCallback(
    (slot: LiveLessonSlotProps) => <TeacherLessonPreview slot={slot} />,
    [],
  )
  return <LiveClassroom sessionId={sessionId} teacher renderLesson={renderLesson} />
}

function TeacherLessonPreview({ slot }: { slot: LiveLessonSlotProps }) {
  const { lessonId } = slot.lesson
  const [loaded, setLoaded] = useState<{
    lessonId: string
    document: PublishedDocument | null
    error: string | null
  } | null>(null)
  useEffect(() => {
    let active = true
    apiGet<{ document: PublishedDocument }>(
      `/api/members/lessons/${encodeURIComponent(lessonId)}/draft/published`,
    )
      .then((value) => {
        if (active) setLoaded({ lessonId, document: value.document, error: null })
      })
      .catch((cause) => {
        if (active)
          setLoaded({
            lessonId,
            document: null,
            error:
              cause instanceof Error && cause.message
                ? cause.message
                : 'Não foi possível abrir a aula publicada deste encontro.',
          })
      })
    return () => {
      active = false
    }
  }, [lessonId])
  const document = loaded?.lessonId === lessonId ? loaded.document : null
  const error = loaded?.lessonId === lessonId ? loaded.error : null
  if (error)
    return (
      <p role="alert" className="rounded-xl border border-destructive/30 bg-destructive/5 p-4">
        {error}
      </p>
    )
  if (!document)
    return (
      <p role="status" className="rounded-xl border bg-card p-4">
        Abrindo a aula do encontro…
      </p>
    )
  return <TeacherLesson key={lessonId} slot={slot} document={document} />
}

function TeacherLesson({
  slot,
  document,
}: {
  slot: LiveLessonSlotProps
  document: PublishedDocument
}) {
  const kids = slot.audience !== 'adult'
  const lesson = useMemo(() => previewLessonOf(slot.lesson.lessonId, document), [slot, document])
  const callbacks = useRef(slot)
  callbacks.current = slot
  useEffect(() => {
    callbacks.current.onOutline?.({
      sections: document.sections.map((section) => ({ id: section.id, title: section.title })),
      attachments: document.attachments.map((item) => ({
        id: item.id,
        label: item.label,
        fileType: item.fileType,
      })),
    })
  }, [document])
  const [sectionId, setSectionId] = useState<string | null>(document.sections[0]?.id ?? null)
  // As anotações da rota própria (versão publicada) e, sem ela, as do documento que já está aqui.
  const notes =
    (sectionId && slot.teacherNotes?.[sectionId]?.trim()) ||
    (sectionId &&
      (
        document.sections.find((section) => section.id === sectionId) as LessonSection | undefined
      )?.teacherNotes?.trim()) ||
    null
  const blocks = useMemo(() => new Map(lesson.blocks.map((block) => [block.id, block])), [lesson])
  const renderBlocks = (items: LessonBlockView[]) =>
    items.map((item) => {
      const block = blocks.get(item.id)
      if (!block) return null
      if (block.kind === 'studio') {
        const content = block.content as StudioBlock
        return slot.liveWorkspace ? (
          <LiveBlockWorkspace
            key={block.id}
            workspace={slot.liveWorkspace}
            blockId={block.id}
            title="Projeto da criança"
            curation={{
              level: content.level,
              allowBlocks: content.allowBlocks,
              allowCategories: content.allowCategories,
              allowedModes: content.allowedModes,
              allowLevelReveal: content.allowLevelReveal,
            }}
          />
        ) : null
      }
      if (block.kind === 'pinta') return <PintaPreview key={block.id} block={block} />
      return <LessonBlocks key={item.id} blocks={[item]} />
    })
  return (
    <div className="space-y-4">
      {notes ? (
        <aside
          aria-label="Anotações desta parte"
          className="flex gap-3 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-amber-950"
        >
          <StickyNote className="mt-0.5 size-5 shrink-0" aria-hidden />
          <div className="min-w-0">
            <p className="font-bold text-sm">Anotações desta parte (só você vê)</p>
            <p className="mt-1 whitespace-pre-wrap">{notes}</p>
          </div>
        </aside>
      ) : null}
      <LessonCopyProvider value={kids ? KIDS_LESSON_COPY : ADULT_LESSON_COPY}>
        <LessonSections
          lesson={lesson}
          lessonTitle={lesson.title}
          kids={kids}
          stage={slot.stage}
          sectionControl={slot.sectionControl}
          onSectionChange={({ sectionId: id }) => {
            setSectionId(id || null)
            callbacks.current.onSectionReport({ sectionId: id || null, completedSectionIds: [] })
          }}
          renderBlocks={renderBlocks}
        />
      </LessonCopyProvider>
    </div>
  )
}

function PintaPreview({ block }: { block: LessonBlockView }) {
  const handle = useRef<PintaHandle | null>(null)
  const content = block.content as { initialAsset?: unknown; allowTools?: readonly string[] }
  const asset = sanitizePintaAsset(content.initialAsset)
  return asset ? (
    <PintaEmbed
      initialAsset={asset}
      handleRef={handle}
      allowTools={content.allowTools}
      features={{ resize: false, export: false }}
    />
  ) : (
    <p>O desenho inicial desta parte não está disponível.</p>
  )
}

/**
 * A aula PUBLICADA no formato que o `LessonSections` desenha (o mesmo espelho da prévia da
 * autoria). O item de arquivo dos materiais ganha nome, tipo e tamanho do anexo; o `url` do anexo
 * nunca vai ao componente.
 */
export function previewLessonOf(lessonId: string, document: PublishedDocument): LessonDetailView {
  const attachments = new Map(document.attachments.map((item) => [item.id, item]))
  return {
    id: lessonId,
    slug: document.slug,
    title: document.title,
    courseSlug: '',
    moduleId: '',
    completed: false,
    estimatedMinutes: document.estimatedMinutes,
    positionSeconds: null,
    sections: document.sections,
    legacyLayout: isLegacyLessonLayout(lessonId, document.sections),
    blocks: document.blocks.map((block, index) => {
      const content = block.content as { kind: string; items?: MaterialItem[] }
      const resolved =
        content.kind === 'materials' && Array.isArray(content.items)
          ? {
              ...content,
              items: content.items.flatMap((item): MaterialItem[] => {
                if (item.kind !== 'file') return [item]
                const attachment = attachments.get(item.attachmentId)
                if (!attachment) return []
                return [
                  {
                    ...item,
                    label: item.label?.trim() || attachment.label,
                    fileType: attachment.fileType,
                    sizeBytes: attachment.sizeBytes,
                  },
                ]
              }),
            }
          : content
      return { id: block.id, kind: content.kind, sortOrder: index, content: resolved }
    }),
    attachments: [],
  }
}
