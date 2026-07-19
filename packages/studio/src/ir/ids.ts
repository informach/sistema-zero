import { normalizeSZIR } from './behavior'
import type { CSSEntry, HTMLNode, SZIRInput, SZIRV2 } from './schema'

export function assignStableIdsToIR(input: SZIRInput, prefix = 'ir'): SZIRV2 {
  const ir = normalizeSZIR(input)
  // JS: clona e atribui `__id` a TODOS os nós (statements e expressões) em
  // QUALQUER profundidade — inclusive corpos de função/classe/forEach/timers e
  // expressões compostas (vetores, hsl, lógicos…). O assignment antigo só
  // percorria event/if/repeat/animationLoop, então blocos internos de outros
  // blocos ficavam sem `__id` e não realçavam no source map cruzado (bloco↔código).
  // O id é baseado no caminho (chave + índice): determinístico e estável para a
  // mesma estrutura, e idêntico ao esquema antigo nos casos que ele já cobria.
  const behavior = structuredClone(ir.behavior)
  for (const area of ['start', 'events', 'loops'] as const) {
    behavior[area].forEach((statement, index) => {
      assignNodeIds(statement, `${prefix}_${area}_${index}`)
    })
  }
  return {
    version: 2,
    html: ir.html.map((node, index) => assignHTMLId(node, `${prefix}_html_${index}`)),
    css: ir.css.map((entry, index) => assignCSSId(entry, `${prefix}_css_${index}`)),
    behavior,
    extensions: [...ir.extensions],
    ...(ir.htmlShell ? { htmlShell: ir.htmlShell } : {}),
  }
}

/**
 * Atribui `__id` a uma entrada de CSS e, no caso de `@media`, recorre nas regras
 * internas com um id de fallback determinístico (`${id}_rules_${i}`). Sem isso as
 * regras dentro de uma media query ficavam sem `__id` (o reverse parser de CSS
 * também não os emite), quebrando o realce bloco↔código do conteúdo responsivo.
 * NÃO passa por `assignNodeIds`: aquele só atribui `__id` a objetos com campo
 * `type`, e `CSSRule` não tem — seria pulada.
 */
function assignCSSId(entry: CSSEntry, id: string): CSSEntry {
  if ('type' in entry && entry.type === 'mediaQuery') {
    return {
      ...entry,
      __id: entry.__id ?? id,
      rules: entry.rules.map((rule, index) => assignCSSId(rule, `${id}_rules_${index}`)),
    }
  }
  return { ...entry, __id: entry.__id ?? id }
}

function assignHTMLId(node: HTMLNode, id: string): HTMLNode {
  if (node.type === 'element') {
    return {
      ...node,
      __id: node.__id ?? id,
      children: node.children?.map((child, index) => assignHTMLId(child, `${id}_child_${index}`)),
    }
  }
  return { ...node, __id: node.__id ?? id }
}

/**
 * Percorre um nó de IR de JS (statement ou expressão) e atribui `__id` a ele e a
 * todos os descendentes que forem nós (objetos com `type`), em qualquer nível.
 * Genérico: cobre todas as variantes atuais e futuras sem enumerar cada uma.
 * Muta o nó recebido — por isso `assignStableIdsToIR` clona antes. Preserva
 * `__id` já existente.
 */
function assignNodeIds(node: unknown, id: string): void {
  if (node === null || typeof node !== 'object') return
  const obj = node as Record<string, unknown>
  if (typeof obj.type === 'string' && obj.__id === undefined) obj.__id = id
  for (const key of Object.keys(obj)) {
    if (key === '__id' || key === 'type') continue
    const value = obj[key]
    if (Array.isArray(value)) {
      value.forEach((item, index) => {
        assignNodeIds(item, `${id}_${key}_${index}`)
      })
    } else if (value !== null && typeof value === 'object') {
      assignNodeIds(value, `${id}_${key}`)
    }
  }
}
