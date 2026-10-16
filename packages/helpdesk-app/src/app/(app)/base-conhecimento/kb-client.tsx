'use client'

import type {
  AiRunView,
  KnowledgeAudience,
  KnowledgeGapView,
  KnowledgeProduct,
  KnowledgeRevisionView,
} from '@sistemazero/helpdesk-contracts'
import { Button } from '@sistemazero/ui/button'
import { Dialog } from '@sistemazero/ui/dialog'
import { Textarea } from '@sistemazero/ui/textarea'
import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { AnswerEvidence } from '@/components/shared/answer-evidence'
import { apiGet, apiSend, isApiError } from '@/lib/api'
import { formatShortSp } from '@/lib/dates'
import type { HelpdeskPage, KbArticleView } from '@/lib/types'
import { ArticleDialog } from './article-dialog'
import { audienceLabels, KnowledgeFields, productLabels } from './knowledge-fields'

export function KbClient({ canPublish }: { canPublish: boolean }) {
  const [tab, setTab] = useState('Artigos')
  const [items, setItems] = useState<KbArticleView[]>([])
  const [hasMore, setHasMore] = useState(false)
  const [offset, setOffset] = useState(0)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [editor, setEditor] = useState<{ article: KbArticleView | null } | null>(null)
  const [selected, setSelected] = useState<KbArticleView | null>(null)
  const [revisions, setRevisions] = useState<KnowledgeRevisionView[]>([])
  const [gaps, setGaps] = useState<KnowledgeGapView[]>([])
  const [gapTarget, setGapTarget] = useState<string | null>(null)
  const [question, setQuestion] = useState('')
  const [audience, setAudience] = useState<KnowledgeAudience>('customer_adult')
  const [product, setProduct] = useState<KnowledgeProduct>('community')
  const [answer, setAnswer] = useState<AiRunView | null>(null)

  const load = useCallback(async (start = 0) => {
    setBusy(true)
    setError('')
    try {
      const page = await apiGet<HelpdeskPage<KbArticleView>>(
        `/api/helpdesk/kb?limit=50&offset=${start}`,
      )
      setItems((current) =>
        start
          ? [...current, ...page.items.filter((item) => !current.some((old) => old.id === item.id))]
          : page.items,
      )
      setOffset(start + page.items.length)
      setHasMore(page.hasMore)
    } catch {
      setError('Não foi possível carregar a base. Tente novamente.')
    } finally {
      setBusy(false)
    }
  }, [])
  useEffect(() => {
    void load()
  }, [load])

  async function inspect(article: KbArticleView) {
    setBusy(true)
    try {
      setRevisions(
        await apiGet<KnowledgeRevisionView[]>(`/api/helpdesk/kb/${article.id}/revisions`),
      )
      setSelected(article)
    } catch {
      toast.error('Não foi possível carregar as revisões.')
    } finally {
      setBusy(false)
    }
  }
  async function mutate(
    action: 'publish' | 'unpublish' | 'archive' | 'retry-index',
    revisionId?: string,
  ) {
    if (!selected) return
    setBusy(true)
    try {
      await apiSend(
        `/api/helpdesk/kb/${selected.id}/${action}`,
        'POST',
        action === 'retry-index'
          ? { revisionId }
          : { version: selected.version, ...(action === 'publish' ? { revisionId } : {}) },
      )
      toast.success(action === 'retry-index' ? 'Indexação reagendada.' : 'Base atualizada.')
      setSelected(null)
      await load()
    } catch (e) {
      toast.error(isApiError(e) ? e.message : 'Não foi possível atualizar a base.')
    } finally {
      setBusy(false)
    }
  }
  async function showGaps() {
    setTab('Lacunas')
    setBusy(true)
    setError('')
    try {
      setGaps(await apiGet<KnowledgeGapView[]>('/api/helpdesk/kb/gaps'))
    } catch {
      setError('Não foi possível carregar as lacunas.')
    } finally {
      setBusy(false)
    }
  }
  async function testAnswer() {
    setBusy(true)
    setAnswer(null)
    setError('')
    try {
      setAnswer(
        await apiSend<AiRunView>('/api/helpdesk/kb/test-answer', 'POST', {
          query: question,
          audience,
          product,
        }),
      )
    } catch (e) {
      setError(isApiError(e) ? e.message : 'Falha ao testar a resposta.')
    } finally {
      setBusy(false)
    }
  }
  const draft = revisions.find((revision) => revision.id === selected?.draftRevisionId)
  return (
    <div className="space-y-5" aria-busy={busy}>
      <nav aria-label="Base de conhecimento" className="flex flex-wrap gap-2">
        {['Artigos', 'Fontes', 'Lacunas', 'Testar resposta'].map((name) => (
          <Button
            key={name}
            variant={tab === name ? 'default' : 'outline'}
            onClick={() => (name === 'Lacunas' ? void showGaps() : setTab(name))}
          >
            {name}
          </Button>
        ))}
      </nav>
      {error ? (
        <div role="alert" className="text-sm text-destructive">
          {error}
          <Button variant="ghost" onClick={() => void (tab === 'Lacunas' ? showGaps() : load())}>
            Tentar novamente
          </Button>
        </div>
      ) : null}
      {tab === 'Artigos' || tab === 'Fontes' ? (
        <>
          <div className="flex justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              {tab === 'Fontes'
                ? 'Confira origem, responsável, revisão e validade antes de publicar.'
                : 'Editar cria uma nova revisão sem alterar a publicação atual.'}
            </p>
            <Button onClick={() => setEditor({ article: null })}>Novo artigo</Button>
          </div>
          {!busy && !items.length ? <p>Nenhum artigo cadastrado.</p> : null}
          <ul className="divide-y divide-border rounded-xl border border-border">
            {items.map((article) => (
              <li key={article.id} className="flex flex-wrap items-start justify-between gap-3 p-4">
                <div className="min-w-0 space-y-1">
                  <h2 className="font-medium">{article.title}</h2>
                  <p className="text-sm text-muted-foreground">
                    {article.published ? 'Publicado' : 'Rascunho'} ·{' '}
                    {audienceLabels[article.audience]} · {productLabels[article.product]}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Responsável: {article.ownerName || 'Não definido'} · Origem: {article.origin} ·{' '}
                    {article.validUntil
                      ? `Válido até ${formatShortSp(article.validUntil)}`
                      : 'Sem vencimento'}
                  </p>
                  {article.publishedRevisionId &&
                  article.draftRevisionId !== article.publishedRevisionId ? (
                    <p className="text-xs">Há alterações ainda não publicadas.</p>
                  ) : null}
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setEditor({ article })}>
                    Editar
                  </Button>
                  <Button variant="outline" onClick={() => void inspect(article)} disabled={busy}>
                    Revisões e publicação
                  </Button>
                </div>
              </li>
            ))}
          </ul>
          {hasMore ? (
            <Button variant="outline" disabled={busy} onClick={() => void load(offset)}>
              Carregar mais
            </Button>
          ) : null}
        </>
      ) : null}
      {tab === 'Lacunas' ? (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Execuções sem cobertura completa. Revise o atendimento e escreva uma orientação geral,
            removendo dados pessoais, antes de criar um artigo.
          </p>
          {gaps.length === 0 && !busy ? <p>Nenhuma lacuna pendente.</p> : null}
          {gaps.map((gap) => (
            <div
              key={gap.runId}
              className="flex flex-wrap justify-between gap-3 rounded-lg border p-3"
            >
              <p>
                {audienceLabels[gap.audience]} · {productLabels[gap.product]} · {gap.reason}
                {gap.ticketId ? (
                  <a className="ml-3 underline" href={`/tickets/${gap.ticketId}`}>
                    Revisar atendimento
                  </a>
                ) : null}
              </p>
              <Button
                variant="outline"
                onClick={() => {
                  setGapTarget(gap.runId)
                  setEditor({ article: null })
                }}
              >
                Escrever artigo
              </Button>
            </div>
          ))}
        </div>
      ) : null}
      {tab === 'Testar resposta' ? (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Simula uma pergunta com o público e o produto selecionados. Não envia mensagens a
            clientes. Use perguntas sem dados pessoais.
          </p>
          <KnowledgeFields
            audience={audience}
            product={product}
            onAudience={setAudience}
            onProduct={setProduct}
          />
          <label htmlFor="kb-question" className="text-sm">
            Pergunta de teste
          </label>
          <Textarea
            id="kb-question"
            maxLength={8000}
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
          />
          <Button onClick={() => void testAnswer()} disabled={busy || question.trim().length < 3}>
            {busy ? 'Testando…' : 'Testar resposta'}
          </Button>
          {answer ? <AnswerEvidence run={answer} /> : null}
        </div>
      ) : null}
      <ArticleDialog
        open={editor !== null}
        article={editor?.article ?? null}
        onClose={() => {
          setEditor(null)
          setGapTarget(null)
        }}
        onSaved={(saved) => {
          if (gapTarget)
            void apiSend(`/api/helpdesk/kb/gaps/${gapTarget}/resolve`, 'POST', {
              articleId: saved.id,
            })
              .then(() => showGaps())
              .catch(() => toast.error('Artigo salvo, mas a lacuna continua pendente.'))
          void load()
        }}
        onStale={() => void load()}
      />
      <Dialog
        open={selected !== null}
        onClose={() => setSelected(null)}
        title="Revisões e publicação"
        className="max-w-2xl"
        footer={
          <Button variant="outline" onClick={() => setSelected(null)}>
            Fechar
          </Button>
        }
      >
        <div className="space-y-4">
          <p className="text-sm">{selected?.title}</p>
          {revisions.map((revision) => (
            <details key={revision.id} className="rounded-lg border p-3">
              <summary className="cursor-pointer">
                Revisão {revision.number} · {revision.indexState}{' '}
                {selected?.publishedRevisionId === revision.id ? '· Publicada' : ''}
              </summary>
              <p className="my-2 text-xs">
                {audienceLabels[revision.audience]} · {revision.ownerName} · {revision.origin}
              </p>
              <pre className="max-h-64 overflow-auto whitespace-pre-wrap text-sm">
                {revision.content}
              </pre>
              {revision.indexState === 'failed' ? (
                <Button
                  variant="outline"
                  onClick={() => void mutate('retry-index', revision.id)}
                  disabled={busy}
                >
                  Repetir indexação
                </Button>
              ) : null}
            </details>
          ))}
          <Button
            variant="outline"
            onClick={() => selected && void inspect(selected)}
            disabled={busy}
          >
            Atualizar indexação
          </Button>
          {canPublish ? (
            <div className="flex flex-wrap gap-2">
              <Button
                disabled={
                  busy ||
                  draft?.indexState !== 'ready' ||
                  !draft.ownerName ||
                  !draft.validUntil ||
                  new Date(draft.validUntil).getTime() <= Date.now()
                }
                onClick={() => draft && void mutate('publish', draft.id)}
              >
                Publicar revisão atual
              </Button>
              <Button
                variant="outline"
                disabled={busy || !selected?.published}
                onClick={() => void mutate('unpublish')}
              >
                Retirar publicação
              </Button>
              <Button variant="destructive" disabled={busy} onClick={() => void mutate('archive')}>
                Arquivar artigo
              </Button>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              A publicação e a retirada são feitas por administradores.
            </p>
          )}
        </div>
      </Dialog>
    </div>
  )
}
