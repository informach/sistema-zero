import { expect, test } from 'bun:test'
import {
  BICHOS_ADOTADOS_MAXIMO,
  criarSalvamentoInicial,
  migrarSalvamento,
  SalvamentoV23Schema,
  VERSAO_SALVAMENTO,
} from '../src'
import { inicialV22 } from './ajuda-salvamento'

const AGORA = new Date('2026-11-01T12:00:00Z')
const bicho = (id: 'gato' | 'cachorro' | 'coelho' | 'porquinho', nome: string) => ({
  id,
  nome,
  fase: 'filhote' as const,
  fome: 80,
  limpeza: 80,
  carinho: 80,
  diasCuidados: 0,
  diaCuidadoEm: null,
  truque: { sessoes: 0, ultimaEm: null, aprendido: false },
})

/** V23 (lacunas, 01/11/2026; a proposta: "No Bosque dá para adotar mais"): até três adotados. */
test('a V22 migra com o mesmo adotado e nenhum outro', () => {
  const antiga = inicialV22(AGORA)
  antiga.bichos = { achados: ['gato'], adotado: bicho('gato', 'Mia') }
  const atual = migrarSalvamento(antiga)
  expect(atual?.versao).toBe(VERSAO_SALVAMENTO)
  expect(atual?.bichos).toEqual({ achados: ['gato'], adotado: bicho('gato', 'Mia'), outros: [] })
})

test('até dois outros, sem repetir bicho e só com um adotado que vai junto', () => {
  const s = criarSalvamentoInicial(AGORA)
  const com = (bichos: object) => SalvamentoV23Schema.safeParse({ ...s, bichos }).success
  const achados = ['gato', 'cachorro', 'coelho', 'porquinho']
  expect(BICHOS_ADOTADOS_MAXIMO).toBe(3)
  expect(
    com({
      achados,
      adotado: bicho('gato', 'Mia'),
      outros: [bicho('cachorro', 'Rex'), bicho('coelho', 'Bolinha')],
    }),
  ).toBe(true)
  expect(
    com({
      achados,
      adotado: bicho('gato', 'Mia'),
      outros: [bicho('cachorro', 'Rex'), bicho('coelho', 'Bolinha'), bicho('porquinho', 'Rosa')],
    }),
  ).toBe(false)
  expect(com({ achados, adotado: bicho('gato', 'Mia'), outros: [bicho('gato', 'Outra')] })).toBe(
    false,
  )
  expect(com({ achados, adotado: null, outros: [bicho('gato', 'Mia')] })).toBe(false)
})
