import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import type { Obra } from '@sistemazero/arquipelago-contracts'
import type { Object3D } from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import {
  COLISORES_DA_BANCADA,
  COLISORES_DO_FAROL,
  colisoresDaCasa,
  colisoresDaHorta,
  colisoresDasArvores,
  deslocar,
  GRUPOS,
} from '../src/mundo/colisao-da-ilha-central'
import { type ColisorDaIlha, lerColisores } from '../src/mundo/colisores-da-ilha'
import { ALTURA_DA_TERRA, alturaDaIlha, CENTRO_DA_CASA, PORTA, QUARTO } from '../src/mundo/medidas'
import { ladoDaParede, planta } from '../src/sistemas/construcao/comodos'
import {
  aberturaNaAresta,
  arestaMaisPerto,
  arestasDoArrasto,
  chaveDaAresta,
  chavesDosTrechos,
  trechosDasChaves,
} from '../src/sistemas/construcao/grade'
import {
  LOTE_DA_CASA,
  naArea,
  noFixo,
  ocupante,
  QUARTO_NA_GRADE,
} from '../src/sistemas/construcao/lote'
import {
  apagarParede,
  esticarParede,
  porAbertura,
  type Resultado,
  tirarAbertura,
  trocarPiso,
} from '../src/sistemas/construcao/obra'
import {
  colisoresDaObra,
  NADA_CORTADO,
  pecasDaObra,
  TUDO_CORTADO,
} from '../src/sistemas/construcao/pecas'

const L = LOTE_DA_CASA
const inicial = (): Obra => structuredClone(L.obraInicial)

function ok(r: Resultado): Obra {
  if (!r.ok) throw new Error(`recusado: ${JSON.stringify(r)}`)
  return r.obra
}

/** Um cômodo na frente do quarto, fechado pela parede da frente dele (x -6 a -1, z 0 a 3). */
function comComodoNaFrente(): Obra {
  let o = inicial()
  o = ok(esticarParede(o, L, { x: -6, z: 0 }, { x: -6, z: 3 }))
  o = ok(esticarParede(o, L, { x: -6, z: 3 }, { x: -1, z: 3 }))
  return ok(esticarParede(o, L, { x: -1, z: 3 }, { x: -1, z: 0 }))
}

/** Um cômodo à direita do quarto, atrás da parede travada (x 6 a 8, z -6 a -2). */
function comComodoADireita(): Obra {
  let o = inicial()
  o = ok(esticarParede(o, L, { x: 6, z: -6 }, { x: 8, z: -6 }))
  o = ok(esticarParede(o, L, { x: 8, z: -6 }, { x: 8, z: -2 }))
  return ok(esticarParede(o, L, { x: 8, z: -2 }, { x: 6, z: -2 }))
}

describe('o lote da casa', () => {
  test('o quarto e a porta nova da grade são os do mundo', () => {
    expect(QUARTO_NA_GRADE).toEqual({
      x0: CENTRO_DA_CASA.x - QUARTO.largura / 2,
      z0: CENTRO_DA_CASA.z - QUARTO.fundo / 2,
      x1: CENTRO_DA_CASA.x + QUARTO.largura / 2,
      z1: CENTRO_DA_CASA.z + QUARTO.fundo / 2,
    })
    const porta = L.obraInicial.aberturas.find((a) => a.tipo === 'porta')
    // O meio da porta do kit (3 células) é o meio da porta nova do `casa.glb`.
    expect(porta && porta.x + 1.5).toBe(CENTRO_DA_CASA.x + PORTA.x)
    expect(porta?.z).toBe(QUARTO_NA_GRADE.z1)
  })

  test('toda célula livre do lote é plana: o piso nem fica enterrado nem solto', () => {
    const tortas: string[] = []
    for (let z = L.area.z0; z < L.area.z1; z++)
      for (let x = L.area.x0; x < L.area.x1; x++) {
        if (ocupante(L, { x, z }) || noFixo(L, { x, z })) continue
        for (let i = 0; i <= 4; i++)
          for (let j = 0; j <= 4; j++) {
            const h = alturaDaIlha(x + i / 4, z + j / 4) - ALTURA_DA_TERRA
            // O topo do piso fica 0,02 acima da terra e ele tem 0,10 de espessura.
            if (h > 0.02 || h < -0.15) tortas.push(`${x},${z}`)
          }
      }
    expect([...new Set(tortas)]).toEqual([])
  })

  test('todo colisor que cai no lote está numa célula ocupada', async () => {
    const carregar = async (arquivo: string): Promise<Object3D> => {
      const buf = readFileSync(join(import.meta.dir, '..', 'src', 'assets', 'mundo', arquivo))
      const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength)
      return (await new GLTFLoader().parseAsync(ab, '')).scene
    }
    const colisores: ColisorDaIlha[] = [
      ...colisoresDaHorta(),
      ...deslocar(COLISORES_DA_BANCADA, GRUPOS.bancada),
      ...deslocar(COLISORES_DO_FAROL, GRUPOS.farol),
      ...colisoresDasArvores(),
      ...lerColisores(await carregar('terreno.glb')),
      ...deslocar(lerColisores(await carregar('farol.glb')), GRUPOS.farol),
    ]
    const soltos: string[] = []
    for (const c of colisores) {
      if (c.forma === 'malha') continue
      const [mx, , mz] =
        c.forma === 'caixa' ? c.meio.map((m) => m * Math.SQRT2) : [c.raio, 0, c.raio]
      const [px, , pz] = c.posicao
      for (let z = Math.floor(pz - (mz ?? 0)); z <= Math.floor(pz + (mz ?? 0) - 1e-6); z++)
        for (let x = Math.floor(px - (mx ?? 0)); x <= Math.floor(px + (mx ?? 0) - 1e-6); x++) {
          if (!naArea(L.area, { x, z })) continue
          if (!ocupante(L, { x, z }) && !noFixo(L, { x, z })) soltos.push(`${c.nome} em ${x},${z}`)
        }
    }
    expect(soltos).toEqual([])
  })
})

describe('a grade', () => {
  test('arestas viram trechos juntados, sempre na mesma ordem', () => {
    const chaves = chavesDosTrechos([
      { x: 2, z: 0, eixo: 'x', n: 2 },
      { x: 0, z: 0, eixo: 'x', n: 2 },
      { x: 0, z: 0, eixo: 'z', n: 1 },
    ])
    expect(trechosDasChaves(chaves)).toEqual([
      { x: 0, z: 0, eixo: 'x', n: 4 },
      { x: 0, z: 0, eixo: 'z', n: 1 },
    ])
  })

  test('arrastar anda reto pelo eixo em que mais andou', () => {
    expect(arestasDoArrasto({ x: 3, z: 1 }, { x: 0, z: 2 })).toEqual([
      { eixo: 'x', x: 0, z: 1 },
      { eixo: 'x', x: 1, z: 1 },
      { eixo: 'x', x: 2, z: 1 },
    ])
    expect(arestasDoArrasto({ x: 1, z: 1 }, { x: 1, z: 1 })).toEqual([])
    expect(arestasDoArrasto({ x: 0, z: 0 }, { x: 1, z: -2 })).toHaveLength(2)
  })

  test('o toque cai na aresta mais perto; a abertura fica com o meio nela', () => {
    expect(arestaMaisPerto(2.4, 0.1)).toEqual({ eixo: 'x', x: 2, z: 0 })
    expect(arestaMaisPerto(5.95, -3.3)).toEqual({ eixo: 'z', x: 6, z: -4 })
    expect(aberturaNaAresta('porta', { eixo: 'x', x: 2, z: 0 })).toEqual({
      tipo: 'porta',
      eixo: 'x',
      x: 1,
      z: 0,
    })
    expect(aberturaNaAresta('janela-arco', { eixo: 'z', x: 6, z: -4 }).z).toBe(-4)
  })
})

describe('paredes e cômodos', () => {
  test('a obra inicial: o quarto é um cômodo só, fechado pelas paredes travadas e fixas', () => {
    const p = planta(inicial(), L)
    expect(p.comodos).toHaveLength(1)
    expect(p.comodos[0]?.quarto).toBe(true)
    expect(p.comodos[0]?.celulas).toHaveLength(12 * 8)
  })

  test('três paredes fecham um cômodo novo com a parede do quarto; nasce com piso de tábua', () => {
    const p = planta(comComodoNaFrente(), L)
    expect(p.comodos).toHaveLength(2)
    const novo = p.comodos.find((c) => !c.quarto)
    expect(novo?.celulas).toHaveLength(15)
    expect(novo?.piso).toBe('tabua')
  })

  test('lambri com a fachada para fora; parede entre dois cômodos é lisa', () => {
    const p = planta(comComodoADireita(), L)
    // A parede de cima do cômodo novo (z -6): dentro fica em +z.
    expect(ladoDaParede(p, chaveDaAresta({ eixo: 'x', x: 6, z: -6 }))).toEqual({
      familia: 'lambri',
      dentro: 1,
    })
    // A da direita (x 8): dentro em -x.
    expect(ladoDaParede(p, chaveDaAresta({ eixo: 'z', x: 8, z: -5 }))).toEqual({
      familia: 'lambri',
      dentro: -1,
    })
    // A do quarto entre os dois: lisa.
    expect(ladoDaParede(p, chaveDaAresta({ eixo: 'z', x: 6, z: -4 })).familia).toBe('lisa')
    // A do quarto fora do cômodo novo continua lambri.
    expect(ladoDaParede(p, chaveDaAresta({ eixo: 'z', x: 6, z: -8 })).familia).toBe('lambri')
  })

  test('não dá para construir em cima da varanda, dentro do quarto nem fora do lote', () => {
    const o = inicial()
    expect(esticarParede(o, L, { x: 0, z: 1 }, { x: 4, z: 1 })).toMatchObject({
      ok: false,
      motivo: 'ocupado',
      nome: 'a varanda',
    })
    expect(esticarParede(o, L, { x: 0, z: -4 }, { x: 3, z: -4 })).toMatchObject({
      ok: false,
      motivo: 'dentro-do-quarto',
    })
    expect(esticarParede(o, L, { x: 10, z: -10 }, { x: 16, z: -10 })).toMatchObject({
      ok: false,
      motivo: 'fora-do-lote',
    })
  })

  test('fechar a varanda dentro de casa é recusado', () => {
    let o = inicial()
    o = ok(esticarParede(o, L, { x: -1, z: 0 }, { x: -1, z: 3 }))
    o = ok(esticarParede(o, L, { x: -1, z: 3 }, { x: 6, z: 3 }))
    expect(esticarParede(o, L, { x: 6, z: 3 }, { x: 6, z: 0 })).toMatchObject({
      ok: false,
      motivo: 'fecha-ocupado',
      nome: 'a varanda',
    })
  })

  test('as moitas do terreno ocupam o lugar', () => {
    expect(esticarParede(inicial(), L, { x: -10, z: -7 }, { x: -6, z: -7 })).toMatchObject({
      ok: false,
      motivo: 'ocupado',
      nome: 'a moita',
    })
  })

  test('apagar tira paredes e as portas delas; as do quarto ficam', () => {
    let o = comComodoNaFrente()
    o = ok(porAbertura(o, L, 'porta', { eixo: 'z', x: -6, z: 1 }))
    const apagada = ok(apagarParede(o, L, arestasDoArrasto({ x: -6, z: 0 }, { x: -6, z: 3 })))
    expect(apagada.aberturas.some((a) => a.x === -6 && a.eixo === 'z')).toBe(false)
    expect(planta(apagada, L).comodos).toHaveLength(1)
    expect(apagarParede(inicial(), L, [{ eixo: 'x', x: -3, z: 0 }])).toMatchObject({
      ok: false,
      motivo: 'parede-do-quarto',
    })
  })

  test('o piso do cômodo inteiro troca; no quarto não', () => {
    const o = ok(trocarPiso(comComodoNaFrente(), L, { x: -4, z: 1 }, 'ladrilho'))
    expect(planta(o, L).comodos.find((c) => !c.quarto)?.piso).toBe('ladrilho')
    const deNovo = ok(trocarPiso(o, L, { x: -5, z: 2 }, 'azulejo'))
    expect(deNovo.pisos).toEqual([{ x: -5, z: 2, tipo: 'azulejo' }])
    expect(trocarPiso(o, L, { x: 0, z: -4 }, 'azulejo')).toMatchObject({ motivo: 'no-quarto' })
    expect(trocarPiso(o, L, { x: 10, z: 6 }, 'azulejo')).toMatchObject({
      motivo: 'fora-de-comodo',
    })
  })
})

describe('portas e janelas', () => {
  test('a porta nova no quarto: o resto da casa nasce dela', () => {
    // A janela do lado sai e a porta entra no lugar dela.
    const semJanela = ok(tirarAbertura(comComodoADireita(), { eixo: 'z', x: 6, z: -5 }))
    const o = ok(porAbertura(semJanela, L, 'porta', { eixo: 'z', x: 6, z: -4 }))
    expect(o.aberturas.at(-1)).toEqual({ tipo: 'porta', eixo: 'z', x: 6, z: -5 })
  })

  test('na parede fixa, sem parede, em emenda e em cima de outra: não', () => {
    const o = comComodoADireita()
    expect(porAbertura(o, L, 'porta', { eixo: 'z', x: -6, z: -4 })).toMatchObject({
      motivo: 'parede-fixa',
    })
    expect(porAbertura(o, L, 'porta', { eixo: 'x', x: 10, z: 5 })).toMatchObject({
      motivo: 'sem-parede',
    })
    // A parede de baixo do cômodo novo chega na do quarto em (6, -2): porta com o meio ali, não.
    expect(porAbertura(o, L, 'porta', { eixo: 'z', x: 6, z: -2 })).toMatchObject({
      motivo: 'encontro-de-paredes',
    })
    expect(porAbertura(o, L, 'janela-redonda', { eixo: 'x', x: 2, z: 0 })).toMatchObject({
      motivo: 'ja-tem-abertura',
    })
  })

  test('tirar a abertura deixa a parede', () => {
    const o = ok(tirarAbertura(inicial(), { eixo: 'x', x: 2, z: 0 }))
    expect(o.aberturas.some((a) => a.tipo === 'porta')).toBe(false)
    expect(o.paredes).toEqual(inicial().paredes)
  })
})

describe('as peças do kit', () => {
  test('a obra inicial: paredes de lambri do quarto com a porta e as janelas, e três quinas', () => {
    const p = planta(inicial(), L)
    const { paredes, quinas, folhas, pisos } = pecasDaObra(inicial(), p, NADA_CORTADO)
    const nos = paredes.map((x) => x.no)
    expect(nos.filter((n) => n === 'parede-porta-lambri')).toHaveLength(1)
    expect(nos.filter((n) => n === 'parede-janela-grande-lambri')).toHaveLength(2)
    expect(nos.filter((n) => n === 'parede-lambri')).toHaveLength(6 + 5)
    const porta = paredes.find((x) => x.no === 'parede-porta-lambri')
    expect(porta).toMatchObject({ x: 2.5, z: 0, giro: 0 })
    // A parede da direita tem o quarto em -x: gira +90°.
    const janelaDoLado = paredes.find((x) => x.no === 'parede-janela-grande-lambri' && x.x === 6)
    expect(janelaDoLado?.giro).toBeCloseTo(Math.PI / 2)
    expect(janelaDoLado?.z).toBe(-4.5)
    expect(folhas).toEqual([expect.objectContaining({ no: 'porta', x: 2.5, z: 0 })])
    expect(quinas.map((q) => `${q.no} ${q.x},${q.z}`).sort()).toEqual([
      'quina-lambri -6,0',
      'quina-lambri 6,-8',
      'quina-lambri 6,0',
    ])
    expect(pisos).toEqual([])
  })

  test('cortadas: as peças baixas, a porta sem folha e a janela vira parede baixa', () => {
    const p = planta(inicial(), L)
    const { paredes, folhas, quinas } = pecasDaObra(inicial(), p, TUDO_CORTADO)
    expect(folhas).toEqual([])
    expect(paredes.some((x) => x.no === 'parede-porta-lambri-baixa')).toBe(true)
    expect(paredes.some((x) => x.no.startsWith('parede-janela'))).toBe(false)
    expect(paredes.filter((x) => x.no === 'parede-lambri-baixa')).toHaveLength(6 + 5 + 6)
    // Encontro com a parede fixa (em pé): a quina fica alta.
    expect(quinas.find((q) => q.x === -6)?.no).toBe('quina-lambri')
    expect(quinas.find((q) => q.x === 6 && q.z === 0)?.no).toBe('quina-lambri-baixa')
  })

  test('cômodo novo: piso em todas as células e parede lisa entre os dois', () => {
    const o = comComodoADireita()
    const { pisos, paredes } = pecasDaObra(o, planta(o, L), NADA_CORTADO)
    expect(pisos).toHaveLength(8)
    expect(pisos[0]?.no).toBe('piso-tabua')
    // Entre o quarto e o cômodo novo: a janela do lado vira janela de dentro, sem veneziana.
    expect(paredes.filter((x) => x.no === 'parede-lisa')).toHaveLength(1)
    expect(paredes.filter((x) => x.no === 'parede-janela-grande-lisa')).toHaveLength(1)
  })

  test('a colisão deixa o vão da porta livre e fecha o resto', () => {
    const o = inicial()
    const caixas = colisoresDaObra(o, planta(o, L))
    const dentro = (x: number, y: number, z: number) =>
      caixas.some(
        (c) =>
          Math.abs(x - c.posicao[0]) <= c.meio[0] &&
          Math.abs(y - c.posicao[1]) <= c.meio[1] &&
          Math.abs(z - c.posicao[2]) <= c.meio[2],
      )
    expect(dentro(2.5, 1, 0)).toBe(false)
    expect(dentro(2.5, 3.5, 0)).toBe(true)
    expect(dentro(-5, 1, 0)).toBe(true)
    expect(dentro(6, 1, -7)).toBe(true)
    // A parede fixa do quarto colide pela casa de antes.
    expect(dentro(-6, 1, -4)).toBe(false)
  })
})

describe('a casa construída', () => {
  test('a frente e a direita do quarto colidem pelo kit; a esquerda, o fundo e a varanda ficam', () => {
    const nomes = colisoresDaCasa(true, true).map((c) => c.nome)
    for (const n of [
      'col-parede-frente-1',
      'col-parede-direita',
      'col-porta-aberta',
      'col-floreira-lado',
    ])
      expect(nomes).not.toContain(n)
    for (const n of ['col-parede-esquerda', 'col-parede-fundo', 'col-quina-1', 'col-coluna-1'])
      expect(nomes).toContain(n)
    expect(colisoresDaCasa(true).map((c) => c.nome)).toContain('col-parede-frente-1')
  })
})
