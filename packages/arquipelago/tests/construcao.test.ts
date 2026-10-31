import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import type { Obra } from '@sistemazero/arquipelago-contracts'
import { BoxGeometry, Color, Group, Mesh, MeshStandardMaterial, type Object3D } from 'three'
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
import { type ColisorDaIlha, lerColisores, soParaOCorpo } from '../src/mundo/colisores-da-ilha'
import {
  ALTURA_DA_TERRA,
  alturaDaIlha,
  CENTRO_DA_CASA,
  CHAO_DO_LOTE,
  PORTA,
  QUARTO,
} from '../src/mundo/medidas'
import {
  coresDoMeuQuarto,
  MATERIAL_DE_DENTRO,
  materiaisDoMeuQuarto,
  penduradosDoQuarto,
  pintarLado,
} from '../src/mundo/quarto-na-obra'
import { QUARTO_DE_EXEMPLO } from '../src/plataforma/falsa'
import { obraDeExemploComFundo } from '../src/plataforma/obra-de-exemplo'
import { ladoDaParede, planta } from '../src/sistemas/construcao/comodos'
import {
  entradaDaObra,
  frenteDaEntrada,
  ocupadasDaObra,
  retanguloDaVaranda,
} from '../src/sistemas/construcao/entrada'
import { falaDaRecusa, falaDoAviso, motivoDaPrevia } from '../src/sistemas/construcao/falas'
import { type Escolhas, toque } from '../src/sistemas/construcao/ferramentas'
import {
  aberturaNaAresta,
  arestaMaisPerto,
  arestasDoArrasto,
  chaveDaAresta,
  chavesDosTrechos,
  trechosDasChaves,
} from '../src/sistemas/construcao/grade'
import {
  comPenduradosDoQuarto,
  LOTE_DA_CASA,
  naArea,
  noFixo,
  ocupante,
  QUARTO_NA_GRADE,
} from '../src/sistemas/construcao/lote'
import {
  apagarParede,
  esticarParede,
  moverEntrada,
  porAbertura,
  type Recusa,
  type Resultado,
  tirarAbertura,
  trocarPiso,
} from '../src/sistemas/construcao/obra'
import {
  COLISOR_DA_PAREDE_CORTADA,
  colisoresDaObra,
  colisoresDaVaranda,
  NADA_CORTADO,
  NO_DA_JANELA,
  pecasDaObra,
  pecasDaVaranda,
  TUDO_CORTADO,
} from '../src/sistemas/construcao/pecas'
import { porCanteiro } from '../src/sistemas/construcao/quintal'
import {
  paredesCortadasNoViver,
  retanguloDoComodo,
  telhadoDoComodo,
  telhadosDaObra,
} from '../src/sistemas/construcao/telhado'

const L = LOTE_DA_CASA
const ESCOLHAS: Escolhas = {
  janela: 'janela-redonda',
  piso: 'tabua',
  caminho: 'pedra',
  objeto: null,
  movel: null,
  giro: 0,
}
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

/** Um cômodo atrás do quarto, fechado pelo fundo dele (x 1 a 6, z -12 a -8). */
function comComodoAtras(): Obra {
  let o = inicial()
  o = ok(esticarParede(o, L, { x: 1, z: -8 }, { x: 1, z: -12 }))
  o = ok(esticarParede(o, L, { x: 1, z: -12 }, { x: 6, z: -12 }))
  return ok(esticarParede(o, L, { x: 6, z: -12 }, { x: 6, z: -8 }))
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
    expect(esticarParede(o, L, { x: 2, z: 11 }, { x: 6, z: 11 })).toMatchObject({
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

  test('o pé do farol ocupa o lugar; o resto do lote é livre (sem árvore, moita nem horta)', () => {
    expect(esticarParede(inicial(), L, { x: -14, z: -10 }, { x: -10, z: -10 })).toMatchObject({
      ok: false,
      motivo: 'ocupado',
      nome: 'o farol',
    })
    // A varanda segue a porta de entrada da obra (31/10/2026): na obra inicial, na frente da porta nova.
    expect(L.ocupadas.map((o) => o.nome)).toEqual(['o farol'])
    expect(ocupadasDaObra(inicial(), L)).toEqual([
      { nome: 'a varanda', ret: { x0: 0, z0: 0, x1: 5, z1: 2 } },
      ...L.ocupadas,
    ])
    expect(L.area).toEqual(CHAO_DO_LOTE)
    // Os cantos do lote, longe do quarto, aceitam parede.
    expect(esticarParede(inicial(), L, { x: 10, z: -13 }, { x: 15, z: -13 }).ok).toBe(true)
    expect(esticarParede(inicial(), L, { x: -14, z: 9 }, { x: -8, z: 9 }).ok).toBe(true)
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

  test('sem parede, em emenda e em cima de outra: não', () => {
    const o = comComodoADireita()
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

  test('as quatro paredes do quarto aceitam porta e janela; o fundo e a esquerda não se apagam', () => {
    const atras = comComodoAtras()
    const noFundo = ok(porAbertura(atras, L, 'porta', { eixo: 'x', x: 3, z: -8 }))
    expect(noFundo.aberturas.at(-1)).toEqual({ tipo: 'porta', eixo: 'x', x: 2, z: -8 })
    // O salvamento não ganha as paredes do quarto: só a porta.
    expect(noFundo.paredes).toEqual(atras.paredes)
    const naEsquerda = ok(porAbertura(inicial(), L, 'porta', { eixo: 'z', x: -6, z: -4 }))
    expect(naEsquerda.aberturas.at(-1)).toEqual({ tipo: 'porta', eixo: 'z', x: -6, z: -5 })
    expect(porAbertura(inicial(), L, 'janela-arco', { eixo: 'x', x: -3, z: -8 }).ok).toBe(true)
    // Apagar não tira o fundo nem a esquerda (nem arrastando, nem num toque).
    expect(
      apagarParede(noFundo, L, arestasDoArrasto({ x: -6, z: -8 }, { x: 6, z: -8 })),
    ).toMatchObject({
      ok: false,
      motivo: 'parede-do-quarto',
    })
    expect(
      toque('apagar', inicial(), L, { x: -6.1, z: -3.5 }, ESCOLHAS, []).resultado,
    ).toMatchObject({ ok: false, motivo: 'parede-do-quarto' })
    // Apagar uma parede do cômodo de trás abre o cômodo, mas a porta do fundo fica.
    const aberto = ok(
      apagarParede(noFundo, L, arestasDoArrasto({ x: 1, z: -12 }, { x: 6, z: -12 })),
    )
    expect(aberto.aberturas).toContainEqual({ tipo: 'porta', eixo: 'x', x: 2, z: -8 })
    // Dentro do quarto continua não indo parede.
    expect(esticarParede(inicial(), L, { x: 0, z: -4 }, { x: 3, z: -4 })).toMatchObject({
      motivo: 'dentro-do-quarto',
    })
  })

  test('nas arestas de um quadro do Meu quarto, porta e janela vão mais para o lado', () => {
    // O letreiro do quarto de exemplo (fundo, u 4, 2 de largura) e a janela pendurada (esquerda, u 2).
    const comQuadros = comPenduradosDoQuarto(L, penduradosDoQuarto(QUARTO_DE_EXEMPLO))
    expect([...(comQuadros.penduradosDoQuarto ?? [])].sort()).toEqual(
      [
        chaveDaAresta({ eixo: 'x', x: -2, z: -8 }),
        chaveDaAresta({ eixo: 'x', x: -1, z: -8 }),
        chaveDaAresta({ eixo: 'z', x: -6, z: -6 }),
        chaveDaAresta({ eixo: 'z', x: -6, z: -5 }),
      ].sort(),
    )
    const porta = porAbertura(inicial(), comQuadros, 'porta', { eixo: 'x', x: 0, z: -8 })
    expect(porta).toMatchObject({ ok: false, motivo: 'quadro-do-quarto', abertura: 'porta' })
    expect(falaDaRecusa(porta as Recusa)).toBe(
      'Nessa parede tem um quadro do seu quarto. Ponha a porta mais para o lado.',
    )
    const janela = porAbertura(inicial(), comQuadros, 'janela-redonda', { eixo: 'z', x: -6, z: -6 })
    expect(falaDaRecusa(janela as Recusa)).toBe(
      'Nessa parede tem um quadro do seu quarto. Ponha a janela mais para o lado.',
    )
    // Mais para o lado, dá.
    expect(porAbertura(inicial(), comQuadros, 'porta', { eixo: 'x', x: 2, z: -8 }).ok).toBe(true)
    expect(porAbertura(inicial(), comQuadros, 'porta', { eixo: 'z', x: -6, z: -2 }).ok).toBe(true)
    // Sem `wall`, o item fica no fundo (a direita do Meu quarto); item de chão não conta.
    expect(
      penduradosDoQuarto({
        ...QUARTO_DE_EXEMPLO,
        placedItems: [
          { itemId: 'quadro', x: 0, y: 1 },
          { itemId: 'cama', x: 0, y: 1 },
        ],
      }),
    ).toEqual([{ parede: 'fundo', u: 0, largura: 2 }])
  })

  test('a porta em cima de uma janela troca a janela; o resto continua como era', () => {
    const o = inicial()
    const r = porAbertura(o, L, 'porta', { eixo: 'x', x: -4, z: 0 })
    expect(r).toMatchObject({ ok: true, aviso: 'janela-virou-porta' })
    const nova = ok(r)
    expect(nova.aberturas.filter((a) => a.tipo === 'janela-grande')).toHaveLength(1)
    expect(nova.aberturas).toContainEqual({ tipo: 'porta', eixo: 'x', x: -5, z: 0 })
    expect(falaDoAviso('janela-virou-porta')).toBe('A janela virou porta.')
    // A janela do lado também, mesmo pegando só uma parte dela.
    expect(porAbertura(o, L, 'porta', { eixo: 'z', x: 6, z: -3 })).toMatchObject({
      ok: true,
      aviso: 'janela-virou-porta',
    })
    // Porta em cima de porta e janela em cima de porta ou janela: como antes.
    expect(porAbertura(o, L, 'porta', { eixo: 'x', x: 3, z: 0 })).toMatchObject({
      motivo: 'ja-tem-abertura',
    })
    expect(porAbertura(o, L, 'porta', { eixo: 'x', x: 2, z: 0 })).toMatchObject({ motivo: 'nada' })
    expect(porAbertura(o, L, 'janela-arco', { eixo: 'x', x: -4, z: 0 })).toMatchObject({
      motivo: 'ja-tem-abertura',
    })
    expect(porAbertura(o, L, 'janela-redonda', { eixo: 'x', x: 2, z: 0 })).toMatchObject({
      motivo: 'ja-tem-abertura',
    })
    // A porta que pegaria a janela e a porta ao mesmo tempo, não.
    const juntas = ok(tirarAbertura(o, { eixo: 'x', x: -4, z: 0 }))
    const comJanela = ok(porAbertura(juntas, L, 'janela-redonda', { eixo: 'x', x: 0, z: 0 }))
    expect(porAbertura(comJanela, L, 'porta', { eixo: 'x', x: 0, z: 0 })).toMatchObject({
      motivo: 'ja-tem-abertura',
    })
    // A regra de antes vale primeiro: com quadro do Meu quarto ou parede chegando no meio, não troca.
    const comQuadro = comPenduradosDoQuarto(L, [{ parede: 'fundo', u: 2, largura: 1 }])
    const janelaNoFundo = ok(porAbertura(o, L, 'janela-grande', { eixo: 'x', x: -3, z: -8 }))
    expect(
      porAbertura(janelaNoFundo, comQuadro, 'porta', { eixo: 'x', x: -3, z: -8 }),
    ).toMatchObject({ motivo: 'quadro-do-quarto' })
  })

  test('a dica mostra o motivo da prévia vermelha e volta quando dá', () => {
    const comQuadros = comPenduradosDoQuarto(L, penduradosDoQuarto(QUARTO_DE_EXEMPLO))
    const vermelha = toque('porta', inicial(), comQuadros, { x: -1.5, z: -7.95 }, ESCOLHAS, [])
    expect(vermelha.previa).toMatchObject({ tipo: 'arestas', ok: false })
    expect(motivoDaPrevia(vermelha.resultado)).toBe(
      'Nessa parede tem um quadro do seu quarto. Ponha a porta mais para o lado.',
    )
    // Passando pela grama (sem parede ali) a dica normal fica: o vermelho ali é só "não é parede".
    const longe = toque('porta', inicial(), comQuadros, { x: 10.5, z: 5.05 }, ESCOLHAS, [])
    expect(longe.resultado).toMatchObject({ ok: false, motivo: 'sem-parede' })
    expect(motivoDaPrevia(longe.resultado)).toBeNull()
    const certa = toque('porta', inicial(), comQuadros, { x: 3.5, z: -7.95 }, ESCOLHAS, [])
    expect(certa.previa).toMatchObject({ ok: true })
    expect(motivoDaPrevia(certa.resultado)).toBeNull()
    expect(motivoDaPrevia(null)).toBeNull()
    // O "nada" (a mesma porta de novo) não tem fala: volta a dica.
    expect(
      motivoDaPrevia(toque('porta', inicial(), L, { x: 2.5, z: 0.05 }, ESCOLHAS, []).resultado),
    ).toBeNull()
  })

  test('tirar a abertura deixa a parede', () => {
    const o = ok(tirarAbertura(inicial(), { eixo: 'x', x: 2, z: 0 }))
    expect(o.aberturas.some((a) => a.tipo === 'porta')).toBe(false)
    expect(o.paredes).toEqual(inicial().paredes)
  })
})

describe('as peças do kit', () => {
  test('a obra inicial: as quatro paredes de lambri do quarto com a porta e as janelas, e as quatro quinas', () => {
    const p = planta(inicial(), L)
    const { paredes, quinas, folhas, pisos } = pecasDaObra(inicial(), p, NADA_CORTADO)
    const nos = paredes.map((x) => x.no)
    expect(nos.filter((n) => n === 'parede-porta-lambri')).toHaveLength(1)
    expect(nos.filter((n) => n === 'parede-janela-grande-lambri')).toHaveLength(2)
    // Frente (12 menos a porta e a janela), direita (8 menos a janela), fundo (12) e esquerda (8).
    expect(nos.filter((n) => n === 'parede-lambri')).toHaveLength(6 + 5 + 12 + 8)
    const porta = paredes.find((x) => x.no === 'parede-porta-lambri')
    expect(porta).toMatchObject({ x: 2.5, z: 0, giro: 0 })
    // A parede da direita tem o quarto em -x: gira +90°.
    const janelaDoLado = paredes.find((x) => x.no === 'parede-janela-grande-lambri' && x.x === 6)
    expect(janelaDoLado?.giro).toBeCloseTo(Math.PI / 2)
    expect(janelaDoLado?.z).toBe(-4.5)
    expect(folhas).toEqual([expect.objectContaining({ no: 'porta', x: 2.5, z: 0 })])
    expect(quinas.map((q) => `${q.no} ${q.x},${q.z}`).sort()).toEqual([
      'quina-lambri -6,-8',
      'quina-lambri -6,0',
      'quina-lambri 6,-8',
      'quina-lambri 6,0',
    ])
    // O fundo e a esquerda: lambri com a fachada para fora (o quarto em +z e em +x).
    expect(paredes.find((x) => x.x === 0.5 && x.z === -8)).toMatchObject({
      no: 'parede-lambri',
      giro: Math.PI,
    })
    expect(paredes.find((x) => x.x === -6 && x.z === -3.5)?.giro).toBeCloseTo(-Math.PI / 2)
    expect(pisos).toEqual([])
  })

  test('cortadas: as peças baixas, a porta sem folha e a janela baixa no meio da abertura', () => {
    const p = planta(inicial(), L)
    const { paredes, folhas, quinas } = pecasDaObra(inicial(), p, TUDO_CORTADO)
    expect(folhas).toEqual([])
    expect(paredes.some((x) => x.no === 'parede-porta-lambri-baixa')).toBe(true)
    // A janela aparece no Construir: uma peça só, a janela vista na parede cortada.
    const janelas = paredes.filter((x) => x.no.startsWith('parede-janela'))
    expect(janelas.map((x) => `${x.no} ${x.x},${x.z}`).sort()).toEqual([
      'parede-janela-grande-lambri-baixa -2.5,0',
      'parede-janela-grande-lambri-baixa 6,-4.5',
    ])
    expect(paredes.filter((x) => x.no === 'parede-lambri-baixa')).toHaveLength(6 + 5 + 12 + 8)
    expect(quinas.every((q) => q.no === 'quina-lambri-baixa')).toBe(true)
    expect(quinas).toHaveLength(4)
  })

  test('cada janela cortada usa o nó baixo do tipo dela, na família da parede', () => {
    let o = comComodoADireita()
    o = ok(porAbertura(o, L, 'janela-arco', { eixo: 'x', x: 6, z: -6 }))
    o = ok(porAbertura(o, L, 'janela-redonda', { eixo: 'z', x: 8, z: -4 }))
    const { paredes } = pecasDaObra(o, planta(o, L), TUDO_CORTADO)
    const nos = paredes.map((x) => x.no).filter((n) => n.startsWith('parede-janela'))
    expect(nos.sort()).toEqual([
      'parede-janela-arco-lambri-baixa',
      'parede-janela-grande-lambri-baixa',
      // A janela do lado do quarto, entre ele e o cômodo novo.
      'parede-janela-grande-lisa-baixa',
      'parede-janela-redonda-lambri-baixa',
    ])
    expect(paredes.find((x) => x.no === 'parede-janela-arco-lambri-baixa')).toMatchObject({
      x: 7,
      z: -6,
    })
  })

  test('todo nó de parede que as peças pedem existe no kit (as janelas baixas inclusive)', async () => {
    const buf = readFileSync(
      join(import.meta.dir, '..', 'src', 'assets', 'casa', 'casa-paredes.glb'),
    )
    const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength)
    const kit = (await new GLTFLoader().parseAsync(ab, '')).scene
    const nos: string[] = []
    for (const fam of ['lambri', 'lisa'])
      for (const baixa of ['', '-baixa']) {
        nos.push(`parede-${fam}${baixa}`, `parede-porta-${fam}${baixa}`, `quina-${fam}${baixa}`)
        for (const janela of Object.values(NO_DA_JANELA)) nos.push(`${janela}-${fam}${baixa}`)
      }
    expect(nos.filter((n) => !kit.getObjectByName(n))).toEqual([])
    // E a obra de exemplo com o fundo, cortada ou não, só pede nós desses.
    const o = obraDeExemploComFundo()
    for (const corte of [NADA_CORTADO, TUDO_CORTADO]) {
      const { paredes, quinas } = pecasDaObra(o, planta(o, L), corte)
      for (const x of [...paredes, ...quinas]) expect(nos).toContain(x.no)
    }
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
    // O fundo e a esquerda do quarto colidem pelo kit (na casa construída não há casa de antes ali).
    expect(dentro(-6, 1, -4)).toBe(true)
    expect(dentro(0, 1, -8)).toBe(true)
    expect(dentro(-6, 1, -8)).toBe(true)
  })
})

describe('a casa construída', () => {
  test('as quatro paredes do quarto colidem pelo kit; a varanda vai com a porta de entrada', () => {
    const nomes = colisoresDaCasa(true, true).map((c) => c.nome)
    for (const n of [
      'col-parede-frente-1',
      'col-parede-direita',
      'col-parede-esquerda',
      'col-parede-fundo',
      'col-quina-1',
      'col-alicerce-fundo',
      'col-porta-aberta',
      'col-floreira-lado',
    ])
      expect(nomes).not.toContain(n)
    // Da casa de antes não fica nenhum colisor: a varanda é a do kit, na entrada.
    expect(nomes).toEqual([])
    const deAntes = colisoresDaCasa(true).map((c) => c.nome)
    for (const n of ['col-parede-frente-1', 'col-parede-esquerda', 'col-parede-fundo'])
      expect(deAntes).toContain(n)
  })

  test('a obra salva antes (sem o fundo e a esquerda em obra.paredes) ganha as quatro paredes', () => {
    // A obra inicial de antes de 31/10/2026 é a mesma de hoje: o salvamento não muda.
    const antiga: Obra = {
      ...inicial(),
      paredes: [
        { x: -6, z: 0, eixo: 'x', n: 12 },
        { x: 6, z: -8, eixo: 'z', n: 8 },
      ],
    }
    expect(L.obraInicial.paredes).toEqual(antiga.paredes)
    const p = planta(antiga, L)
    for (const k of [
      chaveDaAresta({ eixo: 'x', x: -6, z: -8 }),
      chaveDaAresta({ eixo: 'x', x: 5, z: -8 }),
      chaveDaAresta({ eixo: 'z', x: -6, z: -8 }),
      chaveDaAresta({ eixo: 'z', x: -6, z: -1 }),
    ]) {
      expect(p.paredes.has(k)).toBe(true)
      expect(p.travadas.has(k)).toBe(true)
    }
    const { paredes } = pecasDaObra(antiga, p, NADA_CORTADO)
    const naLinha = (f: (x: { x: number; z: number }) => boolean) => paredes.filter(f).length
    expect(naLinha((x) => x.z === -8)).toBe(12)
    expect(naLinha((x) => x.x === -6)).toBe(8)
    // Nenhuma mudança no Construir grava essas paredes na obra.
    const r = esticarParede(antiga, L, { x: -6, z: -8 }, { x: 6, z: -8 })
    expect(r).toMatchObject({ ok: false, motivo: 'nada' })
  })

  test('a colisão do fundo do quarto deixa o vão da porta livre', () => {
    const atras = comComodoAtras()
    const o = ok(porAbertura(atras, L, 'porta', { eixo: 'x', x: 3, z: -8 }))
    const caixas = colisoresDaObra(o, planta(o, L))
    const dentro = (x: number, y: number, z: number) =>
      caixas.some(
        (c) =>
          Math.abs(x - c.posicao[0]) <= c.meio[0] &&
          Math.abs(y - c.posicao[1]) <= c.meio[1] &&
          Math.abs(z - c.posicao[2]) <= c.meio[2],
      )
    expect(dentro(3.5, 1, -8)).toBe(false)
    expect(dentro(3.5, 3.5, -8)).toBe(true)
    expect(dentro(0.5, 1, -8)).toBe(true)
    expect(dentro(5.5, 1, -8)).toBe(true)
    // E a porta do kit aparece no fundo, com a folha.
    const { paredes, folhas } = pecasDaObra(o, planta(o, L), NADA_CORTADO)
    expect(paredes.find((x) => x.no.startsWith('parede-porta') && x.z === -8)).toMatchObject({
      no: 'parede-porta-lisa',
      x: 3.5,
      z: -8,
    })
    expect(folhas.map((f) => `${f.no} ${f.x},${f.z}`)).toContain('porta-interna 3.5,-8')
  })

  test('a cor do Meu quarto vai só no lado de dentro do quarto das quatro paredes dele', () => {
    // Um cômodo atrás (com porta no fundo) e um à direita: o fundo e a direita ficam lisos.
    let o = ok(porAbertura(comComodoAtras(), L, 'porta', { eixo: 'x', x: 3, z: -8 }))
    o = ok(esticarParede(o, L, { x: 6, z: -6 }, { x: 8, z: -6 }))
    o = ok(esticarParede(o, L, { x: 8, z: -6 }, { x: 8, z: -2 }))
    o = ok(esticarParede(o, L, { x: 8, z: -2 }, { x: 6, z: -2 }))
    const p = planta(o, L)
    for (const corte of [NADA_CORTADO, TUDO_CORTADO]) {
      const { paredes, quinas } = pecasDaObra(o, p, corte)
      for (const x of paredes) {
        const noFundoOuFrente = (x.z === -8 || x.z === 0) && x.x > -6 && x.x < 6
        const naEsquerdaOuDireita = (x.x === -6 || x.x === 6) && x.z > -8 && x.z < 0
        const cor = noFundoOuFrente ? 'fundo' : naEsquerdaOuDireita ? 'esquerda' : undefined
        expect(`${x.chave} ${x.quarto?.cor}`).toBe(`${x.chave} ${cor}`)
      }
      const lado = (f: (x: { x: number; z: number; no: string }) => boolean) =>
        paredes.find(f)?.quarto?.material
      // Lambri: o lado de dentro (+Y) é o do quarto.
      expect(lado((x) => x.z === -8 && x.x === -4.5)).toBe('paredeDentro')
      expect(lado((x) => x.x === -6 && x.z === -3.5)).toBe('paredeDentro')
      expect(lado((x) => x.z === 0 && x.x === -5.5)).toBe('paredeDentro')
      expect(lado((x) => x.x === 6 && x.z === -7.5)).toBe('paredeDentro')
      // Lisa com o quarto no +z ou +x (o fundo, e a porta nele): ainda o +Y.
      expect(lado((x) => x.no.startsWith('parede-porta') && x.z === -8)).toBe('paredeDentro')
      // Lisa com o quarto no -x (a direita, com o cômodo novo do outro lado): o verso.
      expect(lado((x) => x.x === 6 && x.z === -2.5)).toBe('paredeVerso')
      // As paredes dos cômodos novos e as quinas ficam como o kit fez.
      expect(paredes.filter((x) => x.x === 8 || x.z === -12).some((x) => x.quarto)).toBe(false)
      expect(quinas.some((q) => q.quarto)).toBe(false)
    }
  })

  test('a cor de dentro é uma cópia do material: o do kit e os outros lados não mudam', () => {
    const cores = coresDoMeuQuarto({
      ...QUARTO_DE_EXEMPLO,
      wallColors: { left: '#ff0000', right: '#0000ff' },
    })
    expect(cores).toEqual({ esquerda: '#ff0000', fundo: '#0000ff' })
    // Sem cor escolhida, a do tema (a mesma que o Meu quarto usa).
    expect(coresDoMeuQuarto({ ...QUARTO_DE_EXEMPLO, wallColors: undefined }).esquerda).toMatch(/^#/)
    const dentro = new MeshStandardMaterial({ name: MATERIAL_DE_DENTRO, color: '#f4ecdf' })
    const fora = new MeshStandardMaterial({ name: 'parede', color: '#fbe7d2' })
    const materiais = materiaisDoMeuQuarto(dentro, cores)
    expect(materiais.esquerda).not.toBe(dentro)
    expect(materiais.esquerda.color.getHexString()).toBe('ff0000')
    expect(materiais.fundo.color.getHexString()).toBe('0000ff')
    expect(dentro.color.getHexString()).toBe(new Color('#f4ecdf').getHexString())
    const geo = new BoxGeometry()
    const peca = new Group()
    peca.add(new Mesh(geo, [fora, dentro]), new Mesh(geo, dentro))
    const outra = new Mesh(geo, dentro)
    pintarLado(peca, MATERIAL_DE_DENTRO, materiais.fundo)
    const usados = peca.children.flatMap((m) => [(m as Mesh).material].flat())
    expect(usados).toEqual([fora, materiais.fundo, materiais.fundo])
    expect(outra.material).toBe(dentro)
  })
})

describe('o corte no Viver e o telhado', () => {
  test('dentro de casa, corta a parede entre a câmera e a pessoa; fora, nenhuma', () => {
    const p = planta(inicial(), L)
    const dentro = paredesCortadasNoViver(p, { x: 0.5, z: -3.5 }, { x: 0.5, z: 9 })
    expect(dentro.has(chaveDaAresta({ eixo: 'x', x: 0, z: 0 }))).toBe(true)
    // A parede da direita não separa os dois: fica em pé.
    expect(dentro.has(chaveDaAresta({ eixo: 'z', x: 6, z: -4 }))).toBe(false)
    // A esquerda e o fundo (com os quadros do Meu quarto) nunca.
    const deCostas = paredesCortadasNoViver(p, { x: 0.5, z: -3.5 }, { x: -12, z: -14 })
    expect(deCostas.size).toBe(0)
    expect([...dentro].some((k) => p.doMeuQuarto.has(k))).toBe(false)
    expect(paredesCortadasNoViver(p, { x: 0.5, z: 5.5 }, { x: 0.5, z: 12 }).size).toBe(0)
  })

  test('a parede cortada só segura o corpo: a câmera passa por ela', () => {
    const o = inicial()
    const corte = (k: string) => k === chaveDaAresta({ eixo: 'x', x: -6, z: 0 })
    const caixas = colisoresDaObra(o, planta(o, L), corte)
    const cortadas = caixas.filter((c) => c.nome.startsWith(COLISOR_DA_PAREDE_CORTADA))
    expect(cortadas).toHaveLength(1)
    expect(soParaOCorpo(cortadas[0]?.nome ?? '')).toBe(true)
    expect(caixas.filter((c) => !soParaOCorpo(c.nome)).length).toBeGreaterThan(5)
  })

  test('telhado de duas águas num cômodo de 2 por 4: beirais, águas, cumeeira, testeiras e oitões', () => {
    const t = telhadoDoComodo({ x0: 6, z0: -6, x1: 8, z1: -2 })
    const conta = (no: string) => t.filter((x) => x.no === no).length
    expect(conta('beiral')).toBe(4)
    expect(conta('agua')).toBe(8)
    expect(conta('cumeeira')).toBe(2)
    expect(conta('cumeeira-ponta')).toBe(2)
    expect(conta('testeira-beiral-esq') + conta('testeira-beiral-dir')).toBe(4)
    expect(conta('testeira-esq') + conta('testeira-dir')).toBe(8)
    expect(conta('oitao-faixa')).toBe(4)
    expect(conta('oitao-esq') + conta('oitao-dir')).toBe(8)
    // A cumeeira no meio, na altura 4 + 0,25 × fundo; o lado de z maior sobe sem giro.
    expect(t.find((x) => x.no === 'cumeeira')).toMatchObject({ z: -4, y: 5 })
    expect(t.find((x) => x.no === 'beiral' && x.z === -2)?.giro).toBe(0)
    expect(t.find((x) => x.no === 'beiral' && x.z === -6)?.giro).toBeCloseTo(Math.PI)
  })

  test('com fundo ímpar, a água, a testeira e o oitão do meio são as meias', () => {
    const t = telhadoDoComodo({ x0: 0, z0: 0, x1: 1, z1: 3 })
    expect(t.filter((x) => x.no === 'agua-meia')).toHaveLength(2)
    expect(t.filter((x) => x.no.startsWith('oitao-meia-'))).toHaveLength(4)
    expect(t.filter((x) => x.no === 'oitao-faixa-meia')).toHaveLength(4)
  })

  test('só cômodo retangular ganha telhado', () => {
    let o = inicial()
    o = ok(esticarParede(o, L, { x: -6, z: 0 }, { x: -6, z: 3 }))
    o = ok(esticarParede(o, L, { x: -6, z: 3 }, { x: -1, z: 3 }))
    o = ok(esticarParede(o, L, { x: -1, z: 3 }, { x: -1, z: 0 }))
    const p = planta(o, L)
    const novo = p.comodos.find((c) => !c.quarto)
    expect(novo && retanguloDoComodo(novo)).toEqual({ x0: -6, z0: 0, x1: -1, z1: 3 })
    expect(telhadosDaObra(p).length).toBeGreaterThan(0)
    // Em L: sem telhado.
    const emL = { ...novo, celulas: novo?.celulas.slice(1) ?? [] }
    expect(retanguloDoComodo(emL as never)).toBeNull()
  })
})

describe('a porta de entrada e a varanda (31/10/2026)', () => {
  /** O cômodo da frente do quarto do exemplo (x -6 a -1, z 0 a 3) com a parede da frente dele. */
  const comComodo = comComodoNaFrente

  test('a entrada é a primeira porta de fora: na obra inicial, a porta nova, com a varanda na frente', () => {
    const e = entradaDaObra(inicial(), L)
    expect(e?.indice).toBe(0)
    expect(e?.abertura).toEqual({ tipo: 'porta', x: 1, z: 0, eixo: 'x' })
    expect(e?.fora).toBe(1)
    expect(e?.meio).toEqual({ x: 2.5, z: 0 })
    expect(e?.giro).toBe(0)
    expect(e && retanguloDaVaranda(e)).toEqual({ x0: 0, z0: 0, x1: 5, z1: 2 })
    expect(e && frenteDaEntrada(e, 1.2)).toEqual({ x: 2.5, z: 1.2 })
    // Uma obra salva antes (a mesma obra inicial): a entrada continua na frente, sem mudar nada.
    const salva: Obra = JSON.parse(JSON.stringify(L.obraInicial))
    expect(entradaDaObra(salva, L)?.abertura).toEqual(L.obraInicial.aberturas[0])
    // A cabana não tem entrada nem varanda.
    expect(entradaDaObra(inicial(), { ...L, varanda: undefined })).toBeNull()
  })

  test('porta entre dois cômodos e porta numa parede solta não são de fora', () => {
    let o = comComodoADireita()
    o = ok(porAbertura(o, L, 'porta', { eixo: 'z', x: 6, z: -4 }))
    // A porta do quarto para o cômodo novo: dentro dos dois lados.
    expect(entradaDaObra({ ...o, aberturas: o.aberturas.slice(1) }, L)).toBeNull()
    // Uma parede solta no quintal com porta: fora dos dois lados.
    let solta = ok(esticarParede(inicial(), L, { x: 8, z: 4 }, { x: 13, z: 4 }))
    solta = ok(porAbertura(solta, L, 'porta', { eixo: 'x', x: 10, z: 4 }))
    expect(entradaDaObra({ ...solta, aberturas: solta.aberturas.slice(1) }, L)).toBeNull()
  })

  test('mudar a entrada para o lado direito do quarto: a porta e a varanda vão juntas', () => {
    const o = inicial()
    // A parede da direita (x 6): a porta vai no lugar da janela do lado (z -6 a -3), que vira porta.
    const r = moverEntrada(o, L, { eixo: 'z', x: 6, z: -5 })
    expect(r).toMatchObject({ ok: true, aviso: 'janela-virou-porta' })
    const movida = ok(r)
    expect(movida.aberturas[0]).toEqual({ tipo: 'porta', x: 6, z: -6, eixo: 'z' })
    // A porta de antes saiu: a parede da frente fica inteira.
    expect(movida.aberturas.filter((a) => a.tipo === 'porta')).toHaveLength(1)
    expect(movida.paredes).toEqual(o.paredes)
    const e = entradaDaObra(movida, L)
    expect(e?.fora).toBe(1)
    expect(e?.giro).toBeCloseTo(Math.PI / 2)
    expect(e && retanguloDaVaranda(e)).toEqual({ x0: 6, z0: -7, x1: 8, z1: -2 })
    // A frente de antes ficou livre para construir; a varanda nova, não.
    expect(esticarParede(movida, L, { x: 0, z: 1 }, { x: 4, z: 1 }).ok).toBe(true)
    expect(esticarParede(movida, L, { x: 7, z: -8 }, { x: 7, z: -1 })).toMatchObject({
      ok: false,
      motivo: 'ocupado',
      nome: 'a varanda',
    })
    expect(porCanteiro(movida, L, { x: 6, z: -4 })).toMatchObject({ ok: false, nome: 'a varanda' })
    expect(porCanteiro(movida, L, { x: 2, z: 1 }).ok).toBe(true)
    expect(ocupadasDaObra(movida, L)[0]).toEqual({
      nome: 'a varanda',
      ret: { x0: 6, z0: -7, x1: 8, z1: -2 },
    })
  })

  test('a varanda encosta na parede em toda a largura (não dobra a quina)', () => {
    // A porta no fim da parede da direita (z -3 a 0): de um lado não há parede para a varanda.
    expect(moverEntrada(inicial(), L, { eixo: 'z', x: 6, z: -2 })).toMatchObject({
      ok: false,
      motivo: 'varanda-nao-cabe',
    })
  })

  test('mudar a entrada para o fundo e para um cômodo novo na frente', () => {
    const fundo = ok(moverEntrada(inicial(), L, { eixo: 'x', x: -2, z: -8 }))
    const e = entradaDaObra(fundo, L)
    expect(e?.abertura).toEqual({ tipo: 'porta', x: -3, z: -8, eixo: 'x' })
    expect(e?.fora).toBe(-1)
    expect(e?.giro).toBeCloseTo(Math.PI)
    expect(e && retanguloDaVaranda(e)).toEqual({ x0: -4, z0: -10, x1: 1, z1: -8 })
    // O cômodo da frente (x -6 a -1, z 0 a 3): a parede da frente dele dá para fora.
    const comodo = ok(moverEntrada(comComodo(), L, { eixo: 'x', x: -4, z: 3 }))
    const ec = entradaDaObra(comodo, L)
    expect(ec?.abertura).toEqual({ tipo: 'porta', x: -5, z: 3, eixo: 'x' })
    expect(ec && retanguloDaVaranda(ec)).toEqual({ x0: -6, z0: 3, x1: -1, z1: 5 })
  })

  test('recusas: parede que não dá para fora, varanda que não cabe e as de sempre', () => {
    // Um cômodo à direita do quarto (x 6 a 9, z -8 a -1).
    let direita = ok(esticarParede(inicial(), L, { x: 6, z: -8 }, { x: 9, z: -8 }))
    direita = ok(esticarParede(direita, L, { x: 9, z: -8 }, { x: 9, z: -1 }))
    direita = ok(esticarParede(direita, L, { x: 9, z: -1 }, { x: 6, z: -1 }))
    // Entre o quarto e o cômodo: não dá para fora.
    expect(moverEntrada(direita, L, { eixo: 'z', x: 6, z: -6 })).toMatchObject({
      ok: false,
      motivo: 'entrada-fora',
    })
    // A parede de fora do cômodo (x 9) dá para fora; a varanda (x 9 a 11) cabe.
    expect(moverEntrada(direita, L, { eixo: 'z', x: 9, z: -5 }).ok).toBe(true)
    // Um canteiro na frente: a varanda não cabe.
    const comCanteiro = ok(porCanteiro(direita, L, { x: 10, z: -4 }))
    expect(moverEntrada(comCanteiro, L, { eixo: 'z', x: 9, z: -5 })).toMatchObject({
      ok: false,
      motivo: 'varanda-nao-cabe',
    })
    // Fora do lote: o fundo de um cômodo encostado na beira de trás (z -14).
    let canto = ok(esticarParede(inicial(), L, { x: 10, z: -14 }, { x: 10, z: -10 }))
    canto = ok(esticarParede(canto, L, { x: 10, z: -10 }, { x: 15, z: -10 }))
    canto = ok(esticarParede(canto, L, { x: 15, z: -10 }, { x: 15, z: -14 }))
    canto = ok(esticarParede(canto, L, { x: 15, z: -14 }, { x: 10, z: -14 }))
    expect(moverEntrada(canto, L, { eixo: 'x', x: 12, z: -14 })).toMatchObject({
      ok: false,
      motivo: 'varanda-nao-cabe',
    })
    // A varanda em cima do pé do farol.
    let perto = ok(esticarParede(inicial(), L, { x: -8, z: -12 }, { x: -8, z: -7 }))
    perto = ok(esticarParede(perto, L, { x: -8, z: -7 }, { x: -6, z: -7 }))
    perto = ok(esticarParede(perto, L, { x: -8, z: -12 }, { x: -6, z: -12 }))
    perto = ok(esticarParede(perto, L, { x: -6, z: -12 }, { x: -6, z: -8 }))
    expect(moverEntrada(perto, L, { eixo: 'z', x: -8, z: -10 })).toMatchObject({
      ok: false,
      motivo: 'varanda-nao-cabe',
    })
    // A parede chegando no meio da porta e o quadro do Meu quarto, como na porta de sempre.
    expect(moverEntrada(comComodo(), L, { eixo: 'x', x: -1, z: 0 })).toMatchObject({
      ok: false,
      motivo: 'encontro-de-paredes',
    })
    const comQuadro = comPenduradosDoQuarto(L, [{ parede: 'fundo', u: 2, largura: 1 }])
    expect(moverEntrada(inicial(), comQuadro, { eixo: 'x', x: -4, z: -8 })).toMatchObject({
      ok: false,
      motivo: 'quadro-do-quarto',
    })
    // Na grama, ou na própria entrada: nada.
    expect(moverEntrada(inicial(), L, { eixo: 'x', x: 10, z: 5 })).toMatchObject({
      motivo: 'sem-parede',
    })
    expect(moverEntrada(inicial(), L, { eixo: 'x', x: 2, z: 0 })).toMatchObject({ motivo: 'nada' })
    // As falas novas (sem "—", sem "!", sem pergunta).
    for (const motivo of ['entrada-fora', 'varanda-nao-cabe', 'entrada'] as const) {
      const fala = falaDaRecusa({ motivo }) ?? ''
      expect(fala).not.toMatch(/[—!?]/)
      expect(motivoDaPrevia({ ok: false, motivo })).toBe(fala)
    }
    expect(falaDaRecusa({ motivo: 'entrada-fora' })).toBe(
      'A entrada vai numa parede que dá para fora.',
    )
    expect(falaDaRecusa({ motivo: 'varanda-nao-cabe' })).toBe(
      'A varanda não cabe aí. Escolha outra parede de fora.',
    )
  })

  test('uma janela no caminho vira porta; uma porta de fora no mesmo lugar vira a entrada', () => {
    // A janela grande da frente (x -5 a -2): a entrada vai para cima dela.
    const r = moverEntrada(inicial(), L, { eixo: 'x', x: -4, z: 0 })
    expect(r).toMatchObject({ ok: true, aviso: 'janela-virou-porta' })
    const o = ok(r)
    expect(o.aberturas[0]).toEqual({ tipo: 'porta', x: -5, z: 0, eixo: 'x' })
    expect(o.aberturas.some((a) => a.tipo === 'janela-grande' && a.z === 0)).toBe(false)
    // Uma porta de fora comum no fundo: mudar a entrada para ela a torna a entrada.
    const comPorta = ok(porAbertura(inicial(), L, 'porta', { eixo: 'x', x: -2, z: -8 }))
    expect(entradaDaObra(comPorta, L)?.indice).toBe(0)
    const virou = ok(moverEntrada(comPorta, L, { eixo: 'x', x: -2, z: -8 }))
    expect(virou.aberturas.filter((a) => a.tipo === 'porta')).toEqual([
      { tipo: 'porta', x: -3, z: -8, eixo: 'x' },
    ])
  })

  test('a entrada não se apaga; as outras portas de fora, sim', () => {
    const o = inicial()
    expect(tirarAbertura(o, { eixo: 'x', x: 2, z: 0 }, L)).toMatchObject({
      ok: false,
      motivo: 'entrada',
    })
    expect(falaDaRecusa({ motivo: 'entrada' })).toBe(
      'A casa precisa de uma porta de entrada. Toque nela com a Porta para mudar de lugar.',
    )
    // Pelo Apagar do Construir (o toque perto da porta).
    const t = toque('apagar', o, L, { x: 2.5, z: 0.1 }, ESCOLHAS, [])
    expect(t.resultado).toMatchObject({ ok: false, motivo: 'entrada' })
    // Uma porta de fora a mais, no fundo, é porta comum.
    const comPorta = ok(porAbertura(o, L, 'porta', { eixo: 'x', x: -2, z: -8 }))
    expect(tirarAbertura(comPorta, { eixo: 'x', x: -2, z: -8 }, L).ok).toBe(true)
    // Apagar a parede da entrada (num cômodo) ou abrir o cômodo dela para fora: recusado.
    const comodo = ok(moverEntrada(comComodo(), L, { eixo: 'x', x: -4, z: 3 }))
    expect(apagarParede(comodo, L, [{ eixo: 'x', x: -4, z: 3 }])).toMatchObject({
      ok: false,
      motivo: 'entrada',
    })
    expect(apagarParede(comodo, L, [{ eixo: 'z', x: -1, z: 1 }])).toMatchObject({
      ok: false,
      motivo: 'entrada',
    })
  })

  test('com a Porta: tocar na entrada escolhe, o toque seguinte numa parede de fora leva', () => {
    const o = inicial()
    const naEntrada = toque('porta', o, L, { x: 2.4, z: 0.1 }, ESCOLHAS, [])
    expect(naEntrada.entrada).toBe('selecionar')
    expect(naEntrada.resultado).toBeNull()
    expect(naEntrada.previa).toMatchObject({ tipo: 'arestas', entrada: true, ok: true })
    const escolhida = { ...ESCOLHAS, entradaSelecionada: true }
    // Tocar de novo solta.
    expect(toque('porta', o, L, { x: 2.4, z: 0.1 }, escolhida, []).entrada).toBe('soltar')
    // Numa parede de fora: move (e solta), com a prévia da varanda nova.
    const leva = toque('porta', o, L, { x: 6.05, z: -4.5 }, escolhida, [])
    expect(leva.resultado?.ok).toBe(true)
    expect(leva.entrada).toBe('soltar')
    expect(leva.previa).toMatchObject({ tipo: 'arestas', ok: true })
    expect(leva.previa.tipo === 'arestas' && leva.previa.varanda).toHaveLength(10)
    // Sem a entrada escolhida, a Porta põe porta comum (a de sempre).
    expect(toque('porta', o, L, { x: 6.05, z: -4.5 }, ESCOLHAS, []).entrada).toBeUndefined()
  })

  test('desfazer volta a entrada (a obra de antes é a mesma)', () => {
    // O Desfazer da loja guarda a obra de antes inteira; aqui a regra: voltar à obra de antes
    // devolve a entrada e a varanda de antes.
    const antes = inicial()
    const depois = ok(moverEntrada(antes, L, { eixo: 'z', x: 6, z: -5 }))
    expect(entradaDaObra(depois, L)?.abertura.eixo).toBe('z')
    expect(entradaDaObra(antes, L)?.abertura).toEqual(L.obraInicial.aberturas[0])
    expect(ocupadasDaObra(antes, L)[0]?.ret).toEqual({ x0: 0, z0: 0, x1: 5, z1: 2 })
  })

  test('numa obra sem porta de fora, a primeira porta de fora vira a entrada, se a varanda cabe', () => {
    const semPorta: Obra = { ...inicial(), aberturas: inicial().aberturas.slice(1) }
    expect(entradaDaObra(semPorta, L)).toBeNull()
    expect(ocupadasDaObra(semPorta, L)).toEqual(L.ocupadas)
    const comCanteiro = ok(porCanteiro(semPorta, L, { x: 2, z: 1 }))
    expect(porAbertura(comCanteiro, L, 'porta', { eixo: 'x', x: 2, z: 0 })).toMatchObject({
      ok: false,
      motivo: 'varanda-nao-cabe',
    })
    const r = ok(porAbertura(semPorta, L, 'porta', { eixo: 'x', x: 2, z: 0 }))
    expect(entradaDaObra(r, L)?.abertura).toEqual({ tipo: 'porta', x: 1, z: 0, eixo: 'x' })
  })

  test('a peça e os colisores da varanda seguem a entrada (giro de quarto de volta)', () => {
    const o = ok(moverEntrada(inicial(), L, { eixo: 'z', x: 6, z: -5 }))
    const e = entradaDaObra(o, L)
    const { varanda, toldo } = pecasDaVaranda(e)
    expect(varanda[0]).toMatchObject({ arquivo: 'varanda', no: 'varanda', x: 6, z: -4.5 })
    expect(toldo[0]?.no).toBe('varanda-toldo')
    const caixas = colisoresDaVaranda(e)
    const deque = caixas.find((c) => c.nome === 'col-varanda-deque')
    // Para fora em +x: o tampo do deque vai de x 6,2 a 7,75.
    expect(deque?.posicao[0]).toBeCloseTo(6.975)
    expect(deque?.posicao[2]).toBeCloseTo(-4.5)
    expect(deque?.meio).toEqual([0.775, 0.05, 2.1])
    // Todo colisor da varanda cai dentro das células dela.
    const ret = e ? retanguloDaVaranda(e) : null
    for (const c of caixas)
      if (ret && c.nome !== 'col-varanda-degrau') {
        expect(c.posicao[0] - c.meio[0]).toBeGreaterThanOrEqual(ret.x0)
        expect(c.posicao[0] + c.meio[0]).toBeLessThanOrEqual(ret.x1)
        expect(c.posicao[2] - c.meio[2]).toBeGreaterThanOrEqual(ret.z0)
        expect(c.posicao[2] + c.meio[2]).toBeLessThanOrEqual(ret.z1)
      }
    expect(colisoresDaVaranda(null)).toEqual([])
  })
})
