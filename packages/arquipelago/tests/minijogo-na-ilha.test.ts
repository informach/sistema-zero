import { describe, expect, test } from 'bun:test'
import type { Minijogo } from '@sistemazero/arquipelago-contracts'
import { Mesh } from 'three'
import {
  ANCORA_DO_BRINQUEDO,
  BRINQUEDOS_DE_MINIJOGO,
  capaDoBrinquedo,
  ilhaDoPainel,
  minijogosDaIlha,
  painelDoBrinquedo,
  TELA_DO_BRINQUEDO,
} from '../src/sistemas/brinquedos-de-minijogo'
import { arquivoDaIlha, carregarGlb } from './ajuda-colisores'

/**
 * O minijogo fica na ilha (B10, 31/10/2026): a barraca da feira da Vila Doce e o quiosque do
 * festival do Pico mostram e abrem os minijogos aprovados da própria ilha.
 */
const base = {
  aprovadoEm: '2026-10-30T12:00:00.000Z',
  atualizadoEm: '2026-10-30T12:00:00.000Z',
}
const lista: Minijogo[] = [
  {
    ...base,
    desafioId: 'a',
    titulo: 'Do Bosque',
    capa: 'data:image/png;base64,QQ==',
    ilha: 'bosque',
  },
  { ...base, desafioId: 'b', titulo: 'Da Vila sem capa', capa: null, ilha: 'vila-doce' },
  {
    ...base,
    desafioId: 'c',
    titulo: 'Da Vila',
    capa: 'data:image/png;base64,Qg==',
    ilha: 'vila-doce',
  },
  { ...base, desafioId: 'd', titulo: 'Sem ilha', capa: 'data:image/png;base64,Qw==' },
]

describe('os minijogos de cada brinquedo', () => {
  test('cada brinquedo mostra só os da própria ilha, na ordem da lista', () => {
    expect(minijogosDaIlha(lista, 'vila-doce').map((m) => m.desafioId)).toEqual(['b', 'c'])
    expect(minijogosDaIlha(lista, 'pico')).toEqual([])
  })

  test('a tela pega a capa do mais recente da ilha que tem capa', () => {
    expect(capaDoBrinquedo(lista, 'vila-doce')).toBe('data:image/png;base64,Qg==')
    expect(capaDoBrinquedo(lista, 'pico')).toBeNull()
  })

  test('o painel de cada ilha se reconhece e nenhum outro é confundido', () => {
    expect(ilhaDoPainel(painelDoBrinquedo('pico'))).toBe('pico')
    expect(ilhaDoPainel(painelDoBrinquedo('vila-doce'))).toBe('vila-doce')
    expect(ilhaDoPainel('brinquedo-de-minijogo:bosque')).toBeNull()
    expect(ilhaDoPainel('feira-da-vila')).toBeNull()
    expect(ilhaDoPainel(null)).toBeNull()
  })

  test('os textos seguem a regra da criança', () => {
    for (const b of Object.values(BRINQUEDOS_DE_MINIJOGO))
      for (const t of [b.titulo, b.rotulo, b.vazio]) {
        expect(t).not.toMatch(/[—–!]/)
        expect(t.trimStart().startsWith('¿')).toBe(false)
        expect(t.trimStart()[0]).not.toBe('?')
      }
  })
})

describe('o código encontra o brinquedo, a tela e a âncora no GLB', () => {
  for (const [ilha, b] of Object.entries(BRINQUEDOS_DE_MINIJOGO)) {
    test(`${ilha}: ${b.no}`, async () => {
      const raiz = await carregarGlb(arquivoDaIlha(`${ilha}.glb`))
      expect(raiz.getObjectByName(b.no)).toBeDefined()
      expect(raiz.getObjectByName(ANCORA_DO_BRINQUEDO)?.parent).toBe(raiz)
      let malhas = 0
      raiz.getObjectByName(TELA_DO_BRINQUEDO)?.traverse((o) => {
        if (o instanceof Mesh) malhas++
      })
      expect(malhas).toBe(1)
    })
  }
})
