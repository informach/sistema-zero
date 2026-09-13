'use client'

import { isLegacyLessonLayout } from '@sistemazero/core/learning'
import { LessonBlocks } from '@sistemazero/member-shell/components/lesson-blocks'
import { useLessonPreview } from '@sistemazero/member-shell/components/lesson-preview-context'
import { LessonSections } from '@sistemazero/member-shell/components/lesson-sections'
import type { LessonBlockView, LessonDetailView } from '@sistemazero/member-shell/lib/types'
import { sanitizePintaAsset } from '@sistemazero/pinta/assets'
import type { PintaHandle } from '@sistemazero/pinta/lesson'
import type { StudioHandle } from '@sistemazero/studio'
import { Button } from '@sistemazero/ui/button'
import { useRef, useState } from 'react'
import { PintaEmbed } from '@/components/pinta/pinta-embed'
import { StudioEmbed } from '@/components/studio/studio-embed'
import type { BlockView } from '@/lib/types'
import { LessonRehearsal } from './lesson-rehearsal'
import { LessonSectionAuthoring, type SectionAuthoringProps } from './lesson-section-authoring'

function ToolPreview({ block }: { block: BlockView }) {
  const studio = useRef<StudioHandle | null>(null)
  const pinta = useRef<PintaHandle | null>(null)
  const rehearsal = useLessonPreview()
  const [checkResult, setCheckResult] = useState('')
  const initialProject = useRef(
    block.content.kind === 'studio'
      ? (rehearsal?.workspaces[block.id] ?? block.content.initialProject)
      : undefined,
  )
  if (block.content.kind === 'studio')
    return (
      <div className="space-y-3">
        <StudioEmbed
          handleRef={studio}
          initialProject={initialProject.current}
          onChange={
            rehearsal ? (project) => rehearsal.onWorkspaceChange(block.id, project) : undefined
          }
          features={{ ai: false, export: false }}
          lessonConfig={{
            level: block.content.level,
            allowedModes: block.content.allowedModes,
            allowBlocks: block.content.allowBlocks,
            allowCategories: block.content.allowCategories,
            allowLevelReveal: block.content.allowLevelReveal,
            activity: block.content.activity,
          }}
        />
        {rehearsal && (
          <>
            <Button
              variant="outline"
              onClick={async () => {
                try {
                  setCheckResult(
                    await rehearsal.onProjectCheck(block.id, studio.current?.getProject()),
                  )
                } catch (error) {
                  setCheckResult(
                    error instanceof Error ? error.message : 'Não foi possível conferir o projeto.',
                  )
                }
              }}
            >
              Conferir estrutura no ensaio
            </Button>
            <p role="status" className="whitespace-pre-line text-sm">
              {checkResult}
            </p>
          </>
        )}
      </div>
    )
  if (block.content.kind === 'pinta') {
    const asset = sanitizePintaAsset(block.content.initialAsset)
    return asset ? (
      <PintaEmbed
        initialAsset={asset}
        handleRef={pinta}
        allowTools={block.content.allowTools}
        features={{ resize: false, export: false }}
      />
    ) : (
      <p>Configure o desenho inicial para abrir a prévia.</p>
    )
  }
  return null
}
export function LessonStructureEditor(
  props: SectionAuthoringProps & {
    preview: boolean
    onPreviewChange: (value: boolean) => void
  },
) {
  const { lesson, document, preview, onPreviewChange } = props
  const [rehearsalMode, setRehearsalMode] = useState(false)
  const blocks = new Map(lesson.blocks.map((b) => [b.id, b]))
  const previewLesson: LessonDetailView = {
    id: lesson.id,
    slug: document.slug,
    title: document.title,
    courseSlug: '',
    moduleId: '',
    completed: false,
    estimatedMinutes: document.estimatedMinutes,
    positionSeconds: null,
    sections: document.sections,
    legacyLayout: isLegacyLessonLayout(lesson.id, document.sections),
    supportBlockIds: document.supportBlockIds,
    blocks: lesson.blocks,
    attachments: [],
  }
  const renderPreviewBlocks = (items: LessonBlockView[]) =>
    items.map((item) => {
      const block = blocks.get(item.id)
      if (!block) return null
      if (block.kind === 'studio' || block.kind === 'pinta')
        return <ToolPreview key={block.id} block={block} />
      if (block.content.kind === 'video' && !block.content.src)
        return (
          <p key={block.id} className="rounded-xl border border-dashed border-border p-5">
            Vídeo planejado:{' '}
            {document.plannedVideos.find((v) => v.blockId === block.id)?.instructions}
          </p>
        )
      return <LessonBlocks key={item.id} blocks={[item]} />
    })
  return (
    <section className="space-y-5">
      {props.area === 'sections' && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Percurso da aula</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Monte cada seção no seu ritmo. Explorações e trechos de criação podem se alternar
              livremente.
            </p>
          </div>
          <Button variant="outline" onClick={() => onPreviewChange(!preview)}>
            {preview ? 'Voltar à edição' : 'Prévia do rascunho'}
          </Button>
        </div>
      )}
      {preview && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2" role="group" aria-label="Modo da prévia">
            <Button
              variant={!rehearsalMode ? 'default' : 'outline'}
              aria-pressed={!rehearsalMode}
              onClick={() => setRehearsalMode(false)}
            >
              Conferir livremente
            </Button>
            <Button
              variant={rehearsalMode ? 'default' : 'outline'}
              aria-pressed={rehearsalMode}
              onClick={() => setRehearsalMode(true)}
            >
              Ensaiar como aluno
            </Button>
          </div>
          {rehearsalMode ? (
            <LessonRehearsal
              lesson={previewLesson}
              document={document}
              renderBlocks={renderPreviewBlocks}
            />
          ) : (
            <LessonSections lesson={previewLesson} renderBlocks={renderPreviewBlocks} />
          )}
        </div>
      )}
      <div hidden={preview}>
        <LessonSectionAuthoring {...props} />
      </div>
    </section>
  )
}
