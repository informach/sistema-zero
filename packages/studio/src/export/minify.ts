/**
 * Minificadores para o export de produção. São libs PURE-JS carregadas sob
 * demanda (`await import(...)`) — nunca entram no bundle inicial do host e não
 * usam worker/wasm (compatível com Vite/Turbopack/webpack; ver regra #1 do
 * CLAUDE.md, que torna esbuild-wasm/lightningcss-wasm arriscados aqui).
 *
 * Falha de minificação NUNCA quebra o export: cai para o código original.
 */

export interface Minifiers {
  /** Minifica JS. `module: true` quando o trecho é um ES module (mangle no topo). */
  js(code: string, opts?: { module?: boolean }): Promise<string>
  css(code: string): Promise<string>
  /** Minify de HTML é síncrono e conservador (ver `minifyHtml`). */
  html(code: string): string
}

/** Passa-tudo: usado nos testes (builders testáveis sem rodar terser/csso). */
export const identityMinifiers: Minifiers = {
  js: async (code) => code,
  css: async (code) => code,
  html: (code) => code,
}

/** Carrega terser (JS) + csso (CSS) sob demanda e devolve os wrappers reais. */
export async function defaultMinifiers(): Promise<Minifiers> {
  const [terser, cssoMod] = await Promise.all([import('terser'), import('csso')])
  // csso é CJS: o namespace pode expor `minify` direto ou em `default`.
  const cssMinify =
    (cssoMod as { minify?: (css: string) => { css: string } }).minify ??
    (cssoMod as { default?: { minify: (css: string) => { css: string } } }).default?.minify

  return {
    async js(code, opts) {
      if (!code.trim()) return code
      try {
        const result = await terser.minify(code, {
          compress: true,
          mangle: true,
          // Em script clássico (module:false) o terser NÃO mexe nos nomes de
          // topo (toplevel:false), preservando funções globais usadas por
          // handlers `onclick="..."`. Em module pode manglar o topo com segurança.
          module: opts?.module ?? false,
        })
        return result.code ?? code
      } catch {
        return code
      }
    },
    async css(code) {
      if (!code.trim() || !cssMinify) return code
      try {
        return cssMinify(code).css || code
      } catch {
        return code
      }
    },
    html: minifyHtml,
  }
}

/**
 * Minify de HTML deliberadamente CONSERVADOR: só apara espaço em branco no fim
 * de cada linha e colapsa linhas em branco. NÃO colapsa espaço entre tags (seria
 * significativo entre elementos inline) nem remove comentários (poderiam ser
 * condicionais). O ganho real de tamanho vem do CSS/JS minificados à parte.
 */
export function minifyHtml(html: string): string {
  return html
    .replace(/[ \t]+$/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}
