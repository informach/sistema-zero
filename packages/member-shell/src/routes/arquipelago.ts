import 'server-only'
import { tipoDoArquivoDoCliente } from '@sistemazero/arquipelago-contracts'
import { NextResponse } from 'next/server'
import { getEnv } from '../lib/env'
import { clientForwardHeaders, type GatewayModule, type GatewayResponse } from '../server/gateway'
import { readJsonBodyWithLimit } from '../server/read-json-body'

export type ArquipelagoRoutes = ReturnType<typeof createArquipelagoRoutes>

/** Salvamento de até 64 KB mais a revisão; tempo e limite são minúsculos (os mesmos do gateway). */
const CORPO_DO_SALVAMENTO = 96 * 1024
const CORPO_PEQUENO = 1024
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
export function createArquipelagoRoutes(deps: { gateway: GatewayModule }) {
  const { gateway } = deps
  const chamar = (caminho: string, metodo: 'GET' | 'PUT' | 'POST', corpo?: unknown) =>
    gateway
      .gatewayFetch(`/arquipelago${caminho}`, {
        method: metodo,
        ...(corpo === undefined ? {} : { body: corpo }),
      })
      .then(repasse)

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
    /** Área dos pais: o app embrulha com o portão do responsável. */
    arquipelagoLimiteDaFamilia: {
      GET: () => chamar('/familia/limite', 'GET'),
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
