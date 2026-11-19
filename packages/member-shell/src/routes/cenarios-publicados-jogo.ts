import 'server-only'
import { AcessoSchema } from '@sistemazero/arquipelago-contracts'
import { ArquivoCompiladoSchema } from '@sistemazero/molda-cenarios-core/compilar'
import {
  MIME_DO_MANIFESTO,
  PerfilDePublicacaoSchema,
  PublicacaoParaOJogoSchema,
} from '@sistemazero/molda-cenarios-core/publicacao'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { avatarLinkWindow } from '../lib/avatar-link-window'
import type { SessionUser } from '../lib/types'
import type { GatewayModule, GatewayResponse } from '../server/gateway'
import type { r2PresignGetUgc } from '../server/r2'

const Arquivo = z
  .object({
    digest: z.string().regex(/^[a-f0-9]{64}$/),
    chave: z.string(),
    bytes: z.number().int().positive(),
    tipoDoConteudo: ArquivoCompiladoSchema.shape.mime.or(z.literal(MIME_DO_MANIFESTO)),
  })
  .strict()

/** A consulta do jogador não abre espaços/bibliotecas nem depende do modo de autoria. */
export function criarLeituraDeCenariosDoJogo(deps: {
  gateway: Pick<GatewayModule, 'gatewayFetch' | 'gatewayFetchHmac'>
  assinar: typeof r2PresignGetUgc
  agora(): number
  ator(user: SessionUser): { usuarioId: string; contaId: string; equipe: boolean; suporte: boolean }
  responder(r: GatewayResponse): NextResponse
  erro(status: number, code: string, mensagem: string): NextResponse
}) {
  return async (metodo: string, caminho: string, req: Request, user: SessionUser | null) => {
    const perfil = /^jogo\/perfis\/([^/]+)$/.exec(caminho)
    const recurso = /^jogo\/publicacoes\/([a-f0-9-]{36})\/arquivos\/([a-f0-9]{64})$/.exec(caminho)
    if (metodo !== 'GET' || (!perfil && !recurso)) return null
    if (!user) return deps.erro(401, 'UNAUTHENTICATED', 'Entre de novo para continuar.')
    const destino =
      perfil && PerfilDePublicacaoSchema.safeParse({ tipo: 'arquipelago-v2', ilha: perfil[1] })
    const id = recurso && z.uuid().safeParse(recurso[1])
    if ((perfil && !destino?.success) || (recurso && !id?.success))
      return deps.erro(404, 'NOT_FOUND', 'Não achei isso')
    // A política é a do jogo (inclui Kids, responsável e equipe), não a da oficina.
    const acesso = await deps.gateway.gatewayFetch('/arquipelago/acesso', {
      method: 'GET',
      signal: req.signal,
    })
    if (acesso.status !== 200) return deps.responder(acesso)
    const decisao = AcessoSchema.safeParse(acesso.body)
    if (!decisao.success)
      return deps.erro(502, 'ARQUIPELAGO_INDISPONIVEL', 'O jogo não respondeu agora.')
    if (!decisao.data.liberado)
      return deps.erro(403, 'ARQUIPELAGO_BLOQUEADO', 'O jogo não está liberado para esta conta.')
    const ator = deps.ator(user)
    if (destino?.success) {
      const r = await deps.gateway.gatewayFetchHmac(
        '/members/internal/cenarios/publicacoes/jogo/perfil',
        {
          method: 'POST',
          body: { ator, perfil: destino.data },
          signal: req.signal,
        },
      )
      if (r.status !== 200) return deps.responder(r)
      const p = PublicacaoParaOJogoSchema.nullable().safeParse(r.body)
      if (!p.success || (p.data && p.data.perfil.ilha !== destino.data.ilha))
        return deps.erro(502, 'ARQUIPELAGO_INDISPONIVEL', 'O cenário respondeu fora do combinado.')
      return NextResponse.json(
        { publicacao: p.data },
        { headers: { 'cache-control': 'private, no-store' } },
      )
    }
    const r = await deps.gateway.gatewayFetchHmac(
      '/members/internal/cenarios/publicacoes/jogo/arquivo',
      {
        method: 'POST',
        body: { ator, publicacaoId: id!.data, digest: recurso![2] },
        signal: req.signal,
      },
    )
    if (r.status !== 200) return deps.responder(r)
    const a = Arquivo.safeParse(r.body)
    if (
      !a.success ||
      a.data.digest !== recurso![2] ||
      !new RegExp(`^cenarios/[a-f0-9-]{36}/blobs/${recurso![2]}$`).test(a.data.chave)
    )
      return deps.erro(502, 'ARQUIPELAGO_INDISPONIVEL', 'O arquivo respondeu fora do combinado.')
    const janela = avatarLinkWindow(deps.agora())
    const url = await deps.assinar(a.data.chave, {
      expiresInSeconds: janela.expiresInSeconds,
      signingDate: janela.signingDate,
      responseCacheControl: janela.fileCacheControl,
      responseContentType: a.data.tipoDoConteudo,
    })
    // Cada passagem no BFF confere o acesso de novo; o blob imutável conserva o cache por hash.
    const resposta =
      new URL(req.url).searchParams.get('como') === 'endereco'
        ? NextResponse.json({ url, bytes: a.data.bytes, tipoDoConteudo: a.data.tipoDoConteudo })
        : NextResponse.redirect(url, 302)
    resposta.headers.set('cache-control', 'private, no-store')
    return resposta
  }
}
