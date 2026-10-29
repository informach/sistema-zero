import { expect, test } from 'bun:test'
import {
  migrarDaV12,
  migrarDaV13,
  migrarDaV14,
  migrarSalvamento,
  PONTOS_DE_CORAL,
  SalvamentoV12Schema,
  SalvamentoV13Schema,
} from '../src/salvamento'
import { inicialV14 } from './ajuda-salvamento'

const AGORA = new Date('2026-10-29T12:00:00Z')

/** Uma V13: o salvamento inicial sem a banda do Pico (V14). */
function v13() {
  const { pico: _pico, ...s } = inicialV14(AGORA)
  return { ...s, versao: 13 as const }
}

test('V12 migra para V13 sem tocar nas descobertas, com nenhum coral replantado', () => {
  const s = v13()
  const antiga = SalvamentoV12Schema.parse({
    ...s,
    versao: 12,
    recife: { bau: true, pagina: false, tesouro: true },
    vale: { pegadas: true, escavacao: 2, ninhos: ['ninho-3'] },
  })
  const copia = structuredClone(antiga)
  const atual = migrarDaV12(antiga)
  expect(atual).toEqual({
    ...antiga,
    versao: 13,
    recife: { bau: true, pagina: false, tesouro: true, corais: 0 },
  })
  expect(migrarSalvamento(antiga)).toEqual(migrarDaV14(migrarDaV13(atual)))
  expect(antiga).toEqual(copia)
  // A V12 continua estrita: os corais só existem da V13 em diante.
  expect(SalvamentoV12Schema.safeParse({ ...antiga, recife: atual.recife }).success).toBe(false)
})

test('os corais são um número de 0 a 15 que atravessa o JSON, e nada fora disso', () => {
  const s = v13()
  expect(s.recife.corais).toBe(0)
  expect(PONTOS_DE_CORAL).toBe(4)
  for (let corais = 0; corais < 2 ** PONTOS_DE_CORAL; corais++) {
    const com = { ...s, recife: { ...s.recife, corais } }
    expect(migrarSalvamento(JSON.parse(JSON.stringify(com)))).toEqual(migrarDaV14(migrarDaV13(com)))
  }
  for (const corais of [-1, 16, 1.5, '3', null, true])
    expect(SalvamentoV13Schema.safeParse({ ...s, recife: { ...s.recife, corais } }).success).toBe(
      false,
    )
  const { corais: _, ...semCorais } = s.recife
  expect(SalvamentoV13Schema.safeParse({ ...s, recife: semCorais }).success).toBe(false)
  expect(SalvamentoV13Schema.safeParse({ ...s, recife: { ...s.recife, outro: 1 } }).success).toBe(
    false,
  )
  expect(migrarSalvamento({ ...s, versao: 16 })).toBeNull()
})
