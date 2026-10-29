import { beforeAll, describe, expect, test } from 'bun:test'
import { join } from 'node:path'
import { criarSalvamentoInicial, ILHAS, PONTOS_DE_CORAL } from '@sistemazero/arquipelago-contracts'
import { type Mesh, type Object3D, Raycaster, Vector3 } from 'three'
import { lerColisores } from '../src/mundo/colisores-da-ilha'
import { centroNoAnel } from '../src/mundo/medidas'
import { ganharProjetos } from '../src/sistemas/construcao/projeto-azul'
import {
  aquarioNoPainel,
  CORAIS,
  coraisReplantados,
  coralReplantado,
  falaDoReplantio,
  LAGOA_DO_RECIFE,
  PEIXES_DO_AQUARIO,
  PONTOS_DOS_CORAIS,
  peixesVisiveis,
  replantarCoral,
  rotuloDoCoral,
} from '../src/sistemas/corais-do-recife'
import { ALCANCE_DO_MAPA, abertasNoMapa, ilhasNoMapa, ROTULO_DO_MAPA } from '../src/sistemas/mapa'
import {
  arquivoDaIlha,
  bate,
  CENTRO_DO_CORPO,
  carregarGlb,
  type Forma,
  gradeDeAndar,
  jsonDoGlb,
} from './ajuda-colisores'

const AGORA = new Date('2026-10-29T12:00:00Z')

/** As regras da casa para o texto que a criança lê. */
function regraDoTexto(t: string) {
  expect(t).not.toMatch(/[!—]/)
  expect(t.split(/[.\n]/)[0]).not.toContain('?')
}

describe('replantar os corais', () => {
  test('cada ponto é um bit; replantar de novo não muda nada', () => {
    let s = criarSalvamentoInicial(AGORA)
    expect(coraisReplantados(s.recife.corais)).toBe(0)
    const ordem = [2, 0, 3, 1]
    for (const [n, i] of ordem.entries()) {
      const antes = s
      s = replantarCoral(s, i)
      expect(coralReplantado(s.recife.corais, i)).toBe(true)
      expect(coraisReplantados(s.recife.corais)).toBe(n + 1)
      expect(replantarCoral(s, i)).toBe(s)
      expect(antes.recife.corais).not.toBe(s.recife.corais)
      // Nada além dos corais muda: nem os achados do mergulho nem as necessidades.
      expect({ ...s, recife: { ...s.recife, corais: antes.recife.corais } }).toEqual(antes)
    }
    expect(s.recife.corais).toBe(2 ** PONTOS_DE_CORAL - 1)
    expect(replantarCoral(s, -1)).toBe(s)
    expect(replantarCoral(s, PONTOS_DE_CORAL)).toBe(s)
  })

  test('as falas contam o que falta e seguem a régua do texto', () => {
    expect(PONTOS_DOS_CORAIS.map((p) => p.no)).toEqual([
      'coral-galho',
      'coral-cerebro',
      'coral-leque',
      'coral-tubo',
    ])
    expect(rotuloDoCoral(1)).toBe('Replantar o coral cérebro')
    expect(falaDoReplantio(0, 0b0001)).toBe(
      'O coral galho voltou a crescer. Um peixe novo foi para o aquário. Faltam 3 corais na lagoa.',
    )
    expect(falaDoReplantio(3, 0b1011)).toContain('Falta 1 coral na lagoa.')
    expect(falaDoReplantio(2, 0b1111)).toBe(
      'Os quatro corais da lagoa voltaram a crescer. O aquário tem quatro peixes.',
    )
    for (let corais = 1; corais < 16; corais++)
      for (let i = 0; i < 4; i++) regraDoTexto(falaDoReplantio(i, corais))
    for (let i = 0; i < 4; i++) regraDoTexto(rotuloDoCoral(i))
  })
})

describe('o aquário', () => {
  test('chega como projeto azul com o primeiro coral, uma vez só', () => {
    const s = criarSalvamentoInicial(AGORA)
    expect(ganharProjetos(s, AGORA).ganhos).not.toContain('aquario')
    const com = replantarCoral(s, 3)
    const r = ganharProjetos(com, AGORA)
    expect(r.ganhos).toContain('aquario')
    expect(r.salvamento.projetos.aquario).toEqual({
      ganhoEm: AGORA.toISOString(),
      aparencia: null,
      aparencias: [],
    })
    expect(ganharProjetos(replantarCoral(r.salvamento, 0), AGORA).ganhos).not.toContain('aquario')
  })

  test('um peixe por coral replantado, e o painel diz onde replantar o resto', () => {
    expect(peixesVisiveis(0)).toEqual([false, false, false, false])
    expect(peixesVisiveis(0b0101)).toEqual([true, false, true, false])
    const painel = aquarioNoPainel(0b0110)
    expect(painel.titulo).toBe('Peixes no aquário: 2 de 4.')
    expect(painel.linhas.map((l) => l.peixe)).toEqual([false, true, true, false])
    expect(painel.linhas[0]?.texto).toBe('Replante o coral galho na lagoa do Recife.')
    expect(painel.linhas[1]?.texto).toBe('O peixe do coral cérebro chegou.')
    for (const l of [painel.titulo, ...painel.linhas.map((x) => x.texto)]) regraDoTexto(l)
  })
})

describe('o mapa do arquipélago', () => {
  test('as ilhas ficam no papel como no anel do mundo, coloridas pela jornada', () => {
    const ilhas = ilhasNoMapa(4, 'recife')
    expect(ilhas.map((i) => i.ilha.id)).toEqual(ILHAS.map((i) => i.id))
    for (const i of ilhas) {
      if (i.ilha.angulo === null) continue
      const c = centroNoAnel(i.ilha)
      // A direção no papel é a do mundo visto de cima (x para a direita, z para baixo).
      expect(Math.sign(Math.round(i.x - 50))).toBe(Math.sign(Math.round(c.x)))
      expect(Math.sign(Math.round(i.y - 50))).toBe(Math.sign(Math.round(c.z)))
    }
    expect(ilhas.filter((i) => i.aberta).map((i) => i.ilha.id)).toEqual([
      'sua-ilha',
      'bosque',
      'vila-doce',
      'recife',
    ])
    expect(ilhas.filter((i) => i.aqui).map((i) => i.ilha.id)).toEqual(['recife'])
    expect(abertasNoMapa(4)).toBe(4)
    expect(abertasNoMapa(8)).toBe(8)
    regraDoTexto(ROTULO_DO_MAPA)
  })
})

describe('no recife.glb e nos modelos', () => {
  let raiz: Object3D
  let formas: Forma[]
  let terreno: Mesh
  beforeAll(async () => {
    raiz = await carregarGlb(arquivoDaIlha('recife.glb'))
    formas = lerColisores(raiz).filter((c): c is Forma => c.forma !== 'malha')
    terreno = raiz.getObjectByName('col-terreno') as Mesh
  })

  test('os quatro corais e os quatro peixes existem nos arquivos', () => {
    const props = jsonDoGlb(arquivoDaIlha('recife-props.glb'))
    for (const p of PONTOS_DOS_CORAIS) expect(props.nodes.some((n) => n.name === p.no)).toBe(true)
    const aquario = jsonDoGlb(
      join(import.meta.dir, '..', 'src', 'assets', 'objetos', 'aquario.glb'),
    )
    for (const nome of PEIXES_DO_AQUARIO)
      expect(aquario.nodes.some((n) => n.name === nome)).toBe(true)
    expect(aquario.animations?.some((a) => a.name === 'nadar')).toBe(true)
  })

  test('cada ponto fica na água rasa da beira da lagoa, no fundo, sem colisor em cima', () => {
    const agua = raiz.getObjectByName('agua') as Mesh
    agua.geometry.computeBoundingBox()
    const nivel = (agua.geometry.boundingBox?.max.y ?? 0) + agua.position.y
    const lagoa = raiz.getObjectByName('lagoa')?.position
    expect(lagoa?.x).toBeCloseTo(LAGOA_DO_RECIFE.x, 3)
    expect(lagoa?.z).toBeCloseTo(LAGOA_DO_RECIFE.z, 3)
    const raios = new Raycaster()
    for (const p of PONTOS_DOS_CORAIS) {
      const dentro =
        ((p.x - LAGOA_DO_RECIFE.x) / LAGOA_DO_RECIFE.raioX) ** 2 +
        ((p.z - LAGOA_DO_RECIFE.z) / LAGOA_DO_RECIFE.raioZ) ** 2
      expect(dentro).toBeLessThan(1)
      raios.set(new Vector3(p.x, 40, p.z), new Vector3(0, -1, 0))
      const fundo = raios.intersectObject(terreno, false)[0]?.point.y
      expect(fundo).toBeDefined()
      expect(Math.abs((fundo ?? 0) - p.y)).toBeLessThan(0.02)
      // Água rasa: dá pé, sem nadar (a cintura fica bem acima da água).
      expect(nivel - p.y).toBeGreaterThan(0.15)
      expect(nivel - p.y).toBeLessThan(0.4)
      const corpo = new Vector3(p.x, p.y + CENTRO_DO_CORPO, p.z)
      expect(formas.find((c) => bate(c, corpo))?.nome).toBeUndefined()
    }
  })

  test('a pé, da chegada, a criança alcança cada coral e a mesa de mapas', () => {
    const grade = gradeDeAndar(terreno, formas, 24)
    const chegada = raiz.getObjectByName('chegada')?.position
    if (!chegada) throw new Error('sem a chegada')
    const andou = grade.alcance(chegada.x, chegada.z)
    // Uma célula seca alcançada fica bem dentro do alcance (a folga cobre o passo da grade).
    for (const p of PONTOS_DOS_CORAIS)
      expect(grade.chegaPerto(andou, p.x, p.z, CORAIS.alcance - 0.5), p.no).toBe(true)
    const mapa = raiz.getObjectByName('mapa')?.position
    if (!mapa) throw new Error('sem a âncora mapa')
    expect(grade.chegaPerto(andou, mapa.x, mapa.z, ALCANCE_DO_MAPA - 0.5)).toBe(true)
  })
})
