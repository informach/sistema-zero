import { describe, expect, mock, test } from 'bun:test'
import { PlataformaIndisponivelError } from '../../src/application/erros'
import {
  LeiturasDosMembros,
  VALIDADE_DO_CURRICULO_MS,
  VALIDADE_DO_JOGADOR_MS,
} from '../../src/application/leituras-dos-membros'
import type { Jogador } from '../../src/domain/jogador'

const crianca: Jogador = {
  id: 'p1',
  publico: 'kids',
  contaId: 'c1',
  equipe: false,
  somenteLeitura: false,
}
const adulto: Jogador = {
  id: 'a1',
  publico: 'adulto',
  contaId: null,
  equipe: false,
  somenteLeitura: false,
}

function criar() {
  let agora = 0
  const porta = {
    lerJornada: mock(),
    lerJogador: mock(async (_pergunta: unknown) => ({ posicao: 1, total: 8, blocos: ['b'] })),
    lerCurriculo: mock(async () => ({ versao: 1, cursos: [], catalogo: [] })),
  }
  const l = new LeiturasDosMembros(porta, () => agora)
  return { l, porta, andar: (ms: number) => (agora += ms) }
}

describe('leituras do Members', () => {
  test('pergunta o jogador no formato do Members (Kids: perfil + conta; adulto: a própria conta)', async () => {
    const { l, porta } = criar()
    await l.jogador(crianca)
    await l.jogador(adulto)
    expect(porta.lerJogador.mock.calls.map((c) => c[0])).toEqual([
      { userId: 'p1', accountId: 'c1', audience: 'kids' },
      { userId: 'a1', accountId: 'a1', audience: 'adult' },
    ])
  })

  test('cache curto: o jogador por 30 s e o currículo por 5 min; pedidos juntos dividem a ida', async () => {
    const { l, porta, andar } = criar()
    await Promise.all([l.jogador(crianca), l.jogador(crianca)])
    expect(porta.lerJogador).toHaveBeenCalledTimes(1)
    andar(VALIDADE_DO_JOGADOR_MS + 1)
    await l.jogador(crianca)
    expect(porta.lerJogador).toHaveBeenCalledTimes(2)
    await l.curriculo('kids')
    andar(VALIDADE_DO_CURRICULO_MS - 1)
    await l.curriculo('kids')
    expect(porta.lerCurriculo).toHaveBeenCalledTimes(1)
    await l.curriculo('adult')
    expect(porta.lerCurriculo).toHaveBeenCalledTimes(2)
  })

  test('falha vira PlataformaIndisponivel e não fica no cache', async () => {
    const { l, porta } = criar()
    porta.lerJogador.mockImplementationOnce(async () => {
      throw new Error('fora')
    })
    await expect(l.jogador(crianca)).rejects.toBeInstanceOf(PlataformaIndisponivelError)
    expect((await l.jogador(crianca)).blocos).toEqual(['b'])
  })

  test('sem Members: desligadas', async () => {
    const l = new LeiturasDosMembros(null)
    expect(l.ligadas()).toBe(false)
    expect(() => l.curriculo('kids')).toThrow(PlataformaIndisponivelError)
  })
})
