import type { HTMLNode, SZIR } from './schema'

export function assignStableIdsToIR(ir: SZIR, prefix = 'ir'): SZIR {
  // JS: clona e atribui `__id` a TODOS os nós (statements e expressões) em
  // QUALQUER profundidade — inclusive corpos de função/classe/forEach/timers e
  // expressões compostas (vetores, hsl, lógicos…). O assignment antigo só
  // percorria event/if/repeat/animationLoop, então blocos internos de outros
  // blocos ficavam sem `__id` e não realçavam no source map cruzado (bloco↔código).
  // O id é baseado no caminho (chave + índice): determinístico e estável para a
  // mesma estrutura, e idêntico ao esquema antigo nos casos que ele já cobria.
  const js = structuredClone(ir.js)
  js.forEach((statement, index) => {
    assignNodeIds(statement, `${prefix}_js_${index}`)
  })
  return {
    html: ir.html.map((node, index) => assignHTMLId(node, `${prefix}_html_${index}`)),
    css: ir.css.map((entry, index) => ({ ...entry, __id: entry.__id ?? `${prefix}_css_${index}` })),
    js,
    extensions: [...ir.extensions],
    ...(ir.htmlShell ? { htmlShell: ir.htmlShell } : {}),
  }
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
