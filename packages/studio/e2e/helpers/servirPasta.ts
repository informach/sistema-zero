import { execSync } from 'node:child_process'
import { readFile } from 'node:fs/promises'
import { createServer, type Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { extname, resolve, sep } from 'node:path'

/**
 * Um servidor de arquivos estáticos de uma pasta (os jogos gerados em `output/`, fora do Git),
 * numa porta livre. Nada fora da pasta sai dele.
 */
export async function servirPasta(
  pasta: string,
): Promise<{ base: string; fechar(): Promise<void> }> {
  const raiz = resolve(pasta)
  const tipos: Record<string, string> = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.json': 'application/json',
    '.png': 'image/png',
  }
  const servidor: Server = createServer(async (pedido, resposta) => {
    const caminho = decodeURIComponent(new URL(pedido.url ?? '/', 'http://x').pathname)
    const arquivo = resolve(raiz, `.${caminho}`)
    if (arquivo !== raiz && !arquivo.startsWith(raiz + sep)) {
      resposta.writeHead(403)
      resposta.end()
      return
    }
    try {
      const bytes = await readFile(arquivo)
      resposta.writeHead(200, {
        'content-type': tipos[extname(caminho)] ?? 'application/octet-stream',
      })
      resposta.end(bytes)
    } catch {
      resposta.writeHead(404)
      resposta.end()
    }
  })
  await new Promise<void>((pronto) => servidor.listen(0, '127.0.0.1', pronto))
  return {
    base: `http://127.0.0.1:${(servidor.address() as AddressInfo).port}`,
    fechar: () => new Promise<void>((pronto) => servidor.close(() => pronto())),
  }
}

/** O commit medido e se a árvore tinha mudanças nos pacotes do jogo e do cenário. */
export function proveniencia(): { sha: string | null; sujo: boolean | null } {
  try {
    const sha = execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim()
    const sujo =
      execSync(
        'git status --porcelain -- . ../molda-cenarios ../molda-cenarios-core ../molda-cenarios-motor',
        { encoding: 'utf8' },
      ).trim().length > 0
    return { sha, sujo }
  } catch {
    return { sha: null, sujo: null }
  }
}
