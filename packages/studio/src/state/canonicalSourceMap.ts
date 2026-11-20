import { buildCssSourceMapFromText, generateProjectFilesWithMap, type SourceMap } from '#generators'
import { normalizeSZIR, type SZIRInput } from '#ir'

/**
 * Memo do source-map CANÔNICO (HTML/JS) por referência de `ir`. Na Ponte, uma
 * edição de bloco gera o projeto em DOIS pontos com o MESMO `ir`: o
 * `regenerateFromBlocks` (BlocklyPanel — precisa dos `files`) e o efeito canônico
 * do `BridgeMode` (precisa do mapa). Sem coordenação, o gerador inteiro
 * (HTML+CSS+JS) rodava duas vezes por edição. Aqui o primeiro a gerar SEMEIA o
 * cache na chave do PRÓPRIO objeto `ir`; o segundo REUSA.
 *
 * `WeakMap` na referência do `ir`: o `applyProjectState` instala um novo objeto
 * `ir` a cada mudança, então a chave é estável enquanto o IR não muda e é
 * coletada junto com ele. O `jsHeader`/`projectName` entram na validação porque
 * afetam as linhas do mapa — uma divergência apenas força o recálculo (degrada
 * para o comportamento antigo, nunca devolve um mapa errado).
 */
interface CanonicalEntry {
  projectName: string
  jsHeader: string | undefined
  map: SourceMap
  css?: string
}

const cache = new WeakMap<SZIRInput, CanonicalEntry>()
const displayedCache = new WeakMap<
  SZIRInput,
  { canonical: SourceMap; css: string; map: SourceMap }
>()

/** Keep diagnostics aligned with retained CSS without poisoning the canonical cache. */
export function getDisplayedSourceMap(
  ir: SZIRInput,
  projectName: string,
  jsHeader: string | undefined,
  css: string,
): SourceMap {
  const canonical = getCanonicalSourceMap(ir, projectName, jsHeader)
  if (cache.get(ir)?.css === css) return canonical
  const hit = displayedCache.get(ir)
  if (hit?.canonical === canonical && hit.css === css) return hit.map
  const map = Object.fromEntries(
    Object.entries(canonical).filter(([, entry]) => entry.file !== 'style.css'),
  )
  Object.assign(map, buildCssSourceMapFromText(css, normalizeSZIR(ir).css, 'style.css'))
  displayedCache.set(ir, { canonical, css, map })
  return map
}

/** Devolve o mapa canônico do `ir`, gerando-o (e cacheando) só no 1º acesso. */
export function getCanonicalSourceMap(
  ir: SZIRInput,
  projectName: string,
  jsHeader: string | undefined,
): SourceMap {
  const hit = cache.get(ir)
  if (hit && hit.projectName === projectName && hit.jsHeader === jsHeader) return hit.map
  const { sourceMap, files } = generateProjectFilesWithMap({ ir, projectName, jsHeader })
  cache.set(ir, { projectName, jsHeader, map: sourceMap, css: files['style.css'] })
  return sourceMap
}

/** Semeia o cache com um mapa já gerado (quando o chamador gerou por outro motivo). */
export function primeCanonicalSourceMap(
  ir: SZIRInput,
  projectName: string,
  jsHeader: string | undefined,
  map: SourceMap,
  css?: string,
): void {
  cache.set(ir, { projectName, jsHeader, map, css })
}
