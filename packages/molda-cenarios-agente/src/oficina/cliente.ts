import { type ComandoDeCenario, ComandoDeCenarioSchema } from '@sistemazero/molda-cenarios-core/v2'
import { z } from 'zod'

/**
 * Cliente da oficina de cenários para agentes: fala com a plataforma pelo gateway, nas MESMAS
 * rotas que a edição à mão usa (`/members/cenarios/*`). Não precisa de aba aberta: o lote de
 * comandos roda no servidor, com a mesma conferência de revisão e de espaço.
 */

export interface AcessoDaOficina {
  /** O endereço do gateway da plataforma. */
  url: string
  /** Um token de acesso já emitido (vale pouco tempo), ou o e-mail e a senha de quem é da equipe. */
  token?: string
  email?: string
  senha?: string
}

const UUID = z.uuid()
const NOME = z.string().trim().min(1).max(120)

/** Recusa do serviço, com a frase dele e o que ele mandou junto (a revisão atual, os problemas). */
export class RecusaDaOficina extends Error {
  constructor(
    mensagem: string,
    readonly status: number,
    readonly codigo: string | null,
    readonly detalhes: Record<string, unknown> | null,
  ) {
    super(mensagem)
    this.name = 'RecusaDaOficina'
  }
}

export function criarClienteDaOficina(
  acesso: AcessoDaOficina,
  buscar: (endereco: string, opcoes: RequestInit) => Promise<Response> = (endereco, opcoes) =>
    fetch(endereco, opcoes),
) {
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
  if (!acesso.token && !(acesso.email && acesso.senha))
    throw Error('Informe um token de acesso, ou o e-mail e a senha de uma conta da equipe')
  const raiz = base.toString().replace(/\/$/, '')

  let token = acesso.token ?? null
  let renovacao: string | null = null
  let entrando: Promise<void> | null = null

  async function json(resposta: Response): Promise<Record<string, unknown> | unknown[] | null> {
    return (await resposta.json().catch(() => null)) as Record<string, unknown> | unknown[] | null
  }
  async function autenticar(caminho: string, corpo: unknown): Promise<boolean> {
    const resposta = await buscar(`${raiz}${caminho}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(corpo),
      redirect: 'error',
      signal: AbortSignal.timeout(20_000),
    })
    const lido = await json(resposta)
    const tokens = !Array.isArray(lido)
      ? (lido?.tokens as Record<string, unknown> | undefined)
      : null
    if (!resposta.ok || typeof tokens?.accessToken !== 'string') return false
    token = tokens.accessToken
    renovacao = typeof tokens.refreshToken === 'string' ? tokens.refreshToken : null
    return true
  }
  /** Entra (ou renova) uma vez só, mesmo com vários pedidos esperando. */
  function entrar(): Promise<void> {
    entrando ??= (async () => {
      try {
        if (renovacao && (await autenticar('/auth/refresh', { refreshToken: renovacao }))) return
        if (!acesso.email || !acesso.senha)
          throw Error('O token de acesso venceu. Gere outro ou informe e-mail e senha.')
        if (!(await autenticar('/auth/login', { email: acesso.email, password: acesso.senha })))
          throw Error('Não consegui entrar com este e-mail e esta senha')
      } finally {
        entrando = null
      }
    })()
    return entrando
  }

  async function pedir<T>(
    metodo: 'GET' | 'POST' | 'PATCH' | 'DELETE',
    caminho: string,
    corpo?: unknown,
  ): Promise<T> {
    if (!token) await entrar()
    const enviar = () =>
      buscar(`${raiz}/members/cenarios${caminho}`, {
        method: metodo,
        headers: {
          authorization: `Bearer ${token}`,
          ...(corpo === undefined ? {} : { 'content-type': 'application/json' }),
        },
        ...(corpo === undefined ? {} : { body: JSON.stringify(corpo) }),
        redirect: 'error',
        signal: AbortSignal.timeout(65_000),
      })
    let resposta = await enviar()
    if (resposta.status === 401) {
      await entrar()
      resposta = await enviar()
    }
    const lido = await json(resposta)
    if (resposta.ok) return lido as T
    const envelope = Array.isArray(lido) ? null : lido
    const erro = envelope?.error as Record<string, unknown> | undefined
    throw new RecusaDaOficina(
      typeof erro?.message === 'string' ? erro.message : `O serviço respondeu ${resposta.status}`,
      resposta.status,
      typeof erro?.code === 'string' ? erro.code : null,
      (envelope?.details as Record<string, unknown> | undefined) ?? null,
    )
  }

  const id = (valor: string) => UUID.parse(valor)
  return {
    /** A oficina está aberta para esta conta? */
    acesso: async () => pedir<{ aberto: boolean }>('GET', '/acesso'),
    espacos: async () => pedir<unknown[]>('GET', '/espacos'),
    bibliotecas: async (espacoId: string) =>
      pedir<unknown[]>('GET', `/espacos/${id(espacoId)}/bibliotecas`),
    async modelos(
      bibliotecaId: string,
      filtro: { busca?: string; pasta?: string; cursor?: string; limite?: number } = {},
    ) {
      const consulta = new URLSearchParams()
      if (filtro.busca?.trim()) consulta.set('busca', filtro.busca.trim().slice(0, 120))
      if (filtro.pasta !== undefined) consulta.set('pasta', filtro.pasta)
      if (filtro.cursor) consulta.set('cursor', filtro.cursor)
      if (filtro.limite) consulta.set('limite', String(filtro.limite))
      return pedir<{ itens: unknown[]; total: number; proximo: string | null }>(
        'GET',
        `/bibliotecas/${id(bibliotecaId)}/modelos${consulta.size ? `?${consulta}` : ''}`,
      )
    },
    mundos: async (espacoId: string) => pedir<unknown[]>('GET', `/espacos/${id(espacoId)}/mundos`),
    criarMundo: async (espacoId: string, nome: string) =>
      pedir<{ id: string }>('POST', `/espacos/${id(espacoId)}/mundos`, { nome: NOME.parse(nome) }),
    ligarBibliotecas: async (mundoId: string, bibliotecas: string[]) =>
      pedir<unknown>('PATCH', `/mundos/${id(mundoId)}`, { bibliotecas: bibliotecas.map(id) }),
    cenarios: async (mundoId: string) => pedir<unknown[]>('GET', `/mundos/${id(mundoId)}/cenarios`),
    criarCenario: async (mundoId: string, nome: string) =>
      pedir<{ id: string; revisao: number }>('POST', `/mundos/${id(mundoId)}/cenarios`, {
        nome: NOME.parse(nome),
      }),
    cenario: async (cenarioId: string) =>
      pedir<{ id: string; revisao: number; documento: unknown }>(
        'GET',
        `/cenarios/${id(cenarioId)}`,
      ),
    /**
     * Aplica um lote de comandos, inteiro ou nada. `revisaoEsperada` é a revisão lida por último;
     * repetir o MESMO `operacaoId` depois de uma resposta perdida não aplica duas vezes.
     */
    async editar(
      cenarioId: string,
      revisaoEsperada: number,
      comandos: ComandoDeCenario[],
      operacaoId: string = crypto.randomUUID(),
    ) {
      return pedir<{ revisao: number }>('POST', `/cenarios/${id(cenarioId)}/lotes`, {
        revisaoEsperada: z.number().int().min(0).parse(revisaoEsperada),
        comandos: z.array(ComandoDeCenarioSchema).min(1).max(500).parse(comandos),
        operacaoId: z
          .string()
          .regex(/^[A-Za-z0-9_-]{8,80}$/)
          .parse(operacaoId),
      })
    },
    duplicar: async (cenarioId: string) =>
      pedir<{ id: string }>('POST', `/cenarios/${id(cenarioId)}/duplicar`),
  }
}

export type ClienteDaOficina = ReturnType<typeof criarClienteDaOficina>

/** Lê o acesso do ambiente. Nada de segredo em arquivo do repositório nem em documento. */
export function lerAcessoDaOficina(ambiente: Record<string, string | undefined> = process.env) {
  const url = ambiente.MOLDA_CENARIOS_URL
  if (!url) throw Error('Informe MOLDA_CENARIOS_URL (o endereço do gateway da plataforma)')
  return {
    url,
    ...(ambiente.MOLDA_CENARIOS_TOKEN ? { token: ambiente.MOLDA_CENARIOS_TOKEN } : {}),
    ...(ambiente.MOLDA_CENARIOS_EMAIL ? { email: ambiente.MOLDA_CENARIOS_EMAIL } : {}),
    ...(ambiente.MOLDA_CENARIOS_SENHA ? { senha: ambiente.MOLDA_CENARIOS_SENHA } : {}),
  } satisfies AcessoDaOficina
}
