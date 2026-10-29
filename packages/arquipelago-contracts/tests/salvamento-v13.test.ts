import { expect, test } from 'bun:test'
import {
  criarSalvamentoInicial,
  migrarDaV12,
  migrarSalvamento,
  PONTOS_DE_CORAL,
  SalvamentoV12Schema,
  SalvamentoV13Schema,
  VERSAO_SALVAMENTO,
} from '../src/salvamento'

const AGORA = new Date('2026-10-29T12:00:00Z')

test('V12 migra para V13 sem tocar nas descobertas, com nenhum coral replantado', () => {
  const s = criarSalvamentoInicial(AGORA)
  const antiga = SalvamentoV12Schema.parse({
    ...s,
    versao: 12,
    recife: { bau: true, pagina: false, tesouro: true },
    vale: { pegadas: true, escavacao: 2, ninhos: ['ninho-3'] },
  })
  const copia = structuredClone(antiga)
  const atual = migrarDaV12(antiga)
  expect(VERSAO_SALVAMENTO).toBe(13)
  expect(atual).toEqual({
    ...antiga,
    versao: 13,
    recife: { bau: true, pagina: false, tesouro: true, corais: 0 },
  })
  expect(migrarSalvamento(antiga)).toEqual(atual)
  expect(antiga).toEqual(copia)
  // A V12 continua estrita: os corais só existem da V13 em diante.
  expect(SalvamentoV12Schema.safeParse({ ...antiga, recife: atual.recife }).success).toBe(false)
})

test('os corais são um número de 0 a 15 que atravessa o JSON, e nada fora disso', () => {
  const s = criarSalvamentoInicial(AGORA)
  expect(s.recife.corais).toBe(0)
  expect(PONTOS_DE_CORAL).toBe(4)
  for (let corais = 0; corais < 2 ** PONTOS_DE_CORAL; corais++) {
    const com = { ...s, recife: { ...s.recife, corais } }
    expect(migrarSalvamento(JSON.parse(JSON.stringify(com)))).toEqual(com)
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
  expect(migrarSalvamento({ ...s, versao: 14 })).toBeNull()
})
