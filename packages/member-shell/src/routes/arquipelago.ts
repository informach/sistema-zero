import 'server-only'
import {
  PERFIS_DA_FAMILIA_MAXIMO,
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

const invalido = () =>
  NextResponse.json(
    { error: { code: 'VALIDATION_ERROR', message: 'Requisição inválida' } },
    { status: 400 },
  )

/**
 * Repasse do Arquipélago Vagalume: o navegador fala com o serviço do jogo SÓ por aqui (mesma
 * origem), e daqui pelo gateway com a sessão HttpOnly. Nenhuma regra de jogo mora no BFF: quem
 * decide acesso, salvamento, tempo e suporte somente leitura é o `@sistemazero/arquipelago-api`.
 * O cliente compilado do jogo também passa por aqui, na mesma origem da página.
 */
export function createArquipelagoRoutes(deps: {
  gateway: GatewayModule
  profiles: Pick<ProfilesClient, 'list'>
}) {
  const { gateway } = deps
  const chamar = (
    caminho: string,
    metodo: 'GET' | 'PUT' | 'POST',
    corpo?: unknown,
    extra: { query?: Record<string, string>; timeoutMs?: number } = {},
  ) =>
    gateway
      .gatewayFetch(`/arquipelago${caminho}`, {
        method: metodo,
        ...(corpo === undefined ? {} : { body: corpo }),
        ...extra,
      })
      .then(repasse)
  const idDe = async (ctx: { params: Promise<{ id: string }> }) => {
    const { id } = await ctx.params
    return UUID.test(id) ? id : null
  }

  const comCorpo =
    (caminho: string, metodo: 'PUT' | 'POST', teto: number) => async (req: Request) => {
      const lido = await corpoJson(req, teto)
      return lido.ok ? chamar(caminho, metodo, lido.corpo) : invalido()
    }

  return {
    arquipelagoAcesso: { GET: () => chamar('/acesso', 'GET') },
    arquipelagoSalvamento: {
      GET: () => chamar('/salvamento', 'GET'),
      PUT: comCorpo('/salvamento', 'PUT', CORPO_DO_SALVAMENTO),
    },
    arquipelagoTempo: { POST: comCorpo('/tempo', 'POST', CORPO_PEQUENO) },
    arquipelagoRecuperarTempo: { POST: comCorpo('/tempo/recuperar', 'POST', CORPO_PEQUENO) },
    arquipelagoSessaoTempo: { POST: comCorpo('/tempo/sessao', 'POST', CORPO_PEQUENO) },
    /** Cartões da rotina dos Lumis (os de controle pelos blocos conquistados nos cursos). */
    arquipelagoCartas: { GET: () => chamar('/cartas', 'GET') },
    /** Desafios da ilha (`?ilha=`): situação, o que falta e de onde se aprende. */
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
     * Área dos pais: o app embrulha com o portão do responsável. A leitura leva os perfis da conta
     * (a grade do Auth) para o serviço dizer se alguma criança vê o jogo; sem a lista, nada segue.
     */
    arquipelagoLimiteDaFamilia: {
      GET: async () => {
        const lista = await deps.profiles.list()
        if (lista.status !== 200 || !lista.body) return repasse(lista)
        const perfis = lista.body.profiles.slice(0, PERFIS_DA_FAMILIA_MAXIMO).map((p) => p.id)
        return chamar('/familia/limite', 'GET', undefined, { query: { perfis: perfis.join(',') } })
      },
      PUT: comCorpo('/familia/limite', 'PUT', CORPO_PEQUENO),
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
