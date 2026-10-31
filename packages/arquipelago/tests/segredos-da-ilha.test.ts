import { beforeAll, describe, expect, test } from 'bun:test'
import { join } from 'node:path'
import { ilhasDoAnel } from '@sistemazero/arquipelago-contracts'
import { Box3, type Object3D, Vector3 } from 'three'
import {
  COLISORES_DO_FAROL,
  COLISORES_DO_PIER,
  colisoresDasArvores,
  deslocar,
  GRUPOS,
  posicaoDoCanteiro,
} from '../src/mundo/colisao-da-ilha-central'
import { lerColisores } from '../src/mundo/colisores-da-ilha'
import {
  colisoresNoLugar,
  lugarDoQuadroNaSuaIlha,
  lugarDoQuadroNoFarol,
} from '../src/mundo/lugar-do-quadro'
import { PONTO_DA_PESCA } from '../src/mundo/lugares-da-praia'
import { peDoSegredo, ventoDoSegredo } from '../src/mundo/lugares-dos-segredos'
import {
  ALTURA_DA_TERRA,
  alturaDaIlha,
  BANCADA,
  CATA_VENTO,
  FAROL,
  FUNDO_DO_MAR,
  GRAVIDADE,
  NIVEL_DA_AGUA,
  PIER,
  trajetoDaPonte,
} from '../src/mundo/medidas'
import { CHAVES_DA_CASA } from '../src/sistemas/chaves-da-casa'
import { CIPO, comprimentoDaPegada, GRAVIDADE_DO_CIPO } from '../src/sistemas/cipo'
import { LOTE_DA_CASA_GRANDE } from '../src/sistemas/construcao/lote'
import { beiradaMaximaDoPulo, CORPO } from '../src/sistemas/corpo'
import { BOIAS_DA_ILHA_CENTRAL } from '../src/sistemas/correnteza'
import { PLANADOR } from '../src/sistemas/planador'
import { SEGREDOS } from '../src/sistemas/segredos'
import { bate, carregarGlb, type Forma, pisoEm, topoDaForma, topoEm } from './ajuda-colisores'

/**
 * Os dois segredos novos da sua ilha (31/10/2026):
 * - o cipó (`segredos-da-ilha.glb`, `arte/mundo/segredos_ilha.py`): o deque alto que SÓ o balanço
 *   do cipó alcança, no padrão dos cipós do Bosque (pivô no nó `cipo-1`, corda até o ponto mais baixo);
 * - a gruta do mergulho (`pier.glb`, nó `gruta`): a entrada abaixo da linha d'água e, dentro, o
 *   lugar do segredo onde o corpo cabe, com a área do mergulho no padrão do Recife.
 * Tudo conferido contra os colisores reais (dos arquivos e do código).
 */

/** Os números da dona, medidos no código (31/10/2026): o pulo leva os pés a 1,5 m; de patins, o vão
 *  vai a 4,24 m. */
const PULO = 1.5
const VAO_DOS_PATINS = 4.24
const MUNDO = join(import.meta.dir, '..', 'src', 'assets', 'mundo')

let segredos: Object3D
let pier: Object3D
let farol: Object3D
let doSegredo: Forma[]
let daIlha: Forma[]
let doPier: Forma[]

const solidos = (raiz: Object3D) =>
  lerColisores(raiz).filter((c): c is Forma => c.forma !== 'malha')
/** O piso onde os pés ficam em (x, z): o alto de forma mais alto até `ate`, ou o chão dado. */
const pisoAte = (formas: readonly Forma[], x: number, z: number, chao: number, ate: number) =>
  pisoEm(
    formas.filter((c) => {
      const y = topoEm(c, x, z)
      return y === undefined || y <= ate + 0.05
    }),
    x,
    z,
    chao,
  )
const ancora = (raiz: Object3D, nome: string) => {
  const o = raiz.getObjectByName(nome)
  if (!o) throw new Error(`sem a âncora ${nome}`)
  return o
}

beforeAll(async () => {
  segredos = await carregarGlb(join(MUNDO, 'segredos-da-ilha.glb'))
  pier = await carregarGlb(join(MUNDO, 'pier.glb'))
  farol = await carregarGlb(join(MUNDO, 'farol.glb'))
  const terreno = await carregarGlb(join(MUNDO, 'terreno.glb'))
  for (const r of [segredos, pier, farol, terreno]) r.updateMatrixWorld(true)
  doSegredo = solidos(segredos)
  doPier = solidos(pier)
  daIlha = [
    ...solidos(terreno),
    ...doSegredo,
    ...(colisoresDasArvores() as Forma[]),
    ...(deslocar([...COLISORES_DO_FAROL, ...solidos(farol)], GRUPOS.farol) as Forma[]),
    ...(deslocar([...COLISORES_DO_PIER, ...doPier], GRUPOS.pier) as Forma[]),
    ...(colisoresNoLugar(lugarDoQuadroNaSuaIlha()) as Forma[]),
    ...(colisoresNoLugar(lugarDoQuadroNoFarol()) as Forma[]),
  ]
})

describe('o segredo do cipó', () => {
  const deque = () => doSegredo.find((c) => c.nome === 'col-deque-segredo-1') as Forma

  test('os nós do Bosque: o cipó com o pivô no galho, a árvore, o deque e a âncora em cima dele', () => {
    for (const n of ['cipo-1', 'arvore-do-cipo', 'copa-cipo', 'deque-do-cipo', 'segredo-cipo'])
      expect(segredos.getObjectByName(n), n).toBeDefined()
    expect(doSegredo.some((c) => c.nome === 'col-cil-tronco-cipo-1')).toBe(true)
    expect(deque()).toBeDefined()
    const s = ancora(segredos, 'segredo-cipo').position
    const piso = pisoEm(daIlha, s.x, s.z, alturaDaIlha(s.x, s.z))
    expect(piso.nome).toBe('col-deque-segredo-1')
    expect(Math.abs(piso.y - s.y)).toBeLessThan(0.02)
    const corpo = new Vector3(s.x, s.y + CORPO.doCentroAoPe + CORPO.folga, s.z)
    expect(daIlha.find((c) => bate(c, corpo))?.nome).toBeUndefined()
  })

  /** O pivô e a corda como o Bosque lê (`bosque-vivo.tsx`): do nó até o ponto mais baixo dele. */
  function cipo() {
    const no = ancora(segredos, 'cipo-1')
    const caixa = new Box3().setFromObject(no)
    const pivo = no.position.clone()
    const corda = pivo.y - caixa.min.y
    const chao = alturaDaIlha(pivo.x, pivo.z)
    return {
      pivo,
      corda,
      chao,
      pegada: comprimentoDaPegada(pivo.y, chao, corda, CORPO.doCentroAoPe),
    }
  }

  test('o cipó pende do galho com a pegada inteira (a corda alcança os pés perto do chão)', () => {
    const { corda, pegada, pivo, chao } = cipo()
    expect(corda).toBeGreaterThan(4)
    expect(pegada).toBeGreaterThan(4)
    // No ponto mais baixo, os pés passam a `folgaDosPes` do chão, sem nada no caminho do balanço.
    const s = ancora(segredos, 'segredo-cipo').position
    const rumo = Math.atan2(s.x - pivo.x, s.z - pivo.z)
    for (let a = -CIPO.anguloMaximo; a <= CIPO.anguloMaximo; a += 0.05) {
      const maos = new Vector3(
        pivo.x + Math.sin(rumo) * Math.sin(a) * pegada,
        pivo.y - Math.cos(a) * pegada,
        pivo.z + Math.cos(rumo) * Math.sin(a) * pegada,
      )
      const centro = maos.clone().add(new Vector3(0, -CIPO.maosAcimaDoCentro, 0))
      expect(
        daIlha.find((c) => bate(c, centro))?.nome,
        `no balanço em ${a.toFixed(2)}`,
      ).toBeUndefined()
      expect(centro.y - CORPO.doCentroAoPe).toBeGreaterThan(chao + CIPO.folgaDosPes - 0.01)
    }
  })

  test('o balanço solta a criança em cima do deque (pêndulo e voo com os números do cipó)', () => {
    const { pivo, pegada } = cipo()
    const d = deque()
    const topo = topoDaForma(d)
    const s = ancora(segredos, 'segredo-cipo').position
    const rumo = Math.atan2(s.x - pivo.x, s.z - pivo.z)
    let pousos = 0
    // Bombeando, o balanço chega ao ângulo máximo; soltando em cada ângulo da volta para o deque:
    for (let solta = 0; solta <= CIPO.anguloMaximo; solta += 0.02) {
      const v =
        Math.sqrt(
          2 * GRAVIDADE_DO_CIPO * pegada * (Math.cos(solta) - Math.cos(CIPO.anguloMaximo)),
        ) * CIPO.impulsoAoSoltar
      let ao = Math.sin(solta) * pegada
      let y = pivo.y - Math.cos(solta) * pegada - CIPO.maosAcimaDoCentro
      const vh = Math.cos(solta) * v
      let vy = Math.sin(solta) * v + CIPO.subidaAoSoltar
      for (let t = 0; t < 2; t += 1 / 120) {
        ao += vh / 120
        vy -= GRAVIDADE / 120
        y += vy / 120
        const x = pivo.x + Math.sin(rumo) * ao
        const z = pivo.z + Math.cos(rumo) * ao
        const pes = y - CORPO.doCentroAoPe
        const embaixo = topoEm(d, x, z)
        if (vy < 0 && embaixo !== undefined && pes <= topo) {
          // Pousou se chegou por cima (há meio passo os pés estavam acima do tampo).
          if (pes > topo - 0.15) pousos++
          break
        }
        if (pes < alturaDaIlha(x, z)) break
      }
    }
    expect(pousos).toBeGreaterThan(3)
  })

  test('sem o cipó não se chega: o tampo passa do pulo sobre tudo a menos de 4,24 m dele', () => {
    const d = deque()
    if (d.forma !== 'caixa') throw new Error('o deque é uma caixa')
    const topo = topoDaForma(d)
    expect(PULO).toBeGreaterThanOrEqual(beiradaMaximaDoPulo(GRAVIDADE) - 0.01)
    const [cx, , cz] = d.posicao
    const [mx, , mz] = d.meio
    const outros = daIlha.filter((c) => c !== d && !c.nome.startsWith('col-cil-poste-segredo-'))
    let olhados = 0
    for (let x = cx - mx - VAO_DOS_PATINS; x <= cx + mx + VAO_DOS_PATINS; x += 0.25) {
      for (let z = cz - mz - VAO_DOS_PATINS; z <= cz + mz + VAO_DOS_PATINS; z += 0.25) {
        const fora = Math.max(Math.abs(x - cx) - mx, Math.abs(z - cz) - mz, 0)
        if (fora <= 0 || fora > VAO_DOS_PATINS) continue
        const chao = Math.max(alturaDaIlha(x, z), NIVEL_DA_AGUA)
        const apoio = pisoEm(outros, x, z, chao)
        olhados++
        // Ou bem mais baixo que o tampo, ou bem mais alto (e então inalcançável também).
        const ok = apoio.y < topo - PULO || apoio.y > topo + PULO
        expect(ok, `apoio ${apoio.nome ?? 'chão'} a ${apoio.y.toFixed(2)} em (${x}, ${z})`).toBe(
          true,
        )
      }
    }
    expect(olhados).toBeGreaterThan(500)
    // E nada de escada, quina, tronco de escalar ou equilíbrio no arquivo do segredo.
    segredos.traverse((o) => {
      expect(/^(escada|borda|escalada|equilibrio)-/.test(o.name), o.name).toBe(false)
    })
  })

  test('o planador não chega lá vindo do Farol nem do vento do segredo da ilha', () => {
    const d = deque()
    if (d.forma !== 'caixa') throw new Error('o deque é uma caixa')
    const topo = topoDaForma(d)
    const distancia = (x: number, z: number) =>
      Math.hypot(
        Math.max(Math.abs(x - d.posicao[0]) - d.meio[0], 0),
        Math.max(Math.abs(z - d.posicao[2]) - d.meio[2], 0),
      )
    const alcance = (alto: number) => ((alto - topo) / PLANADOR.descida) * PLANADOR.velocidade
    // O alto da corrente da subida do Farol (e a varanda), no mundo.
    const correnteTopo = ancora(farol, 'corrente-de-ar-topo').position
    const doFarol = {
      x: FAROL.x + correnteTopo.x,
      y: ALTURA_DA_TERRA + correnteTopo.y,
      z: FAROL.z + correnteTopo.z,
    }
    expect(distancia(doFarol.x, doFarol.z)).toBeGreaterThan(alcance(doFarol.y) + 5)
    expect(distancia(FAROL.x, FAROL.z)).toBeGreaterThan(alcance(doFarol.y) + 5)
    const segredo = SEGREDOS.find((s) => s.id === 'sua-ilha')
    if (!segredo) throw new Error('sem o segredo da sua ilha')
    const { corrente } = ventoDoSegredo(segredo, peDoSegredo(segredo))
    expect(distancia(corrente.x, corrente.z)).toBeGreaterThan(alcance(corrente.topo) + 5)
  })

  test('fora do lote grande, da horta, das trilhas, das pontes, das chaves e dos outros lugares', () => {
    const tronco = doSegredo.find((c) => c.nome === 'col-cil-tronco-cipo-1') as Forma
    const d = deque()
    const { pivo } = cipo()
    const pontos = [
      [tronco.posicao[0], tronco.posicao[2]],
      [d.posicao[0], d.posicao[2]],
      [pivo.x, pivo.z],
    ] as const
    const a = LOTE_DA_CASA_GRANDE.area
    const longe = (x: number, z: number, px: number, pz: number, minimo: number, nome: string) =>
      expect(Math.hypot(x - px, z - pz), nome).toBeGreaterThan(minimo)
    for (const [x, z] of pontos) {
      expect(x > a.x0 - 3 && x < a.x1 + 3 && z > a.z0 - 3 && z < a.z1 + 3).toBe(false)
      for (let i = 0; i < 6; i++) {
        const c = posicaoDoCanteiro(i)
        longe(x, z, c.x, c.z, 5, 'horta')
      }
      longe(x, z, BANCADA.x, BANCADA.z, 5, 'bancada')
      longe(x, z, CATA_VENTO.x, CATA_VENTO.z, 5, 'cata-vento')
      longe(x, z, PIER.x, PIER.z, 8, 'píer')
      longe(x, z, FAROL.x, FAROL.z, 30, 'farol')
      for (const k of CHAVES_DA_CASA) longe(x, z, k.x, k.z, 2.5, k.nome)
      for (const s of SEGREDOS.filter((s) => s.ilha === 'sua-ilha')) longe(x, z, s.x, s.z, 5, s.id)
      for (const q of [lugarDoQuadroNaSuaIlha(), lugarDoQuadroNoFarol()])
        longe(x, z, q.x, q.z, 5, 'quadro')
      for (const ilha of ilhasDoAnel())
        for (const p of trajetoDaPonte(ilha)) longe(x, z, p.x, p.z, 3, `ponte de ${ilha.id}`)
    }
  })
})

describe('a gruta do mergulho sob o píer', () => {
  /** No referencial do grupo Pier (y = 0 no mar). */
  const fundo = (x: number, z: number) => alturaDaIlha(PIER.x + x, PIER.z + z)
  const daGruta = () => doPier.filter((c) => c.nome.startsWith('col-gruta-'))

  test('a gruta é filha do píer, com as âncoras do segredo e do mergulho', () => {
    let pai = pier.getObjectByName('gruta')?.parent ?? null
    while (pai && pai.name !== 'pier') pai = pai.parent
    expect(pai?.name).toBe('pier')
    for (const n of ['segredo-mergulho', 'mergulho-gruta', 'area-mergulho-gruta'])
      expect(pier.getObjectByName(n), n).toBeDefined()
    expect(daGruta().length).toBeGreaterThanOrEqual(6)
    // As estacas, o barco e o embarque continuam como estavam.
    expect(doPier.filter((c) => c.nome.startsWith('col-cil-estaca-'))).toHaveLength(8)
    expect(pier.getObjectByName('barco')).toBeDefined()
    expect(pier.getObjectByName('embarque')).toBeDefined()
  })

  test('dentro, no lugar do segredo, o corpo cabe de pé, todo debaixo da água', () => {
    const s = ancora(pier, 'segredo-mergulho').position
    const piso = pisoAte(doPier, s.x, s.z, fundo(s.x, s.z), s.y)
    expect(piso.nome).toMatch(/^col-gruta-/)
    expect(Math.abs(piso.y - s.y)).toBeLessThan(0.02)
    const centro = new Vector3(s.x, s.y + CORPO.doCentroAoPe + CORPO.folga, s.z)
    expect(doPier.find((c) => bate(c, centro))?.nome).toBeUndefined()
    // A cabeça (1,8 m acima dos pés) fica bem abaixo da linha d'água, e o chão da gruta acima do
    // fundo do jogo (que também colide).
    expect(s.y + 2 * CORPO.doCentroAoPe).toBeLessThan(NIVEL_DA_AGUA - 1)
    for (const c of daGruta())
      if (c.forma === 'caixa')
        expect(topoDaForma(c)).toBeGreaterThan(fundo(c.posicao[0], c.posicao[2]))
  })

  test('só se entra mergulhando: a entrada fica abaixo da linha d’água e o resto é rocha', () => {
    const s = ancora(pier, 'segredo-mergulho').position
    const centroY = s.y + CORPO.doCentroAoPe + CORPO.folga
    // De fora, pela frente da entrada (para o píer), o corpo nada em linha reta até o segredo.
    const dir = new Vector3(1, 0, 0)
    for (let d = 0; d <= 3; d += 0.1) {
      const p = new Vector3(s.x + dir.x * d, centroY, s.z)
      expect(doPier.find((c) => bate(c, p))?.nome, `a ${d.toFixed(1)} m da gruta`).toBeUndefined()
    }
    // Em volta, nos outros rumos e mais para cima, a rocha segura.
    for (const [dx, dz] of [
      [-1, 0],
      [0, 1],
      [0, -1],
    ] as const) {
      const p = new Vector3(s.x + dx * 1.6, centroY, s.z + dz * 1.6)
      expect(doPier.find((c) => bate(c, p))?.nome, `${dx}, ${dz}`).toBeDefined()
    }
    // Subindo dali, o teto de rocha segura antes da superfície (não há saída por cima).
    let teto: string | undefined
    for (let y = centroY; y < NIVEL_DA_AGUA && !teto; y += 0.1)
      teto = doPier.find((c) => bate(c, new Vector3(s.x, y, s.z)))?.nome
    expect(teto).toMatch(/^col-(gruta|cil-rocha-gruta)-/)
    // O alto do vão da entrada (o teto) fica a mais de um metro da linha d'água: quem nada na
    // superfície (o corpo até a cintura na água) não passa por ele.
    const alto = Math.min(
      ...daGruta()
        .filter((c) => c.forma === 'caixa' && c.posicao[1] > centroY)
        .map((c) => (c.forma === 'caixa' ? c.posicao[1] - c.meio[1] : 0)),
    )
    expect(alto).toBeLessThan(NIVEL_DA_AGUA - 1)
  })

  test('a área de mergulho cobre a entrada e a gruta, dentro das boias da ilha central', () => {
    const area = ancora(pier, 'area-mergulho-gruta')
    const raio = area.scale.x
    expect(area.scale.z).toBeCloseTo(raio, 3)
    expect(area.position.y).toBeCloseTo(FUNDO_DO_MAR, 3)
    expect(area.position.y + area.scale.y).toBeCloseTo(NIVEL_DA_AGUA, 3)
    const entrada = ancora(pier, 'mergulho-gruta').position
    expect(entrada.y).toBeCloseTo(NIVEL_DA_AGUA, 3)
    const s = ancora(pier, 'segredo-mergulho').position
    for (const p of [entrada, s])
      expect(Math.hypot(p.x - area.position.x, p.z - area.position.z)).toBeLessThan(raio - 1)
    for (const c of daGruta())
      expect(
        Math.hypot(c.posicao[0] - area.position.x, c.posicao[2] - area.position.z),
      ).toBeLessThan(raio)
    // A área cabe antes das boias da ilha central (e da correnteza depois delas).
    const meio = Math.hypot(PIER.x + area.position.x, PIER.z + area.position.z)
    expect(meio + raio).toBeLessThan(BOIAS_DA_ILHA_CENTRAL)
    // Quem está na ponta do píer alcança a entrada (o alcance do mergulho é 1,5 m).
    expect(Math.abs(entrada.x) - 1).toBeLessThan(1.5)
  })

  test('longe das estacas, do barco, do embarque e do ponto da pesca', () => {
    const estacas = doPier.filter((c) => c.nome.startsWith('col-cil-estaca-'))
    const barco = ancora(pier, 'barco').position
    const embarque = ancora(pier, 'embarque').position
    const pesca = { x: PONTO_DA_PESCA.x - PIER.x, z: PONTO_DA_PESCA.z - PIER.z }
    const entrada = ancora(pier, 'mergulho-gruta').position
    for (const c of [
      ...daGruta(),
      ...doPier.filter((k) => k.nome.startsWith('col-cil-rocha-gruta-')),
    ]) {
      const meia = c.forma === 'caixa' ? Math.max(c.meio[0], c.meio[2]) : c.raio
      for (const e of estacas)
        expect(
          Math.hypot(c.posicao[0] - e.posicao[0], c.posicao[2] - e.posicao[2]) - meia,
          c.nome,
        ).toBeGreaterThan(1)
      expect(Math.hypot(c.posicao[0] - barco.x, c.posicao[2] - barco.z) - meia).toBeGreaterThan(3)
    }
    expect(Math.hypot(entrada.x - embarque.x, entrada.z - embarque.z)).toBeGreaterThan(2.5)
    expect(Math.hypot(entrada.x - pesca.x, entrada.z - pesca.z)).toBeGreaterThan(3)
    expect(Math.hypot(entrada.x - barco.x, entrada.z - barco.z)).toBeGreaterThan(3.5)
  })
})
