'use client'

import {
  HELP_TOOL_REFS,
  type HelpTutorialDocument,
  type HelpTutorialStep,
  helpEditorialWarnings,
  isHelpSlug,
  validateHelpTutorial,
} from '@sistemazero/core/help'
import { HelpTutorialView } from '@sistemazero/member-shell/components/help-tutorial-view'
import { Badge } from '@sistemazero/ui/badge'
import { Button } from '@sistemazero/ui/button'
import { Card, CardContent } from '@sistemazero/ui/card'
import { Dialog } from '@sistemazero/ui/dialog'
import { Input } from '@sistemazero/ui/input'
import { Field } from '@sistemazero/ui/label'
import { Select } from '@sistemazero/ui/select'
import { Spinner } from '@sistemazero/ui/spinner'
import { Textarea } from '@sistemazero/ui/textarea'
import { ArrowDown, ArrowUp, Download, Eye, Plus, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { AdminHeader } from '@/components/admin/admin-header'
import { useConfirm } from '@/components/admin/use-confirm'
import { RichTextEditor } from '@/components/editor/rich-text-editor'
import { ImageUploader } from '@/components/media/image-uploader'
import { VideoUploader } from '@/components/media/video-uploader'
import { type ApiError, apiGet, apiSend } from '@/lib/api'
import { downloadJson } from '@/lib/download-json'
import type { HelpCollectionView, HelpTutorialAdminView } from '@/lib/types'

const TOOL_LABEL: Record<(typeof HELP_TOOL_REFS)[number], string> = {
  pinta: 'Pinta',
  'estudio-completo': 'Estúdio',
  pensa: 'Pensa',
  molda: 'Molda',
}

function newStepId(steps: HelpTutorialStep[]): string {
  let n = steps.length + 1
  while (steps.some((s) => s.id === `passo-${n}`)) n += 1
  return `passo-${n}`
}

function videoProviderOf(src: string): 'vimeo' | 'youtube' | null {
  try {
    const host = new URL(src).hostname.toLowerCase()
    if (host === 'vimeo.com' || host.endsWith('.vimeo.com')) return 'vimeo'
    if (
      host === 'youtu.be' ||
      host === 'youtube.com' ||
      host.endsWith('.youtube.com') ||
      host.endsWith('youtube-nocookie.com')
    ) {
      return 'youtube'
    }
  } catch {
    // não é URL
  }
  return null
}

/**
 * O editor de UM tutorial do "Como fazer". Sem autosave, de propósito: o documento é pequeno e
 * o "Salvar rascunho" explícito com `expectedRevision` (409 → recarregar) evita o motor de
 * operações da aula. "Revisar e publicar" repete o diálogo da aula: bloqueios (`validateHelpTutorial`,
 * a MESMA função que o members roda) e sugestões (`helpEditorialWarnings`), com a prévia sendo o
 * `HelpTutorialView` real do member-shell.
 */
export function HelpEditorClient({
  tutorialId,
  currentRole,
}: {
  tutorialId: string
  currentRole: string
}) {
  const canWrite = currentRole === 'superadmin' || currentRole === 'admin'
  const router = useRouter()
  const [record, setRecord] = useState<HelpTutorialAdminView | null>(null)
  const [collections, setCollections] = useState<HelpCollectionView[]>([])
  const [draft, setDraft] = useState<HelpTutorialDocument | null>(null)
  const [meta, setMeta] = useState<{ slug: string; collectionId: string; position: number } | null>(
    null,
  )
  const [dirty, setDirty] = useState(false)
  const [busy, setBusy] = useState(false)
  const [preview, setPreview] = useState(false)
  const [reviewOpen, setReviewOpen] = useState(false)
  const [keywordsText, setKeywordsText] = useState('')
  const [videoUrl, setVideoUrl] = useState('')
  const { confirm, confirmDialog } = useConfirm()

  const load = useCallback(async () => {
    try {
      const [t, c] = await Promise.all([
        apiGet<HelpTutorialAdminView>(`/api/members/help/tutorials/${tutorialId}`),
        apiGet<{ collections: HelpCollectionView[] }>('/api/members/help/collections'),
      ])
      setRecord(t)
      setDraft(t.draft)
      setMeta({ slug: t.slug, collectionId: t.collectionId, position: t.position })
      setKeywordsText(t.draft.keywords.join(', '))
      setVideoUrl(t.draft.video?.src ?? '')
      setCollections(c.collections)
      setDirty(false)
    } catch (err) {
      toast.error((err as ApiError).message ?? 'Não consegui carregar o tutorial.')
    }
  }, [tutorialId])

  useEffect(() => {
    void load()
  }, [load])

  function update(patch: Partial<HelpTutorialDocument>) {
    setDraft((d) => (d ? { ...d, ...patch } : d))
    setDirty(true)
  }

  function updateStep(id: string, patch: Partial<HelpTutorialStep>) {
    setDraft((d) =>
      d ? { ...d, steps: d.steps.map((s) => (s.id === id ? { ...s, ...patch } : s)) } : d,
    )
    setDirty(true)
  }

  function moveStep(id: string, delta: -1 | 1) {
    setDraft((d) => {
      if (!d) return d
      const i = d.steps.findIndex((s) => s.id === id)
      const j = i + delta
      if (i < 0 || j < 0 || j >= d.steps.length) return d
      const steps = [...d.steps]
      ;[steps[i], steps[j]] = [steps[j] as HelpTutorialStep, steps[i] as HelpTutorialStep]
      return { ...d, steps }
    })
    setDirty(true)
  }

  const issues = useMemo(
    () => (draft && meta ? validateHelpTutorial(draft, { slug: meta.slug }) : []),
    [draft, meta],
  )
  const warnings = useMemo(() => (draft ? helpEditorialWarnings(draft) : []), [draft])

  async function save(): Promise<boolean> {
    if (!record || !draft || !meta) return false
    setBusy(true)
    try {
      const saved = await apiSend<HelpTutorialAdminView>(
        `/api/members/help/tutorials/${tutorialId}`,
        'PATCH',
        {
          expectedRevision: record.revision,
          draft,
          slug: meta.slug,
          collectionId: meta.collectionId,
          position: meta.position,
        },
      )
      setRecord(saved)
      setDirty(false)
      toast.success('Rascunho salvo.')
      return true
    } catch (err) {
      const e = err as ApiError
      if (e.status === 409 && e.code === 'HELP_TUTORIAL_CONFLICT') {
        toast.error('Outra pessoa salvou este tutorial. Recarregue a página para continuar.')
      } else {
        toast.error(e.message ?? 'Não consegui salvar.')
      }
      return false
    } finally {
      setBusy(false)
    }
  }

  async function act(action: 'publish' | 'unpublish' | 'archive'): Promise<boolean> {
    if (!record) return false
    if (dirty && !(await save())) return false
    setBusy(true)
    try {
      const current = await apiGet<HelpTutorialAdminView>(
        `/api/members/help/tutorials/${tutorialId}`,
      )
      const next = await apiSend<HelpTutorialAdminView>(
        `/api/members/help/tutorials/${tutorialId}/${action}`,
        'POST',
        { expectedRevision: current.revision },
      )
      setRecord(next)
      toast.success(
        action === 'publish'
          ? 'Publicado! A criança já vê este tutorial.'
          : action === 'unpublish'
            ? 'Despublicado. Some do Como fazer da criança.'
            : 'Arquivado.',
      )
      return true
    } catch (err) {
      const e = err as ApiError
      toast.error(e.message ?? 'Não consegui.')
      return false
    } finally {
      setBusy(false)
    }
  }

  if (!record || !draft || !meta) {
    return (
      <div className="flex justify-center py-12">
        <Spinner />
      </div>
    )
  }

  const collection = collections.find((c) => c.id === meta.collectionId)
  const readOnly = !canWrite || record.status === 'archived'

  return (
    <div className="space-y-6">
      <AdminHeader
        title={draft.title || 'Tutorial sem título'}
        description={`/como-fazer/${meta.slug} · ${collection?.title ?? 'sem coleção'} · revisão ${record.revision}`}
        acoesAbaixo
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Link href="/admin/como-fazer" className="text-sm underline">
              Voltar à lista
            </Link>
            <Badge
              variant={
                record.status === 'published'
                  ? 'success'
                  : record.status === 'archived'
                    ? 'destructive'
                    : 'muted'
              }
            >
              {record.status === 'published'
                ? 'Publicado'
                : record.status === 'archived'
                  ? 'Arquivado'
                  : 'Rascunho'}
            </Badge>
            {record.hasUnpublishedChanges && <Badge variant="outline">Rascunho mais novo</Badge>}
            <Button variant="outline" onClick={() => setPreview((p) => !p)}>
              <Eye className="size-4" />
              {preview ? 'Voltar a editar' : 'Pré-visualizar'}
            </Button>
            <Button
              variant="outline"
              onClick={() =>
                downloadJson(`${meta.slug}.json`, {
                  tutorials: [
                    {
                      slug: meta.slug,
                      collection: collection?.slug ?? '',
                      position: meta.position,
                      draft,
                    },
                  ],
                })
              }
            >
              <Download className="size-4" />
              Exportar este
            </Button>
            {!readOnly && (
              <>
                <Button variant="outline" disabled={busy || !dirty} onClick={() => void save()}>
                  {busy && <Spinner />}Salvar rascunho
                </Button>
                <Button disabled={busy} onClick={() => setReviewOpen(true)}>
                  Revisar e publicar
                </Button>
                {record.status === 'published' && (
                  <Button
                    variant="ghost"
                    disabled={busy}
                    onClick={() =>
                      confirm({
                        title: 'Despublicar este tutorial?',
                        message:
                          'Ele some do Como fazer da criança e da base do Zappy até publicar de novo.',
                        confirmText: 'Despublicar',
                        onConfirm: async () => {
                          await act('unpublish')
                        },
                      })
                    }
                  >
                    Despublicar
                  </Button>
                )}
                <Button
                  variant="ghost"
                  disabled={busy}
                  onClick={() =>
                    confirm({
                      title: 'Arquivar este tutorial?',
                      message:
                        'Ele some do Como fazer, e não pode mais ser editado nem publicado. O endereço fica reservado.',
                      confirmText: 'Arquivar',
                      confirmVariant: 'destructive',
                      onConfirm: async () => {
                        if (await act('archive')) router.push('/admin/como-fazer')
                      },
                    })
                  }
                >
                  Arquivar
                </Button>
              </>
            )}
          </div>
        }
      />

      {preview ? (
        <Card>
          <CardContent className="pt-6">
            <p className="mb-4 text-muted-foreground text-sm">
              É o rascunho, como a criança vai ler (o mesmo componente da página dela). Sem marca
              d'água aqui.
            </p>
            <h2 className="mb-3 font-semibold text-2xl">{draft.title}</h2>
            <HelpTutorialView
              tutorial={draft}
              headingLevel={3}
              renderRelated={(slug) => <span className="text-sm">/como-fazer/{slug}</span>}
            />
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <div className="space-y-6">
            <Card>
              <CardContent className="space-y-4 pt-6">
                <Field label="Título (a tarefa, como a criança diria)" htmlFor="t-title">
                  <Input
                    id="t-title"
                    value={draft.title}
                    disabled={readOnly}
                    onChange={(e) => update({ title: e.target.value })}
                  />
                </Field>
                <Field label="Resumo (o que ela consegue fazer depois de ler)" htmlFor="t-summary">
                  <Textarea
                    id="t-summary"
                    rows={2}
                    value={draft.summary}
                    disabled={readOnly}
                    onChange={(e) => update({ summary: e.target.value })}
                  />
                </Field>
                <Field
                  label="Palavras alternativas (separe por vírgula: as palavras que a criança usaria)"
                  htmlFor="t-keywords"
                  hint="Ex.: prévia, ver o jogo, olhinho"
                >
                  <Input
                    id="t-keywords"
                    value={keywordsText}
                    disabled={readOnly}
                    onChange={(e) => {
                      setKeywordsText(e.target.value)
                      update({
                        keywords: e.target.value
                          .split(',')
                          .map((k) => k.trim())
                          .filter(Boolean),
                      })
                    }}
                  />
                </Field>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="space-y-4 pt-6">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">Passos</h3>
                  {!readOnly && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        update({
                          steps: [
                            ...draft.steps,
                            { id: newStepId(draft.steps), title: '', body: '' },
                          ],
                        })
                      }
                    >
                      <Plus className="size-4" />
                      Passo
                    </Button>
                  )}
                </div>
                {draft.steps.map((step, index) => (
                  <div key={step.id} className="space-y-3 rounded-xl border p-4">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm">Passo {index + 1}</span>
                      {!readOnly && (
                        <span className="ml-auto flex gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            aria-label={`Subir passo ${index + 1}`}
                            disabled={index === 0}
                            onClick={() => moveStep(step.id, -1)}
                          >
                            <ArrowUp className="size-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            aria-label={`Descer passo ${index + 1}`}
                            disabled={index === draft.steps.length - 1}
                            onClick={() => moveStep(step.id, 1)}
                          >
                            <ArrowDown className="size-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            aria-label={`Remover passo ${index + 1}`}
                            disabled={draft.steps.length === 1}
                            onClick={() =>
                              update({ steps: draft.steps.filter((s) => s.id !== step.id) })
                            }
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </span>
                      )}
                    </div>
                    <Field label="Título do passo" htmlFor={`s-${step.id}-title`}>
                      <Input
                        id={`s-${step.id}-title`}
                        value={step.title}
                        disabled={readOnly}
                        placeholder="Ex.: Abra a aba Pré-visualização"
                        onChange={(e) => updateStep(step.id, { title: e.target.value })}
                      />
                    </Field>
                    <Field label="O que a criança faz, e onde (use os nomes REAIS dos botões)">
                      <RichTextEditor
                        content={step.body}
                        onChange={(markdown) => updateStep(step.id, { body: markdown })}
                      />
                    </Field>
                    <div className="grid gap-3 md:grid-cols-2">
                      <Field label="Imagem da interface (opcional)">
                        <ImageUploader
                          value={step.imageUrl ?? ''}
                          scope="block"
                          onChange={(url) => updateStep(step.id, { imageUrl: url || undefined })}
                        />
                      </Field>
                      <Field
                        label="O que aparece na imagem (texto alternativo)"
                        htmlFor={`s-${step.id}-alt`}
                        error={
                          step.imageUrl && !step.imageAlt?.trim()
                            ? 'Obrigatório quando há imagem.'
                            : undefined
                        }
                      >
                        <Input
                          id={`s-${step.id}-alt`}
                          value={step.imageAlt ?? ''}
                          disabled={readOnly}
                          onChange={(e) =>
                            updateStep(step.id, { imageAlt: e.target.value || undefined })
                          }
                        />
                      </Field>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardContent className="space-y-4 pt-6">
                <Field
                  label="Endereço"
                  htmlFor="t-slug"
                  hint="/como-fazer/… Estável: os links das aulas apontam para ele."
                  error={
                    !isHelpSlug(meta.slug) ? 'Só letras minúsculas, números e traços.' : undefined
                  }
                >
                  <Input
                    id="t-slug"
                    value={meta.slug}
                    disabled={readOnly || record.status === 'published'}
                    onChange={(e) => {
                      setMeta({ ...meta, slug: e.target.value })
                      setDirty(true)
                    }}
                  />
                </Field>
                <Field label="Coleção" htmlFor="t-col">
                  <Select
                    id="t-col"
                    value={meta.collectionId}
                    disabled={readOnly}
                    onChange={(e) => {
                      setMeta({ ...meta, collectionId: e.target.value })
                      setDirty(true)
                    }}
                  >
                    {collections
                      .filter((c) => c.status === 'active' || c.id === meta.collectionId)
                      .map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.title}
                        </option>
                      ))}
                  </Select>
                </Field>
                <Field label="Posição na coleção" htmlFor="t-pos">
                  <Input
                    id="t-pos"
                    type="number"
                    min={0}
                    value={meta.position}
                    disabled={readOnly}
                    onChange={(e) => {
                      setMeta({ ...meta, position: Math.max(0, Number(e.target.value) || 0) })
                      setDirty(true)
                    }}
                  />
                </Field>
                <Field
                  label="Ferramenta de que o tutorial fala"
                  htmlFor="t-tool"
                  hint="A página avisa, sem oferta, quando ela não está liberada para o perfil."
                >
                  <Select
                    id="t-tool"
                    value={draft.toolRef ?? ''}
                    disabled={readOnly}
                    onChange={(e) =>
                      update({
                        toolRef: (e.target.value || undefined) as HelpTutorialDocument['toolRef'],
                      })
                    }
                  >
                    <option value="">Plataforma (nenhuma ferramenta)</option>
                    {HELP_TOOL_REFS.map((tool) => (
                      <option key={tool} value={tool}>
                        {TOOL_LABEL[tool]}
                      </option>
                    ))}
                  </Select>
                </Field>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="space-y-4 pt-6">
                <h3 className="font-semibold">Vídeo curto (opcional)</h3>
                {!readOnly && (
                  <VideoUploader
                    currentSrc={draft.video?.provider === 'vimeo' ? draft.video.src : undefined}
                    onReady={(video) => {
                      setVideoUrl(video.embedUrl)
                      update({ video: { provider: 'vimeo', src: video.embedUrl } })
                    }}
                  />
                )}
                <Field
                  label="Ou cole o endereço (Vimeo ou YouTube)"
                  htmlFor="t-video"
                  error={
                    videoUrl && !videoProviderOf(videoUrl) ? 'Só Vimeo ou YouTube.' : undefined
                  }
                >
                  <Input
                    id="t-video"
                    value={videoUrl}
                    disabled={readOnly}
                    onChange={(e) => {
                      const src = e.target.value.trim()
                      setVideoUrl(e.target.value)
                      const provider = videoProviderOf(src)
                      update({ video: src && provider ? { provider, src } : undefined })
                    }}
                  />
                </Field>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="space-y-2 pt-6 text-sm">
                <h3 className="font-semibold">Antes de publicar</h3>
                {issues.length === 0 ? (
                  <p className="text-muted-foreground">Sem bloqueios.</p>
                ) : (
                  <ul className="list-disc space-y-1 pl-5 text-destructive">
                    {issues.map((i) => (
                      <li key={`${i.field}-${i.message}`}>{i.message}</li>
                    ))}
                  </ul>
                )}
                {warnings.length > 0 && (
                  <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
                    {warnings.map((w) => (
                      <li key={w}>{w}</li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      <Dialog
        open={reviewOpen}
        onClose={() => setReviewOpen(false)}
        title="Revisar e publicar"
        className="max-w-2xl"
        footer={
          <Button
            disabled={busy || issues.length > 0}
            onClick={() => {
              void (async () => {
                if (await act('publish')) setReviewOpen(false)
              })()
            }}
          >
            {busy && <Spinner />}
            {record.status === 'published' ? 'Publicar a versão nova' : 'Publicar'}
          </Button>
        }
      >
        <div className="space-y-4">
          <p className="text-sm">
            {issues.length
              ? `${issues.length} pendência(s) impedem a publicação.`
              : 'Sem pendências. Ao publicar, a criança vê este tutorial na hora e o Zappy passa a citá-lo.'}
          </p>
          {issues.map((issue) => (
            <div
              key={`${issue.field}-${issue.message}`}
              className="rounded-xl border border-destructive/20 p-3 text-sm"
            >
              {issue.message}
            </div>
          ))}
          {warnings.length > 0 && (
            <details>
              <summary className="cursor-pointer font-medium text-sm">
                Sugestões (não impedem publicar)
              </summary>
              <ul className="mt-3 list-disc space-y-2 pl-5 text-sm">
                {warnings.map((w) => (
                  <li key={w}>{w}</li>
                ))}
              </ul>
            </details>
          )}
        </div>
      </Dialog>
      {confirmDialog}
    </div>
  )
}
