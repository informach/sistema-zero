import { getEnv } from '../lib/env'

/**
 * Os arquivos dos exemplos GRANDES da galeria "Ver os jogos prontos" (lote 9 da conclusão do
 * plano do Estúdio, 22/11/2026): o jogo E tem 20 MB de modelos e não cabe no pacote do app.
 * Ele mora no R2 público do ambiente (`STUDIO_EXAMPLES_ORIGIN` + `/estudio-exemplos/...`), e esta
 * rota o entrega do MESMO domínio do app (o `fetch` do navegador não depende de CORS no bucket).
 *
 * - Sem `STUDIO_EXAMPLES_ORIGIN`, 404: a página do Estúdio também não passa o endereço, e o card
 *   do exemplo nem aparece (é como a produção fica até ela decidir).
 * - Só um formato de caminho passa: `<pasta>/<sha256>.json`. O nome é o hash do conteúdo, então o
 *   arquivo nunca muda e pode ficar em cache para sempre (o Estúdio confere o hash ao abrir).
 */
const PASTA = /^[a-z0-9-]{1,40}$/
const ARQUIVO = /^[0-9a-f]{64}\.json$/

export function studioExampleFileUrl(origin: string, caminho: readonly string[]): string | null {
  if (caminho.length !== 2 || !PASTA.test(caminho[0]!) || !ARQUIVO.test(caminho[1]!)) return null
  return `${origin.replace(/\/+$/, '')}/estudio-exemplos/${caminho[0]}/${caminho[1]}`
}

export function createStudioExampleFilesRoute(
  deps: { origin?: () => string | undefined; fetcher?: typeof fetch } = {},
) {
  const origin = deps.origin ?? (() => getEnv().STUDIO_EXAMPLES_ORIGIN)
  const fetcher = deps.fetcher ?? fetch
  return {
    async GET(_request: Request, context: { params: Promise<{ caminho?: string[] }> }) {
      const base = origin()
      const { caminho = [] } = await context.params
      const url = base ? studioExampleFileUrl(base, caminho) : null
      if (!url) return new Response('Not found', { status: 404 })
      const resposta = await fetcher(url, { cache: 'no-store' })
      if (!resposta.ok || !resposta.body) return new Response('Not found', { status: 404 })
      return new Response(resposta.body, {
        headers: {
          'content-type': 'application/json',
          'cache-control': 'public, max-age=31536000, immutable',
          'x-content-type-options': 'nosniff',
        },
      })
    },
  }
}
