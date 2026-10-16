import { parseInstagramCalendar } from './editorial-markdown'

export const structuredCalendarVersion = 'editorial-calendar-v1'

/** Resolve a document reference as an identity, never as a filesystem or network request. */
export function calendarSourceKey(origin: string, sourcePath: string, link: string, key: string) {
  const match = /^([^#?]+)#([^#?]+)$/.exec(link)
  if (!match?.[1] || !match[2] || match[2].toUpperCase() !== key)
    throw new Error(`Referência do calendário não corresponde a ${key}`)
  const relative = decodeURIComponent(match[1])
  if (
    /^[\\/]|[:\\]/.test(relative) ||
    [...relative].some((character) => character.charCodeAt(0) < 32)
  )
    throw new Error(`Referência externa ou inválida em ${key}`)
  const parts = sourcePath.split('/').slice(0, -1)
  for (const part of relative.split('/')) {
    if (part === '..') {
      if (!parts.length) throw new Error(`Referência fora da origem em ${key}`)
      parts.pop()
    } else if (part && part !== '.') parts.push(part)
  }
  return `${origin}:${parts.join('/')}#${key}`
}

export function parseStructuredCalendar(text: string, origin: string, sourcePath: string) {
  if (new TextEncoder().encode(text).length > 192 * 1024)
    throw new Error('Calendário excede o limite de texto')
  const rows: string[] = []
  let fence: string | null = null
  for (const line of text.split(/\r?\n/)) {
    const marker = /^\s{0,3}(`{3,}|~{3,})/.exec(line)?.[1]
    if (marker) {
      if (!fence) fence = marker
      else if (marker[0] === fence[0] && marker.length >= fence.length) fence = null
      continue
    }
    if (!fence && /^\|\s*\d+\s*\|/.test(line) && /\[(?:P|ST)\d{2}\s*[·:]/.test(line))
      rows.push(line)
  }
  if (!rows.length) return []
  const entries = parseInstagramCalendar(rows.join('\n'))
  if (entries.length > 100) throw new Error('Calendário excede 100 pautas por documento')
  const slots = new Set<string>()
  return entries.map((entry) => {
    const slot = `${entry.week}:${entry.position}`
    if (slots.has(slot)) throw new Error(`Posição repetida na semana ${entry.week}`)
    slots.add(slot)
    return {
      ...entry,
      sourceKey: calendarSourceKey(origin, sourcePath, entry.sourceLink, entry.sourceId),
    }
  })
}
