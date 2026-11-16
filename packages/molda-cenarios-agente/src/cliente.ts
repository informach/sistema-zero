import {
  CriarCenarioSchema,
  type DocumentoDeCenario,
  type ModeloDeCatalogo,
  type PedidoDeViewport,
  PedidoDeViewportSchema,
  type ProjetoDeCenario,
  type ResultadoDeViewport,
  type RevisaoDeCenario,
  type SessaoDeCenario,
  type TarefaDeViewport,
} from '@sistemazero/molda-cenarios-core'

export interface AcessoCenarios {
  url: string
  token: string
}
export function criarClienteCenarios(acesso: AcessoCenarios) {
  const base = new URL(acesso.url)
  if (
    !['http:', 'https:'].includes(base.protocol) ||
    base.username ||
    base.password ||
    base.search ||
    base.hash
  )
    throw Error('URL de serviço inválida')
  if (base.protocol === 'http:' && !['localhost', '127.0.0.1', '[::1]'].includes(base.hostname))
    throw Error('Use HTTPS fora do ambiente local')
  if (!acesso.token) throw Error('Token de administração necessário')
  const pedir = async <T>(path: string, body?: unknown): Promise<T> => {
    const r = await fetch(`${base.toString().replace(/\/$/, '')}${path}`, {
      method: body === undefined ? 'GET' : 'POST',
      headers: {
        authorization: `Bearer ${acesso.token}`,
        ...(body === undefined ? {} : { 'content-type': 'application/json' }),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      redirect: 'error',
      signal: AbortSignal.timeout(65000),
    })
    const v = await r.json()
    if (!r.ok)
      throw Object.assign(Error(v.error?.message ?? `Serviço respondeu ${r.status}`), {
        status: r.status,
        revisaoAtual: v.revisaoAtual,
      })
    return v
  }
  return {
    projetos: () => pedir<ProjetoDeCenario[]>('/projetos'),
    projeto: (id: string) => pedir<RevisaoDeCenario>(`/projetos/${encodeURIComponent(id)}`),
    criar: (nome: string, documento: DocumentoDeCenario, operacaoId: string) =>
      pedir<RevisaoDeCenario>(
        '/projetos',
        CriarCenarioSchema.parse({ nome, documento, operacaoId }),
      ),
    catalogo: async (id: string, digest: string) =>
      (
        await pedir<{ modelos: ModeloDeCatalogo[] }>(
          `/catalogos/${encodeURIComponent(id)}/${encodeURIComponent(digest)}`,
        )
      ).modelos,
    aplicar: (id: string, revisao: number) =>
      pedir(`/projetos/${encodeURIComponent(id)}/aplicar`, { revisao }),
    sessoes: () => pedir<SessaoDeCenario[]>('/sessoes'),
    async executar(sessaoId: string, entrada: PedidoDeViewport): Promise<ResultadoDeViewport> {
      const p = PedidoDeViewportSchema.parse(entrada)
      await pedir(`/sessoes/${encodeURIComponent(sessaoId)}/pedidos`, p)
      const prazo = Date.now() + 125000
      while (Date.now() < prazo) {
        const t = await pedir<TarefaDeViewport>(
          `/sessoes/${encodeURIComponent(sessaoId)}/pedidos/${p.id}`,
        )
        if (t.estado === 'concluido') {
          if (!t.resultado) throw Error('Pedido concluído sem resultado')
          return t.resultado
        }
        await new Promise((resolve) => setTimeout(resolve, 350))
      }
      throw Error('O viewport não confirmou o pedido. Consulte a revisão antes de repetir.')
    },
  }
}
export async function lerAcesso() {
  if (process.env.MOLDA_CENARIOS_URL && process.env.MOLDA_CENARIOS_TOKEN)
    return { url: process.env.MOLDA_CENARIOS_URL, token: process.env.MOLDA_CENARIOS_TOKEN }
  const arquivo = process.env.MOLDA_CENARIOS_SESSION_FILE
  if (!arquivo)
    throw Error(
      'Informe MOLDA_CENARIOS_URL e MOLDA_CENARIOS_TOKEN, ou MOLDA_CENARIOS_SESSION_FILE para o ensaio local',
    )
  const a = await Bun.file(arquivo).json()
  if (typeof a.url !== 'string' || typeof a.token !== 'string')
    throw Error('Arquivo de acesso inválido')
  return { url: a.url, token: a.token }
}
