import { describe, expect, test } from 'bun:test'
import {
  CELULAS_MOLDADAS_MAXIMO,
  criarSalvamentoInicial,
  MOVEIS,
  OBJETOS_DA_CASA,
  OBRA_ESTENDIDA_MAX_BYTES,
  type ObraEstendida,
  ObraEstendidaSchema,
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
import { loteDeCima } from '../src/sistemas/construcao/andar'
import { LOTE_DA_CASA_GRANDE, loteDaCabana } from '../src/sistemas/construcao/lote'

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
  let perdeNoPut = 0
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
        if (metodo === 'PUT' && perdeNoPut > 0) {
          // O serviço grava, mas a resposta não chega.
          perdeNoPut--
          await base.servico.buscar(caminho, opcoes)
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
    perderResposta(vezes = 1) {
      perdeNoPut = vezes
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

  test('o serviço gravou e a resposta se perdeu: reabrir reconhece a gravação e não perde o que veio depois (N1)', async () => {
    const espiada = plataformaEspiada()
    const guarda = guardaEmMemoria()
    const primeira = montar(espiada, guarda)
    await primeira.obra.getState().carregar()
    espiada.perderResposta()
    primeira.obra.getState().mudar(comTerreno([1, 1, 1]))
    await primeira.obra.getState().gravarAgora()
    expect(primeira.obra.getState().situacao).toBe('erro')
    // Depois da falha, mais uma mudança (A+B no aparelho).
    espiada.cair()
    primeira.obra.getState().mudar(comTerreno([2, 1, 1]))
    await primeira.obra.getState().gravarAgora()
    expect(JSON.parse(guarda.dados.get(chave) ?? 'null').obra.terreno.alturas).toHaveLength(2)
    // Reabriu: o serviço está com A na revisão 1, e A é a gravação que foi daqui.
    const segunda = montar(espiada, guarda)
    await segunda.obra.getState().carregar()
    expect(segunda.obra.getState()).toMatchObject({ revisao: 2, situacao: 'pronta' })
    expect(segunda.obra.getState().obra?.terreno?.alturas).toEqual([
      [1, 1, 1],
      [2, 1, 1],
    ])
    expect(segunda.loja.getState().dica?.texto).not.toBe(AVISO_DA_OBRA_DE_OUTRO_APARELHO)
    expect(segunda.obra.getState().recuperacao).toBeNull()
    expect(guarda.dados.has(chave)).toBe(false)
  })

  test('resposta perdida e edição durante o envio, sem reabrir: o 409 da própria gravação não apaga nada', async () => {
    const { obra, loja, perderResposta } = montar()
    await obra.getState().carregar()
    perderResposta()
    obra.getState().mudar(comTerreno([1, 1, 1]))
    const envio = obra.getState().gravarAgora()
    // Mudou enquanto ia.
    obra.getState().mudar(comTerreno([2, 1, 1]))
    await envio
    // O próximo envio vai sobre a revisão 0, o serviço responde 409 com a gravação daqui.
    await obra.getState().gravarAgora()
    await pausa()
    await obra.getState().gravarAgora()
    expect(obra.getState()).toMatchObject({ revisao: 2, situacao: 'pronta' })
    expect(obra.getState().obra?.terreno?.alturas).toEqual([
      [1, 1, 1],
      [2, 1, 1],
    ])
    expect(loja.getState().dica?.texto).not.toBe(AVISO_DA_OBRA_DE_OUTRO_APARELHO)
  })

  test('conflito de verdade: fica a de lá e a daqui fica guardada para voltar a ela', async () => {
    const { obra, outroAparelho, guarda } = montar()
    await obra.getState().carregar()
    const deLa = comTerreno([9, 9, 3])({ versao: 1, iglu: null, andar: null, terreno: null })
    expect((await outroAparelho(0, deLa)).status).toBe(200)
    obra.getState().mudar(comTerreno([1, 1, 1]))
    await obra.getState().gravarAgora()
    expect(obra.getState().obra).toEqual(deLa)
    const daqui = obra.getState().recuperacao
    expect(daqui?.terreno?.alturas).toEqual([[1, 1, 1]])
    expect(guarda.dados.has(`${chave}:recuperacao`)).toBe(true)
    // Voltar à daqui: vira a mudança nova, gravada sobre a de lá.
    expect(obra.getState().recuperar()).toBe(true)
    await obra.getState().gravarAgora()
    expect(obra.getState()).toMatchObject({ revisao: 2, situacao: 'pronta', recuperacao: null })
    expect(obra.getState().obra?.terreno?.alturas).toEqual([[1, 1, 1]])
    expect(guarda.dados.has(`${chave}:recuperacao`)).toBe(false)
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

describe('o documento cheio da obra estendida (plano do E04, "Verificação prevista")', () => {
  test('a maior obra que o jogo deixa fazer (iglu, andar e terreno nos tetos) cabe nos 32 KB', () => {
    // Os tetos do jogo: o lote do iglu (o de toda cabana), o lote de cima e as células moldadas.
    // As coordenadas e o comprimento são os mais compridos do contrato (-60 e 60), para o JSON
    // ser o maior possível; os objetos vão todos, embora a cabana não os use.
    const cabana = loteDaCabana('pico', { x0: -60, z0: -60, x1: 60, z1: 60 }).limites
    const cima = loteDeCima(LOTE_DA_CASA_GRANDE).limites
    const cel = (i: number) => ({ x: -60 + (i % 121), z: -60 + Math.floor(i / 121) })
    const trechos = (n: number) =>
      Array.from({ length: n }, (_, i) => ({ ...cel(i), eixo: 'x' as const, n: 60 }))
    const janelas = (n: number) =>
      Array.from({ length: n }, (_, i) => ({
        tipo: 'janela-redonda' as const,
        ...cel(i),
        eixo: 'x' as const,
      }))
    const pisos = (n: number) =>
      Array.from({ length: n }, (_, i) => ({ ...cel(i), tipo: 'ladrilho' as const }))
    const cheia: ObraEstendida = {
      versao: 1,
      iglu: {
        paredes: trechos(cabana.trechosDeParede),
        aberturas: janelas(cabana.aberturas),
        pisos: pisos(cabana.pisos),
        objetos: OBJETOS_DA_CASA.map((id, i) => ({ ...cel(i), id, giro: 3 })),
        cercas: trechos(cabana.trechosDeCerca),
        caminhos: Array.from({ length: cabana.caminhos }, (_, i) => ({
          ...cel(i),
          tipo: 'pedra' as const,
        })),
        canteiros: Array.from({ length: cabana.canteiros }, (_, i) => cel(i)),
        moveis: [],
      },
      andar: {
        escada: { x: -60, z: -60, giro: 3 },
        paredes: trechos(cima.trechosDeParede),
        aberturas: janelas(cima.aberturas),
        pisos: pisos(cima.pisos),
        // Os móveis dos cômodos de cima no teto, com o índice e as coordenadas mais compridos.
        moveis: Array.from({ length: cima.moveis }, () => [MOVEIS.length - 1, -60, -60, 3]),
      },
      terreno: {
        alturas: Array.from({ length: CELULAS_MOLDADAS_MAXIMO }, (_, i) => {
          const c = cel(i)
          return [c.x, c.z, 3] as [number, number, number]
        }),
      },
    }
    const bytes = new TextEncoder().encode(JSON.stringify(cheia)).byteLength
    expect(ObraEstendidaSchema.safeParse(cheia).success).toBe(true)
    expect(bytes).toBeLessThanOrEqual(OBRA_ESTENDIDA_MAX_BYTES)
  })
})
