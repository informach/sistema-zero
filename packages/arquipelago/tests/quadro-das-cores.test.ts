import { describe, expect, test } from 'bun:test'
import type { DesafioNaLista, Plataforma } from '@sistemazero/arquipelago-contracts'
import { criarLojaDosDesafios } from '../src/estado/desafios'
import { criarLoja } from '../src/estado/loja'
import { criarPlataformaFalsa } from '../src/plataforma/falsa'
import {
  lerDesafios,
  manchasAcesas,
  motivoDoErro,
  novosFeitos,
  oQueFalta,
  quadrosDaIlha,
} from '../src/sistemas/quadro-das-cores'

const CURSO = {
  courseId: '00000000-0000-4000-8000-000000000001',
  titulo: 'Repetições',
  slug: 'repeticoes',
  posto: 'coder',
}
const d = (over: Partial<DesafioNaLista>): DesafioNaLista => ({
  id: '00000000-0000-4000-8000-0000000000a1',
  revisao: 1,
  ilha: 'bosque',
  tipo: 'quadro-das-cores',
  quadro: 1,
  ordem: 0,
  titulo: 'A borboleta',
  situacao: 'disponivel',
  faltam: [],
  recompensa: { cor: true, moedas: 20, moedasExtra: 10 },
  recompensaVista: false,
  ...over,
})

describe('quadrosDaIlha', () => {
  test('seis quadros na ordem; só Quadro das Cores da ilha; sem desafio fica vazio', () => {
    const q = quadrosDaIlha(
      [
        d({ quadro: 2, situacao: 'concluido' }),
        d({ quadro: 1 }),
        d({ quadro: 3, situacao: 'faltam-blocos' }),
        d({ quadro: 4, ilha: 'farol' }),
        d({ quadro: null, tipo: 'desafio-do-dia' }),
      ],
      'bosque',
    )
    expect(q.map((x) => x.estado)).toEqual([
      'disponivel',
      'feito',
      'trancado',
      'vazio',
      'vazio',
      'vazio',
    ])
    expect(manchasAcesas(q)).toEqual([false, true, false, false, false, false])
  })

  test('novosFeitos só aponta o que ficou feito agora', () => {
    const antes = quadrosDaIlha(
      [d({ quadro: 1 }), d({ quadro: 2, situacao: 'concluido' })],
      'bosque',
    )
    const depois = quadrosDaIlha(
      [d({ quadro: 1, situacao: 'concluido' }), d({ quadro: 2, situacao: 'concluido' })],
      'bosque',
    )
    expect(novosFeitos(antes, depois)).toEqual([1])
    expect(novosFeitos(depois, depois)).toEqual([])
  })

  test('o que falta: ilha fechada ou o primeiro curso de cada bloco, sem repetir', () => {
    expect(oQueFalta(d({ situacao: 'ilha-fechada' }))).toEqual({ ilhaFechada: true, cursos: [] })
    expect(
      oQueFalta(
        d({
          situacao: 'faltam-blocos',
          faltam: [
            { bloco: 'a', rotulo: null, cursos: [CURSO] },
            { bloco: 'b', rotulo: null, cursos: [CURSO] },
            { bloco: 'c', rotulo: null, cursos: [] },
          ],
        }),
      ),
    ).toEqual({ ilhaFechada: false, cursos: ['Repetições'] })
  })

  test('resposta estranha não passa; erros viram motivo', () => {
    expect(lerDesafios({ versao: 1 })).toBeNull()
    expect(motivoDoErro(403, { error: { code: 'DESAFIOS_DESLIGADOS' } })).toBe('desligado')
    expect(motivoDoErro(403, { error: { code: 'ACESSO_BLOQUEADO' } })).toBe('desligado')
    expect(motivoDoErro(424, null)).toBe('fora-do-ar')
  })
})

describe('loja dos desafios com a plataforma de mentira', () => {
  function montar(desafios: 'ligados' | 'desligados' = 'ligados') {
    const plataforma = criarPlataformaFalsa({ desafios })
    const loja = criarLoja({
      salvamento: plataforma.guardado().salvamento ?? (undefined as never),
      jornada: 2,
      quarto: { theme: 'padrao', placedItems: [] } as never,
      avatar: { slots: {} },
      acesso: {
        liberado: true,
        motivo: null,
        limiteDiarioMinutos: null,
        usadoHojeSegundos: 0,
      } as never,
      aoMudar: () => {},
    })
    return { loja, desafios: criarLojaDosDesafios(loja, plataforma as Plataforma) }
  }

  test('carrega, joga o desafio disponível, a lista volta com o quadro feito e a festa', async () => {
    const { loja, desafios } = montar()
    await desafios.getState().carregar()
    const dados = desafios.getState().dados
    expect(dados && quadrosDaIlha(dados.desafios, 'bosque').map((q) => q.estado)).toEqual([
      'disponivel',
      'trancado',
      'feito',
      'vazio',
      'vazio',
      'vazio',
    ])
    expect(desafios.getState().festa).toBeNull()
    const id = dados?.desafios.find((x) => x.quadro === 1)?.id ?? ''
    const jogo = desafios.getState().jogar(id, 1)
    // Enquanto o Estúdio de desafio está aberto, o jogo fica pausado.
    expect(loja.getState().ferramentaAberta).toBe(true)
    expect(await jogo).toBe('feito')
    expect(loja.getState().ferramentaAberta).toBe(false)
    expect(desafios.getState().festa).toEqual({ ilha: 'bosque', quadros: [1] })
    desafios.getState().festaVista()
    expect(desafios.getState().festa).toBeNull()
  })

  test('desafio trancado não abre; desligado fecha o quadro com o motivo', async () => {
    const { desafios } = montar()
    await desafios.getState().carregar()
    const trancado = desafios.getState().dados?.desafios.find((x) => x.quadro === 2)?.id ?? ''
    expect(await desafios.getState().jogar(trancado, 1)).toBe('nao-abriu')
    const desligado = montar('desligados').desafios
    await desligado.getState().carregar()
    expect(desligado.getState().fechado).toBe('desligado')
    expect(desligado.getState().dados).toBeNull()
  })
})
