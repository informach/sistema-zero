import { describe, expect, test } from 'bun:test'
import { join } from 'node:path'
import { cssHexValuesForCustomProperty } from './css-custom-properties'

describe('resolução dos tokens CSS usados pelos testes visuais', () => {
  test('segue os aliases importados até a cor canônica do cartão kids', () => {
    const globals = join(import.meta.dir, '../../community-kids/src/app/globals.css')

    expect(cssHexValuesForCustomProperty(globals, '--pen-cartao')).toEqual(['#ffffff'])
  })

  test('continua lendo a declaração literal da comunidade adulta', () => {
    const globals = join(import.meta.dir, '../../community/src/app/globals.css')

    expect(cssHexValuesForCustomProperty(globals, '--pen-cartao')).toEqual(['#ffffff'])
  })
})
