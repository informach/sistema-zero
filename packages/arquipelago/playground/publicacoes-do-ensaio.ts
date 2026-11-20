import { resolve } from 'node:path'
import { lerCenaCompilada } from '@sistemazero/molda-cenarios-core/compilar'
import {
  MIME_DO_MANIFESTO,
  PerfilDePublicacaoSchema,
  PublicacaoParaOJogoSchema,
} from '@sistemazero/molda-cenarios-core/publicacao'
import { digestDosBytes } from '@sistemazero/molda-cenarios-core/v2'

/** Leitura local e somente de publicações de QA. O servidor escuta exclusivamente em loopback.
 * Os arquivos pagos e o estado deste ensaio ficam fora do Git e das contas da plataforma. */
export async function publicacoesDoEnsaio(
  raiz: string | null,
  pedido: Request,
): Promise<Response | null> {
  const url = new URL(pedido.url),
    perfil = /^\/api\/cenarios\/jogo\/perfis\/([^/]+)$/.exec(url.pathname),
    arquivo =
      /^\/api\/cenarios\/jogo\/publicacoes\/([a-f0-9-]{36})\/arquivos\/([a-f0-9]{64})$/.exec(
        url.pathname,
      )
  if (!perfil && !arquivo) return null
  if (pedido.method !== 'GET') return new Response('Somente leitura no ensaio', { status: 405 })
  const headers = { 'cache-control': 'private, no-store' }
  try {
    if (perfil) {
      const ilha = PerfilDePublicacaoSchema.parse({ tipo: 'arquipelago-v2', ilha: perfil[1] }).ilha
      if (!raiz) return Response.json({ publicacao: null }, { headers })
      const f = Bun.file(resolve(raiz, 'perfis', `${ilha}.json`))
      if (!(await f.exists())) return Response.json({ publicacao: null }, { headers })
      const publicacao = PublicacaoParaOJogoSchema.parse(await f.json())
      if (publicacao.perfil.ilha !== ilha) throw Error('A ilha do ensaio está incorreta.')
      return Response.json({ publicacao }, { headers })
    }
    if (!raiz || !arquivo)
      return new Response('Publicação de ensaio ausente', { status: 404, headers })
    const id = arquivo[1]!,
      digest = arquivo[2]!,
      recibo = Bun.file(resolve(raiz, 'publicacoes', id, 'publicacao.json'))
    if (!(await recibo.exists()))
      return new Response('Publicação de ensaio ausente', { status: 404, headers })
    const publicacao = PublicacaoParaOJogoSchema.parse(await recibo.json())
    if (publicacao.id !== id) throw Error('A versão do ensaio está incorreta.')
    const manifesto = Bun.file(resolve(raiz, 'blobs', publicacao.manifesto.digest)),
      bytes = new Uint8Array(await manifesto.arrayBuffer())
    if (
      bytes.length !== publicacao.manifesto.bytes ||
      (await digestDosBytes(bytes)) !== publicacao.manifesto.digest
    )
      throw Error('O manifesto do ensaio está inválido.')
    const cena = lerCenaCompilada(new TextDecoder('utf-8', { fatal: true }).decode(bytes))
    const meta =
      digest === publicacao.manifesto.digest
        ? { bytes: bytes.length, mime: MIME_DO_MANIFESTO }
        : cena.arquivos.find((a) => a.digest === digest)
    if (!meta)
      return new Response('Arquivo fora desta publicação de ensaio', { status: 404, headers })
    if (url.searchParams.get('conteudo') === '1') {
      const f = Bun.file(resolve(raiz, 'blobs', digest))
      if (!(await f.exists()) || f.size !== meta.bytes)
        throw Error('O arquivo do ensaio está incompleto.')
      return new Response(f, { headers: { ...headers, 'content-type': meta.mime } })
    }
    url.search = '?conteudo=1'
    return Response.json(
      { url: url.toString(), bytes: meta.bytes, tipoDoConteudo: meta.mime },
      { headers },
    )
  } catch {
    return new Response('A publicação local de ensaio é inválida ou está incompleta.', {
      status: 500,
      headers,
    })
  }
}
