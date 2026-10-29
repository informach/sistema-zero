import { describe, expect, test } from 'bun:test'
import {
  conferirMapaDasIlhas,
  ILHAS,
  ilhaDoPosto,
  type JornadaDosMembros,
  JornadaDosMembrosSchema,
  mapaDasIlhasEmOrdem,
  POSTOS_DA_JORNADA,
} from '../src'

const etapas = (n: number) =>
  Array.from({ length: n }, (_, i) => ({ id: `e${i}`, titulo: `Etapa ${i + 1}` }))
const jornada = (over: Partial<JornadaDosMembros> = {}): JornadaDosMembros => ({
  kids: { versao: 3, postos: [...POSTOS_DA_JORNADA] },
  adulto: { versao: 2, configurada: true, etapas: etapas(7) },
  ...over,
})

describe('mapa ilha → posto', () => {
  test('um posto por ilha, sem repetir, na ordem da jornada', () => {
    expect(mapaDasIlhasEmOrdem()).toBe(true)
    expect(new Set(ILHAS.map((i) => i.posto)).size).toBe(ILHAS.length)
    expect(ilhaDoPosto('noob').id).toBe('sua-ilha')
    expect(ilhaDoPosto('coder').id).toBe('bosque')
    expect(ilhaDoPosto('god').id).toBe('farol')
  })
})

describe('conferência contra a jornada do Members', () => {
  test('jornada igual ao mapa não tem problema', () => {
    expect(conferirMapaDasIlhas(jornada())).toEqual([])
  })

  test('Kids com posto trocado, faltando ou fora de ordem', () => {
    const trocado = [...POSTOS_DA_JORNADA] as string[]
    ;[trocado[1], trocado[2]] = [trocado[2] as string, trocado[1] as string]
    expect(
      conferirMapaDasIlhas(jornada({ kids: { versao: 3, postos: trocado } }))[0],
    ).toMatchObject({
      publico: 'kids',
      tipo: 'postos-diferentes',
    })
    expect(
      conferirMapaDasIlhas(jornada({ kids: { versao: 3, postos: POSTOS_DA_JORNADA.slice(0, 7) } })),
    ).toHaveLength(1)
  })

  test('Kids sem política publicada', () => {
    expect(conferirMapaDasIlhas(jornada({ kids: { versao: 0, postos: [] } }))).toEqual([
      { publico: 'kids', tipo: 'politica-nao-publicada' },
    ])
  })

  test('adulto: uma etapa por ilha antes do Farol, e sem jornada configurada', () => {
    expect(
      conferirMapaDasIlhas(
        jornada({ adulto: { versao: 2, configurada: true, etapas: etapas(5) } }),
      ),
    ).toEqual([{ publico: 'adulto', tipo: 'etapas-a-mais-ou-a-menos', esperado: 7, recebido: 5 }])
    expect(
      conferirMapaDasIlhas(jornada({ adulto: { versao: 0, configurada: false, etapas: [] } })),
    ).toEqual([{ publico: 'adulto', tipo: 'jornada-nao-configurada' }])
  })

  test('o formato é estrito', () => {
    expect(JornadaDosMembrosSchema.safeParse(jornada()).success).toBe(true)
    expect(JornadaDosMembrosSchema.safeParse({ ...jornada(), extra: 1 }).success).toBe(false)
  })
})
