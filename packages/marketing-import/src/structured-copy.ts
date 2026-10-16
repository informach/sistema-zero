import type { EditorialDocument } from '@sistemazero/marketing-contracts'

type Representation = Extract<EditorialDocument, { kind: 'representation' }>
export type SourceComponent = {
  key: string
  title: string
  type: 'copy' | 'slide' | 'scene' | 'caption'
  body: string
  productionNotes: string
  channel: 'main' | 'direct'
}
export type SourcePiece = {
  key: string
  title: string
  raw: string
  format: Representation['format']
  medium: Representation['medium']
  components: SourceComponent[]
}
export const structuredCopyVersion = 'editorial-markdown-v3'
type Heading = { level: number; title: string; start: number; end: number }

/** Fenced examples stay in production notes and never become literal copy or headings. */
function sourceLines(text: string) {
  const result: Array<{ line: string; start: number; end: number; code: boolean }> = []
  let offset = 0,
    fence: { marker: string; length: number } | null = null
  for (const line of text.split(/(?<=\n)/)) {
    const marker = line.match(/^\s{0,3}(`{3,}|~{3,})/)
    const code = !!fence || !!marker
    if (marker?.[1]) {
      if (!fence) fence = { marker: marker[1][0] ?? '', length: marker[1].length }
      else if (marker[1][0] === fence.marker && marker[1].length >= fence.length) fence = null
    }
    result.push({ line, start: offset, end: offset + line.length, code })
    offset += line.length
  }
  return result
}
function headings(text: string): Heading[] {
  const result: Heading[] = []
  for (const line of sourceLines(text)) {
    if (line.code) continue
    const match = line.line.match(/^(#{1,6})\s+(.+?)\s*\r?\n?$/)
    if (match?.[1] && match[2])
      result.push({ level: match[1].length, title: match[2], start: line.start, end: line.end })
  }
  return result
}
function quoted(text: string) {
  return sourceLines(text)
    .filter((value) => !value.code && /^>/.test(value.line))
    .map((value) => value.line.replace(/^> ?/, '').replace(/\r?\n$/, ''))
    .join('\n')
    .trim()
}
function notes(text: string) {
  return sourceLines(text)
    .filter((value) => value.code || !/^>/.test(value.line))
    .map((value) => value.line)
    .join('')
    .trim()
}
function key(text: string) {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}
function cells(line: string) {
  return line
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split(/(?<!\\)\|/)
    .map((value) => value.trim().replace(/\\\|/g, '|'))
}
function scenes(text: string): SourceComponent[] {
  const lines = sourceLines(text).map((value) => (value.code ? '' : value.line.trimEnd())),
    result: SourceComponent[] = []
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (
      !line?.startsWith('|') ||
      cells(line).join('|').toLowerCase() !== 'tempo|texto na tela|fala|cena'
    )
      continue
    const separator = lines[++i]
    if (
      !separator ||
      cells(separator).length !== 4 ||
      cells(separator).some((cell) => !/^:?-{3,}:?$/.test(cell))
    )
      throw new Error('Tabela de roteiro sem separador válido')
    while (lines[i + 1]?.trim().startsWith('|')) {
      const row = lines[++i]
      if (!row) break
      const values = cells(row)
      if (values.length !== 4) throw new Error('Tabela de roteiro com colunas incompletas')
      const [time = '', overlay = '', speech = '', scene = ''] = values
      result.push({
        key: `scene:${result.length + 1}`,
        title: `Cena ${result.length + 1} · ${time}`,
        type: 'scene',
        body: speech,
        channel: 'main',
        productionNotes: `Tempo de referência: ${time}\nTexto na tela: ${overlay}\nFala: ${speech}\nCena: ${scene}`,
      })
    }
  }
  return result
}
function components(raw: string): SourceComponent[] {
  const sections = headings(raw).filter((heading) => heading.level === 3)
  const result = scenes(raw.slice(0, sections[0]?.start ?? raw.length))
  for (const [index, section] of sections.entries()) {
    const content = raw.slice(section.end, sections[index + 1]?.start ?? raw.length)
    if (/^Direct\b/i.test(section.title)) {
      const messages = [...content.matchAll(/^\*\*(DM\d+)[^\r\n]*\*\*\s*$/gm)]
      if (!messages.length && quoted(content)) throw new Error('Direct sem mensagens identificadas')
      for (const [position, message] of messages.entries()) {
        if (!message[1] || message.index === undefined) throw new Error('Mensagem sem identidade')
        const part = content.slice(
          message.index + message[0].length,
          messages[position + 1]?.index ?? content.length,
        )
        result.push({
          key: message[1].toLowerCase(),
          title: message[1],
          type: 'copy',
          body: quoted(part),
          productionNotes: notes(part),
          channel: 'direct',
        })
      }
      continue
    }
    const body = quoted(content)
    if (!body) continue
    const number = section.title.match(/^(Slide|Tela|Cena)\s+(\d+)\b/i)
    result.push({
      key: number ? `${number[1]?.toLowerCase()}:${number[2]}` : key(section.title),
      title: section.title,
      type: /^Slide\b/i.test(section.title)
        ? 'slide'
        : /^Cena\b/i.test(section.title)
          ? 'scene'
          : /^Legenda\b/i.test(section.title)
            ? 'caption'
            : 'copy',
      body,
      productionNotes: notes(content),
      channel: 'main',
    })
  }
  if (
    new Set(result.map((component) => `${component.channel}:${component.key}`)).size !==
    result.length
  )
    throw new Error('Componente repetido na mesma peça')
  return result
}
function format(raw: string, sourceId: string): Pick<SourcePiece, 'format' | 'medium'> | null {
  if (sourceId.startsWith('ST')) return { format: 'story', medium: 'mixed' }
  const value = raw.match(/\*\*Formato:\*\*\s*([^\r\n]*?)(?:\.\s|\s*·|$)/im)?.[1]
  if (/^carross[eé]l\b/i.test(value ?? '')) return { format: 'carousel', medium: 'image' }
  if (/^reels?\b/i.test(value ?? '')) return { format: 'reel', medium: 'video' }
  if (/^imagem\s+[uú]nica\b/i.test(value ?? '')) return { format: 'feed', medium: 'image' }
  return null
}

/** Pure extraction: original instructions and literal copy remain separate; no status/date inference. */
export function parseStructuredCopy(text: string) {
  if (new TextEncoder().encode(text).length > 196608)
    throw new Error('Fonte textual acima de 192 KiB')
  const all = headings(text),
    sections = all.filter((heading) => heading.level === 2)
  const seen = new Set<string>()
  const pieces: SourcePiece[] = [],
    issues: Array<{ key: string; message: string }> = []
  for (const [index, section] of sections.entries()) {
    const end = sections[index + 1]?.start ?? text.length
    const raw = text
      .slice(section.start, end)
      .replace(/\n<a id="[^"]+"><\/a>\s*$/, '')
      .trim()
    const identity = section.title.match(/^((?:P|ST|E|F|MC)\d{2})\s*[·:]\s*(.+)$/)
    if (identity?.[1] && identity[2]) {
      if (seen.has(identity[1])) throw new Error('Identidade editorial repetida na fonte')
      seen.add(identity[1])
      const identified = format(raw, identity[1])
      if (!identified) {
        issues.push({
          key: identity[1],
          message: 'Formato não reconhecido; origem preservada para conferência.',
        })
        continue
      }
      const extracted = components(raw)
      if (!extracted.length) {
        issues.push({ key: identity[1], message: 'Nenhum componente literal reconhecido.' })
        continue
      }
      pieces.push({
        key: identity[1],
        title: identity[2],
        raw,
        ...identified,
        components: extracted,
      })
      continue
    }
    const screens = all.filter(
      (heading) => heading.level === 3 && heading.start > section.start && heading.start < end,
    )
    const identified = screens.filter((heading) =>
      /^(CF|PJ|AL|DU|AV|SN)\d{2}\s*[·:]/.test(heading.title),
    )
    if (!identified.length) continue
    const extracted: SourceComponent[] = identified.map((heading) => {
      const identity = heading.title.match(/^([A-Z]{2}\d{2})\s*[·:]\s*(.+)$/)
      if (!identity?.[1]) throw new Error('Tela de destaque sem identidade')
      const next = screens.find((candidate) => candidate.start > heading.start)
      const content = text.slice(heading.end, next?.start ?? end)
      return {
        key: identity[1],
        title: heading.title,
        type: 'copy',
        channel: 'main',
        body: quoted(content),
        productionNotes: notes(content),
      }
    })
    if (extracted.some((component) => !component.body))
      issues.push({
        key: `highlight:${key(section.title)}`,
        message: 'Tela de destaque sem texto literal; conferir material de origem.',
      })
    pieces.push({
      key: `highlight:${key(section.title)}`,
      title: `Destaque · ${section.title}`,
      raw,
      format: 'story',
      medium: 'mixed',
      components: extracted,
    })
  }
  if (new Set(pieces.map((piece) => piece.key)).size !== pieces.length)
    throw new Error('Identidade editorial repetida na fonte')
  return { parserVersion: structuredCopyVersion, pieces, issues }
}
