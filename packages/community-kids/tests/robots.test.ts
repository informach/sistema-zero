import { describe, expect, test } from 'bun:test'
import robots from '../src/app/robots'

describe('robots.txt (kids)', () => {
  test('permite rotas publicas com noindex e bloqueia o resto', () => {
    expect(robots().rules).toEqual({
      userAgent: '*',
      allow: ['/jogar/', '/validar/'],
      disallow: '/',
    })
  })
})
