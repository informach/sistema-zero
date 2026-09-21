import { describe, expect, it } from 'bun:test'

/**
 * A prévia da animação Rive no editor de curso é WebAssembly, e
 * `'wasm-unsafe-eval'` é uma KEYWORD à parte: nem `https:` nem `'unsafe-inline'`
 * no `script-src` liberam a compilação de um módulo WASM.
 *
 * ⚠️ `bun test` roda sem enforcement de CSP — nenhum teste de comportamento pega
 * esta classe de defeito, e a recusa do Chrome é SILENCIOSA (a prévia fica em
 * branco, sem erro na UI). O que dá para travar é o cabeçalho que o Next EMITE.
 * Gêmeo de `community-kids/tests/csp-media-data.test.ts`, que nasceu do mesmo
 * defeito no mascote animado.
 */

interface ConfigComHeaders {
  headers?: () => Promise<unknown>
}

async function directives(mod: { default: unknown }, nome: string): Promise<string[]> {
  const cfg = mod.default as ConfigComHeaders
  const headers = await cfg.headers?.()
  const re = new RegExp(`${nome}[^;\\\\"]*`, 'g')
  return [...JSON.stringify(headers).matchAll(re)].map((m) => m[0])
}

describe('CSP do painel', () => {
  it('TODA diretiva script-src emitida libera wasm-unsafe-eval', async () => {
    const emitidas = await directives(await import('../next.config'), 'script-src')
    expect(emitidas.length).toBeGreaterThan(0)
    for (const d of emitidas) expect(d).toContain("'wasm-unsafe-eval'")
  })

  it('o connect-src NÃO precisa do CDN: a prévia passa pela rota-proxy do painel', async () => {
    // Se alguém trocar a prévia para buscar o R2 direto, este teste cai junto — e
    // é para cair: seria preciso afrouxar o `connect-src` (hoje `'self'` + três
    // hosts nomeados, sem `https:`) e criar regra de CORS no bucket público.
    const emitidas = await directives(await import('../next.config'), 'connect-src')
    expect(emitidas.length).toBeGreaterThan(0)
    for (const d of emitidas) expect(d).toContain("'self'")
  })
})
