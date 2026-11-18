import { expect, test } from 'bun:test'
import { EntidadeCompiladaSchema } from '../src/compilar/schema-metadados'
import { criarDocumentoVazio, executarLote, PropriedadesSchema, validarDocumento } from '../src/v2'

test('chave reservada é recusada na entrada, sem desaparecer silenciosamente da autoria ou compilação', () => {
  const propriedades = JSON.parse('{"__proto__":"teste","uso":"horta"}')
  expect(PropriedadesSchema.safeParse(propriedades).success).toBe(false)
  const d = criarDocumentoVazio('d', 'Dados'),
    marcador = {
      id: 'm',
      nome: 'Marco',
      grupo: null,
      oculto: false,
      bloqueado: false,
      posicao: { x: 0, y: 0, z: 0 },
      giro: 0,
      noChao: false,
      objeto: null,
      propriedades,
    }
  expect(() => validarDocumento({ ...d, marcadores: [marcador] })).toThrow()
  expect(() =>
    executarLote(
      { documento: d, revisao: 0 },
      { revisaoEsperada: 0, comandos: [{ tipo: 'marcador.definir', marcador }] },
    ),
  ).toThrow()
  expect(d.marcadores).toHaveLength(0)
  expect(
    EntidadeCompiladaSchema.safeParse({
      id: 'm',
      nome: 'Marco',
      tipo: 'marcador',
      grupo: null,
      propriedades,
    }).success,
  ).toBe(false)
  expect(Object.hasOwn(propriedades, '__proto__')).toBe(true)
})
test('propriedades comuns preservam nomes e valores como dados, inclusive nomes de métodos sem função', () => {
  const propriedades = JSON.parse('{"constructor":"texto","toString":true,"contagem":3}')
  expect(PropriedadesSchema.parse(propriedades)).toEqual(propriedades)
})
