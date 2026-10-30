import { describe, expect, test } from 'bun:test'
import type { CoresConquistadas } from '@sistemazero/arquipelago-contracts'
import { criarDesafiosFalsos } from '../src/plataforma/desafios-falsos'
import {
  chaveDasCores,
  coresDoCatalogo,
  guardarCores,
  lerCoresGuardadas,
  unirCores,
} from '../src/sistemas/cores-conquistadas'
import { lerDesafios } from '../src/sistemas/quadro-das-cores'

const cor = (quadros: number[]): CoresConquistadas => ({
  versao: 1,
  ilhas: [{ id: 'bosque', quadros }],
})

describe('fotografia visual das conquistas', () => {
  test('união conserva posições, sem duplicar, reordenar ilhas ou modificar leituras', () => {
    const primeira = cor([5, 1])
    const antes = structuredClone(primeira)
    const unidas = unirCores(primeira, cor([1, 2]), cor([]))
    expect(unidas.ilhas.find((i) => i.id === 'bosque')?.quadros).toEqual([1, 2, 5])
    expect(unidas.ilhas.find((i) => i.id === 'vila-doce')?.quadros).toEqual([])
    expect(primeira).toEqual(antes)
  })

  test('catálogo contribui só com posições válidas de quadros concluídos, nunca com desafio do dia', () => {
    const resposta = criarDesafiosFalsos(2, { dia: 'feito' }).buscar('/desafios', 'GET')
    const dados = lerDesafios(resposta?.corpo)
    expect(dados).not.toBeNull()
    const exemplo = dados!.desafios[0]!
    const cores = coresDoCatalogo([
      ...dados!.desafios,
      ...[0, 7, 1.5, null].map((quadro) => ({
        ...exemplo,
        quadro,
        situacao: 'concluido' as const,
      })),
    ])
    expect(cores.ilhas.find((i) => i.id === 'bosque')?.quadros).toEqual([3])
  })

  test('recarga usa a última fotografia só daquele perfil e público', () => {
    const dados = new Map<string, string>()
    const armazem = {
      getItem: (k: string) => dados.get(k) ?? null,
      setItem: (k: string, v: string) => {
        dados.set(k, v)
      },
    }
    const chave = chaveDasCores('kids', 'ana')
    guardarCores(chave, cor([2]), armazem)
    expect(lerCoresGuardadas(chave, armazem)).toEqual(cor([2]))
    expect(lerCoresGuardadas(chaveDasCores('kids', 'bia'), armazem)).toEqual(unirCores())
    expect(lerCoresGuardadas(chaveDasCores('adulto', 'ana'), armazem)).toEqual(unirCores())
    for (const invalido of [
      '{',
      'a'.repeat(2049),
      JSON.stringify(cor([7])),
      JSON.stringify({ ...cor([1]), moedas: 99 }),
    ]) {
      dados.set(chave, invalido)
      expect(lerCoresGuardadas(chave, armazem)).toEqual(unirCores())
    }
  })

  test('armazenamento bloqueado não impede ler ou confirmar a cor nesta sessão', () => {
    const armazem = {
      getItem: () => {
        throw new Error('bloqueado')
      },
      setItem: () => {
        throw new Error('bloqueado')
      },
    }
    expect(lerCoresGuardadas('chave', armazem)).toEqual(unirCores())
    expect(() => guardarCores('chave', cor([1]), armazem)).not.toThrow()
  })
})
