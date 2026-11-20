/**
 * O mesmo documento HTML a menos da ORDEM dos atributos de cada elemento. A ordem dos atributos
 * não muda o sentido do HTML; o bloco de elemento guarda a classe à parte e ela volta no fim.
 * Tudo o mais conta: doctype, cabeçalho, texto (inclusive espaços), comentários, nomes,
 * valores e o conjunto de atributos de cada elemento. Na dúvida (sem DOMParser), não iguala.
 */
export function htmlSourceCompatible(previous: string, generated: string): boolean {
  if (previous === generated) return true
  if (typeof DOMParser === 'undefined') return false
  const parser = new DOMParser()
  const a = parser.parseFromString(previous, 'text/html')
  const b = parser.parseFromString(generated, 'text/html')
  return doctypeOf(a) === doctypeOf(b) && sameNode(a.documentElement, b.documentElement)
}

function doctypeOf(document: Document): string {
  const doctype = document.doctype
  return doctype ? `${doctype.name}|${doctype.publicId}|${doctype.systemId}` : ''
}

function sameNode(a: Node, b: Node): boolean {
  if (a.nodeType !== b.nodeType || a.nodeName !== b.nodeName) return false
  if (a.nodeType !== 1) return a.nodeValue === b.nodeValue && sameChildren(a, b)
  const left = (a as Element).attributes,
    right = (b as Element).attributes
  if (left.length !== right.length) return false
  for (let index = 0; index < left.length; index++) {
    const attribute = left.item(index)
    if (!attribute) return false
    if (
      (b as Element).getAttributeNS(attribute.namespaceURI, attribute.localName) !== attribute.value
    )
      return false
  }
  // O conteúdo de <template> mora num fragmento à parte.
  if (a.nodeName === 'TEMPLATE')
    return sameChildren((a as HTMLTemplateElement).content, (b as HTMLTemplateElement).content)
  return sameChildren(a, b)
}

function sameChildren(a: Node, b: Node): boolean {
  const left = a.childNodes,
    right = b.childNodes
  if (left.length !== right.length) return false
  for (let index = 0; index < left.length; index++) {
    const x = left[index],
      y = right[index]
    if (!x || !y || !sameNode(x, y)) return false
  }
  return true
}
