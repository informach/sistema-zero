export type CalendarEntry = {
  sourceId: string
  title: string
  week: number
  position: number
  sourceLink: string
  format: 'carousel' | 'reel' | 'feed' | 'story'
  medium: 'image' | 'video' | 'mixed'
}
/** Reads the authored week/position; never assigns dates or publication state. */
export function parseInstagramCalendar(text: string): CalendarEntry[] {
  const entries: CalendarEntry[] = []
  for (const line of text.split(/\r?\n/)) {
    if (!/^\|\s*\d+\s*\|/.test(line)) continue
    const columns = line.split(/(?<!\\)\|/).slice(1, -1),
      week = Number(columns.shift()?.trim())
    if (!Number.isInteger(week) || week < 1 || week > 104)
      throw new Error('Semana editorial fora do intervalo')
    for (const [index, column] of columns.entries()) {
      const match = column.match(/\[((?:P|ST)\d{2})\s*[·:]\s*([^\]]+)\]\(([^)]+)\)/)
      if (!match?.[1] || !match[2] || !match[3])
        throw new Error(`Pauta não reconhecida na semana ${week}, posição ${index + 1}`)
      const format = match[1].startsWith('ST')
        ? 'story'
        : /Carrossel/i.test(column)
          ? 'carousel'
          : /Reel/i.test(column)
            ? 'reel'
            : /Imagem única/i.test(column)
              ? 'feed'
              : null
      if (!format) throw new Error(`Formato não identificado em ${match[1]}`)
      entries.push({
        sourceId: match[1],
        title: match[2],
        week,
        position: index + 1,
        sourceLink: match[3],
        format,
        medium: format === 'reel' ? 'video' : format === 'story' ? 'mixed' : 'image',
      })
    }
  }
  if (!entries.length) throw new Error('Nenhuma pauta reconhecida no calendário')
  if (new Set(entries.map((entry) => entry.sourceId)).size !== entries.length)
    throw new Error('O calendário contém uma pauta repetida')
  return entries
}
export type CopySection = {
  sourceId: string
  title: string
  raw: string
  components: Array<{ title: string; body: string; type: 'slide' | 'caption' | 'scene' | 'copy' }>
}
export function parseInstagramCopy(text: string): CopySection[] {
  const headings = [...text.matchAll(/^##\s+((?:P|ST|E|F|MC)\d{2})\s*[·:]\s*(.+)$/gm)]
  return headings.map((heading, index) => {
    const sourceId = heading[1],
      title = heading[2]
    if (!sourceId || !title || heading.index === undefined)
      throw new Error('Identidade da copy ausente')
    const raw = text
      .slice(heading.index, headings[index + 1]?.index ?? text.length)
      .replace(/\n<a id="[^"]+"><\/a>\s*$/, '')
      .trim()
    const sections = [...raw.matchAll(/^###\s+(.+)$/gm)]
    const components: CopySection['components'] = []
    for (const [position, section] of sections.entries()) {
      const name = section[1]?.trim()
      if (!name || section.index === undefined) continue
      const content = raw.slice(
        section.index + section[0].length,
        sections[position + 1]?.index ?? raw.length,
      )
      const body = content
        .split(/\r?\n/)
        .filter((line) => /^>/.test(line))
        .map((line) => line.replace(/^> ?/, ''))
        .join('\n')
        .trim()
      if (!body) continue
      const type = /^Slide /i.test(name)
        ? 'slide'
        : /^Legenda/i.test(name)
          ? 'caption'
          : /^Cena /i.test(name)
            ? 'scene'
            : 'copy'
      components.push({ title: name, body, type })
    }
    return { sourceId, title: title.trim(), raw, components }
  })
}
