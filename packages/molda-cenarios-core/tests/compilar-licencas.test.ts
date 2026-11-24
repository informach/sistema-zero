import { expect, test } from 'bun:test'
import { conferirLicencasDaCompilacao } from '../src/compilar/licencas'

const bibliotecas = [
  { id: 'livre', nome: 'Criações livres', licenca: 'livre' as const },
  { id: 'minha', nome: 'Meus modelos', licenca: 'propria' as const },
  { id: 'pack', nome: 'Adventure Land', licenca: 'restrita' as const },
]
test('somente bibliotecas usadas participam da conferência; resultado é único e determinístico', () => {
  const contexto = { equipe: false, bibliotecas },
    original = JSON.stringify(contexto),
    licencas = conferirLicencasDaCompilacao(['minha', 'livre', 'minha'], contexto)
  expect(licencas.map((l) => l.id)).toEqual(['livre', 'minha'])
  expect(JSON.stringify(contexto)).toBe(original)
})
test('pessoa sem equipe não exporta recurso restrito; equipe recebe identificação nominal', () => {
  expect(() => conferirLicencasDaCompilacao(['pack'], { equipe: false, bibliotecas })).toThrow(
    /Adventure Land/,
  )
  expect(conferirLicencasDaCompilacao(['pack'], { equipe: true, bibliotecas })).toEqual([
    bibliotecas[2]!,
  ])
})
test('biblioteca ausente, duplicada ou com licença desconhecida é recusada', () => {
  expect(() =>
    conferirLicencasDaCompilacao(['inexistente'], { equipe: true, bibliotecas }),
  ).toThrow(/biblioteca/i)
  expect(() =>
    conferirLicencasDaCompilacao(['pack'], {
      equipe: true,
      bibliotecas: [...bibliotecas, bibliotecas[2]!],
    }),
  ).toThrow(/repetida/i)
  expect(() =>
    conferirLicencasDaCompilacao(['pack'], {
      equipe: true,
      bibliotecas: [{ ...bibliotecas[2]!, licenca: 'publica' }] as never,
    }),
  ).toThrow()
  expect(() =>
    conferirLicencasDaCompilacao(['pack'], { equipe: 'false', bibliotecas } as never),
  ).toThrow()
})
