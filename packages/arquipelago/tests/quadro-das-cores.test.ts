import { describe, expect, test } from 'bun:test'
import type { DesafioNaLista, Plataforma } from '@sistemazero/arquipelago-contracts'
import { criarLojaDosDesafios } from '../src/estado/desafios'
import { criarLoja } from '../src/estado/loja'
import { criarPlataformaFalsa } from '../src/plataforma/falsa'
import {
  AVISO_DO_DIA,
  desafioDeHoje,
  diaParaAvisar,
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

describe('desafio de hoje', () => {
  const doDia = d({
    id: '00000000-0000-4000-8000-0000000000d1',
    tipo: 'desafio-do-dia',
    quadro: null,
  })
  const lista = (feito: boolean | null) => ({
    versao: 1 as const,
    ilhas: [],
    desafios: [d({}), doDia],
    doDia: feito === null ? null : { id: doDia.id, dia: '2026-10-28', feito },
  })

  test('pronto, feito ou nenhum (sem doDia, ou o desafio fora da lista)', () => {
    expect(desafioDeHoje(lista(false))).toEqual({ estado: 'pronto', desafio: doDia })
    expect(desafioDeHoje(lista(true)).estado).toBe('feito')
    expect(desafioDeHoje(lista(null))).toEqual({ estado: 'nenhum', desafio: null })
    expect(desafioDeHoje({ ...lista(false), desafios: [d({})] }).estado).toBe('nenhum')
    const { doDia: _, ...antigo } = lista(false)
    expect(desafioDeHoje(antigo).estado).toBe('nenhum')
  })

  test('o Zappy avisa uma vez por dia, só com desafio por fazer', () => {
    expect(AVISO_DO_DIA).toBe('Tem desafio novo hoje no Quadro das Cores.')
    expect(diaParaAvisar(lista(false), null)).toBe('2026-10-28')
    expect(diaParaAvisar(lista(false), '2026-10-27')).toBe('2026-10-28')
    expect(diaParaAvisar(lista(false), '2026-10-28')).toBeNull()
    expect(diaParaAvisar(lista(true), null)).toBeNull()
    expect(diaParaAvisar(lista(null), null)).toBeNull()
  })
})

describe('loja dos desafios com a plataforma de mentira', () => {
  function montar(
    desafios: 'ligados' | 'desligados' = 'ligados',
    dia?: 'pronto' | 'feito' | 'nenhum',
  ) {
    const plataforma = criarPlataformaFalsa({ desafios, dia })
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
    return { loja, plataforma, desafios: criarLojaDosDesafios(loja, plataforma as Plataforma) }
  }

  test('revogação retira os dados e a festa da leitura anterior', async () => {
    const { desafios, plataforma } = montar()
    await desafios.getState().carregar()
    desafios.setState({ festa: { ilha: 'bosque', quadros: [1] } })
    plataforma.servico.buscar = async () => ({ status: 403, corpo: {} })
    await desafios.getState().carregar()
    expect(desafios.getState()).toMatchObject({ dados: null, festa: null, carregando: false })
  })

  test('conquista histórica permanece com catálogo desligado e não cria festa ou prêmio', async () => {
    const { desafios } = montar('desligados')
    await desafios.getState().carregar()
    expect(desafios.getState().cores.ilhas.find((i) => i.id === 'bosque')?.quadros).toEqual([3])
    expect(desafios.getState()).toMatchObject({ dados: null, festa: null, fechado: 'desligado' })
  })

  test('host antigo usa só conclusões do catálogo e conserva a cor durante uma falha', async () => {
    const { desafios, plataforma } = montar()
    const buscar = plataforma.servico.buscar
    plataforma.servico.buscar = async (caminho, opcoes) =>
      caminho === '/desafios/cores' ? { status: 404, corpo: {} } : buscar(caminho, opcoes)
    await desafios.getState().carregar()
    expect(desafios.getState().cores.ilhas.find((i) => i.id === 'bosque')?.quadros).toEqual([3])
    plataforma.relatarErro = () => {}
    plataforma.servico.buscar = async () => {
      throw new Error('offline')
    }
    await desafios.getState().carregar()
    expect(desafios.getState().cores.ilhas.find((i) => i.id === 'bosque')?.quadros).toEqual([3])
    expect(desafios.getState().fechado).toBe('fora-do-ar')
    expect(desafios.getState().festa).toBeNull()
  })

  test('mover um desafio concluído não pinta o novo lugar quando existe histórico', async () => {
    const { desafios, plataforma } = montar()
    await desafios.getState().carregar()
    const buscar = plataforma.servico.buscar
    plataforma.servico.buscar = async (caminho, opcoes) => {
      const r = await buscar(caminho, opcoes)
      if (caminho !== '/desafios') return r
      const dados = lerDesafios(r.corpo)!
      dados.desafios = dados.desafios.map((d) => (d.quadro === 3 ? { ...d, quadro: 5 } : d))
      return { status: 200, corpo: dados }
    }
    await desafios.getState().carregar()
    expect(desafios.getState().cores.ilhas.find((i) => i.id === 'bosque')?.quadros).toEqual([3])
    expect(desafios.getState().festa).toBeNull()
  })

  test('suporte lê a fotografia mas nunca grava o cache de conquistas', async () => {
    const anterior = Object.getOwnPropertyDescriptor(globalThis, 'localStorage')
    const gravados: string[] = []
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      value: {
        getItem: () => null,
        setItem: (chave: string) => gravados.push(chave),
        removeItem: () => {},
      },
    })
    try {
      const { desafios, loja } = montar()
      gravados.length = 0
      loja.setState({ acesso: { ...loja.getState().acesso, somenteLeitura: true } })
      await desafios.getState().carregar()
      expect(desafios.getState().cores.ilhas.find((i) => i.id === 'bosque')?.quadros).toEqual([3])
      expect(gravados.filter((k) => k.startsWith('arquipelago:cores:'))).toEqual([])
      loja.setState({ acesso: { ...loja.getState().acesso, somenteLeitura: false } })
      await desafios.getState().carregar()
      expect(gravados.filter((k) => k.startsWith('arquipelago:cores:'))).toHaveLength(1)
    } finally {
      if (anterior) Object.defineProperty(globalThis, 'localStorage', anterior)
      else Reflect.deleteProperty(globalThis, 'localStorage')
    }
  })

  test('primeiro acesso offline não ganha cor; recuperação lê as conquistas', async () => {
    const { desafios, plataforma } = montar()
    const buscar = plataforma.servico.buscar
    plataforma.servico.buscar = async () => ({ status: 503, corpo: {} })
    await desafios.getState().carregar()
    expect(desafios.getState().cores.ilhas.every((i) => i.quadros.length === 0)).toBe(true)
    plataforma.servico.buscar = buscar
    await desafios.getState().carregar()
    expect(desafios.getState().cores.ilhas.find((i) => i.id === 'bosque')?.quadros).toEqual([3])
  })

  test('desmontagem aborta leitura e uma resposta tardia não repõe os desafios', async () => {
    const { desafios, plataforma } = montar()
    const buscar = plataforma.servico.buscar
    let sinal: AbortSignal | undefined
    const respostas: (() => void)[] = []
    plataforma.servico.buscar = async (caminho, opcoes) => {
      sinal = opcoes?.sinal
      await new Promise<void>((r) => {
        respostas.push(r)
      })
      return buscar(caminho, opcoes)
    }
    const leitura = desafios.getState().carregar()
    desafios.getState().cancelar()
    expect(sinal?.aborted).toBe(true)
    for (const responder of respostas) responder()
    await leitura
    expect(desafios.getState()).toMatchObject({ dados: null, carregando: false })
    expect(desafios.getState().cores.ilhas.every((i) => i.quadros.length === 0)).toBe(true)
  })

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

  test('banco de mentira: o desafio do dia nos três estados; fazer marca feito hoje', async () => {
    const pronto = montar().desafios
    await pronto.getState().carregar()
    const dados = pronto.getState().dados
    const hoje = dados ? desafioDeHoje(dados) : null
    expect(hoje?.estado).toBe('pronto')
    expect(hoje?.desafio?.recompensa).toEqual({ cor: false, moedas: 10, moedasExtra: 5 })
    // O desafio do dia não conta no Quadro das Cores.
    expect(dados?.ilhas.find((i) => i.id === 'bosque')?.quadro.feitos).toBe(1)
    expect(await pronto.getState().jogar(hoje?.desafio?.id ?? '', 1)).toBe('feito')
    const depois = pronto.getState().dados
    expect(depois && desafioDeHoje(depois).estado).toBe('feito')
    expect(pronto.getState().festa).toBeNull()
    for (const [dia, estado] of [
      ['feito', 'feito'],
      ['nenhum', 'nenhum'],
    ] as const) {
      const outro = montar('ligados', dia).desafios
      await outro.getState().carregar()
      const lidos = outro.getState().dados
      expect(lidos && desafioDeHoje(lidos).estado).toBe(estado)
    }
  })
})
