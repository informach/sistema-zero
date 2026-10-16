import { Unzip, UnzipInflate } from 'fflate'
import { SaxesParser, type SaxesTagNS } from 'saxes'
import { containsCredential } from './inventory-policy'

export const officeTextVersion = 'office-text-v1'
const WORD = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'
const SHEET = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'
const REL = 'http://schemas.openxmlformats.org/package/2006/relationships'
const DOCREL = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships'
const decoder = new TextDecoder('utf-8', { fatal: true })
type XmlNode = Pick<SaxesTagNS, 'uri' | 'local' | 'attributes'> & {
  children: Array<XmlNode | string>
}
const textContent = (node: XmlNode): string =>
  node.children.map((child) => (typeof child === 'string' ? child : textContent(child))).join('')
const attribute = (node: XmlNode, local: string, uri = '') =>
  Object.values(node.attributes).find((value) => value.local === local && value.uri === uri)
    ?.value ?? ''
function elements(node: XmlNode, uri: string, local: string): XmlNode[] {
  const result: XmlNode[] = []
  for (const child of node.children)
    if (typeof child !== 'string') {
      if (child.uri === uri && child.local === local) result.push(child)
      result.push(...elements(child, uri, local))
    }
  return result
}

/** Bounded, text-only extraction. No writes, external relationships, macros,
 * formula evaluation, HTML rendering or network access. Originals stay separate. */
export function extractOfficeText(bytes: Uint8Array, filename: string) {
  if (bytes.length > 196608) throw new Error('Extração Office limitada a originais de 192 KiB')
  const format = /\.docx$/i.test(filename) ? 'docx' : /\.xlsx$/i.test(filename) ? 'xlsx' : null
  if (!format) throw new Error('A extração aceita somente DOCX e XLSX')
  const wanted = (name: string) =>
    format === 'docx'
      ? /^word\/(document|footnotes|endnotes|header\d+|footer\d+)\.xml$/.test(name)
      : /^(xl\/(workbook|sharedStrings)\.xml|xl\/_rels\/workbook\.xml\.rels|xl\/worksheets\/sheet\d+\.xml)$/.test(
          name,
        )
  const files = new Map<string, Uint8Array>(),
    seen = new Set<string>()
  let total = 0
  const unzip = new Unzip((file) => {
    if (
      seen.has(file.name) ||
      seen.size >= 1000 ||
      file.name.includes('\\') ||
      file.name.startsWith('/') ||
      file.name.split('/').some((part) => part === '..')
    )
      throw new Error('Pacote Office contém caminhos inválidos ou repetidos')
    seen.add(file.name)
    if (!wanted(file.name)) return
    if (file.originalSize !== undefined && file.originalSize > 1024 * 1024)
      throw new Error('Parte Office excede o limite de texto descompactado')
    const chunks: Uint8Array[] = []
    let size = 0
    file.ondata = (error, chunk, final) => {
      if (error) throw error
      size += chunk.length
      total += chunk.length
      if (size > 1024 * 1024 || total > 4 * 1024 * 1024)
        throw new Error('Office excede o limite de texto descompactado')
      chunks.push(chunk)
      if (final) {
        if (file.originalSize !== undefined && size !== file.originalSize)
          throw new Error('Parte Office truncada')
        const value = new Uint8Array(size)
        let offset = 0
        for (const part of chunks) {
          value.set(part, offset)
          offset += part.length
        }
        files.set(file.name, value)
      }
    }
    file.start()
  })
  unzip.register(UnzipInflate)
  // A tiny compressed chunk also bounds allocations before the output callback.
  for (let offset = 0; offset < bytes.length; offset += 512)
    unzip.push(bytes.subarray(offset, offset + 512), offset + 512 >= bytes.length)
  function xml(name: string) {
    const content = files.get(name)
    if (!content) throw new Error(`Parte Office ausente: ${name}`)
    const value = decoder.decode(content)
    if (/<!\s*(DOCTYPE|ENTITY)/i.test(value))
      throw new Error('DTD e entidades externas não são aceitos')
    const document: XmlNode = { uri: '', local: '', attributes: {}, children: [] }
    const stack: XmlNode[] = [document]
    let count = 0
    const parser = new SaxesParser({ xmlns: true })
    parser.on('error', () => {
      throw new Error(`XML Office inválido: ${name}`)
    })
    parser.on('doctype', () => {
      throw new Error('DTD não permitido')
    })
    parser.on('opentag', (tag) => {
      if (++count > 100000 || stack.length > 100)
        throw new Error('XML Office excede os limites de estrutura')
      const node: XmlNode = {
        uri: tag.uri,
        local: tag.local,
        attributes: tag.attributes,
        children: [],
      }
      stack.at(-1)?.children.push(node)
      stack.push(node)
    })
    const append = (text: string) => {
      stack.at(-1)?.children.push(text)
    }
    parser.on('text', append)
    parser.on('cdata', append)
    parser.on('closetag', () => {
      stack.pop()
    })
    parser.write(value).close()
    return document
  }
  function wordText(node: XmlNode): string {
    if (node.uri === WORD) {
      if (node.local === 'del' || node.local === 'moveFrom') return ''
      if (node.local === 't') return textContent(node)
      if (node.local === 'tab') return '\t'
      if (['br', 'cr'].includes(node.local)) return '\n'
    }
    let text = ''
    for (const child of node.children) if (typeof child !== 'string') text += wordText(child)
    if (node.uri === WORD && node.local === 'p') text += '\n'
    if (node.uri === WORD && node.local === 'tc') text += '\t'
    return text
  }
  const sections: string[] = []
  if (format === 'docx') {
    sections.push(wordText(xml('word/document.xml')))
    for (const name of [...files.keys()].sort())
      if (name !== 'word/document.xml') sections.push(`[${name}]\n${wordText(xml(name))}`)
  } else {
    const shared = files.has('xl/sharedStrings.xml')
      ? elements(xml('xl/sharedStrings.xml'), SHEET, 'si').map((item) =>
          elements(item, SHEET, 't').map(textContent).join(''),
        )
      : []
    const relationships = new Map(
      elements(xml('xl/_rels/workbook.xml.rels'), REL, 'Relationship')
        .filter((item) => attribute(item, 'TargetMode') !== 'External')
        .map((item) => [attribute(item, 'Id'), attribute(item, 'Target')]),
    )
    for (const sheet of elements(xml('xl/workbook.xml'), SHEET, 'sheet')) {
      const target = relationships.get(attribute(sheet, 'id', DOCREL))
      if (!target || !/^(?:\/xl\/)?worksheets\/sheet\d+\.xml$/.test(target))
        throw new Error('Planilha tem referência ausente ou não suportada')
      const name = target.startsWith('/') ? target.slice(1) : `xl/${target}`
      const rows = [`Planilha: ${attribute(sheet, 'name')}`]
      for (const cell of elements(xml(name), SHEET, 'c')) {
        const type = attribute(cell, 't') || 'n'
        const valueNode = elements(cell, SHEET, 'v')[0]
        const raw = valueNode ? textContent(valueNode) : ''
        let value = raw
        if (type === 's') {
          if (!/^\d+$/.test(raw) || shared[Number(raw)] === undefined)
            throw new Error('Texto compartilhado ausente')
          value = shared[Number(raw)] ?? ''
        } else if (type === 'inlineStr')
          value = elements(cell, SHEET, 't').map(textContent).join('')
        const formulaNode = elements(cell, SHEET, 'f')[0]
        const formula = formulaNode ? textContent(formulaNode) : undefined
        rows.push(
          `${attribute(cell, 'r')} [${type}]: ${value}${formula === undefined ? '' : ` [fórmula não executada: ${formula}; valor em cache]`}`,
        )
      }
      sections.push(rows.join('\n'))
    }
  }
  const text = sections.join('\n\n').trim()
  if (!text || text.length > 500000)
    throw new Error('Office sem texto extraível ou acima de 500 mil caracteres')
  if (containsCredential(text))
    throw new Error('Possível credencial no texto extraído; carga recusada')
  return {
    parserVersion: officeTextVersion,
    format,
    text,
    notes:
      format === 'docx'
        ? [
            'Texto e tabelas; layout, imagens e comentários não reproduzidos. Trechos excluídos na revisão não entram no texto.',
          ]
        : [
            'Células com endereço e tipo original; números e datas não são reformatados. Fórmulas não são executadas; valores em cache podem estar desatualizados.',
          ],
  }
}
