import { XMLParser, XMLValidator } from 'fast-xml-parser'
import { type FeedEntry, FeedError } from '../../../domain/intelligence/feed'

const list = (value: unknown): unknown[] =>
  value === undefined ? [] : Array.isArray(value) ? value : [value]
const object = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
function string(value: unknown): string {
  if (typeof value === 'string') return value
  const text = object(value)['#text']
  return typeof text === 'string' ? text : ''
}
function link(value: string, base: string) {
  try {
    const url = new URL(value, base)
    return value && ['https:', 'http:'].includes(url.protocol) && !url.username && !url.password
      ? url.href
      : null
  } catch {
    return null
  }
}
export function parseFeed(xml: string, url: string) {
  if (Buffer.byteLength(xml) > 1_048_576 || /<!DOCTYPE|<!ENTITY/i.test(xml))
    throw new FeedError('O feed excede o limite ou declara entidades não aceitas', false)
  if (XMLValidator.validate(xml, { allowBooleanAttributes: false }) !== true)
    throw new FeedError('O endereço não retornou XML válido', false)
  let parsed: Record<string, unknown>
  try {
    parsed = object(
      new XMLParser({
        ignoreAttributes: false,
        removeNSPrefix: true,
        parseTagValue: false,
        parseAttributeValue: false,
        processEntities: true,
        maxNestedTags: 64,
        ignoreDeclaration: true,
      }).parse(xml),
    )
  } catch {
    throw new FeedError('O feed não pôde ser lido dentro dos limites de estrutura', false)
  }
  const atom = parsed.feed !== undefined
  if (!atom && !parsed.rss) throw new FeedError('Use um feed RSS 2.0 ou Atom', false)
  const records = list(atom ? object(parsed.feed).entry : object(object(parsed.rss).channel).item)
  const entries: FeedEntry[] = []
  for (const raw of records.slice(0, 200)) {
    const row = object(raw)
    const rawUrl = atom
      ? string(
          object(
            list(row.link).find(
              (value) => !object(value)['@_rel'] || object(value)['@_rel'] === 'alternate',
            ),
          )['@_href'],
        )
      : string(row.link)
    const entryUrl = link(rawUrl, url)
    const key = (string(atom ? row.id : row.guid) || entryUrl || '').trim()
    if (!key || key.length > 4000) continue
    const title = string(row.title).trim().slice(0, 300) || 'Atualização da fonte'
    const date = string(atom ? (row.published ?? row.updated) : row.pubDate)
    entries.push({
      key,
      title,
      url: entryUrl,
      publishedAt: date && Number.isFinite(Date.parse(date)) ? new Date(date).toISOString() : null,
      // Rendered as plain text only; never inserted as HTML or executed by the collector.
      text: string(row.description ?? row.summary ?? row.content ?? row.encoded)
        .replace(/<[^>]*>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 10000),
    })
    if (entries.length === 25) break
  }
  return { entries, observedEntries: records.length, truncated: records.length > entries.length }
}
