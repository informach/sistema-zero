import { beforeAll, describe, expect, test } from 'bun:test'
import { type Mesh, type Object3D, Vector3 } from 'three'
import { ALCANCE_DO_BANCO, bancosDosColisores, pontoDoBanco } from '../src/mundo/bancos-da-vila'
import {
  type ColisorDaIlha,
  lerColisores,
  pecaDoColisor,
  soParaOCorpo,
} from '../src/mundo/colisores-da-ilha'
import { correnteDoPico } from '../src/mundo/corrente-de-ar'
import { maisPerto, type RegistroDeInterativos } from '../src/mundo/interativos'
import { GRAVIDADE } from '../src/mundo/medidas'
import { BANDA } from '../src/sistemas/banda'
import { alcanceDoPulo, beiradaMaximaDoPulo, CORPO } from '../src/sistemas/corpo'
import { lugarNoBanco } from '../src/sistemas/descanso'
import {
  criarEstadoDoCorpo,
  type EntradaDoPasso,
  MODOS,
  type MundoDoMovimento,
} from '../src/sistemas/modos'
import { CORRENTE_DO_PICO } from '../src/sistemas/planador'
import {
  arquivoDaIlha,
  bate,
  carregarGlb,
  type Forma,
  gradeDeAndar,
  grupo,
  jsonDoGlb,
  pisoEm,
  TAMPO,
  topoDaForma,
} from './ajuda-colisores'

/**
 * O Pico Gelado (`arte/ilhas-b/pico.py`, aj-ligar-01): a montanha com a trilha cavada na encosta,
 * o platô do cume e os colisores das peças. A busca em grade confere que a criança anda da chegada
 * da ponte até o platô pela trilha, com o corpo inteiro cabendo, sem degrau maior que o do corpo.
 */
const ARQUIVO = arquivoDaIlha('pico.glb')

let raiz: Object3D
let colisores: ColisorDaIlha[]
let formas: Forma[]
let terreno: Mesh
const ancora = (nome: string) => {
  const o = raiz.getObjectByName(nome)
  if (!o) throw new Error(`sem a âncora ${nome}`)
  return o.position
}

beforeAll(async () => {
  raiz = await carregarGlb(ARQUIVO)
  raiz.updateMatrixWorld(true)
  colisores = lerColisores(raiz)
  formas = colisores.filter((c): c is Forma => c.forma !== 'malha')
  const t = raiz.getObjectByName('col-terreno') as Mesh | undefined
  if (!t?.isMesh) throw new Error('pico.glb sem col-terreno')
  terreno = t
})

describe('os nós col-* do Pico', () => {
  test('existem todos os grupos, sem material (não desenham)', () => {
    const doc = jsonDoGlb(ARQUIVO)
    const nos = doc.nodes.filter((n) => n.name?.startsWith('col-'))
    const quantos = (g: string) => nos.filter((n) => grupo(n.name ?? '') === g).length
    expect(quantos('col-terreno')).toBe(1)
    // O iglu oco (fase3-08): o anel da parede menos a porta, os dois lados do vestíbulo, o fogareiro
    // e os dois bancos de gelo.
    expect(quantos('col-parede-iglu')).toBe(21)
    expect(quantos('col-cil-fogareiro')).toBe(1)
    expect(quantos('col-banco')).toBe(2)
    expect(quantos('col-cil-palco')).toBe(1)
    expect(quantos('col-degrau-palco')).toBe(2)
    expect(quantos('col-parede-gelo')).toBe(3)
    expect(quantos('col-topo-parede')).toBe(1)
    expect(quantos('col-treno')).toBe(1)
    expect(quantos('col-cil-pinheiro')).toBe(12)
    expect(quantos('col-cil-boneco')).toBe(2)
    expect(quantos('col-bloco-de-gelo')).toBe(5)
    expect(quantos('col-cil-poste-lampiao')).toBe(3)
    expect(quantos('col-cil-poste-bandeira')).toBe(2)
    expect(quantos('col-cil-poste-mastro')).toBe(1)
    expect(quantos('col-cil-poste-trilha')).toBeGreaterThan(20)
    expect(quantos('col-guarda-trilha')).toBe(quantos('col-cil-poste-trilha') - 1)
    // A caverna de cristal (fase3-07), com `caverna` no nome.
    expect({
      parede: quantos('col-caverna-parede'),
      teto: quantos('col-cil-caverna-teto'),
      chao: quantos('col-cil-caverna-chao'),
      rampa: quantos('col-caverna-rampa'),
      boca: quantos('col-caverna-boca'),
      colunas: quantos('col-cil-caverna-coluna'),
      laje: quantos('col-cil-caverna-laje'),
      cristais: quantos('col-cil-caverna-cristal'),
      poste: quantos('col-cil-poste-caverna'),
    }).toEqual({
      parede: 32,
      teto: 1,
      chao: 1,
      rampa: 2,
      boca: 3,
      colunas: 4,
      laje: 1,
      cristais: 4,
      poste: 1,
    })
    for (const n of nos) expect(n.mesh === undefined || doc.meshes[n.mesh] !== undefined).toBe(true)
    for (const n of nos) {
      if (n.mesh === undefined) continue
      for (const p of doc.meshes[n.mesh]?.primitives ?? []) expect(p.material).toBeUndefined()
    }
  })

  test('a câmera passa pelo guarda-corpo e pelos postes; a montanha e o iglu a seguram', () => {
    expect(soParaOCorpo('col-guarda-trilha-1')).toBe(true)
    expect(soParaOCorpo('col-cil-poste-trilha-1')).toBe(true)
    expect(soParaOCorpo('col-cil-poste-lampiao-1')).toBe(true)
    expect(soParaOCorpo('col-parede-iglu-1')).toBe(false)
    // Na caverna, as paredes e o teto seguram a câmera; o poste da placa, não.
    expect(soParaOCorpo('col-caverna-parede-1')).toBe(false)
    expect(soParaOCorpo('col-cil-caverna-teto-1')).toBe(false)
    expect(soParaOCorpo('col-cil-poste-caverna-1')).toBe(true)
  })
})

describe('a trilha até o cume', () => {
  let grade: ReturnType<typeof gradeDeAndar>
  const celulas = () => grade.celulas
  const centro = (i: number) => grade.centro(i)
  const alcance = (x: number, z: number) => grade.alcance(x, z)
  const chaoEm = (x: number, z: number) => grade.chaoEm(x, z)
  beforeAll(() => {
    grade = gradeDeAndar(terreno, formas)
  }, 120_000)

  test('da chegada da ponte, a criança anda até o platô do cume', () => {
    const chegada = ancora('chegada')
    const cume = ancora('cume')
    const andou = alcance(chegada.x, chegada.z)
    let noPlato = 0
    for (const i of andou) {
      const { x, z } = centro(i)
      const c = celulas()[i]
      if (c && Math.hypot(x - cume.x, z - cume.z) < 2 && Math.abs(c.y - cume.y) < 0.15) noPlato++
    }
    // Pelo menos um pedaço do platô (não só uma célula na beira).
    expect(noPlato).toBeGreaterThan(20)
  })

  test('a trilha começa na âncora de baixo e termina no platô', () => {
    const inicio = ancora('trilha-inicio')
    const fim = ancora('trilha-fim')
    const cume = ancora('cume')
    // A um degrau do chão da ilha: entra-se nela andando.
    expect((chaoEm(inicio.x, inicio.z) ?? 0) - TAMPO).toBeLessThan(CORPO.degrau)
    // A âncora fica no chão da trilha (que ali já subiu um pouco), não no chão da ilha.
    expect(Math.abs((chaoEm(inicio.x, inicio.z) ?? 0) - inicio.y)).toBeLessThan(0.1)
    expect(Math.abs((chaoEm(fim.x, fim.z) ?? 0) - cume.y)).toBeLessThan(0.15)
    expect(cume.y - TAMPO).toBeGreaterThan(7)
  })

  test('a encosta não se sobe: o alto só se alcança pela trilha e pelo platô', () => {
    // Na trilha, o chão de cada célula alta tem logo ao lado (dentro de 1,2 m) a parede de rocha
    // de dentro: um chão bem mais alto. Na encosta lisa, o chão sobe aos poucos e não há parede.
    // Toda célula alta alcançada andando é da trilha (com a parede ao lado) ou do cume.
    const chegada = ancora('chegada')
    const cume = ancora('cume')
    const andou = alcance(chegada.x, chegada.z)
    let altas = 0
    for (const i of andou) {
      const c = celulas()[i]
      if (!c || c.y < TAMPO + 1.5) continue
      altas++
      const { x, z } = centro(i)
      // O platô (uns 2,6 m de raio) e o fim da rampa, que entra nele com a parede sumindo.
      const d = Math.hypot(x - cume.x, z - cume.z)
      if (d < 2.8) continue
      // Para o meio da montanha, a parede de dentro.
      const ux = (cume.x - x) / d
      const uz = (cume.z - z) / d
      const parede = [0.5, 0.8, 1.2, 1.6].some(
        (k) => (chaoEm(x + ux * k, z + uz * k) ?? -Infinity) > c.y + 0.8,
      )
      expect(parede).toBe(true)
    }
    expect(altas).toBeGreaterThan(100)
  })

  test('as âncoras dos lugares ficam fora da montanha, em chão plano', () => {
    for (const nome of [
      'morador',
      'lumi-1',
      'lumi-2',
      'lumi-3',
      'lumi-4',
      'iglu',
      'lago-congelado',
    ]) {
      const p = ancora(nome)
      const y = chaoEm(p.x, p.z)
      expect(y).toBeDefined()
      expect(Math.abs((y ?? 0) - TAMPO)).toBeLessThan(0.15)
    }
  })
})

describe('a subida ao cume e a descida de trenó (fase3-07)', () => {
  let grade: ReturnType<typeof gradeDeAndar>
  beforeAll(() => {
    grade = gradeDeAndar(terreno, formas)
  }, 120_000)
  const pontos = (prefixo: string) => {
    const lista = []
    for (let i = 1; raiz.getObjectByName(`${prefixo}-${i}`); i++)
      lista.push(ancora(`${prefixo}-${i}`))
    return lista
  }

  test('as quatro paradas sobem pela trilha, no chão dela, e a última entra no platô', () => {
    const paradas = pontos('subida')
    expect(paradas).toHaveLength(4)
    let antes = ancora('trilha-inicio').y
    for (const p of paradas) {
      expect(Math.abs((grade.chaoEm(p.x, p.z) ?? 0) - p.y)).toBeLessThan(0.1)
      expect(p.y).toBeGreaterThan(antes + 1)
      antes = p.y
    }
    const cume = ancora('cume')
    expect(Math.abs((paradas[3]?.y ?? 0) - cume.y)).toBeLessThan(0.15)
    const andou = grade.alcance(ancora('chegada').x, ancora('chegada').z)
    for (const p of paradas) expect(grade.chegaPerto(andou, p.x, p.z, 0.6)).toBe(true)
  })

  test('os cinco flocos ficam na linha do meio da trilha, subindo', () => {
    const flocos = pontos('floco')
    expect(flocos).toHaveLength(5)
    let antes = TAMPO
    for (const f of flocos) {
      expect(Math.abs((grade.chaoEm(f.x, f.z) ?? 0) - f.y)).toBeLessThan(0.1)
      expect(f.y).toBeGreaterThan(antes)
      antes = f.y
    }
  })

  test('o trenó espera no platô, ao alcance de quem chega, sem tapar a boca da trilha', () => {
    const treno = ancora('treno')
    const cume = ancora('cume')
    expect(Math.abs(treno.y - cume.y)).toBeLessThan(0.05)
    expect(Math.hypot(treno.x - cume.x, treno.z - cume.z)).toBeLessThan(2)
    const andou = grade.alcance(ancora('chegada').x, ancora('chegada').z)
    expect(grade.chegaPerto(andou, treno.x, treno.z, 1.5)).toBe(true)
    expect(grade.chegaPerto(andou, cume.x, cume.z, 0.6)).toBe(true)
  })

  test('o colisor do trenó é da peça: quem senta nele não bate nele', () => {
    const doTreno = colisores.filter((c) => pecaDoColisor(c.nome) === 'treno')
    expect(doTreno.map((c) => c.nome)).toEqual(['col-treno-1'])
    // Nenhum outro colisor do Pico vira peça (o chão continua no corpo da ilha).
    expect(colisores.filter((c) => pecaDoColisor(c.nome) !== null)).toHaveLength(1)
  })

  test('a linha do trenó sai dele, desce sempre pelo chão da trilha e acaba no pé', () => {
    const curva = pontos('treno-curva')
    expect(curva.length).toBeGreaterThan(20)
    const treno = ancora('treno')
    expect(Math.hypot((curva[0]?.x ?? 0) - treno.x, (curva[0]?.z ?? 0) - treno.z)).toBeLessThan(
      0.05,
    )
    for (let i = 1; i < curva.length; i++) {
      const a = curva[i - 1]
      const b = curva[i]
      if (!a || !b) continue
      expect(b.y).toBeLessThanOrEqual(a.y + 0.01)
      // Trechos curtos: a linha reta entre dois pontos não corta a parede da curva.
      expect(Math.hypot(b.x - a.x, b.z - a.z)).toBeLessThan(2.5)
      expect(Math.abs((grade.chaoEm(b.x, b.z) ?? 0) - b.y)).toBeLessThan(0.1)
    }
    const fim = curva[curva.length - 1]
    expect((fim?.y ?? 0) - TAMPO).toBeLessThan(CORPO.degrau)
  })
})

describe('a caverna de cristal (fase3-07)', () => {
  const ehPiso = (c: Forma) => /caverna-(chao|rampa)/.test(c.nome)

  test('chega-se à boca andando da chegada da ponte, por trás da montanha', () => {
    const grade = gradeDeAndar(terreno, formas)
    const chegada = ancora('chegada')
    const boca = ancora('caverna-entrada')
    expect(grade.chegaPerto(grade.alcance(chegada.x, chegada.z), boca.x, boca.z, 0.6)).toBe(true)
  }, 120_000)

  test('da boca, a rampa desce até a galeria, o laguinho e o pé de cada saliência', () => {
    const grade = gradeDeAndar(terreno, formas, 9, 0.25, {
      meioX: -18,
      ePiso: ehPiso,
      pisoMinimo: 0.3,
    })
    const boca = ancora('caverna-entrada')
    const dentro = grade.alcance(boca.x, boca.z)
    for (const nome of ['caverna-galeria', 'caverna-laguinho', 'caverna-degrau-1']) {
      const p = ancora(nome)
      expect([nome, grade.chegaPerto(dentro, p.x, p.z, 1.2)]).toEqual([nome, true])
    }
  }, 120_000)

  test('as saliências levam, pulando, do chão da galeria ao cristal raro', () => {
    const altura = beiradaMaximaDoPulo(GRAVIDADE)
    const alcance = alcanceDoPulo(CORPO.andar, GRAVIDADE)
    const colunas = formas
      .filter((c) => /caverna-(coluna|laje)/.test(c.nome))
      .sort((a, b) => topoDaForma(a) - topoDaForma(b))
    expect(colunas).toHaveLength(5)
    const chao = formas.find((c) => c.nome.startsWith('col-cil-caverna-chao'))
    let antes = topoDaForma(chao as Forma)
    let anterior: Forma | null = null
    for (const c of colunas) {
      if (c.forma !== 'cilindro') throw new Error(`${c.nome} não é cilindro`)
      const topo = topoDaForma(c)
      expect([c.nome, topo - antes < altura * 0.8]).toEqual([c.nome, true])
      if (anterior?.forma === 'cilindro') {
        const vao =
          Math.hypot(c.posicao[0] - anterior.posicao[0], c.posicao[2] - anterior.posicao[2]) -
          c.raio -
          anterior.raio
        expect([c.nome, vao < alcance * 0.8]).toEqual([c.nome, true])
      }
      antes = topo
      anterior = c
    }
    const cristal = ancora('cristal-raro')
    const laje = colunas[colunas.length - 1]
    expect(Math.abs(cristal.y - topoDaForma(laje as Forma))).toBeLessThan(0.05)
  })
})

describe('o iglu por dentro e a banda (fase3-08)', () => {
  let grade: ReturnType<typeof gradeDeAndar>
  let andou: Set<number>
  beforeAll(() => {
    grade = gradeDeAndar(terreno, formas)
    const chegada = ancora('chegada')
    andou = grade.alcance(chegada.x, chegada.z)
  }, 120_000)

  test('da chegada, a criança entra no iglu pela porta e fica de pé lá dentro', () => {
    const porta = ancora('iglu')
    const dentro = ancora('iglu-dentro')
    expect(grade.chegaPerto(andou, porta.x, porta.z, 0.5)).toBe(true)
    expect(grade.chegaPerto(andou, dentro.x, dentro.z, 0.5)).toBe(true)
    expect(Math.abs((grade.chaoEm(dentro.x, dentro.z) ?? 0) - TAMPO)).toBeLessThan(0.15)
  })

  test('em nenhum lugar onde se anda lá dentro a cabeça passa da cúpula nem do arco da porta', () => {
    // A cúpula de dentro (arte/ilhas-b/pico.py, IGLU): raio 2,6 e 2,455 de altura no meio. A porta:
    // meia-largura 0,75, lados retos até 1,45 e o arco em cima.
    const dentro = ancora('iglu-dentro')
    const porta = ancora('iglu')
    const fx = porta.x - dentro.x
    const fz = porta.z - dentro.z
    const n = Math.hypot(fx, fz)
    const raio = 2.6
    const alto = 2.455
    // O alto da cápsula sobe até `doCentroAoPe * 2` acima do pé, mais a folga do controlador.
    const cabeca = CORPO.doCentroAoPe * 2 + CORPO.folga
    let celulas = 0
    for (const i of andou) {
      const c = grade.centro(i)
      const dx = c.x - dentro.x
      const dz = c.z - dentro.z
      const d = Math.hypot(dx, dz)
      if (d > raio + 1.5) continue
      const frente = (dx * fx + dz * fz) / n
      const lado = (dx * fz - dz * fx) / n
      if (d < raio - 0.05) celulas++
      // A cúpula de dentro e, no corredor da porta, o arco: onde a cúpula fica abaixo dele, o vão
      // da porta a cortou, e o teto é o arco.
      const cupula = d < raio ? alto * Math.sqrt(1 - (d / raio) ** 2) : Number.POSITIVE_INFINITY
      const arco = Math.abs(lado) < 0.75 && frente > 0 ? 1.45 + Math.sqrt(0.75 ** 2 - lado ** 2) : 0
      const teto = Math.max(cupula, arco)
      expect(teto, `em ${d.toFixed(2)}`).toBeGreaterThan(cabeca)
    }
    // Lá dentro dá para andar, não só a porta: uns 4,5 m² livres entre o fogareiro e os bancos
    // (72 células de 25 cm em 29/10/2026).
    expect(celulas).toBeGreaterThan(60)
  })

  test('os dois bancos de gelo olham para o meio do iglu, e quem senta fica num lugar livre', () => {
    const dentro = ancora('iglu-dentro')
    const bancos = bancosDosColisores(lerColisores(raiz), { x: 0, y: 0, z: 0 })
    expect(bancos).toHaveLength(2)
    for (const b of bancos) {
      const dx = dentro.x - b.centro.x
      const dz = dentro.z - b.centro.z
      const n = Math.hypot(dx, dz)
      // A frente do banco aponta para o meio (o cosseno entre as duas direções perto de 1).
      expect((Math.sin(b.frente) * dx + Math.cos(b.frente) * dz) / n, b.id).toBeGreaterThan(0.95)
      const lugar = lugarNoBanco(b.id, b.centro, b.frente)
      expect(grade.chegaPerto(andou, lugar.corpo.x, lugar.corpo.z, 0.3), b.id).toBe(true)
    }
  })

  test('o fogareiro e o xilofone perdido ficam ao alcance de quem está dentro', () => {
    for (const nome of ['fogareiro', 'instrumento-xilofone']) {
      const p = ancora(nome)
      expect(grade.chegaPerto(andou, p.x, p.z, 1.6), nome).toBe(true)
    }
  })

  test('de pé junto do xilofone, do fogareiro ou de um banco, o botão é o daquele', () => {
    // Os interativos de lá de dentro, nos lugares e alcances do jogo (o banco pela frente dele).
    const registro: RegistroDeInterativos = new Map()
    const por = (id: string, p: { x: number; z: number }, raio: number) =>
      registro.set(id, { ...p, raio, rotulo: () => id, agir: () => {} })
    por('xilofone', ancora('instrumento-xilofone'), BANDA.alcance)
    por('fogareiro', ancora('fogareiro'), BANDA.alcanceDoFogareiro)
    for (const b of bancosDosColisores(lerColisores(raiz), { x: 0, y: 0, z: 0 }))
      por(b.id, pontoDoBanco(b.centro, b.frente), ALCANCE_DO_BANCO)
    expect(registro.size).toBe(4)
    const dentro = ancora('iglu-dentro')
    const livres = [...andou]
      .map((i) => grade.centro(i))
      .filter((c) => Math.hypot(c.x - dentro.x, c.z - dentro.z) < 2.6)
    for (const [id, it] of registro) {
      // Chegando de frente (do meio do iglu, a até 20 cm da linha reta até ele), do lugar livre
      // mais perto (encostada no fogareiro, na frente do banco) até 20 cm além, o botão é o dele,
      // não o do lado.
      const d = (c: { x: number; z: number }) => Math.hypot(c.x - it.x, c.z - it.z)
      const meio = Math.hypot(dentro.x - it.x, dentro.z - it.z)
      const ux = (dentro.x - it.x) / meio
      const uz = (dentro.z - it.z) / meio
      const deFrente = livres.filter(
        (c) =>
          (c.x - it.x) * ux + (c.z - it.z) * uz > 0 &&
          Math.abs((c.x - it.x) * uz - (c.z - it.z) * ux) <= 0.2,
      )
      // O colisor do xilofone vem do jogo: o corpo encosta nele a meia profundidade (0,26) mais o raio.
      const encostada = Math.max(
        Math.min(...deFrente.map(d)),
        id === 'xilofone' ? 0.26 + CORPO.raio : 0,
      )
      // O corpo encosta a 0,81 m do meio do fogareiro (0,46 + 0,35); a grade é de 25 cm.
      expect(encostada, id).toBeLessThan(1)
      const chegando = deFrente.filter((c) => d(c) <= encostada + 0.2)
      expect(chegando.length, id).toBeGreaterThan(0)
      for (const c of chegando)
        expect(maisPerto(registro, c.x, c.z)?.id, `${id} em ${c.x}, ${c.z}`).toBe(id)
    }
  })

  test('o violão perdido fica no chão perto do lago, e a bateria no platô do cume', () => {
    const violao = ancora('instrumento-violao')
    expect(grade.chegaPerto(andou, violao.x, violao.z, 1.2)).toBe(true)
    expect(Math.abs((grade.chaoEm(violao.x, violao.z) ?? 0) - TAMPO)).toBeLessThan(0.15)
    const bateria = ancora('instrumento-bateria')
    const cume = ancora('cume')
    expect(Math.hypot(bateria.x - cume.x, bateria.z - cume.z)).toBeLessThan(2)
    expect(Math.abs(bateria.y - cume.y)).toBeLessThan(0.1)
    expect(grade.chegaPerto(andou, bateria.x, bateria.z, 1.4)).toBe(true)
  })

  test('cada instrumento e cada músico têm o seu lugar em cima do tablado do palco', () => {
    const palco = ancora('palco')
    for (const nome of ['xilofone', 'violao', 'bateria']) {
      for (const p of [ancora(`banda-${nome}`), ancora(`musico-${nome}`)]) {
        expect(Math.hypot(p.x - palco.x, p.z - palco.z)).toBeLessThan(2.2)
        expect(Math.abs(p.y - palco.y)).toBeLessThan(0.02)
      }
    }
  })
})

describe('o vento da parede de gelo e o planador (fase3-09)', () => {
  const corrente = () => {
    const c = correnteDoPico(raiz, { x: 0, y: 0, z: 0 }, 0)
    if (!c) throw new Error('pico.glb sem a âncora corrente-de-ar')
    return c
  }
  const algumaBate = (p: Vector3) => formas.some((f) => bate(f, p))

  test('a corrente fica no chão, na frente do painel mais alto, e chega-se nela andando', () => {
    const c = corrente()
    expect(Math.abs(c.base - TAMPO)).toBeLessThan(0.05)
    expect(c.topo - c.base).toBe(CORRENTE_DO_PICO.altura)
    const topo = ancora('topo-da-parede')
    // O vento sobe um pouco mais alto que o alto da parede: saindo dele, o planador chega à parede
    // ainda por cima dela (mais alto, ele passaria por cima sem descer até o alto da parede).
    expect(c.topo).toBeGreaterThan(topo.y + 0.25)
    expect(Math.hypot(topo.x - c.x, topo.z - c.z)).toBeLessThan(3)
    const grade = gradeDeAndar(terreno, formas)
    const chegada = ancora('chegada')
    expect(grade.chegaPerto(grade.alcance(chegada.x, chegada.z), c.x, c.z, 0.5)).toBe(true)
  }, 120_000)

  test('dentro dela não há nada em que o corpo bata, do chão ao alto', () => {
    const c = corrente()
    for (let y = c.base + 0.3; y <= c.topo; y += 0.25) {
      for (let k = 0; k < 9; k++) {
        const r = k === 0 ? 0 : c.raio * 0.8
        const a = (k / 8) * Math.PI * 2
        const p = new Vector3(c.x + Math.cos(a) * r, y + CORPO.doCentroAoPe, c.z + Math.sin(a) * r)
        expect(algumaBate(p), `em ${p.x.toFixed(2)}, ${y.toFixed(2)}, ${p.z.toFixed(2)}`).toBe(
          false,
        )
      }
    }
  })

  test('do alto da corrente, planando para a parede, a criança pousa no alto dela', () => {
    const c = corrente()
    const topo = ancora('topo-da-parede')
    const mundo: MundoDoMovimento = {
      cipos: [],
      troncos: [],
      aguas: [],
      equilibrios: [],
      escadas: [],
      escorregadores: [],
      bordas: [],
      rodasDeNado: [],
      correntes: [c],
      foco: { x: 0, y: 0, z: 0 },
    }
    const corpo = criarEstadoDoCorpo()
    corpo.modo = 'planar'
    const p = new Vector3(c.x, c.topo - 0.1 + CORPO.doCentroAoPe, c.z)
    const n = Math.hypot(topo.x - c.x, topo.z - c.z)
    corpo.direcao = Math.atan2(topo.x - c.x, topo.z - c.z)
    let pousou: string | undefined
    for (let i = 0; i < 600 && !pousou; i++) {
      const e: EntradaDoPasso = {
        dt: 1 / 60,
        agora: i * 16,
        parado: false,
        p: { x: p.x, y: p.y, z: p.z },
        ix: 0,
        iz: 1,
        pedidoX: (topo.x - c.x) / n,
        pedidoZ: (topo.z - c.z) / n,
        ladoX: 1,
        ladoZ: 0,
        pulou: false,
        usou: false,
        correr: false,
        ritmo: 1,
        patins: false,
        planador: true,
        conversa: null,
        gravidade: GRAVIDADE,
        nivelDoMar: 0,
      }
      MODOS.planar.passo(corpo, e, mundo)
      const prox = p.clone().add(new Vector3(corpo.desloc.x, corpo.desloc.y, corpo.desloc.z))
      const piso = pisoEm(formas, prox.x, prox.z)
      if (prox.y - CORPO.doCentroAoPe <= piso.y) {
        // Pousar é chegar por cima: com os pés já abaixo do alto, a criança bateria na lateral.
        expect(p.y - CORPO.doCentroAoPe, `chegou pela lateral de ${piso.nome}`).toBeGreaterThan(
          piso.y - 0.05,
        )
        pousou = piso.nome ?? 'chao'
      } else {
        expect(algumaBate(prox), `bateu em ${prox.x.toFixed(2)}, ${prox.y.toFixed(2)}`).toBe(false)
        p.copy(prox)
      }
    }
    expect(pousou).toStartWith('col-topo-parede')
  })
})
