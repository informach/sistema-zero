import { expect, test } from 'bun:test'
import {
  criarSalvamentoInicial,
  type JogoDoMural,
  type Minijogo,
  OBJETOS_DA_CASA,
  type Salvamento,
  SalvamentoSchema,
} from '@sistemazero/arquipelago-contracts'
import { Box3, CylinderGeometry, Mesh, MeshBasicMaterial, Raycaster, Vector3 } from 'three'
import { ALTO_DO_FAROL, pontosDoAlto, prepararSala } from '../src/mundo/alto-do-farol'
import { liberarObjeto } from '../src/mundo/carregar-ilha'
import { soParaOCorpo } from '../src/mundo/colisores-da-ilha'
import { ganharProjetos } from '../src/sistemas/construcao/projeto-azul'
import { CORPO } from '../src/sistemas/corpo'
import { VOLTA_DA_IRIS } from '../src/sistemas/final-do-farol'
import {
  aparenciaDaExposicao,
  cameraDaGaleria,
  criacoesParaExpor,
  exporNaVaga,
  FALA_DA_GALERIA_VAZIA,
  FALA_DO_MODO_LIVRE,
  galeriaAberta,
  PEDESTAL,
  tirarDaVaga,
  tituloDaExposicao,
  VAGAS_DA_GALERIA,
  vagaDaExposicao,
  vagasDaGaleria,
} from '../src/sistemas/galeria-do-farol'
import { arquivoDaIlha, bate, carregarGlb, type Forma, gradeDeAndar } from './ajuda-colisores'

const AGORA = new Date('2026-10-30T12:00:00Z')
const MINIJOGO: Minijogo = {
  desafioId: '11111111-1111-4111-8111-111111111111',
  titulo: 'Corrida dos bichos',
  aprovadoEm: '2026-10-29T15:00:00.000Z',
  atualizadoEm: '2026-10-29T15:00:00.000Z',
  capa: null,
}
const JOGO: JogoDoMural = { playId: '22222222-2222-4222-8222-222222222222', titulo: 'Labirinto' }

/** O salvamento depois do final, com uma geladeira pintada, uma moldada e uma comprada na galeria. */
function concluido(): Salvamento {
  const s = criarSalvamentoInicial(AGORA)
  const base: Salvamento = { ...s, farol: { pagina: true, concluido: true, galeria: [] } }
  const comProjetos = ganharProjetos(base, AGORA).salvamento
  const geladeira = comProjetos.projetos.geladeira
  if (!geladeira) throw new Error('a geladeira chega no modo livre')
  return {
    ...comProjetos,
    projetos: {
      ...comProjetos.projetos,
      geladeira: {
        ...geladeira,
        aparencia: { origem: 'pinta', id: 'p1' },
        aparencias: [
          { origem: 'galeria', id: 'geladeira-retro' },
          { origem: 'molda', id: 'm1' },
          { origem: 'pinta', id: 'p1' },
        ],
      },
    },
  }
}

test('sem o final concluído, a galeria fica fechada e nada muda', () => {
  const s = criarSalvamentoInicial(AGORA)
  expect(galeriaAberta(s)).toBe(false)
  expect(exporNaVaga(s, 0, ['j', JOGO.playId])).toBe(s)
})

test('expor guarda só até a última vaga cheia, muda de vaga sem repetir e o salvamento V20 aceita', () => {
  let s = concluido()
  s = exporNaVaga(s, 3, ['a', 'geladeira', 'p1'])
  expect(s.farol.galeria).toEqual([null, null, null, ['a', 'geladeira', 'p1']])
  s = exporNaVaga(s, 1, ['j', JOGO.playId])
  s = exporNaVaga(s, 0, ['a', 'geladeira', 'p1'])
  // A geladeira saiu da vaga 4 e as vazias do fim não são guardadas.
  expect(s.farol.galeria).toEqual([
    ['a', 'geladeira', 'p1'],
    ['j', JOGO.playId],
  ])
  expect(vagaDaExposicao(s, ['j', JOGO.playId])).toBe(1)
  expect(vagaDaExposicao(s, ['d', MINIJOGO.desafioId])).toBe(-1)
  expect(vagasDaGaleria(s)).toHaveLength(6)
  expect(SalvamentoSchema.safeParse(s).success).toBe(true)
  // Fora das seis vagas, nada muda.
  expect(exporNaVaga(s, 6, ['d', MINIJOGO.desafioId])).toBe(s)
  expect(exporNaVaga(s, -1, ['d', MINIJOGO.desafioId])).toBe(s)
  s = tirarDaVaga(s, 1)
  expect(s.farol.galeria).toEqual([['a', 'geladeira', 'p1']])
  expect(tirarDaVaga(s, 4)).toBe(s)
})

test('dá para expor o que ela fez, nunca o que comprou na galeria, e os jogos dos serviços', () => {
  const s = concluido()
  const criacoes = criacoesParaExpor(s, [MINIJOGO], [JOGO])
  expect(criacoes.map((c) => c.exposicao)).toEqual([
    ['a', 'geladeira', 'm1'],
    ['a', 'geladeira', 'p1'],
    ['d', MINIJOGO.desafioId],
    ['j', JOGO.playId],
  ])
  expect(criacoes.map((c) => c.titulo)).toEqual([
    'Geladeira do Molda',
    'Geladeira do Pinta',
    'Corrida dos bichos',
    'Labirinto',
  ])
  // Sem as listas do serviço, só as aparências.
  expect(criacoesParaExpor(s, [], [])).toHaveLength(2)
  expect(aparenciaDaExposicao(s, ['a', 'geladeira', 'geladeira-retro'])).toBeNull()
  expect(tituloDaExposicao(s, ['a', 'geladeira', 'sumiu'], [], [])).toBe(
    'Criação que não está mais guardada',
  )
  expect(tituloDaExposicao(s, ['d', MINIJOGO.desafioId], [], [])).toBe('Minijogo')
  expect(tituloDaExposicao(s, ['j', JOGO.playId], [], [JOGO])).toBe('Labirinto')
})

test('o modo livre traz todos os projetos azuis que faltam, uma vez', () => {
  const s = criarSalvamentoInicial(AGORA)
  expect(ganharProjetos(s, AGORA).ganhos).toEqual([])
  const r = ganharProjetos({ ...s, farol: { pagina: true, concluido: true, galeria: [] } }, AGORA)
  expect([...r.ganhos].sort()).toEqual([...OBJETOS_DA_CASA].sort())
  for (const id of OBJETOS_DA_CASA) expect(r.salvamento.projetos[id]).toBeDefined()
  expect(ganharProjetos(r.salvamento, AGORA).ganhos).toEqual([])
})

test('as seis vagas ficam dentro da sala real, longe da mesa, da grade e da lente, e se alcançam a pé', async () => {
  const modelo = await carregarGlb(arquivoDaIlha('alto-do-farol.glb'))
  const pontos = pontosDoAlto(modelo)
  const sala = prepararSala(modelo) as Forma[]
  const local = (p: { x: number; z: number }) => ({
    x: p.x - ALTO_DO_FAROL.x,
    z: p.z - ALTO_DO_FAROL.z,
  })
  const chegada = local(pontos.chegada)
  const leitura = local(pontos.leitura)
  expect(VAGAS_DA_GALERIA).toHaveLength(6)
  const pedestais: Forma[] = VAGAS_DA_GALERIA.map((v, i) => ({
    forma: 'cilindro',
    nome: `col-cil-pedestal-galeria-${i + 1}`,
    posicao: [v.x, PEDESTAL.altura / 2, v.z],
    rotacao: [0, 0, 0, 1],
    raio: PEDESTAL.raioDoTampo,
    meiaAltura: PEDESTAL.altura / 2,
  }))
  expect(pedestais.every((p) => soParaOCorpo(p.nome))).toBe(true)
  for (const v of VAGAS_DA_GALERIA) {
    // O tampo, com 8 cm de folga, não encosta em nenhum colisor da sala (menos o piso). O `bate`
    // já soma o raio do corpo, então a volta conferida é a do tampo menos esse raio.
    for (let k = 0; k < 24; k++) {
      const a = (k / 24) * Math.PI * 2
      const r = PEDESTAL.raioDoTampo + 0.08 - CORPO.raio
      const p = new Vector3(v.x + Math.cos(a) * r, 0.5, v.z + Math.sin(a) * r)
      for (const c of sala)
        if (!c.nome.startsWith('col-cil-piso'))
          expect([c.nome, bate(c, p)]).toEqual([c.nome, false])
    }
    // De frente para a lente, longe da chegada e da leitura.
    expect(Math.hypot(v.x - chegada.x, v.z - chegada.z)).toBeGreaterThan(1.2)
    expect(Math.hypot(v.x - leitura.x, v.z - leitura.z)).toBeGreaterThan(1.2)
    const frente = new Vector3(Math.sin(v.giro), 0, Math.cos(v.giro))
    expect(frente.dot(new Vector3(-v.x, 0, -v.z).normalize())).toBeCloseTo(1, 5)
  }
  // Com os pedestais no lugar, a chegada ainda alcança a mesa e a frente de cada vaga.
  const terreno = new Mesh(new CylinderGeometry(4.2, 4.2, 0.2, 32), new MeshBasicMaterial())
  terreno.position.y = -0.1
  terreno.updateMatrixWorld(true)
  const grade = gradeDeAndar(terreno, [...sala, ...pedestais], 4.6, 0.1, { pisoMinimo: -0.05 })
  const alcance = grade.alcance(chegada.x, chegada.z)
  expect(grade.chegaPerto(alcance, leitura.x, leitura.z, 0.3)).toBe(true)
  for (const v of VAGAS_DA_GALERIA) {
    const r = Math.hypot(v.x, v.z)
    const f = (r - 0.75) / r
    expect(grade.chegaPerto(alcance, v.x * f, v.z * f, 0.3)).toBe(true)
  }
  liberarObjeto(modelo)
  liberarObjeto(terreno)
})

test('a câmera da galeria vê a criança e o pedestal dela sem nada na frente, de qualquer lado', async () => {
  const modelo = await carregarGlb(arquivoDaIlha('alto-do-farol.glb'))
  prepararSala(modelo)
  modelo.updateMatrixWorld(true)
  // Todas as malhas de desenho da sala menos o piso e os tapetes (lente, forro, paredes, mesa...).
  const malhas: Mesh[] = []
  let forro = Number.POSITIVE_INFINITY
  modelo.traverse((o) => {
    if (!(o instanceof Mesh)) return
    const material = Array.isArray(o.material) ? o.material[0] : o.material
    if (material?.name === 'farolVermelho') forro = new Box3().setFromObject(o).min.y
    if (!['pisoFarol', 'pisoFarolEscuro', 'tapete', 'tapeteClaro'].includes(material?.name ?? ''))
      malhas.push(o)
  })
  expect(malhas.length).toBeGreaterThan(5)
  expect(forro).toBeCloseTo(3.5, 1)
  const raio = new Raycaster()
  const tapa = (de: Vector3, ate: Vector3) => {
    const d = ate.clone().sub(de)
    raio.set(de, d.clone().normalize())
    raio.far = d.length() - 0.05
    return raio.intersectObjects(malhas, false)[0]?.object.name ?? null
  }
  for (let k = 0; k < 24; k++) {
    const angulo = (k / 24) * Math.PI * 2 - Math.PI
    const v = cameraDaGaleria(angulo)
    const camera = new Vector3(v.posicao.x, v.posicao.y, v.posicao.z)
    expect(v.posicao.y).toBeLessThan(forro - 0.1)
    expect(Math.hypot(v.posicao.x, v.posicao.z)).toBeLessThan(4.2 - 0.5)
    // A cabeça e o peito de quem está na chegada (1,2 m do centro), no meio e na frente das
    // vagas, e o tampo dos pedestais.
    for (const [r, y] of [
      [1.2, 1.5],
      [1.2, 1],
      [2, 1],
      [2.6, 1],
      [3.3, PEDESTAL.altura + PEDESTAL.alturaDoTampo],
    ] as const) {
      const p = new Vector3(Math.cos(angulo) * r, y, Math.sin(angulo) * r)
      expect([angulo.toFixed(2), r, y, tapa(camera, p)]).toEqual([angulo.toFixed(2), r, y, null])
    }
    // O alvo fica do lado da criança; o giro aponta da câmera para ele, no formato do rastro.
    expect(Math.atan2(v.alvo.z, v.alvo.x)).toBeCloseTo(angulo, 6)
    const d = Math.hypot(v.alvo.x - v.posicao.x, v.alvo.z - v.posicao.z)
    expect(-Math.sin(v.giro)).toBeCloseTo((v.alvo.x - v.posicao.x) / d, 6)
    expect(-Math.cos(v.giro)).toBeCloseTo((v.alvo.z - v.posicao.z) / d, 6)
  }
  liberarObjeto(modelo)
})

test('textos do modo livre sem pergunta inicial, travessão ou exclamação', () => {
  for (const texto of [FALA_DO_MODO_LIVRE, FALA_DA_GALERIA_VAZIA, ...VOLTA_DA_IRIS])
    expect(texto).not.toMatch(/[—!?]/)
})
