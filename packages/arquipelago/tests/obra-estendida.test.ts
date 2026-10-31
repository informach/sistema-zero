import { describe, expect, test } from 'bun:test'
import {
  criarSalvamentoInicial,
  type ObraEstendida,
  type Plataforma,
  type RespostaDoServico,
} from '@sistemazero/arquipelago-contracts'
import { criarLoja } from '../src/estado/loja'
import {
  AVISO_DA_OBRA_DE_OUTRO_APARELHO,
  chaveDaObraEstendida,
  criarLojaDaObraEstendida,
  type GuardaDaObraEstendida,
  lojaDaObraEstendida,
} from '../src/estado/obra-estendida'
import { criarPlataformaFalsa } from '../src/plataforma/falsa'
import { criarObraEstendidaFalsa } from '../src/plataforma/obra-estendida-falsa'

/** A obra estendida (E04 e B14): troca por revisão, pausa antes de gravar e o que não chegou. */

function guardaEmMemoria(): GuardaDaObraEstendida & { dados: Map<string, string> } {
  const dados = new Map<string, string>()
  return {
    dados,
    getItem: (k) => dados.get(k) ?? null,
    setItem: (k, v) => void dados.set(k, v),
    removeItem: (k) => void dados.delete(k),
  }
}

/** A plataforma falsa com o serviço espiado: conta os pedidos e pode cair na hora de gravar. */
function plataformaEspiada(o: { somenteLeitura?: boolean } = {}) {
  const base = criarPlataformaFalsa({ somenteLeitura: o.somenteLeitura })
  const pedidos: { caminho: string; metodo: string }[] = []
  const erros: string[] = []
  let caiNoPut = 0
  const plataforma: Plataforma = {
    ...base,
    relatarErro: (_erro, contexto) => void erros.push(contexto),
    servico: {
      async buscar(caminho, opcoes) {
        const metodo = opcoes?.metodo ?? 'GET'
        pedidos.push({ caminho, metodo })
        if (metodo === 'PUT' && caiNoPut > 0) {
          caiNoPut--
          throw new TypeError('Failed to fetch')
        }
        return base.servico.buscar(caminho, opcoes)
      },
    },
  }
  return {
    plataforma,
    pedidos,
    erros,
    cair(vezes = 1) {
      caiNoPut = vezes
    },
    /** Outro aparelho grava direto no serviço. */
    outroAparelho: (revisaoBase: number, obra: ObraEstendida): Promise<RespostaDoServico> =>
      base.servico.buscar('/obra-estendida', { metodo: 'PUT', corpo: { revisaoBase, obra } }),
  }
}

function montar(
  espiada = plataformaEspiada(),
  guarda = guardaEmMemoria(),
  acesso: { somenteLeitura?: boolean } = {},
) {
  const loja = criarLoja({
    salvamento: criarSalvamentoInicial(new Date('2026-10-31T12:00:00Z')),
    jornada: 1,
    quarto: { theme: 'padrao', placedItems: [] } as never,
    avatar: { slots: {} },
    acesso: {
      liberado: true,
      motivo: null,
      limiteDiarioMinutos: null,
      usadoHojeSegundos: 0,
      ...acesso,
    } as never,
    aoMudar: () => {},
  })
  const obra = criarLojaDaObraEstendida(loja, espiada.plataforma, { guarda, esperaMs: 5 })
  return { loja, obra, guarda, ...espiada }
}

const chave = chaveDaObraEstendida('kids', 'perfil-de-teste')
const comTerreno =
  (...alturas: [number, number, number][]) =>
  (o: ObraEstendida): ObraEstendida => ({
    ...o,
    terreno: { alturas: [...(o.terreno?.alturas ?? []), ...alturas] },
  })
const pausa = () => new Promise((r) => setTimeout(r, 30))

describe('obra estendida', () => {
  test('uma por loja do jogo', () => {
    const { loja, plataforma } = montar()
    expect(lojaDaObraEstendida(loja, plataforma)).toBe(lojaDaObraEstendida(loja, plataforma))
  })

  test('lê, muda na hora e grava uma vez depois da pausa, com a revisão em que se baseou', async () => {
    const { obra, pedidos, guarda, outroAparelho } = montar()
    expect(obra.getState().mudar(comTerreno([1, 1, 1]))).toBe(false)
    await obra.getState().carregar()
    expect(obra.getState()).toMatchObject({ obra: null, revisao: 0, situacao: 'pronta' })
    expect(obra.getState().mudar(comTerreno([1, 1, 1]))).toBe(true)
    expect(obra.getState().mudar(comTerreno([2, 1, 2]))).toBe(true)
    expect(obra.getState().mudar(comTerreno([3, 1, 3]))).toBe(true)
    expect(obra.getState().situacao).toBe('gravando')
    expect(obra.getState().obra?.terreno?.alturas).toEqual([
      [1, 1, 1],
      [2, 1, 2],
      [3, 1, 3],
    ])
    // O que ainda não chegou fica no aparelho até o serviço confirmar.
    expect(JSON.parse(guarda.dados.get(chave) ?? 'null')).toMatchObject({ revisaoBase: 0 })
    await pausa()
    expect(pedidos.filter((p) => p.metodo === 'PUT')).toHaveLength(1)
    expect(obra.getState()).toMatchObject({ revisao: 1, situacao: 'pronta' })
    expect(guarda.dados.has(chave)).toBe(false)
    // A próxima gravação vai sobre a revisão 1.
    obra.getState().mudar(comTerreno([4, 4, 1]))
    await obra.getState().gravarAgora()
    expect(obra.getState().revisao).toBe(2)
    expect((await outroAparelho(2, obra.getState().obra!)).status).toBe(200)
  })

  test('outro aparelho gravou antes: fica a de lá, com o recado, e nada pendente', async () => {
    const { loja, obra, outroAparelho, guarda } = montar()
    await obra.getState().carregar()
    const deLa = comTerreno([9, 9, 3])({ versao: 1, iglu: null, andar: null, terreno: null })
    expect((await outroAparelho(0, deLa)).status).toBe(200)
    obra.getState().mudar(comTerreno([1, 1, 1]))
    await obra.getState().gravarAgora()
    expect(obra.getState()).toMatchObject({ obra: deLa, revisao: 1, situacao: 'pronta' })
    expect(loja.getState().dica?.texto).toBe(AVISO_DA_OBRA_DE_OUTRO_APARELHO)
    expect(guarda.dados.has(chave)).toBe(false)
  })

  test('sem rede o pendente fica no aparelho e vai na próxima abertura', async () => {
    const espiada = plataformaEspiada()
    const guarda = guardaEmMemoria()
    const primeira = montar(espiada, guarda)
    await primeira.obra.getState().carregar()
    espiada.cair()
    primeira.obra.getState().mudar(comTerreno([1, 2, 3]))
    await primeira.obra.getState().gravarAgora()
    expect(primeira.obra.getState().situacao).toBe('erro')
    expect(espiada.erros).toEqual(['obra-estendida'])
    expect(guarda.dados.has(chave)).toBe(true)
    // Reabriu (outra loja, o mesmo aparelho): a leitura manda o que ficou.
    const segunda = montar(espiada, guarda)
    await segunda.obra.getState().carregar()
    expect(segunda.obra.getState()).toMatchObject({ revisao: 1, situacao: 'pronta' })
    expect(segunda.obra.getState().obra?.terreno?.alturas).toEqual([[1, 2, 3]])
    expect(guarda.dados.has(chave)).toBe(false)
  })

  test('sem rede, mudar de novo tenta de novo', async () => {
    const { obra, cair } = montar()
    await obra.getState().carregar()
    cair()
    obra.getState().mudar(comTerreno([1, 2, 3]))
    await obra.getState().gravarAgora()
    expect(obra.getState().situacao).toBe('erro')
    obra.getState().mudar(comTerreno([2, 2, 3]))
    await obra.getState().gravarAgora()
    expect(obra.getState()).toMatchObject({ revisao: 1, situacao: 'pronta' })
    expect(obra.getState().obra?.terreno?.alturas).toHaveLength(2)
  })

  test('o pendente de outra abertura perde para uma gravação mais nova de outro aparelho', async () => {
    const espiada = plataformaEspiada()
    const guarda = guardaEmMemoria()
    const pendente = comTerreno([1, 1, 1])({ versao: 1, iglu: null, andar: null, terreno: null })
    guarda.setItem(chave, JSON.stringify({ revisaoBase: 0, obra: pendente }))
    const deLa = comTerreno([5, 5, 2])({ versao: 1, iglu: null, andar: null, terreno: null })
    await espiada.outroAparelho(0, deLa)
    const { obra, loja } = montar(espiada, guarda)
    await obra.getState().carregar()
    expect(obra.getState()).toMatchObject({ obra: deLa, revisao: 1, situacao: 'pronta' })
    expect(loja.getState().dica?.texto).toBe(AVISO_DA_OBRA_DE_OUTRO_APARELHO)
    expect(guarda.dados.has(chave)).toBe(false)
    // A leitura já mostra que a base ficou velha: a obra daqui nem vai.
    expect(espiada.pedidos.filter((p) => p.metodo === 'PUT')).toEqual([])
  })

  test('sem o serviço na abertura, o pendente daqui continua valendo', async () => {
    const espiada = plataformaEspiada()
    const guarda = guardaEmMemoria()
    const pendente = comTerreno([1, 1, 1])({ versao: 1, iglu: null, andar: null, terreno: null })
    guarda.setItem(chave, JSON.stringify({ revisaoBase: 0, obra: pendente }))
    const fora: Plataforma = {
      ...espiada.plataforma,
      servico: { buscar: async () => ({ status: 502, corpo: null }) },
    }
    const { obra } = montar({ ...espiada, plataforma: fora }, guarda)
    await obra.getState().carregar()
    expect(obra.getState()).toMatchObject({ obra: pendente, revisao: 0, situacao: 'erro' })
    expect(obra.getState().mudar(comTerreno([2, 2, 2]))).toBe(true)
    expect(JSON.parse(guarda.dados.get(chave) ?? 'null').obra.terreno.alturas).toHaveLength(2)
  })

  test('suporte e visita leem e nunca gravam (o pendente do aparelho fica guardado)', async () => {
    const espiada = plataformaEspiada({ somenteLeitura: true })
    const guarda = guardaEmMemoria()
    guarda.setItem(
      chave,
      JSON.stringify({
        revisaoBase: 0,
        obra: comTerreno([1, 1, 1])({ versao: 1, iglu: null, andar: null, terreno: null }),
      }),
    )
    const suporte = montar(espiada, guarda, { somenteLeitura: true })
    await suporte.obra.getState().carregar()
    expect(suporte.obra.getState()).toMatchObject({ obra: null, revisao: 0, situacao: 'pronta' })
    expect(suporte.obra.getState().mudar(comTerreno([2, 2, 2]))).toBe(false)
    expect(guarda.dados.has(chave)).toBe(true)

    const crianca = montar()
    await crianca.obra.getState().carregar()
    crianca.loja.setState({ visita: {} as never })
    await crianca.obra.getState().carregar()
    expect(crianca.obra.getState().mudar(comTerreno([2, 2, 2]))).toBe(false)
    expect([...espiada.pedidos, ...crianca.pedidos].filter((p) => p.metodo === 'PUT')).toEqual([])
  })

  test('obra fora do contrato não entra', async () => {
    const { obra, erros } = montar()
    await obra.getState().carregar()
    expect(obra.getState().mudar(comTerreno([1, 1, 1], [1, 1, 2]))).toBe(false)
    expect(obra.getState().obra).toBeNull()
    expect(erros).toEqual(['obra-estendida'])
  })
})

describe('obra estendida falsa', () => {
  test('troca por revisão, recusa o suporte e guarda no localStorage do playground', () => {
    const dados = new Map<string, string>()
    const persistencia = {
      ler: () => dados.get('o') ?? null,
      gravar: (v: string) => void dados.set('o', v),
    }
    let leitura = true
    const falsa = criarObraEstendidaFalsa({ somenteLeitura: () => !leitura, persistencia })
    const obra = { versao: 1, iglu: null, andar: null, terreno: null }
    expect(falsa.buscar('/obra-estendida', 'GET')).toEqual({
      status: 200,
      corpo: { revisao: 0, obra: null },
    })
    expect(falsa.buscar('/obra-estendida', 'PUT', { revisaoBase: 0, obra })?.status).toBe(200)
    const velho = falsa.buscar('/obra-estendida', 'PUT', { revisaoBase: 0, obra })
    expect(velho?.status).toBe(409)
    expect((velho?.corpo as { atual: unknown }).atual).toEqual({ revisao: 1, obra })
    expect(
      falsa.buscar('/obra-estendida', 'PUT', { revisaoBase: 1, obra: { ...obra, versao: 2 } })
        ?.status,
    ).toBe(400)
    leitura = false
    expect(falsa.buscar('/obra-estendida', 'PUT', { revisaoBase: 1, obra })?.status).toBe(403)
    expect(falsa.buscar('/fantasmas', 'GET')).toBeNull()
    const reaberta = criarObraEstendidaFalsa({ somenteLeitura: () => false, persistencia })
    expect(reaberta.buscar('/obra-estendida', 'GET')?.corpo).toEqual({ revisao: 1, obra })
  })
})
