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

  /**
   * ⚠️ Asserção de CONJUNTO EXATO, de propósito. A versão óbvia
   * (`expect(d).toContain("'self'")`) não guarda nada: acrescentar o host do CDN
   * passaria, que é justamente o afrouxamento que se quer barrar. Aqui qualquer
   * fonte nova reprova e força uma decisão consciente — com o custo, aceito, de
   * atualizar esta lista quando o afrouxamento for mesmo desejado.
   *
   * O painel NÃO precisa do CDN aqui: a prévia do `.riv` lê os bytes pela rota
   * `/api/media/module-rive/preview`, coberta por `'self'`. Buscar o R2 direto
   * exigiria esta lista maior E uma regra de CORS no bucket público.
   */
  it('o connect-src continua estreito — nenhuma fonte além das declaradas', async () => {
    const ESPERADAS = [
      "'self'",
      'https://*.vimeo.com',
      'https://*.cloud.vimeo.com',
      'https://*.r2.cloudflarestorage.com',
      'https://cloudflareinsights.com',
    ]
    const emitidas = await directives(await import('../next.config'), 'connect-src')
    expect(emitidas.length).toBeGreaterThan(0)
    for (const d of emitidas) {
      const fontes = d.split(/\s+/).slice(1)
      expect(fontes).toEqual(ESPERADAS)
    }
  })
})
