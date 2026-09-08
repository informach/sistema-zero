'use client'

import {
  defaultLessonSection,
  type LessonSection,
  SECTION_INTENT_LABELS,
  SECTION_INTENTS,
  validateLessonSections,
} from '@sistemazero/core/learning'
import { LessonBlocks } from '@sistemazero/member-shell/components/lesson-blocks'
import { LessonSections } from '@sistemazero/member-shell/components/lesson-sections'
import { Button } from '@sistemazero/ui/button'
import { Input } from '@sistemazero/ui/input'
import { Select } from '@sistemazero/ui/select'
import { Textarea } from '@sistemazero/ui/textarea'
import { ArrowDown, ArrowUp, Plus } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { type ApiError, apiGet, apiSend } from '@/lib/api'
import type { BlockView, LessonContentView } from '@/lib/types'

interface Structure {
  revision: string | null
  sections: LessonSection[]
}
function blockLabel(block: BlockView) {
  const c = block.content
  if (c.kind === 'interactive') return c.title
  if (c.kind === 'rich_text')
    return (
      (c.markdown ?? 'Texto')
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
export function LessonStructureEditor({
  lesson,
  canWrite,
  onDirtyChange,
}: {
  lesson: LessonContentView
  canWrite: boolean
  onDirtyChange: (value: boolean) => void
}) {
  const [structure, setStructure] = useState<Structure | null>(null)
  const [busy, setBusy] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState('')
  const [preview, setPreview] = useState(false)
  const reload = useCallback(async () => {
    try {
      setStructure(await apiGet<Structure>(`/api/members/lessons/${lesson.id}/structure`))
      setDirty(false)
      setError('')
    } catch (e) {
      setError((e as ApiError).message || 'Não foi possível carregar as seções.')
    }
  }, [lesson.id])
  useEffect(() => {
    void reload()
  }, [reload])
  useEffect(() => {
    onDirtyChange(dirty)
  }, [dirty, onDirtyChange])
  useEffect(() => {
    if (!dirty) return
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])
  function change(sections: LessonSection[]) {
    setStructure((s) => (s ? { ...s, sections } : null))
    setDirty(true)
    setSaved('')
    setError('')
  }
  function patch(id: string, fields: Partial<LessonSection>) {
    if (structure) change(structure.sections.map((s) => (s.id === id ? { ...s, ...fields } : s)))
  }
  async function save() {
    if (!structure) return
    const invalid = validateLessonSections(structure.sections, lesson.blocks)
    if (invalid) {
      setError(invalid)
      return
    }
    setBusy(true)
    try {
      setStructure(
        await apiSend<Structure>(`/api/members/lessons/${lesson.id}/structure`, 'PUT', {
          expectedRevision: structure.revision,
          sections: structure.sections,
        }),
      )
      setDirty(false)
      setSaved('Organização salva.')
    } catch (e) {
      setError((e as ApiError).message || 'Não foi possível salvar.')
    } finally {
      setBusy(false)
    }
  }
  if (!structure)
    return (
      <div className="rounded-xl border border-border p-5">
        {error || 'Carregando organização didática…'}
        {error && (
          <Button variant="outline" onClick={() => void reload()}>
            Tentar novamente
          </Button>
        )}
      </div>
    )
  const tools = lesson.blocks.filter((b) => b.kind === 'studio' || b.kind === 'pinta')
  return (
    <section className="space-y-4 rounded-2xl border border-border bg-card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Organização didática</h2>
          <p className="mt-1 max-w-prose text-sm text-muted-foreground">
            Cada seção apresenta um objetivo. O mesmo editor pode acompanhar várias seções.
          </p>
        </div>
        <Button variant="outline" onClick={() => setPreview((v) => !v)}>
          {preview ? 'Voltar à organização' : 'Prévia da sequência'}
        </Button>
      </div>
      {preview ? (
        <LessonSections
          key={JSON.stringify(structure.sections)}
          lesson={{
            id: lesson.id,
            slug: lesson.slug,
            title: lesson.title,
            courseSlug: '',
            moduleId: '',
            completed: false,
            estimatedMinutes: null,
            positionSeconds: null,
            sections: structure.sections,
            blocks: lesson.blocks,
            attachments: [],
          }}
          renderBlocks={(blocks) =>
            blocks.some((b) => b.kind === 'studio' || b.kind === 'pinta') ? (
              <div className="rounded-xl border border-dashed border-primary/30 bg-primary/5 p-6">
                Editor do projeto:{' '}
                {blocks.map((b) => (b.kind === 'pinta' ? 'Pinta' : 'Estúdio')).join(', ')}. A
                configuração completa pode ser conferida no bloco abaixo.
              </div>
            ) : (
              <LessonBlocks blocks={blocks} />
            )
          }
        />
      ) : (
        <fieldset disabled={!canWrite || busy} className="space-y-4">
          {structure.sections.map((section, index) => (
            <div key={section.id} className="space-y-4 rounded-xl border border-border p-4">
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Seção {index + 1}
                </span>
                <div className="flex gap-1">
                  {[-1, 1].map((direction) => (
                    <Button
                      key={direction}
                      variant="ghost"
                      size="icon"
                      aria-label={`Mover seção ${index + 1} para ${direction < 0 ? 'cima' : 'baixo'}`}
                      disabled={!canWrite || busy || !structure.sections[index + direction]}
                      onClick={() => {
                        const next = [...structure.sections]
                        const other = next[index + direction]
                        if (!other) return
                        next[index] = other
                        next[index + direction] = section
                        change(next)
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
                    disabled={!canWrite || busy || structure.sections.length === 1}
                    onClick={() => {
                      const next = structure.sections.filter((s) => s.id !== section.id)
                      const target = next[Math.max(0, index - 1)]
                      change(
                        next.map((s) =>
                          s.id === target?.id
                            ? { ...s, blockIds: [...s.blockIds, ...section.blockIds] }
                            : s,
                        ),
                      )
                    }}
                  >
                    Remover seção
                  </Button>
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="space-y-1 text-sm">
                  Título
                  <Input
                    value={section.title}
                    maxLength={200}
                    onChange={(e) => patch(section.id, { title: e.target.value })}
                  />
                </label>
                <label className="space-y-1 text-sm">
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
              </div>
              <label className="block space-y-1 text-sm">
                Objetivo para o aluno
                <Textarea
                  value={section.objective}
                  maxLength={2000}
                  rows={2}
                  onChange={(e) => patch(section.id, { objective: e.target.value })}
                />
              </label>
              <ol className="space-y-2">
                {section.blockIds.map((id, blockIndex) => {
                  const block = lesson.blocks.find((b) => b.id === id)
                  return (
                    <li
                      key={id}
                      className="flex flex-wrap items-center gap-2 rounded-lg bg-muted/30 px-3 py-2"
                    >
                      <span className="min-w-0 flex-1 text-sm">
                        {block ? blockLabel(block) : 'Bloco não encontrado'}
                      </span>
                      {[-1, 1].map((direction) => (
                        <Button
                          key={direction}
                          size="icon"
                          variant="ghost"
                          disabled={!section.blockIds[blockIndex + direction]}
                          aria-label={`Mover bloco ${blockIndex + 1} para ${direction < 0 ? 'cima' : 'baixo'}`}
                          onClick={() => {
                            const ids = [...section.blockIds]
                            const other = ids[blockIndex + direction]
                            if (!other) return
                            ids[blockIndex] = other
                            ids[blockIndex + direction] = id
                            patch(section.id, { blockIds: ids })
                          }}
                        >
                          {direction < 0 ? (
                            <ArrowUp className="size-4" />
                          ) : (
                            <ArrowDown className="size-4" />
                          )}
                        </Button>
                      ))}
                      <Select
                        className="w-auto max-w-52"
                        aria-label={`Seção do bloco ${blockIndex + 1}`}
                        value={section.id}
                        onChange={(e) =>
                          change(
                            structure.sections.map((s) =>
                              s.id === section.id
                                ? { ...s, blockIds: s.blockIds.filter((b) => b !== id) }
                                : s.id === e.target.value
                                  ? { ...s, blockIds: [...s.blockIds, id] }
                                  : s,
                            ),
                          )
                        }
                      >
                        {structure.sections.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.title}
                          </option>
                        ))}
                      </Select>
                    </li>
                  )
                })}
              </ol>
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
                    )
                  }}
                >
                  <option value="">Somente o conteúdo desta seção</option>
                  <optgroup label="Mesmo projeto incorporado">
                    {tools.map((b) => (
                      <option key={b.id} value={b.id}>
                        {blockLabel(b)} · bloco {lesson.blocks.indexOf(b) + 1}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="Criar fora da aula">
                    <option value="estudio">Abrir Estúdio livre em outra aba</option>
                    <option value="pinta">Abrir Pinta em outra aba</option>
                  </optgroup>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Crie um único bloco para o projeto e selecione o mesmo bloco nas seções em que ele
                  deve aparecer. Outro bloco representa outro projeto.
                </p>
              </label>
              <label className="block space-y-1 text-sm">
                Mídias a produzir (uma por linha)
                <Textarea
                  value={section.pendingMedia.join('\n')}
                  rows={2}
                  onChange={(e) =>
                    patch(section.id, {
                      pendingMedia: e.target.value.split('\n').filter((line) => line.trim()),
                    })
                  }
                />
                <span className="text-xs text-muted-foreground">
                  Pendências impedem publicar a aula. Remova cada item depois de produzir e vincular
                  a mídia.
                </span>
              </label>
            </div>
          ))}
          <div className="flex flex-wrap justify-between gap-3">
            <Button
              variant="outline"
              disabled={structure.sections.length >= 60}
              onClick={() =>
                change([
                  ...structure.sections,
                  { ...defaultLessonSection(crypto.randomUUID(), 'Nova seção', []), objective: '' },
                ])
              }
            >
              <Plus className="size-4" />
              Adicionar seção
            </Button>
            <Button disabled={!dirty || busy} onClick={() => void save()}>
              {busy ? 'Salvando…' : 'Salvar organização'}
            </Button>
          </div>
        </fieldset>
      )}
      {error && (
        <div role="alert" className="space-y-2 text-sm text-destructive">
          <p>{error}</p>
          <Button
            variant="outline"
            onClick={() => {
              if (
                !dirty ||
                window.confirm('Descartar as alterações locais e recarregar a organização salva?')
              )
                void reload()
            }}
          >
            Recarregar organização salva
          </Button>
        </div>
      )}
      {saved && (
        <p role="status" className="text-sm text-muted-foreground">
          {saved}
        </p>
      )}
    </section>
  )
}
