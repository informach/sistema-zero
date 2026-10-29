import { expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { criarSalvamentoInicial } from '@sistemazero/arquipelago-contracts'
import { Box3, CylinderGeometry, Group, Mesh, MeshBasicMaterial } from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import {
  ALTO_DO_FAROL,
  ALVOS_DO_FACHO,
  COLISORES_DO_ALTO,
  campoDaSala,
  pontosDoAlto,
  vistaFinal,
} from '../src/mundo/alto-do-farol'
import { malhasDosOlhos } from '../src/mundo/animado'
import { liberarObjeto } from '../src/mundo/carregar-ilha'
import { soParaOCorpo } from '../src/mundo/colisores-da-ilha'
import { paginasDoDiario, TEXTO_DA_PAGINA } from '../src/sistemas/diario'
import {
  conversarComAIris,
  FALA_FINAL_DO_ZAPPY,
  fachosAcesos,
  finalPausado,
  finalTerminou,
  foraDaPassagemDoFarol,
  IRIS_EM_CASA,
  opacidadeDoCorte,
  PAINEL_DO_FINAL,
  podeSubirOFarol,
  ULTIMA_PAGINA,
  VOLTA_DA_IRIS,
} from '../src/sistemas/final-do-farol'
import { arquivoDaIlha, carregarGlb, type Forma, gradeDeAndar } from './ajuda-colisores'

test('a Lenda abre o final, visitas e posições inválidas não abrem', () => {
  for (const n of [0, 6, 7, NaN, Infinity]) expect(podeSubirOFarol(n)).toBe(false)
  expect(podeSubirOFarol(8)).toBe(true)
  expect(podeSubirOFarol(8, true)).toBe(false)
})

test('a página fica escondida até a leitura, sem alterar o salvamento', () => {
  const s = criarSalvamentoInicial(new Date('2026-10-29T12:00:00Z'))
  const antes = JSON.stringify(s)
  expect(paginasDoDiario(s).find((p) => p.ilha === 'farol')?.aberta).toBe(false)
  expect(paginasDoDiario(s, true).find((p) => p.ilha === 'farol')).toMatchObject({
    aberta: true,
    texto: TEXTO_DA_PAGINA.farol,
  })
  expect(conversarComAIris(s).salvamento).toBe(s)
  expect(JSON.stringify(s)).toBe(antes)
})

test('seis fachos em ordem, com um intervalo completo para a última ilha', () => {
  expect(ALVOS_DO_FACHO).toHaveLength(6)
  expect(new Set(ALVOS_DO_FACHO.map((a) => a.ilha.id)).size).toBe(6)
  expect(fachosAcesos(0, false)).toBe(0)
  for (const menos of [false, true]) {
    const inicio = menos ? 0 : 3
    for (let i = 0; i < 6; i++) expect(fachosAcesos(inicio + 2 * i, menos)).toBe(i + 1)
    expect(finalTerminou(inicio + 11.9, menos)).toBe(false)
    expect(finalTerminou(inicio + 12, menos)).toBe(true)
    expect(fachosAcesos(200, menos)).toBe(6)
  }
  expect(campoDaSala(390 / 844)).toBeGreaterThan(campoDaSala(1280 / 720))
  expect(vistaFinal(390 / 844).y).toBeGreaterThan(vistaFinal(1280 / 720).y)
})

test('menu, tempo, ferramenta, aba escondida e conflitos pausam o final', () => {
  const s = {
    menuAberto: false,
    painelAberto: PAINEL_DO_FINAL,
    ferramentaAberta: false,
    tempoAcabou: false,
    tempoPausado: false,
    tempoSincronizando: false,
    resultado: null,
  }
  expect(finalPausado(s, true)).toBe(false)
  expect(finalPausado(s, false)).toBe(true)
  for (const campo of [
    'menuAberto',
    'ferramentaAberta',
    'tempoAcabou',
    'tempoPausado',
    'tempoSincronizando',
  ])
    expect(finalPausado({ ...s, [campo]: true }, true)).toBe(true)
  expect(finalPausado({ ...s, salvamentoSituacao: 'conflito' }, true)).toBe(true)
  expect(finalPausado({ ...s, painelAberto: 'diario' }, true)).toBe(true)
})

test('a chegada e a mesa se alcançam a pé na sala real, com piso e paredes simples', async () => {
  const modelo = await carregarGlb(arquivoDaIlha('alto-do-farol.glb'))
  const pontos = pontosDoAlto(modelo)
  const terreno = new Mesh(new CylinderGeometry(4.2, 4.2, 0.2, 32), new MeshBasicMaterial())
  terreno.position.y = -0.1
  terreno.updateMatrixWorld(true)
  const grade = gradeDeAndar(terreno, COLISORES_DO_ALTO as Forma[], 4.3, 0.1, { pisoMinimo: -0.05 })
  const x = pontos.entrada.x - ALTO_DO_FAROL.x,
    z = pontos.entrada.z - ALTO_DO_FAROL.z
  expect(grade.celulas[grade.indice(x, z)]?.livre).toBe(true)
  expect(
    grade.chegaPerto(
      grade.alcance(x, z),
      pontos.mesa.x - ALTO_DO_FAROL.x,
      pontos.mesa.z - ALTO_DO_FAROL.z,
      0.7,
    ),
  ).toBe(true)
  expect(COLISORES_DO_ALTO.every((c) => c.forma !== 'malha')).toBe(true)
  liberarObjeto(modelo)
  liberarObjeto(terreno)
})

test('a Íris tem os clipes, olhos e colisor de corpo usados pelo morador', async () => {
  const bytes = readFileSync(join(import.meta.dir, '../src/assets/personagens/iris.glb'))
  const gltf = await new GLTFLoader().parseAsync(
    bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
    '',
  )
  for (const clipe of ['parado', 'andar', 'falar', 'acenar', 'feliz'])
    expect(gltf.animations.some((a) => a.name === clipe)).toBe(true)
  expect(malhasDosOlhos(gltf.scene).length).toBeGreaterThan(0)
  expect(soParaOCorpo('col-morador-iris')).toBe(true)
  let mediu = false
  gltf.scene.traverse((no) => {
    if (!(no instanceof Mesh) || !no.name.startsWith('iris-cabeca')) return
    if (Array.isArray(no.material) || no.material.name !== 'pele') return
    // A mesma pose de repouso dos accessors do GLB, sem a expansão dos morph targets.
    const caixa = new Box3().setFromBufferAttribute(no.geometry.getAttribute('position'))
    expect(IRIS_EM_CASA.raio).toBeGreaterThanOrEqual(
      Math.max(Math.abs(caixa.min.x), Math.abs(caixa.max.x)),
    )
    expect(IRIS_EM_CASA.altura).toBeCloseTo(caixa.max.y, 2)
    expect(IRIS_EM_CASA.alturaDaCabeca).toBeCloseTo((caixa.min.y + caixa.max.y) / 2, 3)
    mediu = true
  })
  expect(mediu).toBe(true)
  liberarObjeto(gltf.scene)
})

test('a sala privada libera todas as geometrias, materiais e texturas', async () => {
  const modelo = await carregarGlb(arquivoDaIlha('alto-do-farol.glb'))
  const geometrias = new Set<Mesh['geometry']>()
  modelo.traverse((o) => {
    if (o instanceof Mesh) geometrias.add(o.geometry)
  })
  let soltas = 0
  for (const g of geometrias) g.addEventListener('dispose', () => soltas++)
  liberarObjeto(modelo)
  expect(soltas).toBe(geometrias.size)
  expect(soltas).toBeGreaterThan(0)
})

test('texto curto sem pergunta inicial, travessão ou exclamação e pedido futuro medido', () => {
  for (const texto of [...ULTIMA_PAGINA, FALA_FINAL_DO_ZAPPY, ...VOLTA_DA_IRIS])
    expect(texto).not.toMatch(/[—!?]/)
  expect(new TextEncoder().encode(',"finalDoFarol":false').length).toBe(21)
})

test('as âncoras não somam a posição da sala duas vezes depois da montagem', async () => {
  const modelo = await carregarGlb(arquivoDaIlha('alto-do-farol.glb'))
  const antes = pontosDoAlto(modelo)
  const grupo = new Group()
  grupo.position.set(ALTO_DO_FAROL.x, ALTO_DO_FAROL.y, ALTO_DO_FAROL.z)
  grupo.add(modelo)
  grupo.updateMatrixWorld(true)
  expect(pontosDoAlto(modelo)).toEqual(antes)
  liberarObjeto(modelo)
})

test('o corte fica opaco durante a troca e é dirigido pelo tempo pausável', () => {
  expect(opacidadeDoCorte(0)).toBe(0)
  expect(opacidadeDoCorte(0.13)).toBeCloseTo(0.5)
  expect(opacidadeDoCorte(0.3)).toBe(1)
  expect(opacidadeDoCorte(0.47)).toBeCloseTo(0.5)
  expect(opacidadeDoCorte(0.6)).toBe(0)
})

test('posição e cochilo esperam o corte e o teleporte da saída terminarem', () => {
  expect(foraDaPassagemDoFarol({ etapa: 'sala', corte: null }, false)).toBe(false)
  expect(foraDaPassagemDoFarol({ etapa: 'fora', corte: 0.4 }, false)).toBe(false)
  expect(foraDaPassagemDoFarol({ etapa: 'fora', corte: null }, true)).toBe(false)
  expect(foraDaPassagemDoFarol({ etapa: 'fora', corte: null }, false)).toBe(true)
})
