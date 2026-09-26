'use client'

import {
  HELP_COLLECTION_ICONS,
  HELP_COLLECTION_TONES,
  type HelpCollectionDocument,
  type HelpTutorialDocument,
  isHelpSlug,
  validateHelpCollection,
  validateHelpTutorial,
} from '@sistemazero/core/help'
import { Badge } from '@sistemazero/ui/badge'
import { Button } from '@sistemazero/ui/button'
import { Card, CardContent } from '@sistemazero/ui/card'
import { Dialog } from '@sistemazero/ui/dialog'
import { Input } from '@sistemazero/ui/input'
import { Field } from '@sistemazero/ui/label'
import { Select } from '@sistemazero/ui/select'
import { Spinner } from '@sistemazero/ui/spinner'
import { Tabs } from '@sistemazero/ui/tabs'
import { Textarea } from '@sistemazero/ui/textarea'
import { ArrowDown, ArrowUp, Download, Plus } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { AdminHeader } from '@/components/admin/admin-header'
import { JsonImportPanel } from '@/components/admin/json-import-panel'
import { useConfirm } from '@/components/admin/use-confirm'
import { type ApiError, apiGet, apiSend } from '@/lib/api'
import { downloadJson } from '@/lib/download-json'
import type { ImportParseResult } from '@/lib/lesson-block-import'
import type {
  HelpCollectionView,
  HelpImportFile,
  HelpImportResultView,
  HelpTutorialAdminSummaryView,
} from '@/lib/types'

const STATUS_LABEL: Record<HelpTutorialAdminSummaryView['status'], string> = {
  draft: 'Rascunho',
  published: 'Publicado',
  archived: 'Arquivado',
}
const STATUS_VARIANT: Record<
  HelpTutorialAdminSummaryView['status'],
  'muted' | 'success' | 'destructive'
> = { draft: 'muted', published: 'success', archived: 'destructive' }

const ICON_LABEL: Record<(typeof HELP_COLLECTION_ICONS)[number], string> = {
  compass: 'Bússola (plataforma)',
  palette: 'Paleta (Pinta)',
  blocks: 'Blocos (Estúdio)',
  lightbulb: 'Lâmpada (Pensa)',
  box: 'Cubo (Molda)',
  gamepad: 'Controle',
  sparkles: 'Brilho',
  book: 'Livro',
}
const TONE_LABEL: Record<(typeof HELP_COLLECTION_TONES)[number], string> = {
  marca: 'Cor da casa (azul)',
  estudio: 'Cor do Estúdio',
  pinta: 'Cor do Pinta',
  pensa: 'Cor do Pensa',
  molda: 'Cor do Molda',
}

const EXEMPLO_IMPORT: HelpImportFile = {
  collections: [
    {
      slug: 'estudio',
      title: 'Estúdio',
      description: 'Projetos, blocos e o jogo rodando.',
      icon: 'blocks',
      tone: 'estudio',
    },
  ],
  tutorials: [
    {
      slug: 'estudio-pre-visualizacao',
      collection: 'estudio',
      draft: {
        title: 'Como ver meu jogo na Pré-visualização',
        summary: 'Onde o jogo aparece enquanto você monta os blocos.',
        keywords: ['prévia', 'ver o jogo', 'olhinho'],
        toolRef: 'estudio-completo',
        steps: [
          {
            id: 'abas',
            title: 'Em tela estreita, abra a aba Pré-visualização',
            body: 'Toque em **Pré-visualização** no alto da área de trabalho.',
          },
        ],
      },
    },
  ],
}

function slugify(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
}

// As chaves que o `HelpImportBody` do members aceita (`additionalProperties: false`): um campo a
// mais derrubava o lote INTEIRO com a mensagem crua do TypeBox, em inglês, sem dizer qual tutorial.
const CHAVES_TUTORIAL = new Set(['slug', 'collection', 'position', 'draft'])
const CHAVES_DRAFT = new Set([
  'title',
  'summary',
  'keywords',
  'toolRef',
  'video',
  'steps',
  'related',
])
const CHAVES_PASSO = new Set(['id', 'title', 'body', 'imageUrl', 'imageAlt'])
const CHAVES_VIDEO = new Set(['provider', 'src', 'posterUrl'])
const CHAVES_COLECAO = new Set(['slug', 'title', 'description', 'icon', 'tone', 'position'])

function chavesForaDoLugar(obj: unknown, permitidas: Set<string>): string[] {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return []
  return Object.keys(obj).filter((k) => !permitidas.has(k))
}

/**
 * Confere o arquivo ANTES de mandar ao members: formato do envelope, chaves desconhecidas e o
 * mesmo `validateHelpTutorial` que o publish roda. O import aceita rascunho incompleto (o
 * members é leniente no rascunho), então aqui só o que bloquearia o LOTE vira erro: slug,
 * coleção e chaves fora do contrato. O resto vira aviso na prévia, tutorial por tutorial.
 */
function parseImport(text: string): ImportParseResult<HelpImportFile> {
  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch {
    return { success: false, errors: ['O arquivo não é um JSON válido.'] }
  }
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { success: false, errors: ['O JSON precisa ser um objeto com "tutorials".'] }
  }
  const file = raw as Partial<HelpImportFile>
  const errors: string[] = []
  if (!Array.isArray(file.tutorials)) errors.push('Falta a lista "tutorials".')
  const vistos = new Set<string>()
  for (const [i, t] of (file.tutorials ?? []).entries()) {
    const nome = `Tutorial ${i + 1}${t?.slug ? ` (${t.slug})` : ''}`
    if (!isHelpSlug(t?.slug)) errors.push(`${nome}: "slug" inválido.`)
    else if (vistos.has(t.slug)) errors.push(`${nome}: "slug" repetido no arquivo.`)
    else vistos.add(t.slug)
    if (!isHelpSlug(t?.collection)) errors.push(`${nome}: "collection" inválida.`)
    if (!t?.draft || typeof t.draft !== 'object') {
      errors.push(`${nome}: falta "draft".`)
      continue
    }
    for (const k of chavesForaDoLugar(t, CHAVES_TUTORIAL))
      errors.push(`${nome}: campo "${k}" não existe.`)
    for (const k of chavesForaDoLugar(t.draft, CHAVES_DRAFT)) {
      errors.push(`${nome}: campo "${k}" não existe no rascunho.`)
    }
    for (const k of chavesForaDoLugar(t.draft.video, CHAVES_VIDEO)) {
      errors.push(`${nome}: campo "${k}" não existe no vídeo.`)
    }
    for (const [j, step] of (Array.isArray(t.draft.steps) ? t.draft.steps : []).entries()) {
      for (const k of chavesForaDoLugar(step, CHAVES_PASSO)) {
        errors.push(`${nome}, passo ${j + 1}: campo "${k}" não existe.`)
      }
    }
    if (!Array.isArray(t.draft.steps) || !Array.isArray(t.draft.keywords)) {
      errors.push(`${nome}: "steps" e "keywords" precisam ser listas.`)
    }
  }
  for (const [i, c] of (file.collections ?? []).entries()) {
    for (const k of chavesForaDoLugar(c, CHAVES_COLECAO)) {
      errors.push(`Coleção ${i + 1}: campo "${k}" não existe.`)
    }
    for (const issue of validateHelpCollection(c as HelpCollectionDocument)) {
      errors.push(`Coleção ${i + 1}: ${issue.message}`)
    }
  }
  return errors.length
    ? { success: false, errors }
    : { success: true, data: file as HelpImportFile }
}

/** O que o publish vai cobrar de cada tutorial do lote (informa; o import não bloqueia). */
function pendenciasDoLote(file: HelpImportFile): Array<{ slug: string; issues: string[] }> {
  return file.tutorials.flatMap((t) => {
    const issues = validateHelpTutorial(t.draft as HelpTutorialDocument, { slug: t.slug }).map(
      (i) => i.message,
    )
    return issues.length ? [{ slug: t.slug, issues }] : []
  })
}

/**
 * A biblioteca "Como fazer" (ajuda do Kids): coleções e tutoriais. A criança só lê o
 * PUBLICADO; aqui se edita o rascunho, publica, despublica, arquiva e transporta por JSON
 * (o lote inicial em `docs/como-fazer/` e a viagem staging → produção).
 */
export function ComoFazerClient({ currentRole }: { currentRole: string }) {
  const canWrite = currentRole === 'superadmin' || currentRole === 'admin'
  const router = useRouter()
  const [tab, setTab] = useState<'tutoriais' | 'colecoes' | 'importar'>('tutoriais')
  const [collections, setCollections] = useState<HelpCollectionView[] | null>(null)
  const [tutorials, setTutorials] = useState<HelpTutorialAdminSummaryView[] | null>(null)
  const [filterStatus, setFilterStatus] = useState('')
  const [filterCollection, setFilterCollection] = useState('')
  const [q, setQ] = useState('')
  const [novo, setNovo] = useState<{ title: string; slug: string; collectionId: string } | null>(
    null,
  )
  const [colForm, setColForm] = useState<
    (HelpCollectionDocument & { id?: string; slugTouched?: boolean }) | null
  >(null)
  const [busy, setBusy] = useState(false)
  const { confirm, confirmDialog } = useConfirm()

  const reload = useCallback(async () => {
    try {
      const [c, t] = await Promise.all([
        apiGet<{ collections: HelpCollectionView[] }>('/api/members/help/collections'),
        apiGet<{ tutorials: HelpTutorialAdminSummaryView[] }>('/api/members/help/tutorials'),
      ])
      setCollections(c.collections)
      setTutorials(t.tutorials)
    } catch (err) {
      toast.error((err as ApiError).message ?? 'Não consegui carregar o Como fazer.')
    }
  }, [])

  useEffect(() => {
    void reload()
  }, [reload])

  const collectionTitle = useMemo(
    () => new Map((collections ?? []).map((c) => [c.id, c.title])),
    [collections],
  )
  const activeCollections = (collections ?? []).filter((c) => c.status === 'active')
  const visiveis = (tutorials ?? []).filter(
    (t) =>
      (!filterStatus || t.status === filterStatus) &&
      (!filterCollection || t.collectionId === filterCollection) &&
      (!q.trim() ||
        t.title.toLowerCase().includes(q.trim().toLowerCase()) ||
        t.slug.includes(q.trim().toLowerCase())),
  )

  async function createTutorial() {
    if (!novo) return
    setBusy(true)
    try {
      const created = await apiSend<{ id: string }>('/api/members/help/tutorials', 'POST', {
        slug: novo.slug,
        collectionId: novo.collectionId,
        draft: {
          title: novo.title,
          summary: '',
          keywords: [],
          steps: [{ id: 'passo-1', title: '', body: '' }],
        },
      })
      setNovo(null)
      router.push(`/admin/como-fazer/${created.id}`)
    } catch (err) {
      toast.error((err as ApiError).message ?? 'Não consegui criar o tutorial.')
    } finally {
      setBusy(false)
    }
  }

  async function saveCollection() {
    if (!colForm) return
    const doc: HelpCollectionDocument = {
      slug: colForm.slug,
      title: colForm.title,
      description: colForm.description,
      icon: colForm.icon,
      tone: colForm.tone,
    }
    const issues = validateHelpCollection(doc)
    if (issues.length) {
      toast.error(issues[0]?.message ?? 'Confira os campos.')
      return
    }
    setBusy(true)
    try {
      if (colForm.id) {
        await apiSend(`/api/members/help/collections/${colForm.id}`, 'PATCH', doc)
      } else {
        await apiSend('/api/members/help/collections', 'POST', doc)
      }
      setColForm(null)
      toast.success('Coleção salva.')
      await reload()
    } catch (err) {
      toast.error((err as ApiError).message ?? 'Não consegui salvar a coleção.')
    } finally {
      setBusy(false)
    }
  }

  async function moveCollection(id: string, delta: -1 | 1) {
    const ids = activeCollections.map((c) => c.id)
    const i = ids.indexOf(id)
    const j = i + delta
    if (i < 0 || j < 0 || j >= ids.length) return
    ;[ids[i], ids[j]] = [ids[j] as string, ids[i] as string]
    try {
      await apiSend('/api/members/help/collections/order', 'PUT', { ids })
      await reload()
    } catch (err) {
      toast.error((err as ApiError).message ?? 'Não consegui reordenar.')
    }
  }

  function archiveCollection(c: HelpCollectionView) {
    if (c.publishedCount > 0) {
      // O members recusa com 409; abrir o confirm só para falhar era um botão que mentia.
      toast.error(
        `"${c.title}" ainda tem ${c.publishedCount} tutorial(is) publicado(s). Despublique-os antes de arquivar.`,
      )
      return
    }
    confirm({
      title: `Arquivar "${c.title}"?`,
      message: 'A coleção some do Como fazer da criança. Os tutoriais dela continuam guardados.',
      confirmText: 'Arquivar',
      confirmVariant: 'destructive',
      onConfirm: async () => {
        try {
          await apiSend(`/api/members/help/collections/${c.id}/archive`, 'POST')
          toast.success('Coleção arquivada.')
          await reload()
        } catch (err) {
          toast.error((err as ApiError).message ?? 'Não consegui arquivar.')
        }
      },
    })
  }

  async function restoreCollection(c: HelpCollectionView) {
    try {
      await apiSend(`/api/members/help/collections/${c.id}/restore`, 'POST')
      await reload()
    } catch (err) {
      toast.error((err as ApiError).message ?? 'Não consegui restaurar.')
    }
  }

  async function exportAll() {
    try {
      const data = await apiGet<{
        collections: HelpCollectionView[]
        tutorials: Array<{ slug: string; collectionId: string; position: number; draft: unknown }>
      }>('/api/members/help/tutorials/export')
      const bySlug = new Map(data.collections.map((c) => [c.id, c.slug]))
      const file: HelpImportFile = {
        collections: data.collections.map((c, position) => ({
          slug: c.slug,
          title: c.title,
          description: c.description,
          icon: c.icon,
          tone: c.tone,
          position,
        })),
        tutorials: data.tutorials.map((t) => ({
          slug: t.slug,
          collection: bySlug.get(t.collectionId) ?? '',
          position: t.position,
          draft: t.draft as HelpImportFile['tutorials'][number]['draft'],
        })),
      }
      downloadJson(`como-fazer-${new Date().toISOString().slice(0, 10)}.json`, file)
    } catch (err) {
      toast.error((err as ApiError).message ?? 'Não consegui exportar.')
    }
  }

  /** Lança em falha: o `JsonImportPanel` só mostra o sucesso dele quando isto resolve. */
  async function applyImport(data: HelpImportFile) {
    try {
      const result = await apiSend<HelpImportResultView>(
        '/api/members/help/tutorials/import',
        'POST',
        data,
      )
      const partes = [
        `${result.collections.created} coleção(ões) nova(s), ${result.collections.updated} atualizada(s)`,
        `${result.tutorials.created} tutorial(is) novo(s), ${result.tutorials.updated} atualizado(s)`,
      ]
      if (result.rejected.length) {
        toast.warning(
          `${partes.join('; ')}. Recusados: ${result.rejected.map((r) => `${r.slug} (${r.reason})`).join(', ')}`,
        )
      } else {
        toast.info(`${partes.join('; ')}. Tudo entrou como rascunho: revise e publique.`)
      }
      await reload()
      setTab('tutoriais')
    } catch (err) {
      toast.error((err as ApiError).message ?? 'Não consegui importar.')
      throw err
    }
  }

  const loading = !collections || !tutorials

  return (
    <div className="space-y-6">
      <AdminHeader
        title="Como fazer"
        description="A biblioteca de ajuda do Kids: tutoriais curtos por tarefa, separados dos cursos. A criança só vê o que está publicado."
        action={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => void exportAll()}>
              <Download className="size-4" />
              Exportar JSON
            </Button>
            {canWrite && (
              <Button
                onClick={() =>
                  setNovo({ title: '', slug: '', collectionId: activeCollections[0]?.id ?? '' })
                }
                disabled={activeCollections.length === 0}
              >
                <Plus className="size-4" />
                Novo tutorial
              </Button>
            )}
          </div>
        }
      />

      <Tabs
        value={tab}
        onChange={(value) => setTab(value as typeof tab)}
        items={[
          { value: 'tutoriais', label: 'Tutoriais' },
          { value: 'colecoes', label: 'Coleções' },
          { value: 'importar', label: 'Importar' },
        ]}
      />

      {loading ? (
        <div className="flex justify-center py-12">
          <Spinner />
        </div>
      ) : tab === 'tutoriais' ? (
        <Card>
          <CardContent className="space-y-4 pt-6">
            <div className="grid gap-3 md:grid-cols-3">
              <Input
                placeholder="Buscar por título ou endereço…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                aria-label="Buscar tutorial"
              />
              <Select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                aria-label="Filtrar por situação"
              >
                <option value="">Todas as situações</option>
                <option value="draft">Rascunho</option>
                <option value="published">Publicado</option>
                <option value="archived">Arquivado</option>
              </Select>
              <Select
                value={filterCollection}
                onChange={(e) => setFilterCollection(e.target.value)}
                aria-label="Filtrar por coleção"
              >
                <option value="">Todas as coleções</option>
                {(collections ?? []).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title}
                  </option>
                ))}
              </Select>
            </div>
            {visiveis.length === 0 ? (
              <p className="py-8 text-center text-muted-foreground text-sm">
                {tutorials?.length
                  ? 'Nenhum tutorial com esses filtros.'
                  : 'Ainda não há tutoriais. Crie o primeiro ou importe o lote de docs/como-fazer.'}
              </p>
            ) : (
              <ul className="divide-y">
                {visiveis.map((t) => (
                  <li key={t.id} className="flex flex-wrap items-center gap-3 py-3">
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/admin/como-fazer/${t.id}`}
                        className="font-medium hover:underline"
                      >
                        {t.title || '(sem título)'}
                      </Link>
                      <p className="text-muted-foreground text-xs">
                        {collectionTitle.get(t.collectionId) ?? 'sem coleção'} · /como-fazer/
                        {t.slug}
                      </p>
                    </div>
                    {t.hasUnpublishedChanges && <Badge variant="outline">Rascunho mais novo</Badge>}
                    <Badge variant={STATUS_VARIANT[t.status]}>{STATUS_LABEL[t.status]}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      ) : tab === 'colecoes' ? (
        <Card>
          <CardContent className="space-y-4 pt-6">
            {canWrite && (
              <Button
                variant="outline"
                onClick={() =>
                  setColForm({ slug: '', title: '', description: '', icon: 'book', tone: 'marca' })
                }
              >
                <Plus className="size-4" />
                Nova coleção
              </Button>
            )}
            <ul className="divide-y">
              {(collections ?? []).map((c) => {
                // As setas andam na lista das ATIVAS: o índice da lista completa (com
                // arquivadas) habilitava "Subir" numa primeira ativa que não subia.
                const index = activeCollections.findIndex((a) => a.id === c.id)
                return (
                  <li key={c.id} className="flex flex-wrap items-center gap-3 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">
                        {c.title}{' '}
                        <span className="text-muted-foreground text-xs">
                          · {c.publishedCount} publicado(s) · {ICON_LABEL[c.icon]} ·{' '}
                          {TONE_LABEL[c.tone]}
                        </span>
                      </p>
                      <p className="text-muted-foreground text-xs">
                        {c.description || 'Sem descrição.'}
                      </p>
                    </div>
                    {c.status === 'archived' ? (
                      <>
                        <Badge variant="destructive">Arquivada</Badge>
                        {canWrite && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => void restoreCollection(c)}
                          >
                            Restaurar
                          </Button>
                        )}
                      </>
                    ) : (
                      canWrite && (
                        <>
                          <Button
                            size="sm"
                            variant="ghost"
                            aria-label={`Subir ${c.title}`}
                            disabled={index === 0}
                            onClick={() => void moveCollection(c.id, -1)}
                          >
                            <ArrowUp className="size-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            aria-label={`Descer ${c.title}`}
                            disabled={index === activeCollections.length - 1}
                            onClick={() => void moveCollection(c.id, 1)}
                          >
                            <ArrowDown className="size-4" />
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => setColForm({ ...c })}>
                            Editar
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => archiveCollection(c)}>
                            Arquivar
                          </Button>
                        </>
                      )
                    )}
                  </li>
                )
              })}
            </ul>
          </CardContent>
        </Card>
      ) : (
        <JsonImportPanel<HelpImportFile>
          parse={parseImport}
          renderPreview={(data) => {
            const pendencias = pendenciasDoLote(data)
            return (
              <div className="space-y-3 text-sm">
                <ul className="list-disc space-y-1 pl-5">
                  <li>{data.collections?.length ?? 0} coleção(ões)</li>
                  <li>
                    {data.tutorials.length} tutorial(is):{' '}
                    {data.tutorials.map((t) => t.slug).join(', ')}
                  </li>
                </ul>
                {pendencias.length > 0 && (
                  <details>
                    <summary className="cursor-pointer font-medium">
                      {pendencias.length} tutorial(is) ainda não passariam em "Revisar e publicar"
                      (entram como rascunho mesmo assim)
                    </summary>
                    <ul className="mt-2 list-disc space-y-1 pl-5 text-muted-foreground">
                      {pendencias.map((p) => (
                        <li key={p.slug}>
                          <strong>{p.slug}</strong>: {p.issues.join(' ')}
                        </li>
                      ))}
                    </ul>
                  </details>
                )}
              </div>
            )
          }}
          onApply={applyImport}
          confirmMessage={(filename) => (
            <span>
              A importação de <strong>{filename}</strong> grava no servidor agora: cria ou atualiza
              o RASCUNHO de cada tutorial pelo endereço (slug). O que está publicado não muda até
              você publicar de novo.
            </span>
          )}
          hasExistingContent={(tutorials?.length ?? 0) > 0}
          guide={
            <p className="text-sm">
              O arquivo é o mesmo que "Exportar JSON" gera (e o de <code>docs/como-fazer/</code>). O
              import cria ou atualiza pelo endereço (slug) e só mexe no RASCUNHO: nada é publicado
              sozinho. Ferramenta, vídeo e imagens vão dentro de cada tutorial.
            </p>
          }
          example={EXEMPLO_IMPORT}
          exampleFilename="como-fazer-exemplo.json"
          successMessage="Tutoriais importados como rascunho."
        />
      )}

      <Dialog
        open={novo !== null}
        onClose={() => (busy ? undefined : setNovo(null))}
        title="Novo tutorial"
        footer={
          <Button
            disabled={
              busy || !novo?.title.trim() || !isHelpSlug(novo?.slug ?? '') || !novo?.collectionId
            }
            onClick={() => void createTutorial()}
          >
            {busy && <Spinner />}Criar e editar
          </Button>
        }
      >
        {novo && (
          <div className="space-y-4">
            <Field label="Título (a tarefa, como a criança diria)" htmlFor="novo-title">
              <Input
                id="novo-title"
                value={novo.title}
                placeholder="Ex.: Como ver meu jogo na Pré-visualização"
                onChange={(e) =>
                  setNovo({
                    ...novo,
                    title: e.target.value,
                    slug:
                      novo.slug && novo.slug !== slugify(novo.title)
                        ? novo.slug
                        : slugify(e.target.value),
                  })
                }
              />
            </Field>
            <Field
              label="Endereço (fica em /como-fazer/…, e não muda depois de publicado)"
              htmlFor="novo-slug"
              error={
                novo.slug && !isHelpSlug(novo.slug)
                  ? 'Só letras minúsculas, números e traços.'
                  : undefined
              }
            >
              <Input
                id="novo-slug"
                value={novo.slug}
                onChange={(e) => setNovo({ ...novo, slug: e.target.value })}
              />
            </Field>
            <Field label="Coleção" htmlFor="novo-col">
              <Select
                id="novo-col"
                value={novo.collectionId}
                onChange={(e) => setNovo({ ...novo, collectionId: e.target.value })}
              >
                {activeCollections.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
        )}
      </Dialog>

      <Dialog
        open={colForm !== null}
        onClose={() => (busy ? undefined : setColForm(null))}
        title={colForm?.id ? 'Editar coleção' : 'Nova coleção'}
        footer={
          <Button disabled={busy} onClick={() => void saveCollection()}>
            {busy && <Spinner />}Salvar
          </Button>
        }
      >
        {colForm && (
          <div className="space-y-4">
            <Field label="Nome" htmlFor="col-title">
              <Input
                id="col-title"
                value={colForm.title}
                onChange={(e) =>
                  setColForm({
                    ...colForm,
                    title: e.target.value,
                    slug:
                      colForm.id || colForm.slugTouched ? colForm.slug : slugify(e.target.value),
                  })
                }
              />
            </Field>
            <Field label="Endereço" htmlFor="col-slug" hint="Fica em /como-fazer/colecao/…">
              <Input
                id="col-slug"
                value={colForm.slug}
                onChange={(e) =>
                  setColForm({ ...colForm, slug: e.target.value, slugTouched: true })
                }
              />
            </Field>
            <Field label="Descrição curta" htmlFor="col-desc">
              <Textarea
                id="col-desc"
                rows={2}
                value={colForm.description}
                onChange={(e) => setColForm({ ...colForm, description: e.target.value })}
              />
            </Field>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Ícone" htmlFor="col-icon">
                <Select
                  id="col-icon"
                  value={colForm.icon}
                  onChange={(e) =>
                    setColForm({
                      ...colForm,
                      icon: e.target.value as HelpCollectionDocument['icon'],
                    })
                  }
                >
                  {HELP_COLLECTION_ICONS.map((icon) => (
                    <option key={icon} value={icon}>
                      {ICON_LABEL[icon]}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Cor" htmlFor="col-tone">
                <Select
                  id="col-tone"
                  value={colForm.tone}
                  onChange={(e) =>
                    setColForm({
                      ...colForm,
                      tone: e.target.value as HelpCollectionDocument['tone'],
                    })
                  }
                >
                  {HELP_COLLECTION_TONES.map((tone) => (
                    <option key={tone} value={tone}>
                      {TONE_LABEL[tone]}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
          </div>
        )}
      </Dialog>
      {confirmDialog}
    </div>
  )
}
