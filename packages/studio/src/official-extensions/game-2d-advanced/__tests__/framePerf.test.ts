import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import {
  type CanvasSpy,
  type Harness,
  installCanvasSpy,
  loadRuntime,
  startPlaying,
} from './kitHarness'

/**
 * A SONDA DE TRABALHO do quadro, travada nos números de HOJE.
 *
 * ⚠️ Não são milissegundos DE PROPÓSITO. Relógio em CI é ruído (agente lento
 * pinta de vermelho código que não mudou), e o que um lote de desempenho precisa
 * provar é que o TRABALHO caiu. Estes contadores são determinísticos: mesma
 * cena, mesmo número, em qualquer máquina.
 *
 * O contrato tem duas direções:
 *  - lote que NÃO é de desempenho tem que deixar tudo igual;
 *  - lote QUE É de desempenho tem que BAIXAR o número e trocar a linha aqui,
 *    com o comentário dizendo o quanto e por quê.
 *
 * Hoje, medido nesta cena: 90 mil pares num quadro de dois enxames cheios é o
 * que o `overlapGroups` examina sem índice espacial, e a varredura do `seen` no
 * overlay é quadrática no número de personagens.
 */

interface Sonda {
  quadros: number
  passos: number
  pares: number
  caixas: number
  visitas: number
  linhasDeMapa: number
}

interface Cena {
  h: Harness
  spy: CanvasSpy & { restore: () => void }
  perf: (zerar?: boolean) => Sonda
}

/** Guarda a cena em `atual` para o `afterEach` desmontar o espião do canvas. */
async function cena(windowOverrides: Record<string, unknown> = {}): Promise<Cena> {
  const spy = installCanvasSpy()
  const inspectors: Record<string, (zerar?: boolean) => unknown> = {}
  const h = loadRuntime({ ...windowOverrides, __SZSTUDIO_RUNTIME_INSPECTORS: inspectors })
  await startPlaying(h, 400, 300)
  const porta = inspectors['game-2d-advanced:perf']
  if (typeof porta !== 'function') throw new Error('a sonda de desempenho não registrou')
  atual = { h, spy, perf: (zerar) => porta(zerar) as Sonda }
  return atual
}

const QUADRO_MS = 1000 / 60

let atual: Cena | null = null

beforeEach(() => {
  document.body.innerHTML = ''
})

afterEach(() => {
  atual?.spy.restore()
  atual = null
})

describe('gk — a sonda de trabalho do quadro', () => {
  it('conta um quadro e um passo por volta do laço', async () => {
    const c = await cena()
    c.perf(true)

    for (let i = 1; i <= 10; i += 1) c.h.nextFrame(i * QUADRO_MS)

    const s = c.perf()
    expect(s.quadros).toBe(10)
    expect(s.passos).toBe(10)
  })

  it('⭐ o overlay NÃO é mais quadrático no número de personagens', async () => {
    const c = await cena()
    c.h.api.defineMold('tiro', { w: 6, h: 6 })
    c.h.api.defineMold('bicho', { w: 10, h: 10 })
    for (let i = 0; i < 4; i += 1) {
      c.h.api.spawnFromMold('tiro', 20 + i * 10, 40)
      c.h.api.spawnFromMold('bicho', 20 + i * 10, 90)
    }
    for (let i = 0; i < 3; i += 1) c.h.api.createCharacter({ w: 12, h: 16 })
    c.h.api.showHitboxes()

    c.spy.clear()
    c.perf(true)
    c.h.nextFrame(QUADRO_MS)

    const s = c.perf()
    // 8 do pool + 3 personagens = 11 visitas, 11 caixas: ninguém está em duas
    // listas nesta cena, então não há o que de-duplicar.
    expect(s.visitas).toBe(11)
    expect(s.caixas).toBe(11)
    // ⭐ A de-duplicação era `indexOf` numa lista que cresce — 0+1+…0 = 55
    // comparações para ONZE personagens, quadrático. Virou carimbo de passada.
    // Medido no cenário grande: 3200 entidades saíram de 1,40 ms por quadro para
    // 0,146 ms — 9,6×.
    //
    // ⚠️ O contador antigo (`comparacoes`) morreu junto com o algoritmo: depois
    // do conserto ele não tinha um só site de escrita, e `toBe(0)` passava por
    // VÁCUO em dois testes. Era exatamente o "número decorativo" contra o qual o
    // comentário ao lado avisava.
    // ⚠️ Anti-vácuo, e é ele que impede a sonda de virar número decorativo: o
    // contador tem que casar com o que o contexto 2D de fato recebeu.
    expect(c.spy.strokes.length + c.spy.arcs.length).toBe(s.caixas)
  })

  it('sem o raio-X ligado o overlay não custa NADA', async () => {
    const c = await cena()
    c.h.api.defineMold('tiro', { w: 6, h: 6 })
    for (let i = 0; i < 4; i += 1) c.h.api.spawnFromMold('tiro', 20 + i * 10, 40)

    c.perf(true)
    c.h.nextFrame(QUADRO_MS)

    const s = c.perf()
    expect(s.caixas).toBe(0)
    expect(s.visitas).toBe(0)
  })

  it('⭐⭐ o "para cada par" CORTA o trabalho', async () => {
    const c = await cena()
    c.h.api.defineMold('tiro', { w: 4, h: 4 })
    c.h.api.defineMold('bicho', { w: 4, h: 4 })
    // Lado a lado sem se tocar (5 px de folga): é exatamente o caso que o índice
    // ataca — 40 × 40 = 1600 pares examinados sem ele, e só os vizinhos com ele.
    for (let i = 0; i < 40; i += 1) {
      c.h.api.spawnFromMold('tiro', i * 19, 10)
      c.h.api.spawnFromMold('bicho', i * 19 + 9, 10)
    }

    c.perf(true)
    let encostoes = 0
    c.h.api.overlapGroups('tiro', 'bicho', () => {
      encostoes += 1
    })

    expect(encostoes).toBe(0)
    // ⭐ 1600 → 150. Medido no cenário grande, que é o que a criança sente:
    // 300 × 300 espalhados saíram de 20,3 ms por quadro para 0,295 ms — 80×;
    // com caixa redonda, de 33,6 ms para ~0,3 ms.
    //
    // ⚠️ 150 e não 0: os vizinhos EXISTEM neste cenário (as duas listas dividem
    // a mesma faixa de células). Um índice que devolvesse lista vazia daria
    // zero aqui e passaria — por isso a régua é o número exato.
    expect(c.perf().pares).toBe(150)
  })

  it('⚠️ o LIMIAR é exato: 39 × 40 fica no laço duplo, 40 × 40 liga o índice', async () => {
    // ANTI-VÁCUO do corte. Sem ele, um contador travado em zero passaria no
    // teste acima e daria a impressão de que o índice está funcionando.
    const c = await cena()
    c.h.api.defineMold('a', { w: 4, h: 4 })
    c.h.api.defineMold('b', { w: 4, h: 4 })
    for (let i = 0; i < 39; i += 1) c.h.api.spawnFromMold('a', i * 9, 10)
    for (let i = 0; i < 40; i += 1) c.h.api.spawnFromMold('b', i * 9, 200)

    c.perf(true)
    c.h.api.overlapGroups('a', 'b', () => {})
    // 39 × 40 = 1560, abaixo do limiar: o laço duplo roda inteiro.
    expect(c.perf(true).pares).toBe(1560)

    c.h.api.spawnFromMold('a', 39 * 9, 10)
    c.h.api.overlapGroups('a', 'b', () => {})
    // 40 × 40 = 1600, exatamente o limiar: o índice entra e o trabalho despenca.
    expect(c.perf().pares).toBeLessThan(200)
  })

  it('⚠️ o círculo com raio MAIOR que a caixa continua acertando', async () => {
    // ANTI-VÁCUO do RECORTE, e nenhum outro caso exercita esta geometria: o
    // bloco "forma redonda, raio 40" num sprite 32×32 põe o círculo 24 px para
    // FORA da caixa. Um índice que recortasse pela caixa rejeitaria acerto de
    // verdade — e o modo de falha é MUDO: o jogo só deixa de contar ponto.
    const c = await cena()
    c.h.api.defineMold('bola', { w: 32, h: 32 })
    c.h.api.defineMold('alvo', { w: 4, h: 4 })
    // 40 bolas longe umas das outras, para o limiar do índice ser cruzado.
    for (let i = 0; i < 40; i += 1) {
      const bola = c.h.api.spawnFromMold('bola', 300 + i * 200, 300)
      c.h.api.setHitboxShape(bola, 'circulo', 40)
    }
    // O alvo fica 36 px à direita da PRIMEIRA bola: fora da caixa (que acaba em
    // +32) e dentro do círculo (que alcança +40 a partir do centro, ou seja +56).
    for (let i = 0; i < 40; i += 1) c.h.api.spawnFromMold('alvo', 900 + i * 500, 900)
    const perto = c.h.api.spawnFromMold('alvo', 300 + 36 + 16, 300 + 14)

    const acertos: unknown[] = []
    c.h.api.overlapGroups('bola', 'alvo', (_a: unknown, b: unknown) => {
      acertos.push(b)
    })

    expect(acertos).toContain(perto)
  })

  it('⚠️ o mesmo molde nos DOIS lados dispara cada par DUAS vezes, como sempre', async () => {
    // ANTI-VÁCUO da equivalência. O irmão g2d corta com `sameGroup && index >= i`,
    // e copiar isso aqui faria metade dos jogos de molde único sentir que "parou
    // de contar". A dobra é o comportamento de hoje, e é ele que fica travado.
    const c = await cena()
    c.h.api.defineMold('bolha', { w: 40, h: 40 })
    const bolhas = [
      c.h.api.spawnFromMold('bolha', 100, 100),
      c.h.api.spawnFromMold('bolha', 110, 100),
    ]

    const pares: string[] = []
    c.h.api.overlapGroups('bolha', 'bolha', (a: unknown, b: unknown) => {
      pares.push(`${bolhas.indexOf(a as never)}-${bolhas.indexOf(b as never)}`)
    })

    expect(pares).toEqual(['1-0', '0-1'])
  })

  it('⭐⭐ com e sem índice o corpo recebe os MESMOS pares, na MESMA ordem', async () => {
    // A equivalência assere ORDEM, e não só conjunto: a parada quando o A é
    // recolhido torna a ordem observável no placar da criança.
    const emGrade = (c: Awaited<ReturnType<typeof cena>>, quantos: number): string[] => {
      c.h.api.defineMold('tiro', { w: 12, h: 12 })
      c.h.api.defineMold('bicho', { w: 12, h: 12 })
      const ids = new Map<unknown, string>()
      for (let i = 0; i < quantos; i += 1) {
        ids.set(c.h.api.spawnFromMold('tiro', (i % 8) * 14, Math.floor(i / 8) * 14), `t${i}`)
        ids.set(
          c.h.api.spawnFromMold('bicho', (i % 8) * 14 + 4, Math.floor(i / 8) * 14 + 4),
          `b${i}`,
        )
      }
      const saida: string[] = []
      c.h.api.overlapGroups('tiro', 'bicho', (a: unknown, b: unknown) => {
        saida.push(`${ids.get(a)}>${ids.get(b)}`)
      })
      return saida
    }

    // 12 × 12 = 144 pares: abaixo do limiar, laço duplo.
    const semIndice = emGrade(await cena(), 12)
    atual?.spy.restore()
    document.body.innerHTML = ''
    // 40 × 40 = 1600: o índice entra. A grade de 12 continua dentro dos 40.
    const comIndice = emGrade(await cena(), 40).filter((par) => {
      const [a, b] = par.split('>')
      return Number(a?.slice(1)) < 12 && Number(b?.slice(1)) < 12
    })

    expect(comIndice.length).toBeGreaterThan(0)
    expect(comIndice).toEqual(semIndice)
  })

  it('⭐⭐ mover B no callback tem a MESMA semântica dos dois lados do limiar', async () => {
    const acertosCom = (c: Cena, quantosA: number): number => {
      c.h.api.defineMold('a', { w: 4, h: 4 })
      c.h.api.defineMold('b', { w: 4, h: 4 })
      for (let i = 0; i < quantosA; i += 1) c.h.api.spawnFromMold('a', i * 200, 10)
      for (let i = 0; i < 39; i += 1) c.h.api.spawnFromMold('b', i * 200, 10_000)
      const movido = c.h.api.spawnFromMold('b', (quantosA - 1) * 200, 10)
      let acertos = 0
      c.h.api.overlapGroups('a', 'b', () => {
        acertos += 1
        if (acertos === 1) c.h.api.placeCharacter(movido, (quantosA - 2) * 200, 10)
      })
      return acertos
    }

    const abaixo = acertosCom(await cena(), 39)
    atual?.spy.restore()
    atual = null
    document.body.innerHTML = ''
    const noLimiar = acertosCom(await cena(), 40)

    expect({ abaixo, noLimiar }).toEqual({ abaixo: 1, noLimiar: 1 })
  })

  it('o jogo comum não paga a varredura de LINHAS do mapa', async () => {
    // A varredura O(linhas) do `drawTilemap` vive atrás do ramo do mapa-cenário
    // do RPG. Travar o zero aqui é o que morde se alguém a tirar do ramo: num
    // mapa 512² ela custa 1,8 µs por desenho, todo quadro, para nada.
    //
    // O teste positivo logo abaixo cobre o cache; aqui fica travado que o jogo
    // comum nem entra nesse ramo do mapa-cenário do RPG.
    const c = await cena()
    for (let i = 1; i <= 5; i += 1) c.h.nextFrame(i * QUADRO_MS)

    expect(c.perf().linhasDeMapa).toBe(0)
  })

  it('⭐ o cache do mapa CONTA a primeira varredura e não conta a segunda', async () => {
    const c = await cena({
      __SZGAME_ASSET_META: {
        mapa: {
          tilemap: {
            grid: '1 1 1\n1 1 1',
            solid: [],
            tileSize: 16,
            tileset: { dataUrl: 'data:image/png;base64,AA==' },
          },
        },
      },
    })
    c.h.api.loadTilemap('chao', 'mapa')
    c.h.api.rpgCreateMap('vila', 3, 2, () => {})
    c.h.api.rpgGoMap('vila')
    c.perf(true)

    c.h.api.drawTilemap('chao', 'chão')
    expect(c.perf().linhasDeMapa).toBe(2)

    c.h.api.drawTilemap('chao', 'chão')
    expect(c.perf().linhasDeMapa).toBe(2)
  })
})
