import { expect, test } from 'bun:test'
import { randomUUID } from 'node:crypto'
import { configureMonitoringSchema, monitoringConfigSchema } from '@sistemazero/marketing-contracts'
import { budgetDay, nextBudgetDay } from '../src/domain/intelligence/schedule'
import { parseFeed } from '../src/infrastructure/gateways/feeds/parse-feed'
import {
  pinPublicAddresses,
  publicAddress,
  publicFeedUrl,
} from '../src/infrastructure/gateways/feeds/public-feed-source'

test('lookup preserva endereços validados e suporta callback de lista usado pelo Bun', () => {
  const addresses = [
    { address: '1.1.1.1', family: 4 },
    { address: '2606:4700:4700::1111', family: 6 },
  ]
  const lookup = pinPublicAddresses(addresses)
  addresses[0]!.address = '127.0.0.1'
  lookup('example.com', { all: true }, (error, value) => {
    expect(error).toBeNull()
    expect(value).toEqual([
      { address: '1.1.1.1', family: 4 },
      { address: '2606:4700:4700::1111', family: 6 },
    ])
  })
  lookup('example.com', { family: 4 }, (error, value, family) => {
    expect(error).toBeNull()
    expect(value).toBe('1.1.1.1')
    expect(family).toBe(4)
  })
  expect(() =>
    pinPublicAddresses([
      { address: '1.1.1.1', family: 4 },
      { address: '192.168.1.1', family: 4 },
    ]),
  ).toThrow()
})
test('URL inválida produz erro de validação sem lançar fora do schema', () => {
  expect(
    monitoringConfigSchema.safeParse({
      mode: 'feed',
      feedUrl: 'bad',
      intervalHours: 1,
      timeZone: 'America/Sao_Paulo',
      dailyCallBudget: 1,
      enabled: true,
    }).success,
  ).toBe(false)
})

test('feeds não consultam loopback, redes privadas, link-local, multicast ou metadata', () => {
  for (const ip of [
    '127.0.0.1',
    '10.0.0.1',
    '192.168.0.1',
    '172.16.0.1',
    '169.254.169.254',
    '100.64.0.1',
    '0.0.0.0',
    '::1',
    '::ffff:127.0.0.1',
    'fc00::1',
    'fe80::1',
    'ff02::1',
    '2001:db8::1',
  ])
    expect(publicAddress(ip)).toBe(false)
  for (const ip of ['1.1.1.1', '8.8.8.8', '2606:4700:4700::1111'])
    expect(publicAddress(ip)).toBe(true)
  for (const url of [
    'http://example.com/rss',
    'https://a:b@example.com/rss',
    'https://example.com:8443/rss',
    'https://example.com/rss#foo',
    'https://2130706433/rss',
    'https://[::ffff:127.0.0.1]/rss',
  ])
    expect(() => publicFeedUrl(url)).toThrow()
})
test('RSS e Atom preservam identidade, data e texto sem executar conteúdo', () => {
  const rss = parseFeed(
    '<rss version="2.0"><channel><item><guid>one</guid><title>Título</title><link>https://example.com/one</link><description><![CDATA[<p>Uma atividade</p>]]></description><pubDate>Thu, 15 Oct 2026 12:00:00 GMT</pubDate></item></channel></rss>',
    'https://example.com/rss',
  )
  expect(rss.entries[0]).toEqual({
    key: 'one',
    title: 'Título',
    text: 'Uma atividade',
    url: 'https://example.com/one',
    publishedAt: '2026-10-15T12:00:00.000Z',
  })
  const atom = parseFeed(
    '<feed xmlns="http://www.w3.org/2005/Atom"><entry><id>urn:one</id><title>Tema</title><link rel="alternate" href="/one"/><updated>2026-10-15T12:00:00Z</updated><summary>Uma referência</summary></entry></feed>',
    'https://example.com/rss',
  )
  expect(atom.entries[0]?.url).toBe('https://example.com/one')
  expect(atom.entries[0]?.key).toBe('urn:one')
})
test('entidades externas, estrutura profunda e páginas fora do formato são recusadas; corte fica explícito', () => {
  expect(() =>
    parseFeed(
      '<!DOCTYPE rss [<!ENTITY x SYSTEM "file:///etc/passwd">]><rss/>',
      'https://example.com',
    ),
  ).toThrow()
  expect(() => parseFeed('<html><body>Sem feed</body></html>', 'https://example.com')).toThrow()
  expect(() =>
    parseFeed(`<rss>${'<x>'.repeat(100)}${'</x>'.repeat(100)}</rss>`, 'https://example.com'),
  ).toThrow()
  const feed = parseFeed(
    '<rss><channel>' +
      Array.from(
        { length: 30 },
        (_, i) => `<item><guid>${i}</guid><title>Item</title></item>`,
      ).join('') +
      '</channel></rss>',
    'https://example.com',
  )
  expect(feed.entries).toHaveLength(25)
  expect(feed.truncated).toBe(true)
  expect(feed.observedEntries).toBe(30)
})
test('orçamento usa o dia local inclusive em mudança de horário de verão', () => {
  const now = new Date('2026-11-01T04:30:00Z'),
    next = nextBudgetDay(now, 'America/New_York')
  expect(next.getTime() - now.getTime()).toBeGreaterThan(24 * 3_600_000)
  expect(budgetDay(next, 'America/New_York')).not.toBe(budgetDay(now, 'America/New_York'))
  expect(
    configureMonitoringSchema.safeParse({
      schemaVersion: 1,
      operationId: randomUUID(),
      expectedRevisionId: randomUUID(),
      expectedVersion: 0,
      config: {
        mode: 'feed',
        feedUrl: 'https://example.com/rss',
        intervalHours: 1,
        timeZone: 'Nao/Existe',
        dailyCallBudget: 1,
        enabled: true,
      },
    }).success,
  ).toBe(false)
})
