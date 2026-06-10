import { describe, expect, test } from 'bun:test'
import {
  BRIGHTNESS_DEFAULT,
  BRIGHTNESS_MAX,
  BRIGHTNESS_MIN,
  parseBrightness,
} from '../src/components/community/ebook/ebook-prefs'

describe('parseBrightness', () => {
  test('ausente (null) cai no padrão — brilho total', () => {
    expect(parseBrightness(null)).toBe(BRIGHTNESS_DEFAULT)
  })

  test('lixo/não-finito cai no padrão', () => {
    expect(parseBrightness('')).toBe(BRIGHTNESS_DEFAULT)
    expect(parseBrightness('abc')).toBe(BRIGHTNESS_DEFAULT)
    expect(parseBrightness('NaN')).toBe(BRIGHTNESS_DEFAULT)
    expect(parseBrightness('Infinity')).toBe(BRIGHTNESS_DEFAULT)
    expect(parseBrightness('-Infinity')).toBe(BRIGHTNESS_DEFAULT)
  })

  test('clampa abaixo do mínimo', () => {
    expect(parseBrightness('0.1')).toBe(BRIGHTNESS_MIN)
    expect(parseBrightness('-2')).toBe(BRIGHTNESS_MIN)
    expect(parseBrightness('0')).toBe(BRIGHTNESS_MIN)
  })

  test('clampa acima do máximo', () => {
    expect(parseBrightness('1.5')).toBe(BRIGHTNESS_MAX)
    expect(parseBrightness('100')).toBe(BRIGHTNESS_MAX)
  })

  test('valor válido dentro do range passa intacto', () => {
    expect(parseBrightness('0.75')).toBe(0.75)
    expect(parseBrightness('0.5')).toBe(0.5)
    expect(parseBrightness('1')).toBe(1)
  })
})
