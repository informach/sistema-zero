import { beforeAll, expect, test } from 'bun:test'
import { criarSalvamentoInicial, NINHOS_DO_VALE } from '@sistemazero/arquipelago-contracts'
import { Box3, type Mesh, type Object3D, Vector3 } from 'three'
import { lerColisores } from '../src/mundo/colisores-da-ilha'
import { colisoresDoCaminhoDoVale, explorarVale } from '../src/mundo/exploracao-do-vale'
import { giroDaIlha, ilhasEmVolta } from '../src/mundo/medidas'
import { comprimentoDoCaminho, pontoNoCaminho } from '../src/sistemas/caminho'
import { conciliarSalvamento } from '../src/sistemas/conciliar-salvamento'
import { CORPO } from '../src/sistemas/corpo'
import { colecaoDoVale } from '../src/sistemas/diario'
import { comecarConversaComAJade } from '../src/sistemas/jade'
import {
  ACOES_DA_ESCAVACAO,
  cuidarDoNinho,
  deuEspacoAoNinho,
  escavarNoVale,
  FALA_DE_REVER_O_FOSSIL,
  FALAS_DA_ESCAVACAO,
  registrarPegadasDoVale,
  seguirPegadasDoVale,
  todosOsNinhosCuidados,
  EXPLORACAO_DO_VALE as V,
} from '../src/sistemas/vale'
import { arquivoDaIlha, bate, carregarGlb, type Forma, gradeDeAndar } from './ajuda-colisores'

const novo = () => criarSalvamentoInicial(new Date('2026-10-29T12:00:00Z'))
test('duas sessões juntam descobertas sem perder os ninhos ou repetir etapas', () => {
  const base = novo()
  const local = cuidarDoNinho(escavarNoVale(base, true), 'ninho-1', true)
  const remoto = cuidarDoNinho(
    registrarPegadasDoVale(escavarNoVale(escavarNoVale(base, true), true), true),
    'ninho-3',
    true,
  )
  const junto = conciliarSalvamento(base, local, remoto)
  expect(junto?.vale).toEqual({
    pegadas: true,
    escavacao: 2,
    ninhos: ['ninho-3', 'ninho-1'],
    filhote: null,
  })
  expect(base.vale).toEqual({ pegadas: false, escavacao: 0, ninhos: [], filhote: null })
})
test('escavação em três ações, sem prazo, sem mutar e sem repetir conquista', () => {
  const s = novo()
  expect(escavarNoVale(s, false)).toBe(s)
  let atual = s
  for (let i = 1; i <= 3; i++) {
    atual = escavarNoVale(atual, true)
    expect(atual.vale.escavacao).toBe(i)
  }
  expect(s.vale.escavacao).toBe(0)
  expect(escavarNoVale(atual, true)).toBe(atual)
  expect(atual.recife).toBe(s.recife)
  expect(colecaoDoVale(atual).find((i) => i.id === 'fossil')?.feito).toBe(true)
})
test('ninho exige observar no mundo e dar espaço; pausa não conclui e a conquista não se perde', () => {
  const ninho = { x: 1, z: 2 }
  expect(deuEspacoAoNinho(ninho, { x: 2, z: 2 }, true)).toBe(false)
  expect(deuEspacoAoNinho(ninho, { x: 5, z: 2 }, false)).toBe(false)
  expect(deuEspacoAoNinho(ninho, { x: 5, z: 2 }, true)).toBe(true)
  let s = novo()
  for (const id of NINHOS_DO_VALE) {
    expect(cuidarDoNinho(s, id, false)).toBe(s)
    s = cuidarDoNinho(s, id, true)
    expect(cuidarDoNinho(s, id, true)).toBe(s)
  }
  expect(todosOsNinhosCuidados(s)).toBe(true)
  const conversa = comecarConversaComAJade(s)
  expect(conversa.falas[0]).toBe('Você cuidou dos três ninhos.')
  expect(conversa.salvamento.vale.ninhos).toEqual(s.vale.ninhos)
  expect(colecaoDoVale(s).filter((i) => i.id.startsWith('ninho') && i.feito)).toHaveLength(3)
})
test('o rastro confere a ordem, aceita exploração livre e não avança durante pausa', () => {
  const pontos = [
    { x: 0, z: 0 },
    { x: 4, z: 0 },
    { x: 8, z: 0 },
  ]
  expect(seguirPegadasDoVale(0, pontos, pontos[2]!, true)).toBe(0)
  expect(seguirPegadasDoVale(0, pontos, pontos[0]!, false)).toBe(0)
  let i = 0
  for (const p of pontos) i = seguirPegadasDoVale(i, pontos, p, true)
  expect(i).toBe(3)
  const s = novo()
  expect(registrarPegadasDoVale(s, false)).toBe(s)
  const depois = registrarPegadasDoVale(s, true)
  expect(registrarPegadasDoVale(depois, true)).toBe(depois)
})

let modelo: Object3D
let formas: Forma[]
let lugares: ReturnType<typeof explorarVale>
let grade: ReturnType<typeof gradeDeAndar>
beforeAll(async () => {
  modelo = await carregarGlb(arquivoDaIlha('vale-dos-dinos.glb'))
  const colisores = lerColisores(modelo)
  formas = colisoresDoCaminhoDoVale(modelo, colisores).filter(
    (c): c is Forma => c.forma !== 'malha',
  )
  lugares = explorarVale(modelo, colisores)
  grade = gradeDeAndar(modelo.getObjectByName('col-terreno') as Mesh, formas)
}, 120_000)

test('o rastro e a escavação ficam alcançáveis pela abertura da cerca, sem atravessar peças', () => {
  expect(formas.some((c) => c.nome === 'col-quadro-das-cores')).toBe(true)
  const andou = grade.alcance(lugares.chegada.x, lugares.chegada.z)
  const fim = lugares.escavacao
  expect(grade.chegaPerto(andou, fim.x, fim.z, 0.4)).toBe(true)
  const ancora = modelo.getObjectByName('escavacao')!.position
  expect(((fim.x - ancora.x) / 3.6) ** 2 + ((fim.z - ancora.z) / 2.8) ** 2).toBeLessThan(1)
  const comprimento = comprimentoDoCaminho(lugares.caminho)
  for (let d = 0; d < comprimento; d += 0.1) {
    const p = pontoNoCaminho(lugares.caminho, d)
    expect(grade.chegaPerto(andou, p.x, p.z, 0.4)).toBe(true)
    const corpo = new Vector3(p.x, 1 + CORPO.doCentroAoPe + CORPO.folga, p.z)
    expect(formas.some((c) => bate(c, corpo))).toBe(false)
  }
  expect(lugares.pegadas.length).toBeGreaterThan(10)
})
test('o caminho da ilha preparada e girada coincide com o do GLB local', async () => {
  const girada = await carregarGlb(arquivoDaIlha('vale-dos-dinos.glb'))
  const ilha = ilhasEmVolta().find((i) => i.ilha.id === 'vale-dos-dinos')!.ilha
  girada.rotation.y = giroDaIlha(ilha)
  const preparado = explorarVale(girada, lerColisores(girada))
  expect(preparado.caminho.length).toBe(lugares.caminho.length)
  for (let i = 0; i < lugares.caminho.length; i++) {
    expect(preparado.caminho[i]!.x).toBeCloseTo(lugares.caminho[i]!.x, 4)
    expect(preparado.caminho[i]!.z).toBeCloseTo(lugares.caminho[i]!.z, 4)
  }
})
test('a criança alcança os três ninhos e consegue se afastar a pé', () => {
  const andou = grade.alcance(lugares.chegada.x, lugares.chegada.z)
  for (const ninho of lugares.ninhos) {
    expect(grade.chegaPerto(andou, ninho.x, ninho.z, V.alcance)).toBe(true)
    expect(
      [...andou].some((i) => {
        const p = grade.centro(i)
        const d = Math.hypot(p.x - ninho.x, p.z - ninho.z)
        return d >= V.afastamento && d < V.afastamento + 0.5
      }),
    ).toBe(true)
  }
})
test('a arte reaproveitada tem osso miúdo separado e cabe na folga reservada', async () => {
  const props = await carregarGlb(arquivoDaIlha('vale-dos-dinos-props.glb'))
  const osso = props.getObjectByName('osso')
  expect(osso).toBeDefined()
  const caixa = new Box3().setFromObject(osso!, true)
  expect(Math.max(Math.abs(caixa.min.x), Math.abs(caixa.max.x))).toBeLessThanOrEqual(V.raioDoOsso)
  expect(caixa.max.y).toBeCloseTo(0.28, 2)
})

test('cada etapa da escavação tem a sua fala, e rever o fóssil não repete a descoberta', () => {
  expect(FALAS_DA_ESCAVACAO).toHaveLength(ACOES_DA_ESCAVACAO.length)
  expect(new Set([...FALAS_DA_ESCAVACAO, FALA_DE_REVER_O_FOSSIL]).size).toBe(4)
  for (const t of [...ACOES_DA_ESCAVACAO, ...FALAS_DA_ESCAVACAO, FALA_DE_REVER_O_FOSSIL]) {
    expect(t).not.toMatch(/[!—]/)
    expect(t.split('.')[0]).not.toContain('?')
  }
})
