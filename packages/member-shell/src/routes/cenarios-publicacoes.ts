import 'server-only'
import {
  conferirPreparacaoDePublicacao,
  lerResultadoDaPublicacao,
  lerResultadoDaVolta,
  lerVersoesPublicadas,
  PedidoDePublicacaoSchema,
  PedidoDeVoltaSchema,
  PerfilDePublicacaoSchema,
  type PreparacaoDePublicacao,
  PublicacaoParaOJogoSchema,
} from '@sistemazero/molda-cenarios-core/publicacao'
import type { NextResponse } from 'next/server'
import { z } from 'zod'
import type { SessionUser } from '../lib/types'
import { ConteudoDeCenarioInvalido, type ConteudoDoCenario } from '../server/cenarios-conteudo'
import {
  conferirPacoteDaPublicacao,
  lerManifestoDaPublicacao,
} from '../server/cenarios-publicacao-conteudo'
import type { GatewayModule, GatewayResponse } from '../server/gateway'

const Confirmacao = z.object({ pedido: PedidoDePublicacaoSchema }).strict()
const Recursos = Confirmacao.extend({
  digests: z
    .array(z.string().regex(/^[a-f0-9]{64}$/))
    .min(1)
    .max(50),
})
/** Voltar uma versão leva só ids e a versão esperada: o conteúdo é o da versão guardada. */
const CORPO_DA_VOLTA = 16 * 1024
const caminhos = new Set([
  'publicacoes/manifesto/reservar',
  'publicacoes/recursos/reservar',
  'publicacoes/confirmar',
])

/** Recorte do mesmo BFF: identidade, política de suporte, assinatura e respostas são as existentes. */
export function criarPublicacoesDeCenariosBff(deps: {
  gateway: Pick<GatewayModule, 'gatewayFetch' | 'gatewayFetchHmac'>
  abrir(chave: string, sinal?: AbortSignal): Promise<ConteudoDoCenario | null>
  chave(espacoId: string, digest: string): string
  ator(user: SessionUser): { usuarioId: string; contaId: string; equipe: boolean; suporte: boolean }
  lerCorpo(req: Request, limite: number): Promise<{ ok: boolean; corpo?: unknown }>
  assinar(resposta: GatewayResponse): Promise<NextResponse>
  responder(resposta: GatewayResponse): NextResponse
  erro(status: number, code: string, mensagem: string): NextResponse
}) {
  return async (
    metodo: string,
    caminho: string,
    req: Request,
    user: SessionUser | null,
  ): Promise<NextResponse | null> => {
    const versoes = /^publicacoes\/perfis\/([^/]+)\/versoes$/.exec(caminho)
    if (metodo === 'GET' && versoes) {
      if (!user) return deps.erro(401, 'UNAUTHENTICATED', 'Entre de novo para continuar.')
      const perfil = PerfilDePublicacaoSchema.safeParse({
        tipo: 'arquipelago-v2',
        ilha: versoes[1],
      })
      if (!perfil.success) return deps.erro(404, 'NOT_FOUND', 'Não achei isso')
      // Quem pode ver (a equipe na própria conta) é o members que decide, como ao publicar.
      const resposta = await deps.gateway.gatewayFetch(
        `/members/cenarios/publicacoes/perfis/${perfil.data.ilha}/versoes`,
        { method: 'GET', signal: req.signal },
      )
      if (resposta.status !== 200) return deps.responder(resposta)
      try {
        return deps.responder({
          status: 200,
          body: lerVersoesPublicadas(perfil.data, resposta.body),
        })
      } catch {
        return deps.erro(502, 'CENARIOS_INDISPONIVEL', 'A oficina respondeu fora do combinado.')
      }
    }
    if (metodo === 'POST' && caminho === 'publicacoes/voltar') {
      if (!user) return deps.erro(401, 'UNAUTHENTICATED', 'Entre de novo para continuar.')
      const lido = await deps.lerCorpo(req, CORPO_DA_VOLTA)
      const pedido = lido.ok ? PedidoDeVoltaSchema.safeParse(lido.corpo) : null
      if (!pedido?.success) return deps.erro(400, 'VALIDATION_ERROR', 'Requisição inválida')
      // Troca o que o jogo mostra: como a confirmação, só pela rota interna com o ator da sessão.
      const resposta = await deps.gateway.gatewayFetchHmac(
        '/members/internal/cenarios/publicacoes/voltar',
        {
          method: 'POST',
          signal: req.signal,
          body: { ator: deps.ator(user), pedido: pedido.data },
        },
      )
      if (resposta.status !== 200) return deps.responder(resposta)
      try {
        return deps.responder({
          status: 200,
          body: lerResultadoDaVolta(pedido.data, resposta.body),
        })
      } catch {
        return deps.erro(
          502,
          'CENARIOS_INDISPONIVEL',
          'A volta respondeu com outra versão ou destino.',
        )
      }
    }
    const destino = /^publicacoes\/perfis\/([^/]+)$/.exec(caminho)
    if (metodo === 'GET' && destino) {
      if (!user) return deps.erro(401, 'UNAUTHENTICATED', 'Entre de novo para continuar.')
      const perfil = PerfilDePublicacaoSchema.safeParse({
        tipo: 'arquipelago-v2',
        ilha: destino[1],
      })
      if (!perfil.success) return deps.erro(404, 'NOT_FOUND', 'Não achei isso')
      const resposta = await deps.gateway.gatewayFetch(
        `/members/cenarios/publicacoes/perfis/${perfil.data.ilha}`,
        { method: 'GET', signal: req.signal },
      )
      if (resposta.status !== 200) return deps.responder(resposta)
      const publicacao = PublicacaoParaOJogoSchema.nullable().safeParse(resposta.body)
      if (!publicacao.success)
        return deps.erro(502, 'CENARIOS_INDISPONIVEL', 'A oficina respondeu fora do combinado.')
      return deps.responder({ status: 200, body: { publicacao: publicacao.data } })
    }
    if (metodo !== 'POST' || !caminhos.has(caminho)) return null
    if (!user) return deps.erro(401, 'UNAUTHENTICATED', 'Entre de novo para continuar.')
    const lido = await deps.lerCorpo(req, 64 * 1024)
    if (!lido.ok) return deps.erro(400, 'VALIDATION_ERROR', 'Requisição inválida')
    if (caminho === 'publicacoes/manifesto/reservar') {
      const pedido = PedidoDePublicacaoSchema.safeParse(lido.corpo)
      if (!pedido.success) return deps.erro(400, 'VALIDATION_ERROR', 'Requisição inválida')
      const resposta = await deps.gateway.gatewayFetch(
        '/members/cenarios/publicacoes/manifesto/reservar',
        { method: 'POST', body: pedido.data, signal: req.signal },
      )
      if (resposta.status !== 200) return deps.responder(resposta)
      const reserva = z
        .object({ espacoId: z.uuid(), arquivos: z.array(z.unknown()).max(50) })
        .safeParse(resposta.body)
      if (!reserva.success)
        return deps.erro(502, 'CENARIOS_INDISPONIVEL', 'A oficina respondeu fora do combinado.')
      return deps.assinar({
        status: 200,
        body: { espacoId: reserva.data.espacoId, enviar: reserva.data.arquivos },
      })
    }
    const recursos = caminho === 'publicacoes/recursos/reservar'
    const corpo = recursos ? Recursos.safeParse(lido.corpo) : Confirmacao.safeParse(lido.corpo)
    if (!corpo.success) return deps.erro(400, 'VALIDATION_ERROR', 'Requisição inválida')
    const pedido = corpo.data.pedido
    // Esta autorização real vem antes de abrir qualquer chave de armazenamento.
    const r = await deps.gateway.gatewayFetch('/members/cenarios/publicacoes/preparar', {
      method: 'POST',
      body: pedido,
      signal: req.signal,
    })
    if (r.status !== 200) return deps.responder(r)
    let preparo: PreparacaoDePublicacao
    try {
      preparo = conferirPreparacaoDePublicacao(pedido, r.body)
    } catch {
      return deps.erro(502, 'CENARIOS_INDISPONIVEL', 'A oficina respondeu fora do combinado.')
    }
    if (preparo.publicacao)
      return deps.responder({
        status: 200,
        body: recursos
          ? { espacoId: preparo.espacoId, enviar: [] }
          : { publicacao: preparo.publicacao, repetido: true },
      })
    const espacoId = preparo.espacoId
    const sinal = AbortSignal.any([req.signal, AbortSignal.timeout(120_000)])
    const ler = (digest: string, sinal?: AbortSignal) =>
      deps.abrir(deps.chave(espacoId, digest), sinal)
    try {
      if (recursos) {
        const entrada = Recursos.parse(corpo.data)
        const { snapshot } = await lerManifestoDaPublicacao(pedido, ler, sinal)
        const inventario = new Map(
          snapshot.recursos.filter((r) => r.papel === 'recurso').map((r) => [r.digest, r]),
        )
        if (
          new Set(entrada.digests).size !== entrada.digests.length ||
          entrada.digests.some((d) => !inventario.has(d))
        )
          return deps.erro(
            422,
            'CENARIO_INVALIDO',
            'Escolha somente recursos diferentes deste inventário.',
          )
        const resposta = await deps.gateway.gatewayFetchHmac(
          '/members/internal/cenarios/publicacoes/recursos',
          {
            method: 'POST',
            signal: sinal,
            // Só os metadados dos recursos escolhidos: o manifesto fica no armazenamento.
            body: {
              ator: deps.ator(user),
              pedido,
              recursos: entrada.digests.map((d) => inventario.get(d)!),
            },
          },
        )
        if (resposta.status !== 200) return deps.responder(resposta)
        const reserva = z
          .object({ espacoId: z.literal(espacoId), arquivos: z.array(z.unknown()).max(50) })
          .safeParse(resposta.body)
        if (!reserva.success)
          return deps.erro(502, 'CENARIOS_INDISPONIVEL', 'A oficina respondeu fora do combinado.')
        return deps.assinar({ status: 200, body: { espacoId, enviar: reserva.data.arquivos } })
      }
      const resultado = await conferirPacoteDaPublicacao(pedido, ler, sinal)
      const confirmada = await deps.gateway.gatewayFetchHmac(
        '/members/internal/cenarios/publicacoes/confirmar',
        {
          method: 'POST',
          signal: sinal,
          body: {
            ator: deps.ator(user),
            pedido,
            resumo: resultado.resumo,
            conferidos: resultado.conferidos,
          },
        },
      )
      if (confirmada.status !== 200) return deps.responder(confirmada)
      try {
        return deps.responder({
          status: 200,
          body: lerResultadoDaPublicacao(pedido, confirmada.body),
        })
      } catch {
        return deps.erro(
          502,
          'CENARIOS_INDISPONIVEL',
          'A publicação respondeu com outra revisão ou destino.',
        )
      }
    } catch (erro) {
      sinal.throwIfAborted()
      return erro instanceof ConteudoDeCenarioInvalido
        ? deps.erro(422, 'CENARIO_ARQUIVO_INVALIDO', erro.message)
        : deps.erro(
            503,
            'CENARIOS_ARMAZENAMENTO',
            'Não consegui conferir os arquivos agora. Tente de novo.',
          )
    }
  }
}
