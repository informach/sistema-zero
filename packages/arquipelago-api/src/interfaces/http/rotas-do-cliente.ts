import { join } from 'node:path'
import {
  ManifestoDoClienteSchema,
  tipoDoArquivoDoCliente,
} from '@sistemazero/arquipelago-contracts'
import { envelope } from '@sistemazero/core/http'
import { Elysia } from 'elysia'
import { exigirGateway } from './identidade'

/**
 * Publica o cliente compilado do jogo. O manifesto nunca fica em cache (trocar a versão do
 * jogo = trocar o manifesto); os arquivos têm hash no nome e ficam em cache para sempre.
 */
export function rotasDoCliente(deps: { dir: string; servirMapas: boolean; tokenInterno?: string }) {
  return new Elysia({ prefix: '/arquipelago/cliente' })
    .onBeforeHandle(({ headers }) => exigirGateway(headers['x-internal-token'], deps.tokenInterno))
    .get('/manifesto.json', async ({ set }) => {
      const arquivo = Bun.file(join(deps.dir, 'manifesto.json'))
      const manifesto = (await arquivo.exists())
        ? ManifestoDoClienteSchema.safeParse(await arquivo.json().catch(() => null))
        : null
      if (!manifesto?.success) {
        set.status = 503
        return envelope('CLIENTE_INDISPONIVEL', 'O jogo ainda não foi publicado neste ambiente')
      }
      set.headers['cache-control'] = 'no-cache'
      return manifesto.data
    })
    .get('/:arquivo', async ({ params, set }) => {
      const nome = params.arquivo
      const tipo = tipoDoArquivoDoCliente(nome)
      if (!tipo || (nome.endsWith('.map') && !deps.servirMapas)) {
        set.status = 404
        return envelope('NOT_FOUND', 'Arquivo não encontrado')
      }
      const arquivo = Bun.file(join(deps.dir, nome))
      if (!(await arquivo.exists())) {
        set.status = 404
        return envelope('NOT_FOUND', 'Arquivo não encontrado')
      }
      return new Response(arquivo, {
        headers: {
          'content-type': tipo,
          'cache-control': 'public, max-age=31536000, immutable',
          'x-content-type-options': 'nosniff',
        },
      })
    })
}
