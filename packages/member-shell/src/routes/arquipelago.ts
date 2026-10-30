import 'server-only'
import {
  type AmigosDaFamiliaParaOsPais,
  AmigosDaFamiliaSchema,
  CORPO_DO_FANTASMA_MAX_BYTES,
  IrmaosDoJogadorSchema,
  type IrmaosParaOJogo,
  JogosDoMuralSchema,
  MinijogosSchema,
  PERCURSOS,
  PERFIS_DA_FAMILIA_MAXIMO,
  type SemanaDaFamiliaParaOsPais,
  SemanaDaFamiliaSchema,
  tipoDoArquivoDoCliente,
} from '@sistemazero/arquipelago-contracts'
import { NextResponse } from 'next/server'
import { getEnv } from '../lib/env'
import type { ProfilesClient } from '../server/clients'
import { clientForwardHeaders, type GatewayModule, type GatewayResponse } from '../server/gateway'
import { readJsonBodyWithLimit } from '../server/read-json-body'

export type ArquipelagoRoutes = ReturnType<typeof createArquipelagoRoutes>

/** Salvamento de até 64 KB mais a revisão; tempo e limite são minúsculos (os mesmos do gateway). */
const CORPO_DO_SALVAMENTO = 96 * 1024
const CORPO_PEQUENO = 1024
/** Conferir um desafio leva o projeto do Estúdio (o mesmo teto do serviço e do gateway). */
const CORPO_DA_CONFERENCIA = 4 * 1024 * 1024
/** Conferir roda o jogo no executor pelo Members: o prazo do "Verificar projeto" das aulas. */
const ESPERA_DA_CONFERENCIA_MS = 165_000
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
/** As ilhas do contrato (minúsculas e hífen); o serviço confere o valor de verdade. */
const ILHA = /^[a-z][a-z-]{0,39}$/
/** Até os cabeçalhos chegarem; o corpo (o jogo tem MB) segue sem prazo total. */
const ESPERA_DOS_CABECALHOS_MS = 15_000
const CABECALHOS_DO_CLIENTE = ['content-type', 'cache-control', 'x-content-type-options', 'etag']

function repasse(r: GatewayResponse) {
  const headers = r.retryAfter ? { 'retry-after': r.retryAfter } : undefined
  if (r.body !== null && r.body !== undefined) {
    return NextResponse.json(r.body, { status: r.status, headers })
  }
  return NextResponse.json(
    { error: { code: 'ARQUIPELAGO_INDISPONIVEL', message: 'O jogo não respondeu agora.' } },
    { status: r.status >= 200 && r.status < 300 ? 502 : r.status, headers },
  )
}

/** Lê em fluxo e para no teto: um corpo grande nunca fica inteiro na memória do app. */
async function corpoJson(
  req: Request,
  teto: number,
): Promise<{ ok: true; corpo: unknown } | { ok: false }> {
  try {
    return { ok: true, corpo: await readJsonBodyWithLimit(req, teto, req.signal) }
  } catch {
    return { ok: false }
  }
}

/** O nome da criança na grade de perfis (o card mostra; o serviço do jogo nunca sabe nomes). */
function nomeDoPerfil(perfil: { name?: unknown }): string {
  const nome = typeof perfil.name === 'string' ? perfil.name.trim().slice(0, 80) : ''
  return nome || 'Criança'
}

const invalido = () =>
  NextResponse.json(
    { error: { code: 'VALIDATION_ERROR', message: 'Requisição inválida' } },
    { status: 400 },
  )

const privado = (resposta: NextResponse) => {
  resposta.headers.set('cache-control', 'private, no-store')
  return resposta
}

/**
 * Repasse do Arquipélago Vagalume: o navegador fala com o serviço do jogo SÓ por aqui (mesma
 * origem), e daqui pelo gateway com a sessão HttpOnly. Nenhuma regra de jogo mora no BFF: quem
 * decide acesso, salvamento, tempo e suporte somente leitura é o `@sistemazero/arquipelago-api`.
 * O cliente compilado do jogo também passa por aqui, na mesma origem da página.
 */
export function createArquipelagoRoutes(deps: {
  gateway: GatewayModule
  profiles: Pick<ProfilesClient, 'list' | 'siblings'>
}) {
  const { gateway } = deps
  const chamar = (
    caminho: string,
    metodo: 'GET' | 'PUT' | 'POST' | 'DELETE',
    corpo?: unknown,
    extra: { query?: Record<string, string>; timeoutMs?: number } = {},
  ) =>
    gateway
      .gatewayFetch(`/arquipelago${caminho}`, {
        method: metodo,
        ...(corpo === undefined ? {} : { body: corpo }),
        ...extra,
      })
      .then((r) => {
        const resposta = repasse(r)
        if (
          caminho.startsWith('/minijogos') ||
          caminho.startsWith('/profissoes/') ||
          caminho.startsWith('/insumos/') ||
          caminho.startsWith('/pedidos/') ||
          caminho.startsWith('/familia/minijogos') ||
          caminho.startsWith('/irmaos') ||
          caminho.startsWith('/amigos') ||
          caminho.startsWith('/familia/amigos') ||
          caminho === '/desafios/cores' ||
          caminho.startsWith('/fantasmas') ||
          caminho.startsWith('/visitas-adultas/')
        )
          resposta.headers.set('cache-control', 'private, no-store')
        return resposta
      })
  const idDe = async (ctx: { params: Promise<{ id: string }> }) => {
    const { id } = await ctx.params
    return UUID.test(id) ? id : null
  }

  /**
   * Os perfis prontos da conta (a grade do Auth; o pendente ainda não abre o perfil). Sem a lista,
   * nada segue: a área dos pais esconde os cartões do jogo.
   */
  const perfisProntos = async (): Promise<
    { ok: true; perfis: { id: string; name?: unknown }[] } | { ok: false; resposta: NextResponse }
  > => {
    const lista = await deps.profiles.list()
    if (lista.status !== 200 || !Array.isArray(lista.body?.profiles)) {
      return {
        ok: false,
        resposta: repasse({ ...lista, body: lista.status === 200 ? null : lista.body }),
      }
    }
    const perfis = lista.body.profiles
      .filter((p) => p.admissionState !== 'pending')
      .slice(0, PERFIS_DA_FAMILIA_MAXIMO)
    return { ok: true, perfis }
  }

  const comCorpo =
    (caminho: string, metodo: 'PUT' | 'POST', teto: number) => async (req: Request) => {
      const lido = await corpoJson(req, teto)
      return lido.ok
        ? chamar(caminho, metodo, lido.corpo)
        : caminho.startsWith('/visitas-adultas/')
          ? privado(invalido())
          : invalido()
    }

  return {
    arquipelagoJogosDoMural: {
      GET: async () => {
        const r = await gateway.gatewayFetch('/hub/my-playable-showcase', { method: 'GET' })
        const parsed = JogosDoMuralSchema.safeParse(r.body)
        const resposta =
          r.status === 200 && parsed.success
            ? NextResponse.json(parsed.data)
            : repasse({ ...r, body: r.status === 200 ? null : r.body })
        resposta.headers.set('cache-control', 'private, no-store')
        return resposta
      },
    },
    arquipelagoTodosMinijogosDaFamilia: {
      GET: async () => {
        const lista = await perfisProntos()
        if (!lista.ok) return lista.resposta
        const criancas = await Promise.all(
          lista.perfis.map(async (p) => {
            try {
              const r = await gateway.gatewayFetch(`/arquipelago/familia/minijogos/${p.id}`, {
                method: 'GET',
              })
              const d = MinijogosSchema.safeParse(r.body)
              return r.status === 200 && d.success && d.data.minijogos.length
                ? { perfilId: p.id, nome: nomeDoPerfil(p), ...d.data }
                : null
            } catch {
              return null
            }
          }),
        )
        return NextResponse.json(
          { criancas: criancas.filter((c) => c !== null) },
          { headers: { 'cache-control': 'private, no-store' } },
        )
      },
    },
    arquipelagoMinijogos: { GET: () => chamar('/minijogos', 'GET') },
    arquipelagoMinijogo: {
      GET: async (_req: Request, ctx: { params: Promise<{ id: string }> }) => {
        const id = await idDe(ctx)
        return id ? chamar(`/minijogos/${id}`, 'GET') : invalido()
      },
    },
    arquipelagoMinijogosDaFamilia: {
      GET: async (req: Request, ctx: { params: Promise<{ perfil: string }> }) => {
        const { perfil } = await ctx.params
        const lista = await perfisProntos()
        if (!lista.ok) return lista.resposta
        if (!UUID.test(perfil) || !lista.perfis.some((p) => p.id === perfil)) return invalido()
        const id = new URL(req.url).searchParams.get('id')
        if (id !== null && !UUID.test(id)) return invalido()
        return chamar(`/familia/minijogos/${perfil}${id ? `/${id}` : ''}`, 'GET')
      },
    },
    /**
     * Recordes da família e visitas (fase3-12, 29/10/2026): os irmãos que o serviço do jogo acha
     * (sem nomes) e o NOME de cada um, da leitura dos irmãos da sessão de perfil no Auth (a grade
     * completa é da área dos pais). Quem não estiver na lista do Auth sai; sem a leitura do Auth,
     * 502: o jogo nunca mostra um irmão sem nome. Resposta fora do contrato também vira 502.
     */
    arquipelagoIrmaos: {
      GET: async () => {
        const r = await gateway.gatewayFetch('/arquipelago/irmaos', { method: 'GET' })
        if (r.status !== 200) return repasse(r)
        const lido = IrmaosDoJogadorSchema.safeParse(r.body)
        if (!lido.success) return repasse({ ...r, body: null })
        const semCache = { headers: { 'cache-control': 'private, no-store' } }
        if (lido.data.irmaos.length === 0)
          return NextResponse.json({ ...lido.data, irmaos: [] } satisfies IrmaosParaOJogo, semCache)
        const lista = await deps.profiles.siblings()
        if (lista.status !== 200 || !Array.isArray(lista.body?.siblings))
          return repasse({ ...lista, status: 502, body: null })
        const nomes = new Map(lista.body.siblings.map((p) => [p.id.toLowerCase(), nomeDoPerfil(p)]))
        const paraOJogo: IrmaosParaOJogo = {
          ...lido.data,
          irmaos: lido.data.irmaos.flatMap((i) => {
            const nome = nomes.get(i.perfilId.toLowerCase())
            return nome ? [{ ...i, nome }] : []
          }),
        }
        return NextResponse.json(paraOJogo, semCache)
      },
    },
    /** A casa de um irmão para a visita (só olhar): repasse, com o id conferido. */
    arquipelagoCasaDoIrmao: {
      GET: async (_req: Request, ctx: { params: Promise<{ id: string }> }) => {
        const id = await idDe(ctx)
        return id ? chamar(`/irmaos/${id}/casa`, 'GET') : invalido()
      },
    },
    arquipelagoAcesso: { GET: () => chamar('/acesso', 'GET') },
    arquipelagoConviteAdulto: {
      GET: () => chamar('/visitas-adultas/convite', 'GET'),
      POST: comCorpo('/visitas-adultas/convite', 'POST', CORPO_PEQUENO),
      DELETE: () => chamar('/visitas-adultas/convite', 'DELETE'),
    },
    arquipelagoVisitaAdulta: {
      POST: comCorpo('/visitas-adultas/abrir', 'POST', CORPO_PEQUENO),
    },
    arquipelagoConferirVisitaAdulta: {
      POST: comCorpo('/visitas-adultas/conferir', 'POST', CORPO_PEQUENO),
    },
    arquipelagoFantasmas: { PUT: comCorpo('/fantasmas', 'PUT', CORPO_DO_FANTASMA_MAX_BYTES) },
    arquipelagoFantasma: {
      GET: async (_req: Request, ctx: { params: Promise<{ percurso: string }> }) => {
        const { percurso } = await ctx.params
        const id = PERCURSOS.find((id) => id === percurso)
        return id ? chamar(`/fantasmas/${id}`, 'GET') : invalido()
      },
    },
    arquipelagoFantasmaDoIrmao: {
      GET: async (_req: Request, ctx: { params: Promise<{ id: string; percurso: string }> }) => {
        const { id, percurso } = await ctx.params
        const nome = PERCURSOS.find((p) => p === percurso)
        if (!UUID.test(id) || !nome) return privado(invalido())
        const lista = await deps.profiles.siblings()
        if (lista.status !== 200 || !Array.isArray(lista.body?.siblings))
          return privado(repasse({ ...lista, status: 502, body: null }))
        if (!lista.body.siblings.some((p) => p.id.toLowerCase() === id.toLowerCase()))
          return NextResponse.json(
            { error: { code: 'IRMAO_NAO_ENCONTRADO', message: 'Irmão não encontrado' } },
            { status: 404, headers: { 'cache-control': 'private, no-store' } },
          )
        return chamar(`/irmaos/${id}/fantasmas/${nome}`, 'GET')
      },
    },
    arquipelagoSalvamento: {
      GET: () => chamar('/salvamento', 'GET'),
      PUT: comCorpo('/salvamento', 'PUT', CORPO_DO_SALVAMENTO),
    },
    arquipelagoTempo: { POST: comCorpo('/tempo', 'POST', CORPO_PEQUENO) },
    arquipelagoRecuperarTempo: { POST: comCorpo('/tempo/recuperar', 'POST', CORPO_PEQUENO) },
    arquipelagoSessaoTempo: { POST: comCorpo('/tempo/sessao', 'POST', CORPO_PEQUENO) },
    /** Cartões da rotina dos Lumis (os de controle pelos blocos conquistados nos cursos). */
    arquipelagoCartas: { GET: () => chamar('/cartas', 'GET') },
    arquipelagoInsumosPendentes: { GET: () => chamar('/insumos/pendente', 'GET') },
    arquipelagoInsumosComprar: { POST: comCorpo('/insumos/comprar', 'POST', 1024) },
    arquipelagoPedidosPendentes: { GET: () => chamar('/pedidos/pendentes', 'GET') },
    arquipelagoPedidosEntregar: { POST: comCorpo('/pedidos/entregar', 'POST', 1024) },
    arquipelagoProfissaoIniciar: { POST: comCorpo('/profissoes/iniciar', 'POST', 4096) },
    arquipelagoProfissaoConcluir: { POST: comCorpo('/profissoes/concluir', 'POST', 4096) },
    /** A galeria do Arquipélago (29/10/2026): o que ela comprou, o saldo e comprar. */
    arquipelagoGaleria: { GET: () => chamar('/galeria', 'GET') },
    arquipelagoGaleriaCompras: { POST: comCorpo('/galeria/compras', 'POST', CORPO_PEQUENO) },
    /** Desafios da ilha (`?ilha=`): situação, o que falta e de onde se aprende. */
    arquipelagoCoresConquistadas: { GET: () => chamar('/desafios/cores', 'GET') },
    arquipelagoDesafios: {
      GET: (req: Request) => {
        const ilha = new URL(req.url).searchParams.get('ilha')
        if (ilha !== null && !ILHA.test(ilha)) return invalido()
        return chamar('/desafios', 'GET', undefined, ilha ? { query: { ilha } } : {})
      },
    },
    /** O desafio aberto para o Estúdio de desafio (sem gabarito nem regra: o serviço garante). */
    arquipelagoDesafio: {
      GET: async (_req: Request, ctx: { params: Promise<{ id: string }> }) => {
        const id = await idDe(ctx)
        return id ? chamar(`/desafios/${id}`, 'GET') : invalido()
      },
    },
    /** Conferir o projeto da pessoa: o serviço confere no Members e dá o prêmio uma vez só. */
    arquipelagoDesafioVerificar: {
      POST: async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
        const id = await idDe(ctx)
        if (!id) return invalido()
        const lido = await corpoJson(req, CORPO_DA_CONFERENCIA)
        if (!lido.ok) return invalido()
        return chamar(`/desafios/${id}/verificar`, 'POST', lido.corpo, {
          timeoutMs: ESPERA_DA_CONFERENCIA_MS,
        })
      },
    },
    /** O jogo mostrou a festa do prêmio. */
    arquipelagoDesafioRecompensaVista: {
      POST: async (_req: Request, ctx: { params: Promise<{ id: string }> }) => {
        const id = await idDe(ctx)
        return id ? chamar(`/desafios/${id}/recompensa-vista`, 'POST', {}) : invalido()
      },
    },
    /**
     * Área dos pais: o app embrulha com o portão do responsável. A leitura leva os perfis prontos
     * da conta (a grade do Auth; o pendente ainda não abre o perfil) para o serviço dizer se alguma
     * criança vê o jogo. Sem a lista, nada segue. O teto só pesa para a equipe, que cria perfis sem
     * limite e entra com qualquer um deles.
     */
    arquipelagoLimiteDaFamilia: {
      GET: async () => {
        const lista = await perfisProntos()
        if (!lista.ok) return lista.resposta
        return chamar('/familia/limite', 'GET', undefined, {
          query: { perfis: lista.perfis.map((p) => p.id).join(',') },
        })
      },
      PUT: comCorpo('/familia/limite', 'PUT', CORPO_PEQUENO),
    },
    /**
     * A semana das crianças no jogo (28/10/2026, fase1-18), para o cartão da área dos pais: os
     * mesmos perfis prontos do limite, e o nome de cada criança vem daqui (da grade do Auth),
     * nunca do serviço do jogo. Resposta fora do contrato vira 502: o cartão fica escondido.
     */
    arquipelagoSemanaDaFamilia: {
      GET: async () => {
        const lista = await perfisProntos()
        if (!lista.ok) return lista.resposta
        const r = await gateway.gatewayFetch('/arquipelago/familia/semana', {
          method: 'GET',
          query: { perfis: lista.perfis.map((p) => p.id).join(',') },
        })
        if (r.status !== 200) return repasse(r)
        const lido = SemanaDaFamiliaSchema.safeParse(r.body)
        if (!lido.success) return repasse({ ...r, body: null })
        const nomes = new Map(lista.perfis.map((p) => [p.id.toLowerCase(), nomeDoPerfil(p)]))
        const paraOsPais: SemanaDaFamiliaParaOsPais = {
          ...lido.data,
          criancas: lido.data.criancas.flatMap((c) => {
            const nome = nomes.get(c.perfilId)
            return nome ? [{ ...c, nome }] : []
          }),
          aindaSemJogo: lido.data.aindaSemJogo.flatMap((perfilId) => {
            const nome = nomes.get(perfilId)
            return nome ? [{ perfilId, nome }] : []
          }),
        }
        return NextResponse.json(paraOsPais)
      },
    },
    /**
     * Visitas de outras crianças (N08a, 30/10/2026), na área dos pais: os convites de cada criança
     * (com o nome da grade do Auth, nunca do serviço) e as casas que a família aceitou. Resposta
     * fora do contrato vira 502.
     */
    arquipelagoAmigosDaFamilia: {
      GET: async () => {
        const lista = await perfisProntos()
        if (!lista.ok) return lista.resposta
        const r = await gateway.gatewayFetch('/arquipelago/familia/amigos', {
          method: 'GET',
          query: { perfis: lista.perfis.map((p) => p.id).join(',') },
        })
        if (r.status !== 200) return repasse(r)
        const lido = AmigosDaFamiliaSchema.safeParse(r.body)
        if (!lido.success) return repasse({ ...r, body: null })
        const nomes = new Map(lista.perfis.map((p) => [p.id.toLowerCase(), nomeDoPerfil(p)]))
        const paraOsPais: AmigosDaFamiliaParaOsPais = {
          ...lido.data,
          convites: lido.data.convites.flatMap((c) => {
            const nome = nomes.get(c.perfilId.toLowerCase())
            return nome ? [{ ...c, nome }] : []
          }),
        }
        const resposta = NextResponse.json(paraOsPais)
        resposta.headers.set('cache-control', 'private, no-store')
        return resposta
      },
    },
    arquipelagoConviteDeAmigo: {
      POST: comCorpo('/familia/amigos/convite', 'POST', CORPO_PEQUENO),
      DELETE: async (req: Request) => {
        const perfil = new URL(req.url).searchParams.get('perfil') ?? ''
        return UUID.test(perfil)
          ? chamar(`/familia/amigos/convite/${perfil}`, 'DELETE')
          : invalido()
      },
    },
    arquipelagoAceitarAmigo: {
      POST: comCorpo('/familia/amigos/aceitar', 'POST', CORPO_PEQUENO),
    },
    arquipelagoRemoverAmigo: {
      DELETE: async (_req: Request, ctx: { params: Promise<{ id: string }> }) => {
        const id = await idDe(ctx)
        return id ? chamar(`/familia/amigos/${id}`, 'DELETE') : invalido()
      },
    },
    /** A criança: as casas de amigos que a família aceitou e a casa de uma delas, só leitura. */
    arquipelagoCasasDeAmigos: { GET: () => chamar('/amigos', 'GET') },
    arquipelagoCasaDeAmigo: {
      GET: async (_req: Request, ctx: { params: Promise<{ id: string }> }) => {
        const id = await idDe(ctx)
        return id ? chamar(`/amigos/${id}/casa`, 'GET') : invalido()
      },
    },
    /** As permissões de visita da família. */
    arquipelagoPermissoesDaFamilia: {
      GET: () => chamar('/familia/permissoes', 'GET'),
      PUT: comCorpo('/familia/permissoes', 'PUT', CORPO_PEQUENO),
    },
    arquipelagoCliente: {
      async GET(_req: Request, ctx: { params: Promise<{ arquivo: string }> }) {
        const { arquivo } = await ctx.params
        if (!tipoDoArquivoDoCliente(arquivo)) {
          return NextResponse.json({ error: { code: 'NOT_FOUND' } }, { status: 404 })
        }
        const url = new URL(`/arquipelago/cliente/${arquivo}`, getEnv().GATEWAY_URL)
        // O IP de quem pediu segue junto: o gateway limita por IP, e sem ele todas as crianças
        // dividiriam o balde do servidor da plataforma.
        const espera = new AbortController()
        const prazo = setTimeout(() => espera.abort(), ESPERA_DOS_CABECALHOS_MS)
        const resposta = await fetch(url, {
          headers: await clientForwardHeaders(),
          cache: 'no-store',
          signal: espera.signal,
        })
          .catch(() => null)
          .finally(() => clearTimeout(prazo))
        if (!resposta) {
          return NextResponse.json({ error: { code: 'ARQUIPELAGO_INDISPONIVEL' } }, { status: 503 })
        }
        const headers = new Headers()
        for (const nome of CABECALHOS_DO_CLIENTE) {
          const valor = resposta.headers.get(nome)
          if (valor) headers.set(nome, valor)
        }
        return new Response(resposta.body, { status: resposta.status, headers })
      },
    },
  }
}
