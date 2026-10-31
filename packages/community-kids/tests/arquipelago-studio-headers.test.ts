import { expect, test } from 'bun:test'

type Regra = { source: string; headers: { key: string; value: string }[] }

const valor = (regra: Regra | undefined, chave: string) =>
  regra?.headers.find((header) => header.key === chave)?.value

test('jogo isola apenas sua página para o Estúdio Pro sem permitir terceiros a embutir', async () => {
  for (const path of ['../next.config', '../../community/next.config']) {
    const config = (await import(path)).default
    const rules: Regra[] = await config.headers()
    const game = rules.find((rule) => rule.source === '/arquipelago/:path*')
    expect(game, path).toBeDefined()
    const csp = valor(game, 'Content-Security-Policy') ?? ''
    expect(csp).toContain("frame-ancestors 'none'")
    expect(csp).toContain('webcontainer-api.io')
    expect(valor(game, 'Cross-Origin-Embedder-Policy')).toBe('credentialless')
  }
})

test('a regra do jogo é a dele (A27): o que o jogo e o Pro precisam, sem os vídeos das aulas', async () => {
  for (const path of ['../next.config', '../../community/next.config']) {
    const config = (await import(path)).default
    const rules: Regra[] = await config.headers()
    const game = valor(
      rules.find((rule) => rule.source === '/arquipelago/:path*'),
      'Content-Security-Policy',
    )
    const pro = valor(
      rules.find((rule) => rule.source === '/estudio/pro/:path*'),
      'Content-Security-Policy',
    )
    expect(game, path).toBeDefined()
    // Não é mais a cópia da rota Pro.
    expect(game).not.toBe(pro)
    const diretiva = (nome: string) =>
      (game ?? '').split('; ').find((d) => d.startsWith(`${nome} `)) ?? ''
    // A física e o Molda (WebAssembly) e o terminal do Pro aberto por cima do jogo.
    expect(diretiva('script-src')).toContain("'wasm-unsafe-eval'")
    expect(diretiva('script-src')).toContain("'unsafe-eval'")
    expect(diretiva('worker-src')).toContain('blob:')
    expect(diretiva('frame-src')).toContain('https://stackblitz.com')
    // Sem os vídeos das aulas.
    expect(diretiva('frame-src')).not.toContain('youtube')
    expect(diretiva('frame-src')).not.toContain('vimeo')
    expect(game).toContain("object-src 'none'")
  }
})
