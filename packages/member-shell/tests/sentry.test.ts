import { describe, expect, test } from 'bun:test'
import { buildEnvelope, parseDsn } from '../src/server/sentry'

describe('parseDsn', () => {
  test('decompõe um DSN padrão na URL de ingestão de envelopes', () => {
    const parsed = parseDsn('https://abc123@o55.ingest.us.sentry.io/4509')
    expect(parsed).not.toBeNull()
    expect(parsed?.publicKey).toBe('abc123')
    expect(parsed?.ingestUrl).toBe(
      'https://o55.ingest.us.sentry.io/api/4509/envelope/?sentry_key=abc123&sentry_version=7',
    )
  })

  test('suporta path-prefix de self-hosted', () => {
    const parsed = parseDsn('https://key@sentry.example.com/base/path/9')
    expect(parsed?.ingestUrl).toBe(
      'https://sentry.example.com/base/path/api/9/envelope/?sentry_key=key&sentry_version=7',
    )
  })

  test('ausente/malformado → null (no-op)', () => {
    expect(parseDsn(undefined)).toBeNull()
    expect(parseDsn('')).toBeNull()
    expect(parseDsn('não-é-url')).toBeNull()
    // sem publicKey ou sem projectId
    expect(parseDsn('https://o55.ingest.sentry.io/4509')).toBeNull()
    expect(parseDsn('https://key@o55.ingest.sentry.io/')).toBeNull()
  })
})

describe('buildEnvelope', () => {
  test('monta NDJSON com header, item-header e evento de exceção', () => {
    const out = buildEnvelope({
      eventId: 'deadbeefdeadbeefdeadbeefdeadbeef',
      sentAt: '2026-06-06T00:00:00.000Z',
      errorType: 'TypeError',
      errorValue: 'x is not a function',
      stack: 'TypeError: x is not a function\n  at foo',
      context: { area: 'media' },
    })
    const lines = out.trimEnd().split('\n')
    expect(lines).toHaveLength(3)
    const header = JSON.parse(lines[0] as string)
    expect(header.event_id).toBe('deadbeefdeadbeefdeadbeefdeadbeef')
    expect(JSON.parse(lines[1] as string)).toEqual({ type: 'event' })
    const event = JSON.parse(lines[2] as string)
    expect(event.level).toBe('error')
    expect(event.exception.values[0]).toEqual({ type: 'TypeError', value: 'x is not a function' })
    expect(event.extra.area).toBe('media')
    expect(event.extra.stack).toContain('at foo')
  })
})
