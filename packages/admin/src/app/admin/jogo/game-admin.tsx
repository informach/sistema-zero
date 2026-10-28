'use client'

import {
  type AnaliseDoDesafio,
  AnaliseDoDesafioSchema,
  type CoberturaDosCartoes,
  CoberturaDosCartoesSchema,
  CriarDesafioSchema,
  corPermitida,
  type DesafioDaEquipe,
  DesafioDaEquipeSchema,
  DesafiosDaEquipeSchema,
  ILHA_IDS,
  ilha,
  ProblemasDePublicacaoSchema,
  type ResumoDoDesafio,
  TIPOS_DE_DESAFIO,
} from '@sistemazero/arquipelago-contracts'
import type { EditableStudioProject, StudioHandle } from '@sistemazero/studio'
import { prepareProjectForHost } from '@sistemazero/studio/project-validation'
import { Button } from '@sistemazero/ui/button'
import { Input } from '@sistemazero/ui/input'
import { Select } from '@sistemazero/ui/select'
import { Textarea } from '@sistemazero/ui/textarea'
import { useCallback, useEffect, useRef, useState } from 'react'
import { z } from 'zod'
import { usePlatform } from '@/components/admin/platform-provider'
import { GameObjectivesEditor } from '@/components/editor/game-objectives-editor'
import { StudioEmbed } from '@/components/studio/studio-embed'
import {
  type ChallengeDraft,
  challengeDraft,
  challengePayload,
  challengeType,
  newChallenge,
} from '@/lib/game-challenge-authoring'

const types = {
  'quadro-das-cores': 'Quadro das Cores',
  'desafio-do-dia': 'Desafio do dia',
  'pedido-de-morador': 'Pedido de morador',
}
const listSchema = DesafiosDaEquipeSchema
const coverageSchema = CoberturaDosCartoesSchema
type Coverage = CoberturaDosCartoes
const apiError = z.object({ error: z.object({ message: z.string() }) })

async function request(
  path: string,
  method: 'GET' | 'POST' | 'PUT',
  body?: unknown,
  signal?: AbortSignal,
): Promise<unknown> {
  const res = await fetch(`/api/arquipelago/${path}`, {
    method,
    cache: 'no-store',
    headers: { 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal,
  })
  const raw: unknown = await res.json()
  signal?.throwIfAborted()
  if (!res.ok) {
    const parsed = apiError.safeParse(raw)
    const issues = ProblemasDePublicacaoSchema.safeParse(raw)
    const details = issues.success ? issues.data.problemas.map((p) => p.mensagem).join(' ') : ''
    throw new Error(
      `${parsed.success ? parsed.data.error.message : 'Não foi possível concluir esta operação.'}${details ? ` ${details}` : ''}${res.status === 409 ? ' Sua edição permanece aqui. Reabra a versão atual antes de tentar salvar novamente.' : ''}`,
    )
  }
  return raw
}
const card = 'space-y-4 rounded-xl border border-border bg-card p-5'

export function GameAdmin({ canWrite }: { canWrite: boolean }) {
  const platform = usePlatform()
  const publico = platform === 'kids' ? 'kids' : 'adulto'
  const [island, setIsland] = useState('')
  const [tab, setTab] = useState<'desafios' | 'ilhas' | 'cartoes'>('desafios')
  const [coverageLoading, setCoverageLoading] = useState(false)
  const [rows, setRows] = useState<ResumoDoDesafio[]>([])
  const [coverage, setCoverage] = useState<{ publico: string; value: Coverage } | null>(null)
  const [draft, setDraft] = useState<ChallengeDraft | null>(null)
  const [saved, setSaved] = useState<DesafioDaEquipe | null>(null)
  const [analysis, setAnalysis] = useState<AnaliseDoDesafio | null>(null)
  const [dirty, setDirty] = useState(false)
  const [busy, setBusy] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [hintIds, setHintIds] = useState<string[]>([])
  const listRequest = useRef<AbortController | null>(null)
  const listKey = `${publico}/${island}`
  const activeListKey = useRef(listKey)
  activeListKey.current = listKey
  const [editor, setEditor] = useState<{
    role: 'projetoInicial' | 'gabarito'
    project: EditableStudioProject
  } | null>(null)
  const handle = useRef<StudioHandle | null>(null)
  const editorDialog = useRef<HTMLDialogElement | null>(null)
  const editorOpen = editor !== null
  useEffect(() => {
    if (!editorOpen) return
    const element = editorDialog.current
    element?.showModal()
    return () => element?.close()
  }, [editorOpen])
  const controller = useRef<AbortController | null>(null)
  const lock = useRef(false)
  useEffect(() => () => controller.current?.abort(), [])
  const refreshList = useCallback(() => {
    if (activeListKey.current !== listKey) return
    listRequest.current?.abort()
    const c = new AbortController()
    listRequest.current = c
    setLoading(true)
    setRows([])
    setCoverage(null)
    const query = new URLSearchParams({ publico, ...(island ? { ilha: island } : {}) })
    void request(`desafios?${query}`, 'GET', undefined, c.signal)
      .then((raw) => setRows(listSchema.parse(raw).desafios))
      .catch((e) => {
        if (!c.signal.aborted)
          setError(e instanceof Error ? e.message : 'Não foi possível carregar os desafios.')
      })
      .finally(() => {
        if (!c.signal.aborted) setLoading(false)
      })
  }, [publico, island, listKey])
  useEffect(() => {
    refreshList()
    return () => listRequest.current?.abort()
  }, [refreshList])
  useEffect(() => {
    if (tab === 'desafios') return
    const c = new AbortController()
    setCoverageLoading(true)
    void request(`cobertura?publico=${publico}`, 'GET', undefined, c.signal)
      .then((raw) => setCoverage({ publico, value: coverageSchema.parse(raw) }))
      .catch((e) => {
        if (!c.signal.aborted)
          setError(e instanceof Error ? e.message : 'Não foi possível conferir a cobertura.')
      })
      .finally(() => {
        if (!c.signal.aborted) setCoverageLoading(false)
      })
    return () => c.abort()
  }, [publico, tab])
  useEffect(() => {
    if (!dirty && !editor) return
    const before = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', before)
    return () => window.removeEventListener('beforeunload', before)
  }, [dirty, editor])

  async function run(action: (signal: AbortSignal) => Promise<void>) {
    if (lock.current) return
    lock.current = true
    setBusy(true)
    setError('')
    setNotice('')
    const c = new AbortController()
    controller.current = c
    const signal = AbortSignal.any([c.signal, AbortSignal.timeout(175_000)])
    try {
      await action(signal)
    } catch (e) {
      if (!c.signal.aborted)
        setError(e instanceof Error ? e.message : 'Não foi possível concluir agora.')
    } finally {
      lock.current = false
      if (!c.signal.aborted) setBusy(false)
    }
  }
  function replace(raw: unknown) {
    const next = DesafioDaEquipeSchema.parse(raw)
    const editing = challengeDraft(next)
    setHintIds(next.conteudo.dicas.map(() => crypto.randomUUID()))
    setSaved(next)
    setDraft(editing)
    setDirty(false)
    setAnalysis(null)
  }
  function patch(p: Partial<ChallengeDraft['conteudo']>) {
    setDraft((d) => (d ? { ...d, conteudo: { ...d.conteudo, ...p } } : d))
    setDirty(true)
    setAnalysis(null)
  }
  function meta(p: Partial<ChallengeDraft['metadados']>) {
    setDraft((d) => (d ? { ...d, metadados: { ...d.metadados, ...p } } : d))
    setDirty(true)
    setAnalysis(null)
  }
  function mayReplace() {
    return !dirty || window.confirm('Descartar as alterações ainda não salvas deste desafio?')
  }
  function open(id: string) {
    if (mayReplace())
      void run(async (signal) => replace(await request(`desafios/${id}`, 'GET', undefined, signal)))
  }
  function save() {
    if (!draft || !canWrite) return
    void run(async (signal) => {
      const parsed = CriarDesafioSchema.safeParse(challengePayload(draft))
      if (!parsed.success)
        throw new Error(
          'Confira título, identificador (letras minúsculas, números e hífens), enunciado, objetivos e limites das recompensas. Dicas e objetivos não podem ficar vazios.',
        )
      const raw = await request(
        saved ? `desafios/${saved.resumo.id}` : 'desafios',
        saved ? 'PUT' : 'POST',
        { ...parsed.data, ...(saved ? { revisaoBase: saved.resumo.revisao } : {}) },
        signal,
      )
      replace(raw)
      refreshList()
      setNotice('Rascunho salvo. Analise antes de publicar.')
    })
  }
  function action(name: 'analisar' | 'publicar' | 'arquivar' | 'reativar') {
    if (!saved || dirty) return
    if (name !== 'analisar' && !canWrite) return
    if (
      name === 'arquivar' &&
      !window.confirm(
        'Arquivar este desafio? Ele deixará de aparecer no jogo. As conquistas serão preservadas.',
      )
    )
      return
    void run(async (signal) => {
      const raw = await request(
        `desafios/${saved.resumo.id}/${name}`,
        'POST',
        { revisaoBase: saved.resumo.revisao },
        signal,
      )
      if (name === 'analisar') setAnalysis(AnaliseDoDesafioSchema.parse(raw))
      else {
        replace(raw)
        refreshList()
        setNotice(
          name === 'publicar'
            ? 'Publicado. Esta revisão já pode aparecer no jogo.'
            : 'Situação atualizada.',
        )
      }
    })
  }
  function editProject(role: 'projetoInicial' | 'gabarito') {
    if (!draft || !canWrite) return
    void run(async () => {
      const project = await prepareProjectForHost(draft.conteudo[role])
      if (!project || project.kind === 'pro')
        throw new Error('Os desafios deste lote usam projetos JavaScript em blocos.')
      setEditor({ role, project })
    })
  }
  function applyProject() {
    void run(async () => {
      if (!handle.current || !editor) throw new Error('Aguarde o Estúdio carregar.')
      await handle.current.save()
      const project = handle.current.getProject()
      if (!project || project.programmingLanguage === 'python' || project.kind === 'pro')
        throw new Error('Use um projeto JavaScript em blocos.')
      patch({ [editor.role]: structuredClone(project) })
      setEditor(null)
    })
  }

  return (
    <main className="space-y-6 p-4 md:p-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Jogo · Arquipélago</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Desafios de {publico === 'kids' ? 'Kids' : 'Adultos'}: criar, conferir e publicar por
            ilha.
          </p>
        </div>
        <Button
          disabled={!canWrite || busy || !!editor}
          onClick={() => {
            if (mayReplace()) {
              setTab('desafios')
              setDraft(newChallenge(publico))
              setHintIds([])
              setSaved(null)
              setAnalysis(null)
              setDirty(true)
              setError('')
            }
          }}
        >
          Novo desafio
        </Button>
      </header>
      <nav aria-label="Seções do jogo" className="flex flex-wrap gap-2">
        {(['desafios', 'ilhas', 'cartoes'] as const).map((value) => (
          <Button
            key={value}
            variant={tab === value ? 'default' : 'outline'}
            aria-pressed={tab === value}
            onClick={() => setTab(value)}
          >
            {value === 'desafios'
              ? 'Desafios'
              : value === 'ilhas'
                ? 'Ilhas e postos'
                : 'Cartões dos Lumis'}
          </Button>
        ))}
      </nav>
      {error && (
        <div
          role="alert"
          className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive"
        >
          {error}
        </div>
      )}
      {notice && (
        <p role="status" className="rounded-lg border border-border p-3 text-sm">
          {notice}
        </p>
      )}
      <section hidden={tab !== 'desafios'} className={card} aria-label="Desafios por ilha">
        <div className="flex flex-wrap items-end gap-3">
          <label className="min-w-48 text-sm">
            Ilha
            <Select value={island} onChange={(e) => setIsland(e.target.value)}>
              <option value="">Todas as ilhas</option>
              {ILHA_IDS.map((id) => (
                <option key={id} value={id}>
                  {ilha(id).nome}
                </option>
              ))}
            </Select>
          </label>
          <Button variant="outline" disabled={busy} onClick={() => refreshList()}>
            Atualizar lista
          </Button>
        </div>
        {loading ? (
          <p role="status">Carregando desafios…</p>
        ) : rows.length === 0 ? (
          <p className="py-4 text-sm text-muted-foreground">
            Nenhum desafio nesta seleção. Comece por um dos seis quadros da ilha.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {rows.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div>
                  <p className="font-medium">{r.titulo}</p>
                  <p className="text-sm text-muted-foreground">
                    {ilha(r.ilha).nome} · {types[r.tipo]}
                    {r.quadro ? ` ${r.quadro}/6` : ''} · {r.situacao}
                    {r.alteradoDepoisDePublicar ? ' · alterações não publicadas' : ''}
                  </p>
                </div>
                <Button variant="outline" disabled={busy || !!editor} onClick={() => open(r.id)}>
                  Abrir desafio
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>
      {tab === 'cartoes' && coverage?.publico === publico && (
        <section className={card}>
          <h2 className="text-lg font-semibold">Cartões dos Lumis e cursos</h2>
          <p className="text-sm">Mapa das ilhas: {coverage.value.mapa.situacao}</p>
          <ul className="divide-y divide-border">
            {coverage.value.cartas.map((c) => (
              <li key={c.id} className="py-2 text-sm">
                <strong>{c.nome}</strong>
                {c.bloco && <span> · {c.bloco}</span>}
                <p className="text-muted-foreground">
                  {c.cursos.map((v) => v.titulo).join(', ') || 'Sem curso associado'}
                  {c.avisos.length ? ` · ${c.avisos.join(', ')}` : ''}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}
      {tab !== 'desafios' && coverageLoading && (
        <p role="status">Conferindo a jornada e os cursos…</p>
      )}
      {tab === 'ilhas' && (
        <section className={card}>
          <h2 className="text-lg font-semibold">Ilhas e postos da jornada</h2>
          <p className="text-sm text-muted-foreground">
            As ilhas seguem a jornada publicada. No adulto, a posição da etapa abre a ilha; o Farol
            pede a jornada completa.
          </p>
          {coverage?.publico === publico && (
            <>
              <p className="text-sm">
                Conferência:{' '}
                {coverage.value.mapa.situacao === 'ok'
                  ? 'mapa em dia'
                  : coverage.value.mapa.situacao}
              </p>
              <ul className="text-sm text-destructive">
                {coverage.value.mapa.problemas
                  ?.filter((p) => p.publico === publico)
                  .map((p) => (
                    <li key={p.tipo}>
                      {p.tipo === 'politica-nao-publicada'
                        ? 'Publique a política da jornada Kids.'
                        : p.tipo === 'jornada-nao-configurada'
                          ? 'Configure e publique a jornada adulta.'
                          : p.tipo === 'postos-diferentes'
                            ? 'Os postos publicados diferem do mapa do jogo. Confira a jornada Kids.'
                            : `A jornada tem ${p.recebido} etapas; o mapa espera ${p.esperado}.`}
                    </li>
                  ))}
              </ul>
            </>
          )}
          <ol className="divide-y divide-border">
            {ILHA_IDS.map((id) => {
              const item = ilha(id)
              return (
                <li key={id} className="flex flex-wrap justify-between gap-2 py-3 text-sm">
                  <strong>{item.nome}</strong>
                  <span>
                    {publico === 'kids'
                      ? `Posto ${item.posto} · posição ${item.posicao}`
                      : id === 'farol'
                        ? 'Jornada concluída'
                        : `Etapa ${item.posicao}`}{' '}
                    · 6 quadros
                  </span>
                </li>
              )
            })}
          </ol>
        </section>
      )}
      {draft && (
        <section hidden={tab !== 'desafios'} className={card} aria-label="Editar desafio">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">
                {saved ? draft.conteudo.titulo : 'Novo desafio'}
              </h2>
              <p className="text-sm text-muted-foreground">
                Comunidade: {draft.metadados.publico === 'kids' ? 'Kids' : 'Adultos'} ·{' '}
                {saved ? `revisão ${saved.resumo.revisao}` : 'não salvo'}
                {dirty ? ' · edição pendente' : ''}
              </p>
            </div>
            {draft.metadados.publico !== publico && (
              <p role="status" className="text-sm">
                Sua edição anterior foi preservada. Este desafio continua na comunidade indicada.
              </p>
            )}
          </div>
          <fieldset disabled={!canWrite || busy || !!editor} className="space-y-5">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="text-sm">
                Título
                <Input
                  value={draft.conteudo.titulo}
                  maxLength={80}
                  onChange={(e) => patch({ titulo: e.target.value })}
                />
              </label>
              <label className="text-sm">
                Identificador na URL
                <Input
                  value={draft.metadados.slug}
                  maxLength={80}
                  placeholder="minha-primeira-cor"
                  onChange={(e) => meta({ slug: e.target.value })}
                />
              </label>
              <label className="text-sm">
                Ilha
                <Select
                  value={draft.metadados.ilha}
                  onChange={(e) => {
                    const id = ILHA_IDS.find((id) => id === e.target.value)
                    if (id) meta({ ilha: id })
                  }}
                >
                  {ILHA_IDS.map((id) => (
                    <option key={id} value={id}>
                      {ilha(id).nome}
                    </option>
                  ))}
                </Select>
              </label>
              <label className="text-sm">
                Tipo
                <Select
                  value={draft.metadados.tipo}
                  onChange={(e) => {
                    const type = TIPOS_DE_DESAFIO.find((t) => t === e.target.value)
                    if (!type) return
                    setDraft((d) => (d ? challengeType(d, type) : d))
                    setDirty(true)
                    setAnalysis(null)
                  }}
                >
                  {TIPOS_DE_DESAFIO.map((t) => (
                    <option key={t} value={t}>
                      {types[t]}
                    </option>
                  ))}
                </Select>
              </label>
              {draft.metadados.quadro !== null && (
                <label className="text-sm">
                  Número do quadro
                  <Select
                    value={draft.metadados.quadro}
                    onChange={(e) => meta({ quadro: Number(e.target.value) })}
                  >
                    {[1, 2, 3, 4, 5, 6].map((n) => (
                      <option key={n} value={n}>
                        {n} de 6
                      </option>
                    ))}
                  </Select>
                </label>
              )}
              <label className="text-sm">
                Ordem
                <Input
                  type="number"
                  min={0}
                  max={10000}
                  value={draft.metadados.ordem}
                  onChange={(e) => meta({ ordem: e.target.valueAsNumber })}
                />
              </label>
            </div>
            <label className="block text-sm">
              Enunciado
              <Textarea
                rows={4}
                maxLength={2000}
                value={draft.conteudo.enunciado}
                onChange={(e) => patch({ enunciado: e.target.value })}
              />
            </label>
            <div className="space-y-2">
              <h3 className="font-medium">Dicas</h3>
              {draft.conteudo.dicas.map((d, i) => (
                <div key={hintIds[i]} className="flex gap-2">
                  <Input
                    aria-label={`Dica ${i + 1}`}
                    value={d}
                    maxLength={300}
                    onChange={(e) =>
                      patch({
                        dicas: draft.conteudo.dicas.map((v, j) => (j === i ? e.target.value : v)),
                      })
                    }
                  />
                  <Button
                    variant="outline"
                    onClick={() => {
                      setHintIds((ids) => ids.filter((_, j) => j !== i))
                      patch({ dicas: draft.conteudo.dicas.filter((_, j) => j !== i) })
                    }}
                  >
                    Remover
                  </Button>
                </div>
              ))}
              <Button
                variant="outline"
                disabled={draft.conteudo.dicas.length >= 5}
                onClick={() => {
                  setHintIds((ids) => [...ids, crypto.randomUUID()])
                  patch({ dicas: [...draft.conteudo.dicas, ''] })
                }}
              >
                Adicionar dica
              </Button>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button variant="outline" onClick={() => editProject('projetoInicial')}>
                Editar projeto inicial
              </Button>
              <Button variant="outline" onClick={() => editProject('gabarito')}>
                Editar gabarito
              </Button>
            </div>
            <h3 className="font-semibold">Objetivos do projeto</h3>
            <GameObjectivesEditor
              value={draft.conteudo.objetivos}
              gabarito={draft.conteudo.gabarito}
              onChange={(objetivos) => patch({ objetivos })}
            />
            <details className="rounded-lg border border-border p-4">
              <summary className="cursor-pointer font-medium">Desafio extra</summary>
              <label className="mt-3 flex gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={!!draft.conteudo.desafioExtra}
                  onChange={(e) =>
                    patch({
                      desafioExtra: e.target.checked ? { titulo: '', texto: '' } : undefined,
                    })
                  }
                />
                Oferecer um desafio extra
              </label>
              {draft.conteudo.desafioExtra && (
                <div className="mt-3 space-y-3">
                  <label className="block text-sm">
                    Título do extra
                    <Input
                      maxLength={80}
                      value={draft.conteudo.desafioExtra.titulo}
                      onChange={(e) =>
                        patch({
                          desafioExtra: {
                            titulo: e.target.value,
                            texto: draft.conteudo.desafioExtra?.texto ?? '',
                          },
                        })
                      }
                    />
                  </label>
                  <label className="block text-sm">
                    Instrução do extra
                    <Textarea
                      maxLength={500}
                      value={draft.conteudo.desafioExtra.texto}
                      onChange={(e) =>
                        patch({
                          desafioExtra: {
                            titulo: draft.conteudo.desafioExtra?.titulo ?? '',
                            texto: e.target.value,
                          },
                        })
                      }
                    />
                  </label>
                </div>
              )}
            </details>
            <fieldset className="space-y-3 rounded-lg border border-border p-4">
              <legend className="px-1 font-medium">Recompensas</legend>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={
                    draft.conteudo.recompensa.cor && corPermitida(draft.metadados.tipo, true)
                  }
                  disabled={!corPermitida(draft.metadados.tipo, true)}
                  onChange={(e) =>
                    patch({ recompensa: { ...draft.conteudo.recompensa, cor: e.target.checked } })
                  }
                />
                {corPermitida(draft.metadados.tipo, true)
                  ? 'Pintar a parte da ilha correspondente ao quadro'
                  : 'O desafio do dia nunca pinta a ilha. A cor fica desligada.'}
              </label>
              <div className="grid gap-3 md:grid-cols-3">
                <label className="text-sm">
                  Moedas
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={draft.conteudo.recompensa.moedas}
                    onChange={(e) =>
                      patch({
                        recompensa: {
                          ...draft.conteudo.recompensa,
                          moedas: e.target.valueAsNumber,
                        },
                      })
                    }
                  />
                </label>
                <label className="text-sm">
                  Moedas do extra
                  <Input
                    type="number"
                    min={0}
                    max={50}
                    value={draft.conteudo.recompensa.moedasExtra}
                    onChange={(e) =>
                      patch({
                        recompensa: {
                          ...draft.conteudo.recompensa,
                          moedasExtra: e.target.valueAsNumber,
                        },
                      })
                    }
                  />
                </label>
                <label className="text-sm">
                  Identificador da atração (opcional)
                  <Input
                    maxLength={80}
                    value={draft.conteudo.recompensa.atracao ?? ''}
                    onChange={(e) =>
                      patch({
                        recompensa: {
                          ...draft.conteudo.recompensa,
                          atracao: e.target.value || undefined,
                        },
                      })
                    }
                  />
                </label>
              </div>
            </fieldset>
            <details className="rounded-lg border border-border p-4">
              <summary className="cursor-pointer font-medium">Ajustar blocos exigidos</summary>
              <p className="my-2 text-sm text-muted-foreground">
                A análise deriva os blocos do gabarito. Use um identificador por linha apenas para
                ajustes necessários.
              </p>
              {(['acrescentar', 'retirar'] as const).map((key) => (
                <label key={key} className="mt-3 block text-sm">
                  {key === 'acrescentar' ? 'Acrescentar' : 'Retirar'}
                  <Textarea
                    value={draft.conteudo.blocosManuais[key].join('\n')}
                    onChange={(e) =>
                      patch({
                        blocosManuais: {
                          ...draft.conteudo.blocosManuais,
                          [key]: e.target.value.split('\n'),
                        },
                      })
                    }
                  />
                </label>
              ))}
            </details>
          </fieldset>
          <div className="flex flex-wrap gap-3 border-t border-border pt-4">
            <Button disabled={!canWrite || busy || !!editor || !dirty} onClick={save}>
              Salvar rascunho
            </Button>
            <Button
              variant="outline"
              disabled={busy || dirty || !saved || !!editor}
              onClick={() => action('analisar')}
            >
              Analisar desafio
            </Button>
            <Button
              disabled={
                !canWrite ||
                busy ||
                dirty ||
                !!editor ||
                !saved ||
                saved.resumo.situacao === 'arquivado' ||
                !analysis ||
                analysis.problemas.length > 0
              }
              onClick={() => action('publicar')}
            >
              Publicar revisão
            </Button>
            {saved && (
              <Button
                variant="outline"
                disabled={!canWrite || busy || dirty || !!editor}
                onClick={() =>
                  action(saved.resumo.situacao === 'arquivado' ? 'reativar' : 'arquivar')
                }
              >
                {saved.resumo.situacao === 'arquivado' ? 'Reativar' : 'Arquivar'}
              </Button>
            )}
          </div>
          {busy && (
            <p role="status" className="text-sm">
              Conferindo… A análise pode levar alguns instantes para rodar os projetos.
            </p>
          )}
          {analysis && (
            <div className="space-y-3 border-t border-border pt-4">
              <h3 className="font-semibold">Análise desta revisão</h3>
              {analysis.problemas.length ? (
                <ul className="text-sm text-destructive">
                  {analysis.problemas.map((p) => (
                    <li key={`${p.codigo}/${p.objetivoId ?? ''}/${p.mensagem}`}>{p.mensagem}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm">Sem impedimentos de publicação.</p>
              )}
              <ul className="space-y-2 text-sm">
                {draft.conteudo.objetivos.map((o) => (
                  <li key={o.id}>
                    <strong>{o.label}</strong> · Gabarito:{' '}
                    {analysis.gabarito.find((r) => r.id === o.id)?.passou ? 'cumpre' : 'não cumpre'}{' '}
                    · Inicial:{' '}
                    {analysis.inicial.find((r) => r.id === o.id)?.passou
                      ? 'já cumpre (confira a dificuldade)'
                      : 'a construir'}
                  </li>
                ))}
              </ul>
              <h4 className="font-medium">Onde os blocos são conquistados</h4>
              <ul className="space-y-2 text-sm">
                {analysis.cobertura.map((c) => (
                  <li key={c.bloco}>
                    <strong>{c.rotulo ?? c.bloco}</strong>:{' '}
                    {c.cursos.map((v) => v.titulo).join(', ') || 'sem curso'}
                    {c.avisos.length ? ` · ${c.avisos.join(', ')}` : ''}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}
      {editor && (
        <dialog
          ref={editorDialog}
          onCancel={(e) => {
            e.preventDefault()
            if (!busy && window.confirm('Descartar as alterações feitas neste editor?'))
              setEditor(null)
          }}
          className="fixed inset-0 m-0 flex h-dvh max-h-none w-screen max-w-none flex-col bg-background p-0 text-foreground backdrop:bg-black/60"
          aria-label={
            editor.role === 'gabarito' ? 'Gabarito do desafio' : 'Projeto inicial do desafio'
          }
        >
          <header className="flex flex-wrap items-center gap-3 border-b border-border p-3">
            <h2 className="flex-1 font-semibold">
              {editor.role === 'gabarito' ? 'Gabarito' : 'Projeto inicial'}
            </h2>
            <Button
              variant="outline"
              disabled={busy}
              onClick={() => {
                if (window.confirm('Descartar as alterações feitas neste editor?')) setEditor(null)
              }}
            >
              Descartar edição
            </Button>
            <Button disabled={busy} onClick={applyProject}>
              Usar no rascunho
            </Button>
          </header>
          <div className="min-h-0 flex-1">
            <StudioEmbed
              initialProject={editor.project}
              handleRef={handle}
              hideKindChooser
              lessonConfig={{ level: 'avancado-3d', allowedModes: ['blocks', 'bridge'] }}
              className="h-full"
            />
          </div>
          {error && (
            <p role="alert" className="p-3 text-sm text-destructive">
              {error}
            </p>
          )}
        </dialog>
      )}
    </main>
  )
}
