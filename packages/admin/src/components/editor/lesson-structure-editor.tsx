'use client'

import {
  defaultLessonSection,
  type LessonDraftChange,
  type LessonDraftDocument,
  type LessonDraftIssue,
  type LessonSection,
  SECTION_INTENT_LABELS,
  SECTION_INTENTS,
} from '@sistemazero/core/learning'
import { LessonBlocks } from '@sistemazero/member-shell/components/lesson-blocks'
import { LessonSections } from '@sistemazero/member-shell/components/lesson-sections'
import { sanitizePintaAsset } from '@sistemazero/pinta/assets'
import type { PintaHandle } from '@sistemazero/pinta/lesson'
import type { StudioHandle } from '@sistemazero/studio'
import { Button } from '@sistemazero/ui/button'
import { Input } from '@sistemazero/ui/input'
import { Select } from '@sistemazero/ui/select'
import { Textarea } from '@sistemazero/ui/textarea'
import { ArrowDown, ArrowUp, Pencil, Plus, Trash2 } from 'lucide-react'
import { useRef, useState } from 'react'
import { VideoUploader } from '@/components/media/video-uploader'
import { PintaEmbed } from '@/components/pinta/pinta-embed'
import { StudioEmbed } from '@/components/studio/studio-embed'
import type { BlockView, LessonBlockContent, LessonContentView } from '@/lib/types'
import { SectionCompletionEditor } from './section-completion-editor'

function blockLabel(block: BlockView) {
  const c = block.content
  if (c.kind === 'interactive') return c.title || 'Descoberta interativa'
  if (c.kind === 'rich_text')
    return (
      (c.markdown ?? c.html ?? '')
        .replace(/^#+\s*/, '')
        .split('\n')[0]
        ?.slice(0, 90) || 'Texto'
    )
  return {
    video: 'Vídeo',
    studio: 'Estúdio',
    pinta: 'Pinta',
    quiz: 'Quiz',
    image: 'Imagem',
    audio: 'Áudio',
    ebook: 'E-book',
    embed: 'HTML',
    certificate: 'Certificado',
    coming_soon: 'Em breve',
  }[c.kind]
}
function ToolPreview({ block }: { block: BlockView }) {
  const studio = useRef<StudioHandle | null>(null)
  const pinta = useRef<PintaHandle | null>(null)
  if (block.content.kind === 'studio')
    return (
      <StudioEmbed
        handleRef={studio}
        initialProject={block.content.initialProject}
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
export function LessonStructureEditor({
  lesson,
  document,
  canWrite,
  onChange,
  onAddBlock,
  onEditBlock,
  onRemoveBlock,
  issues,
  preview,
  onPreviewChange,
  editingBlockId,
}: {
  lesson: LessonContentView
  editingBlockId?: string
  document: LessonDraftDocument<LessonBlockContent>
  canWrite: boolean
  onChange: (change: LessonDraftChange<LessonBlockContent>, immediate?: boolean) => void
  onAddBlock: (sectionId: string | null) => void
  onEditBlock: (block: BlockView) => void
  onRemoveBlock: (block: BlockView) => void
  issues: LessonDraftIssue[]
  preview: boolean
  onPreviewChange: (value: boolean) => void
}) {
  const [settings, setSettings] = useState<string | null>(null)
  const blocks = new Map(lesson.blocks.map((b) => [b.id, b]))
  const tools = lesson.blocks.filter(
    (b) => (b.kind === 'studio' || b.kind === 'pinta') && !document.supportBlockIds.includes(b.id),
  )
  const structure = (
    sections: LessonSection[],
    supportBlockIds = document.supportBlockIds,
    immediate = true,
  ) => onChange({ type: 'structure', sections, supportBlockIds }, immediate)
  const patch = (id: string, change: Partial<LessonSection>, immediate = false) =>
    structure(
      document.sections.map((s) => (s.id === id ? { ...s, ...change } : s)),
      document.supportBlockIds,
      immediate,
    )
  function move(blockId: string, target: string) {
    const criterion = document.sections.some((s) => s.completion?.blockIds.includes(blockId))
    structure(
      document.sections.map((s) => ({
        ...s,
        blockIds: [
          ...s.blockIds.filter((id) => id !== blockId),
          ...(s.id === target ? [blockId] : []),
        ],
        ...(s.completion
          ? {
              completion: {
                ...s.completion,
                blockIds: [
                  ...s.completion.blockIds.filter((id) => id !== blockId),
                  ...(s.id === target && criterion ? [blockId] : []),
                ],
                ...(target === 'support' && s.workspaceBlockId === blockId
                  ? { projectChecks: [] }
                  : {}),
              },
            }
          : {}),
        workspaceBlockId:
          target === 'support' && s.workspaceBlockId === blockId ? null : s.workspaceBlockId,
      })),
      [
        ...document.supportBlockIds.filter((id) => id !== blockId),
        ...(target === 'support' ? [blockId] : []),
      ],
    )
  }
  function contentList(ids: string[], location: string) {
    return (
      <div className="space-y-3">
        {ids.map((id, index) => {
          const block = blocks.get(id)
          if (!block) return null
          const video = document.plannedVideos.find((v) => v.blockId === id)
          return (
            <article key={id} className="rounded-xl border border-border bg-background p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="min-w-0 flex-1 text-sm font-medium">{blockLabel(block)}</span>
                {[-1, 1].map((direction) => (
                  <Button
                    key={direction}
                    variant="ghost"
                    size="icon"
                    disabled={!canWrite || !ids[index + direction]}
                    aria-label={
                      direction < 0 ? 'Mover conteúdo para cima' : 'Mover conteúdo para baixo'
                    }
                    onClick={() => {
                      const next = [...ids]
                      const other = next[index + direction]
                      if (!other) return
                      next[index] = other
                      next[index + direction] = id
                      if (location === 'support') structure(document.sections, next)
                      else patch(location, { blockIds: next }, true)
                    }}
                  >
                    {direction < 0 ? (
                      <ArrowUp className="size-4" />
                    ) : (
                      <ArrowDown className="size-4" />
                    )}
                  </Button>
                ))}
                <Button
                  variant="ghost"
                  size="icon"
                  disabled={!canWrite}
                  aria-label={`Editar ${blockLabel(block)}`}
                  onClick={() => onEditBlock(block)}
                >
                  <Pencil className="size-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  disabled={!canWrite}
                  aria-label={`Retirar ${blockLabel(block)}`}
                  onClick={() => onRemoveBlock(block)}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
              <Select
                className="mt-2 max-w-sm"
                disabled={!canWrite}
                aria-label={`Local de ${blockLabel(block)}`}
                value={location}
                onChange={(e) => move(id, e.target.value)}
              >
                {document.sections.map((s, i) => (
                  <option key={s.id} value={s.id}>
                    {i + 1}. {s.title || 'Seção sem título'}
                  </option>
                ))}
                <option value="support">Materiais de apoio</option>
              </Select>
              {video && block.content.kind === 'video' && (
                <div className="mt-4 space-y-3 border-t border-border pt-4">
                  <label className="block space-y-1 text-sm">
                    Orientação de produção
                    <Textarea
                      value={video.instructions}
                      maxLength={5000}
                      disabled={!canWrite}
                      onChange={(e) =>
                        onChange({
                          type: 'planned-videos',
                          plannedVideos: document.plannedVideos.map((v) =>
                            v.blockId === id ? { ...v, instructions: e.target.value } : v,
                          ),
                        })
                      }
                    />
                  </label>
                  {canWrite && editingBlockId !== id ? (
                    <VideoUploader
                      autoCheckStatus
                      currentSrc={block.content.src}
                      onReady={(ready) => {
                        const content = block.content
                        if (content.kind !== 'video') return
                        onChange(
                          {
                            type: 'block',
                            block: {
                              id,
                              content: {
                                ...content,
                                provider: 'vimeo',
                                src: ready.embedUrl,
                                ...(ready.durationSeconds !== null
                                  ? { durationSeconds: ready.durationSeconds }
                                  : {}),
                                ...(ready.captions.length ? { captions: ready.captions } : {}),
                              },
                            },
                          },
                          true,
                        )
                        onChange(
                          {
                            type: 'planned-videos',
                            plannedVideos: document.plannedVideos.map((v) =>
                              v.blockId === id ? { ...v, videoId: ready.vimeoVideoId } : v,
                            ),
                          },
                          true,
                        )
                      }}
                    />
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      {block.content.src ? 'Vídeo vinculado' : 'Vídeo a produzir'}
                    </p>
                  )}
                  {canWrite && block.content.src && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        onChange(
                          {
                            type: 'block',
                            block: { id, content: { kind: 'video', provider: 'vimeo', src: '' } },
                          },
                          true,
                        )
                        onChange(
                          {
                            type: 'planned-videos',
                            plannedVideos: document.plannedVideos.map((v) =>
                              v.blockId === id ? { ...v, videoId: null } : v,
                            ),
                          },
                          true,
                        )
                      }}
                    >
                      Retirar mídia vinculada
                    </Button>
                  )}
                </div>
              )}
              {issues
                .filter((i) => i.blockId === id)
                .map((issue) => (
                  <p key={issue.message} role="alert" className="mt-2 text-sm text-destructive">
                    {issue.message}
                  </p>
                ))}
            </article>
          )
        })}
      </div>
    )
  }
  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Percurso da aula</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Organize o conteúdo e escolha onde o mesmo projeto acompanha o aluno.
          </p>
        </div>
        <Button variant="outline" onClick={() => onPreviewChange(!preview)}>
          {preview ? 'Voltar à edição' : 'Prévia do rascunho'}
        </Button>
      </div>
      {preview ? (
        <LessonSections
          lesson={{
            id: lesson.id,
            slug: document.slug,
            title: document.title,
            courseSlug: '',
            moduleId: '',
            completed: false,
            estimatedMinutes: document.estimatedMinutes,
            positionSeconds: null,
            sections: document.sections,
            supportBlockIds: document.supportBlockIds,
            blocks: lesson.blocks,
            attachments: [],
          }}
          renderBlocks={(items) =>
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
          }
        />
      ) : (
        <fieldset disabled={!canWrite} className="space-y-5">
          {!document.sections.some((s) => s.completion) && (
            <Button
              variant="outline"
              onClick={() =>
                structure(
                  document.sections.map((s) => ({
                    ...s,
                    completion: { version: 1, blockIds: [] },
                  })),
                )
              }
            >
              Preparar avanço por seções
            </Button>
          )}
          {document.sections.map((section, index) => (
            <div
              key={section.id}
              className="overflow-hidden rounded-2xl border border-border bg-card"
            >
              <div className="flex flex-wrap items-center gap-3 border-b border-border p-4 sm:px-5">
                <span className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-sm font-semibold text-primary">
                  {index + 1}
                </span>
                <Input
                  aria-label={`Título da seção ${index + 1}`}
                  value={section.title}
                  maxLength={200}
                  className="min-w-40 flex-1"
                  onChange={(e) => patch(section.id, { title: e.target.value })}
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSettings(settings === section.id ? null : section.id)}
                >
                  Configurações
                </Button>
                {[-1, 1].map((direction) => (
                  <Button
                    key={direction}
                    variant="ghost"
                    size="icon"
                    disabled={!document.sections[index + direction]}
                    aria-label={direction < 0 ? 'Mover seção para cima' : 'Mover seção para baixo'}
                    onClick={() => {
                      const next = [...document.sections]
                      const other = next[index + direction]
                      if (!other) return
                      next[index] = other
                      next[index + direction] = section
                      structure(next)
                    }}
                  >
                    {direction < 0 ? (
                      <ArrowUp className="size-4" />
                    ) : (
                      <ArrowDown className="size-4" />
                    )}
                  </Button>
                ))}
              </div>
              <div className="space-y-4 p-4 sm:p-5">
                {settings === section.id && (
                  <div className="space-y-3 rounded-xl bg-muted/40 p-4">
                    <p className="text-xs font-medium text-muted-foreground">
                      Estas orientações aparecem apenas na autoria.
                    </p>
                    <label className="block space-y-1 text-sm">
                      Intenção didática
                      <Select
                        value={section.intent}
                        onChange={(e) => {
                          const intent = SECTION_INTENTS.find((v) => v === e.target.value)
                          if (intent) patch(section.id, { intent })
                        }}
                      >
                        {SECTION_INTENTS.map((intent) => (
                          <option key={intent} value={intent}>
                            {SECTION_INTENT_LABELS[intent]}
                          </option>
                        ))}
                      </Select>
                    </label>
                    <label className="block space-y-1 text-sm">
                      Objetivo didático
                      <Textarea
                        rows={2}
                        maxLength={2000}
                        value={section.objective}
                        onChange={(e) => patch(section.id, { objective: e.target.value })}
                      />
                    </label>
                    <Button
                      variant="ghost"
                      disabled={document.sections.length < 2}
                      onClick={() => {
                        const rest = document.sections.filter((s) => s.id !== section.id)
                        const target = rest[Math.max(0, index - 1)]
                        structure(
                          rest.map((s) =>
                            s.id === target?.id
                              ? {
                                  ...s,
                                  blockIds: [...s.blockIds, ...section.blockIds],
                                  ...(s.completion
                                    ? {
                                        completion: {
                                          ...s.completion,
                                          blockIds: [
                                            ...s.completion.blockIds,
                                            ...(section.completion?.blockIds ?? []),
                                          ],
                                        },
                                      }
                                    : {}),
                                }
                              : s,
                          ),
                        )
                      }}
                    >
                      Remover seção e manter seu conteúdo na seção anterior
                    </Button>
                  </div>
                )}
                {section.completion && (
                  <SectionCompletionEditor
                    value={section.completion}
                    candidates={section.blockIds.flatMap((id) => {
                      const b = blocks.get(id)
                      return b && ['interactive', 'quiz', 'studio', 'pinta'].includes(b.kind)
                        ? [{ id, label: blockLabel(b) }]
                        : []
                    })}
                    hasStudio={tools.some(
                      (b) => b.id === section.workspaceBlockId && b.kind === 'studio',
                    )}
                    onChange={(completion) => patch(section.id, { completion })}
                  />
                )}
                {issues
                  .filter((i) => i.sectionId === section.id)
                  .map((issue) => (
                    <p key={issue.message} role="alert" className="text-sm text-destructive">
                      {issue.message}
                    </p>
                  ))}
                {contentList(section.blockIds, section.id)}
                <Button variant="outline" onClick={() => onAddBlock(section.id)}>
                  <Plus className="size-4" />
                  Adicionar conteúdo aqui
                </Button>
                <label className="block space-y-1 text-sm">
                  Ferramenta durante esta seção
                  <Select
                    value={section.workspaceBlockId ?? section.externalTool ?? ''}
                    onChange={(e) => {
                      const value = e.target.value
                      patch(
                        section.id,
                        value === 'estudio' || value === 'pinta'
                          ? { externalTool: value, workspaceBlockId: null }
                          : { externalTool: null, workspaceBlockId: value || null },
                        true,
                      )
                    }}
                  >
                    <option value="">Somente o conteúdo desta seção</option>
                    <optgroup label="Continuar o mesmo projeto">
                      {tools.map((b) => (
                        <option key={b.id} value={b.id}>
                          {blockLabel(b)} ·{' '}
                          {document.sections.find((s) => s.blockIds.includes(b.id))?.title}
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="Ferramenta externa">
                      <option value="estudio">Estúdio livre</option>
                      <option value="pinta">Pinta livre</option>
                    </optgroup>
                  </Select>
                </label>
                {section.workspaceBlockId && (
                  <p className="text-xs text-muted-foreground">
                    O aluno continua o mesmo projeto. A entrega será contada uma única vez.
                  </p>
                )}
              </div>
            </div>
          ))}
          <Button
            variant="outline"
            disabled={document.sections.length >= 60}
            onClick={() =>
              structure([
                ...document.sections,
                {
                  ...defaultLessonSection(crypto.randomUUID(), 'Nova seção', []),
                  ...(document.sections.some((s) => s.completion)
                    ? { completion: { version: 1 as const, blockIds: [] } }
                    : {}),
                },
              ])
            }
          >
            <Plus className="size-4" />
            Adicionar seção
          </Button>
          <details className="rounded-2xl border border-border bg-card p-5">
            <summary className="cursor-pointer font-semibold">
              Materiais de apoio · {document.supportBlockIds.length}
            </summary>
            <p className="my-3 text-sm text-muted-foreground">
              Conteúdo opcional, recolhido e fora da sequência principal.
            </p>
            {contentList(document.supportBlockIds, 'support')}
            <Button className="mt-3" variant="outline" onClick={() => onAddBlock(null)}>
              <Plus className="size-4" />
              Adicionar apoio
            </Button>
          </details>
        </fieldset>
      )}
    </section>
  )
}
