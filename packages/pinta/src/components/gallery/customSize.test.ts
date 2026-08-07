import { describe, expect, test } from 'bun:test'
import {
  buildCustomSizeKey,
  customSizeSpecFor,
  EMPTY_CUSTOM_VALUES,
  parseCustomInt,
  seedCustomValues,
} from './customSize'

describe('customSizeSpecFor', () => {
  test('cenários têm largura+altura; personagem um campo; mapa colunas+linhas', () => {
    expect(customSizeSpecFor('pixel-background')).toEqual({
      fields: ['width', 'height'],
      min: 16,
      max: 512,
    })
    expect(customSizeSpecFor('vector-background')).toEqual({
      fields: ['width', 'height'],
      min: 16,
      max: 2048,
    })
    expect(customSizeSpecFor('pixel-sprite')).toEqual({ fields: ['frame'], min: 8, max: 128 })
    expect(customSizeSpecFor('vector-sprite')).toEqual({ fields: ['frame'], min: 8, max: 128 })
    expect(customSizeSpecFor('tilemap')).toEqual({ fields: ['cols', 'rows'], min: 1, max: 128 })
  })

  test('peças ficam FORA (whitelist dura do motor)', () => {
    expect(customSizeSpecFor('tileset')).toBeNull()
    expect(customSizeSpecFor('vector-tileset')).toBeNull()
  })
})

describe('parseCustomInt', () => {
  test('fronteiras da faixa', () => {
    expect(parseCustomInt('15', 16, 512)).toBeNull()
    expect(parseCustomInt('16', 16, 512)).toBe(16)
    expect(parseCustomInt('512', 16, 512)).toBe(512)
    expect(parseCustomInt('513', 16, 512)).toBeNull()
    expect(parseCustomInt('7', 8, 128)).toBeNull()
    expect(parseCustomInt('8', 8, 128)).toBe(8)
    expect(parseCustomInt('128', 8, 128)).toBe(128)
    expect(parseCustomInt('129', 8, 128)).toBeNull()
    expect(parseCustomInt('0', 1, 128)).toBeNull()
    expect(parseCustomInt('1', 1, 128)).toBe(1)
  })

  test('entradas tortas: vazio, texto, decimal, negativo; espaço e zeros à esquerda valem', () => {
    expect(parseCustomInt('', 16, 512)).toBeNull()
    expect(parseCustomInt('abc', 16, 512)).toBeNull()
    expect(parseCustomInt('12abc', 16, 512)).toBeNull()
    expect(parseCustomInt('3.5', 1, 512)).toBeNull()
    expect(parseCustomInt('-32', 1, 512)).toBeNull()
    expect(parseCustomInt(' 32 ', 16, 512)).toBe(32)
    expect(parseCustomInt('016', 16, 512)).toBe(16)
  })
})

describe('buildCustomSizeKey', () => {
  test('monta a chave no formato que o buildInput lê', () => {
    expect(
      buildCustomSizeKey('pixel-background', {
        ...EMPTY_CUSTOM_VALUES,
        width: '300',
        height: '200',
      }),
    ).toBe('300x200')
    expect(buildCustomSizeKey('pixel-sprite', { ...EMPTY_CUSTOM_VALUES, frame: '96' })).toBe('96')
    expect(buildCustomSizeKey('tilemap', { ...EMPTY_CUSTOM_VALUES, cols: '50', rows: '40' })).toBe(
      '50x40',
    )
  })

  test('um campo inválido derruba a chave inteira', () => {
    expect(
      buildCustomSizeKey('pixel-background', {
        ...EMPTY_CUSTOM_VALUES,
        width: '300',
        height: '9999',
      }),
    ).toBeNull()
    expect(
      buildCustomSizeKey('pixel-background', { ...EMPTY_CUSTOM_VALUES, width: '300' }),
    ).toBeNull()
    expect(buildCustomSizeKey('tileset', { ...EMPTY_CUSTOM_VALUES, width: '32' })).toBeNull()
  })
})

describe('seedCustomValues', () => {
  test('pré-preenche do preset selecionado', () => {
    expect(seedCustomValues('pixel-background', '160x120')).toEqual({
      ...EMPTY_CUSTOM_VALUES,
      width: '160',
      height: '120',
    })
    expect(seedCustomValues('pixel-sprite', '32')).toEqual({
      ...EMPTY_CUSTOM_VALUES,
      frame: '32',
    })
    expect(seedCustomValues('tilemap', '20x15')).toEqual({
      ...EMPTY_CUSTOM_VALUES,
      cols: '20',
      rows: '15',
    })
  })

  test('preset torto ou kind sem spec não semeia lixo', () => {
    expect(seedCustomValues('pixel-background', '')).toEqual(EMPTY_CUSTOM_VALUES)
    expect(seedCustomValues('tileset', '16')).toEqual(EMPTY_CUSTOM_VALUES)
  })
})
