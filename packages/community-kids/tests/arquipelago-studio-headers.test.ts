import { expect, test } from 'bun:test'

type Regra = { source: string; headers: { key: string; value: string }[] }

const valor = (regra: Regra | undefined, chave: string) =>
  regra?.headers.find((header) => header.key === chave)?.value

test('jogo isola a sua página e ninguém a embute; o Pro vem num quadro da própria origem', async () => {
  for (const path of ['../next.config', '../../community/next.config']) {
    const config = (await import(path)).default
    const rules: Regra[] = await config.headers()
    const game = rules.find((rule) => rule.source === '/arquipelago/:path*')
    expect(game, path).toBeDefined()
    const csp = valor(game, 'Content-Security-Policy') ?? ''
    expect(csp).toContain("frame-ancestors 'none'")
    // Lacunas, 01/11/2026: o WebContainer não roda mais na página do jogo.
    expect(csp).not.toContain('webcontainer-api.io')
    expect(valor(game, 'Cross-Origin-Embedder-Policy')).toBe('credentialless')
    // A rota isolada do Pro: embutível só pela própria origem, e só com `?embed=arquipelago`.
    const pro = rules.filter((rule) => rule.source === '/estudio/pro/:path*')
    const comum = pro.find((rule) => !('has' in rule))
    const embutido = pro.find((rule) => 'has' in rule) as
      | (Regra & { has: { type: string; key: string; value: string }[] })
      | undefined
    expect(valor(comum, 'Content-Security-Policy'), path).toContain("frame-ancestors 'none'")
    expect(embutido?.has).toEqual([{ type: 'query', key: 'embed', value: 'arquipelago' }])
    expect(valor(embutido, 'Content-Security-Policy')).toContain("frame-ancestors 'self'")
    expect(valor(embutido, 'Content-Security-Policy')).toContain('webcontainer-api.io')
    expect(valor(embutido, 'X-Frame-Options')).toBe('SAMEORIGIN')
    // A regra embutida vem depois da comum (a última vence no Next).
    expect(rules.indexOf(embutido as Regra)).toBeGreaterThan(rules.indexOf(comum as Regra))
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
    // A física e o Molda (WebAssembly); sem `unsafe-eval` (lacunas, 01/11/2026): o Pro abre num
    // quadro da própria origem.
    expect(diretiva('script-src')).toContain("'wasm-unsafe-eval'")
    // O mesmo `script-src` da regra estrita do resto do app (em desenvolvimento o Next põe
    // `unsafe-eval` em todas as páginas; em produção, nenhuma o tem), sem o `blob:` do Pro.
    const estrita = valor(
      rules.find((rule) => rule.source === '/((?!estudio/pro/).*)'),
      'Content-Security-Policy',
    )
    const scriptEstrito = (estrita ?? '').split('; ').find((d) => d.startsWith('script-src ')) ?? ''
    expect(diretiva('script-src')).toBe(scriptEstrito)
    expect(diretiva('script-src')).not.toContain('blob:')
    expect(diretiva('worker-src')).toContain('blob:')
    expect(diretiva('frame-src')).toContain("'self'")
    expect(diretiva('frame-src')).not.toContain('https://stackblitz.com')
    // Sem os vídeos das aulas.
    expect(diretiva('frame-src')).not.toContain('youtube')
    expect(diretiva('frame-src')).not.toContain('vimeo')
    expect(game).toContain("object-src 'none'")
  }
})
