import { useEffect, useState } from 'react'
import type { AnalyticsReport, PageMetric } from '../../analytics/reports'

const date = (offset: number) =>
  new Date(Date.now() + offset * 86400000).toLocaleDateString('en-CA', {
    timeZone: 'America/Sao_Paulo',
  })
const inputClass = 'rounded-lg border border-line bg-card px-3 py-2 text-sm text-ink'
const percent = (n: number, total: number) => (total ? `${((100 * n) / total).toFixed(1)}%` : '—')
interface Heatmap {
  snapshot: {
    image: string
    viewport: number
    height: number
    elements: Record<string, { x: number; y: number; width: number; height: number }>
  } | null
  points: { element: string; x: number; y: number; count: number }[]
}
export default function AnalyticsPanel({ funnel }: { funnel: string }) {
  const [from, setFrom] = useState(date(-29))
  const [to, setTo] = useState(date(0))
  const [environment, setEnvironment] = useState('production')
  const [source, setSource] = useState('')
  const [campaign, setCampaign] = useState('')
  const [page, setPage] = useState('')
  const [pageInput, setPageInput] = useState('')
  const [revision, setRevision] = useState('')
  const [reload, setReload] = useState(0)
  const [report, setReport] = useState<AnalyticsReport | null>(null)
  const [error, setError] = useState('')
  const [selected, setSelected] = useState<PageMetric | null>(null)
  const [heatmap, setHeatmap] = useState<Heatmap | null>(null)
  const [mapError, setMapError] = useState('')
  const [section, setSection] = useState('')
  const params = new URLSearchParams({ from, to, environment })
  for (const [key, value] of Object.entries({ funnel, source, campaign, page, revision }))
    if (value) params.set(key, value)
  const query = params.toString()
  useEffect(() => {
    const controller = new AbortController()
    setReport(null)
    setError('')
    setSelected(null)
    setHeatmap(null)
    fetch(`/api/admin/analytics?${query}&refresh=${reload}`, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok)
          throw new Error(
            response.status === 401
              ? 'Entre novamente no painel.'
              : 'Não foi possível consultar. Confira o período (até 90 dias) e tente novamente.',
          )
        return response.json() as Promise<AnalyticsReport>
      })
      .then((value) => {
        if (!controller.signal.aborted) setReport(value)
      })
      .catch((e) => {
        if (!controller.signal.aborted) setError(e.message)
      })
    return () => controller.abort()
  }, [query, reload])
  useEffect(() => {
    if (!selected) return
    const controller = new AbortController()
    setHeatmap(null)
    setMapError('')
    setSection('')
    const search = new URLSearchParams(query)
    search.set('page', selected.page)
    search.set('revision', selected.revision)
    search.set('viewport', String(selected.viewport))
    fetch(`/api/admin/analytics?${search}`, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error('Não foi possível abrir o mapa. Tente novamente.')
        return response.json() as Promise<Heatmap>
      })
      .then((value) => {
        if (!controller.signal.aborted) setHeatmap(value)
      })
      .catch((e) => {
        if (!controller.signal.aborted) setMapError(e.message)
      })
    return () => controller.abort()
  }, [query, selected])
  const snap = heatmap?.snapshot
  const crop = snap && section ? snap.elements[section] : null
  const points = snap ? heatmap!.points.filter((p) => snap.elements[p.element]) : []
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end gap-3">
        <label className="grid gap-1 text-sm">
          De
          <input
            className={inputClass}
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
        </label>
        <label className="grid gap-1 text-sm">
          Até
          <input
            className={inputClass}
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
        </label>
        <label className="grid gap-1 text-sm">
          Ambiente
          <select
            className={inputClass}
            value={environment}
            onChange={(e) => setEnvironment(e.target.value)}
          >
            <option value="production">Produção</option>
            <option value="development">Desenvolvimento</option>
          </select>
        </label>
        <label className="grid gap-1 text-sm">
          Origem (UTM)
          <input
            className={inputClass}
            placeholder="Todas · ex.: instagram"
            defaultValue={source}
            onBlur={(e) => setSource(e.target.value.trim())}
          />
        </label>
        <label className="grid gap-1 text-sm">
          Página
          <input
            className={inputClass}
            placeholder="Todas · ex.: /"
            value={pageInput}
            onChange={(e) => setPageInput(e.target.value)}
            onBlur={(e) => {
              setPage(e.target.value.trim())
              setRevision('')
            }}
          />
        </label>
        <label className="grid gap-1 text-sm">
          Campanha (UTM)
          <input
            className={inputClass}
            placeholder="Todas as campanhas"
            defaultValue={campaign}
            onBlur={(e) => setCampaign(e.target.value.trim())}
          />
        </label>
        <button type="button" className={inputClass} onClick={() => setReload((n) => n + 1)}>
          Atualizar
        </button>
        {revision && (
          <button type="button" className={inputClass} onClick={() => setRevision('')}>
            Versão {revision.slice(0, 8)} · limpar
          </button>
        )}
      </div>
      <p className="text-sm text-muted">
        Sessões iniciadas no período (horário de Brasília), com permissão para métricas. Uma sessão
        termina após 30 minutos sem atividade. Conversões em até 7 dias, atribuídas à primeira
        sessão vinculada ao lead. Os dias recentes ainda podem receber conversões.
      </p>
      {error && (
        <p role="alert" className="rounded-xl border border-red-400 p-4">
          {error}
        </p>
      )}
      {!report && !error && <p role="status">Consultando métricas…</p>}
      {report && (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
            {[
              ['Sessões', report.summary.sessions],
              ['Visitantes medidos', report.summary.visitors],
              ['Sessões com contato', report.summary.contacts],
              ['Sessões no checkout', report.summary.checkout],
              ['Sessões com compra', report.summary.paid],
              ['Conversão em compra', percent(report.summary.paid, report.summary.sessions)],
            ].map(([label, value]) => (
              <div key={label} className="rounded-xl border border-line bg-card p-4">
                <p className="text-xs text-muted">{label}</p>
                <p className="mt-2 text-2xl font-bold">{value}</p>
              </div>
            ))}
          </div>
          <p className="text-sm text-muted">
            Receita inicial identificada:{' '}
            {(report.summary.revenue / 100).toLocaleString('pt-BR', {
              style: 'currency',
              currency: 'BRL',
            })}
            . {report.summary.missingRevenue} compras sem valor histórico disponível. Não inclui
            renovações nem desconta reembolsos. Último evento do grupo:{' '}
            {report.summary.lastEvent
              ? new Date(report.summary.lastEvent).toLocaleString('pt-BR')
              : 'nenhum'}
            .
          </p>
          <p className="rounded-xl border border-line p-4 text-sm text-muted">
            Conferência comercial: {report.coverage.paid} compras confirmadas no período, das quais{' '}
            {report.coverage.unlinked} estão sem vínculo de navegação. Esta conferência usa a data
            do pagamento e o filtro de produto; inclui todos os ambientes deste banco e não aplica
            filtros de origem, página ou versão. Uma compra sem vínculo pode vir de recusa, bloqueio
            de coleta ou histórico anterior.
          </p>
          {!report.summary.sessions && (
            <div className="rounded-xl border border-line p-5">
              Ainda não há sessões medidas neste filtro. Os dados começam após a ativação e o aceite
              do visitante; o histórico anterior de leads e vendas continua nas outras abas.
            </div>
          )}
          <div className="flex flex-wrap gap-4">
            {report.journeys.map((j) => (
              <p className="rounded-xl border border-line p-3 text-sm" key={j.route}>
                {j.route}: {j.sessions} sessões · {j.paid} com compra ({percent(j.paid, j.sessions)}
                )
              </p>
            ))}
          </div>
          <section>
            <h2 className="mb-3 text-lg font-bold">Origens e campanhas</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr>
                    {['Origem', 'Campanha', 'Sessões', 'Com compra', 'Conversão'].map((h) => (
                      <th className="border-b border-line p-3" key={h}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {report.campaigns.map((c) => (
                    <tr key={`${c.source}:${c.campaign}`}>
                      <td className="p-3">{c.source}</td>
                      <td className="p-3">{c.campaign}</td>
                      <td className="p-3">{c.sessions}</td>
                      <td className="p-3">{c.paid}</td>
                      <td className="p-3">{percent(c.paid, c.sessions)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
          <section>
            <h2 className="mb-3 text-lg font-bold">Páginas, versões e mapas de cliques</h2>
            <p className="mb-3 text-sm text-muted">
              Cada linha reúne a mesma versão e largura de tela. “Visitas” conta aberturas
              distintas. Os prints mostram a página pública sem dados de visitantes.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr>
                    {['Página', 'Versão', 'Tela', 'Visitas', 'Cliques', 'Visual'].map((h) => (
                      <th className="border-b border-line p-3" key={h}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {report.pages.map((p) => (
                    <tr key={`${p.page}:${p.revision}:${p.viewport}`}>
                      <td className="p-3">{p.page}</td>
                      <td className="p-3">
                        <button
                          type="button"
                          className="underline"
                          onClick={() => {
                            setPage(p.page)
                            setPageInput(p.page)
                            setRevision(p.revision)
                          }}
                        >
                          {p.revision.slice(0, 8)}
                        </button>
                      </td>
                      <td className="p-3">{p.viewport}px</td>
                      <td className="p-3">{p.views}</td>
                      <td className="p-3">{p.clicks}</td>
                      <td className="p-3">
                        <button
                          type="button"
                          className="underline disabled:opacity-50"
                          disabled={!p.viewport}
                          onClick={() => setSelected(p)}
                        >
                          {p.snapshot ? 'Ver print e mapa' : 'Ver disponibilidade'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {report.pages.length === 100 && (
              <p className="text-sm text-muted">
                Mostrando as 100 combinações mais visitadas. Restrinja os filtros para ver as
                demais.
              </p>
            )}
          </section>
          {selected && (
            <section className="rounded-xl border border-line p-4">
              <h3 className="font-bold">
                {selected.page} · {selected.revision.slice(0, 8)} · {selected.viewport}px
              </h3>
              {!heatmap && !mapError && <p role="status">Carregando visual…</p>}
              {mapError && <p role="alert">{mapError}</p>}
              {heatmap && !snap && (
                <p className="mt-3 text-sm text-muted">
                  Print indisponível para esta versão e largura. O processo de captura precisa
                  encontrar exatamente essa versão ainda publicada. Páginas com respostas ou dados
                  pessoais não são fotografadas; suas etapas continuam nas métricas.
                </p>
              )}
              {snap && (
                <>
                  <label className="my-4 grid gap-1 text-sm">
                    Recortar uma seção ou elemento
                    <select
                      className={inputClass}
                      value={section}
                      onChange={(e) => setSection(e.target.value)}
                    >
                      <option value="">Página inteira</option>
                      {Object.keys(snap.elements).map((id) => (
                        <option key={id} value={id}>
                          {report.interactions.find(
                            (i) =>
                              i.element === id &&
                              i.page === selected.page &&
                              i.revision === selected.revision,
                          )?.label || id}
                        </option>
                      ))}
                    </select>
                  </label>
                  <p className="mb-3 text-sm text-muted">
                    Pontos mais intensos representam mais cliques.{' '}
                    {heatmap!.points.length - points.length} grupos em elementos ausentes ou
                    fechados neste print não são desenhados. Cliques por teclado entram na tabela,
                    sem ponto no mapa.
                  </p>
                  <svg
                    role="img"
                    aria-label="Print da página com mapa de cliques"
                    viewBox={
                      crop
                        ? `${crop.x} ${crop.y} ${crop.width} ${crop.height}`
                        : `0 0 ${snap.viewport} ${snap.height}`
                    }
                    className="h-auto max-h-[900px] w-full rounded-lg bg-white"
                  >
                    <image
                      href={`data:image/jpeg;base64,${snap.image}`}
                      width={snap.viewport}
                      height={snap.height}
                    />
                    {points.map((p) => {
                      const r = snap.elements[p.element]!
                      return (
                        <circle
                          key={`${p.element}:${p.x}:${p.y}`}
                          cx={r.x + (r.width * Number(p.x)) / 10000}
                          cy={r.y + (r.height * Number(p.y)) / 10000}
                          r={Math.min(22, 7 + Math.log2(p.count + 1) * 3)}
                          fill="#ef2929"
                          fillOpacity={Math.min(0.9, 0.25 + Math.log2(p.count + 1) / 10)}
                          stroke="#ffbf37"
                          strokeWidth="2"
                        >
                          <title>
                            {p.count} cliques · {p.element}
                          </title>
                        </circle>
                      )
                    })}
                  </svg>
                </>
              )}
            </section>
          )}
          <section>
            <h2 className="mb-3 text-lg font-bold">Seções, botões e recursos</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr>
                    {[
                      'Elemento / seção',
                      'Página · versão',
                      'Viram',
                      'Clicaram',
                      'Taxa de clique',
                      'Abriram',
                      'Ampliaram',
                    ].map((h) => (
                      <th className="border-b border-line p-3" key={h}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {report.interactions.map((i) => (
                    <tr key={`${i.page}:${i.revision}:${i.element}`}>
                      <td className="p-3">
                        {i.label || i.element}
                        <small className="block max-w-60 break-words text-muted">
                          {i.element} · {i.section}
                        </small>
                      </td>
                      <td className="p-3">
                        {i.page}
                        <small className="block text-muted">{i.revision.slice(0, 8)}</small>
                      </td>
                      <td className="p-3">{i.exposed}</td>
                      <td className="p-3">{i.clicked}</td>
                      <td className="p-3">{percent(i.clicked, i.exposed)}</td>
                      <td className="p-3">{i.opened}</td>
                      <td className="p-3">{i.zoomed}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-sm text-muted">
              Contagens por abertura de página, sem somar cliques repetidos da mesma visita.
              Exposição exige visibilidade por 1 segundo ou interação. Máximo de 500 elementos por
              consulta.
            </p>
          </section>
          <section>
            <h2 className="mb-3 text-lg font-bold">Quizzes por produto e versão</h2>
            <p className="mb-3 text-sm text-muted">
              O denominador é quem realmente viu a pergunta, incluindo percursos condicionais.
              Respostas são confirmadas pelo servidor. Uma edição posterior não altera os textos
              arquivados.
            </p>
            {!report.quizzes.length && (
              <p className="text-sm text-muted">
                Nenhuma pergunta vista com permissão para métricas neste filtro.
              </p>
            )}
            {report.quizzes.map((q) => (
              <div key={q.definition.id} className="mb-4 rounded-xl border border-line p-4">
                <h3 className="font-bold">{q.definition.funnel}</h3>
                <p className="mb-3 text-xs text-muted">
                  {q.definition.version} · {q.definition.id.slice(0, 8)}
                </p>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr>
                        {['Pergunta daquela versão', 'Viram', 'Responderam', 'Conclusão'].map(
                          (h) => (
                            <th key={h} className="border-b border-line p-2">
                              {h}
                            </th>
                          ),
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {q.definition.questions.map((question) => {
                        const counts = q.questions.find((c) => c.id === question.id)
                        return (
                          <tr key={question.id}>
                            <td className="p-2">
                              {question.position}. {question.title}
                              <details className="text-xs text-muted">
                                <summary>Identificador e opções</summary>
                                {question.id} · {question.revision.slice(0, 8)}
                                <p>
                                  {question.options.map((o) => o.label).join(' · ') ||
                                    question.type}
                                </p>
                              </details>
                            </td>
                            <td className="p-2">{counts?.viewed ?? 0}</td>
                            <td className="p-2">{counts?.answered ?? 0}</td>
                            <td className="p-2">
                              {percent(counts?.answered ?? 0, counts?.viewed ?? 0)}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </section>
        </>
      )}
    </div>
  )
}
