import { describe, expect, it } from 'bun:test'

/**
 * A CSP precisa liberar `data:` em `media-src`, senão o SOM do Estúdio não toca.
 *
 * ⚠️ `bun test` roda em happy-dom, que **não enforça CSP** — nenhum teste de
 * comportamento pega esta classe de defeito. O que dá para travar é o cabeçalho
 * que o Next EMITE: este arquivo chama o `headers()` real do `next.config.ts` e
 * confere todas as diretivas `media-src` produzidas (há mais de uma: a normal e
 * a da rota Pro).
 *
 * O defeito real (08/2026): faltava `data:`. O áudio que a criança envia é
 * embutido como `data:audio/…`, então:
 *
 *   1. o `<audio>` da PRÉVIA no painel "Imagens e sons" (que roda na página do
 *      Next) era recusado — com `preload="none"`, o clique no play simplesmente
 *      não fazia nada, sem erro visível na UI;
 *   2. o som DENTRO do jogo também, porque o iframe do preview é `srcdoc` e
 *      **herda a CSP do pai** (só pode RESTRINGIR, nunca relaxar) — a CSP interna
 *      do Studio libera `data:`, mas o navegador aplica a interseção.
 *
 * Foi exatamente o "carreguei o som e não toca nada, nem no play da prévia". O
 * mesmo mecanismo de herança já estava documentado no arquivo, para o
 * `script-src`; ninguém o aplicou ao som quando ele entrou.
 */

interface ConfigComHeaders {
  headers?: () => Promise<unknown>
}

async function mediaSrcDirectives(mod: { default: unknown }): Promise<string[]> {
  const cfg = mod.default as ConfigComHeaders
  const headers = await cfg.headers?.()
  // O `headers()` devolve uma árvore de {source, headers:[{key,value}]}; a busca
  // por texto evita depender do formato exato do Next.
  return [...JSON.stringify(headers).matchAll(/media-src[^;\\"]*/g)].map((m) => m[0])
}

describe('CSP: o som embutido do Estúdio precisa poder tocar', () => {
  it('kids: TODA diretiva media-src emitida libera data:', async () => {
    const diretivas = await mediaSrcDirectives(await import('../next.config'))
    // Mais de uma: a CSP normal e a da rota Pro (que afrouxa script-src/frame-src).
    expect(diretivas.length).toBeGreaterThan(0)
    for (const d of diretivas) expect(d).toContain('data:')
  })

  it('community adulta: idem (o Estúdio vai para lá)', async () => {
    const diretivas = await mediaSrcDirectives(await import('../../community/next.config'))
    expect(diretivas.length).toBeGreaterThan(0)
    for (const d of diretivas) expect(d).toContain('data:')
  })
})
