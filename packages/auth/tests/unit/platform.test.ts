import { describe, expect, test } from 'bun:test'
import { ValidationError } from '@sistemazero/core/errors'
import { resolvePlatformUrl } from '../../src/application/platform'

const URLS = { main: 'https://comunidade.example.com', kids: 'https://kids.example.com' }

describe('resolvePlatformUrl — base do link por plataforma', () => {
  test('default (sem platform) → main', () => {
    expect(resolvePlatformUrl(URLS)).toBe(URLS.main)
    expect(resolvePlatformUrl(URLS, 'main')).toBe(URLS.main)
  })

  test('kids configurada → URL kids', () => {
    expect(resolvePlatformUrl(URLS, 'kids')).toBe(URLS.kids)
  })

  test('kids SEM env configurada → ValidationError (400 visível, nunca link errado)', () => {
    expect(() => resolvePlatformUrl({ main: URLS.main }, 'kids')).toThrow(ValidationError)
  })
})
