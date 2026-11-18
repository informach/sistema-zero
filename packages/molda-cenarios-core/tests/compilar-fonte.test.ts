import { expect, test } from 'bun:test'
import { digestDoDocumentoDeCenario } from '../src/compilar/fonte'
import { criarDocumentoVazio } from '../src/v2'

test('hash da fonte preserva autoria e independe da ordem de chaves usada por JSONB/HTTP', async () => {
  const d = criarDocumentoVazio('c', 'Fonte')
  d.grupos = [
    {
      id: 'g',
      nome: 'Grupo',
      grupo: null,
      oculto: false,
      bloqueado: false,
      propriedades: { z: 3, a: 'horta', constructor: true },
    },
  ]
  const antes = JSON.stringify(d),
    outra = JSON.parse(antes)
  outra.grupos[0].propriedades = { constructor: true, a: 'horta', z: 3 }
  expect(await digestDoDocumentoDeCenario(d)).toBe(await digestDoDocumentoDeCenario(outra))
  expect(JSON.stringify(d)).toBe(antes)
  outra.grupos[0].propriedades.z = 4
  expect(await digestDoDocumentoDeCenario(d)).not.toBe(await digestDoDocumentoDeCenario(outra))
})
