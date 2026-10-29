import { beforeAll, describe, expect, test } from 'bun:test'
import { type Mesh, type Object3D, Vector3 } from 'three'
import { lerColisores } from '../src/mundo/colisores-da-ilha'
import { BALAO, criarVoo, descerDoBalao } from '../src/sistemas/balao'
import { CORPO } from '../src/sistemas/corpo'
import {
  arquivoDaIlha,
  bate,
  CENTRO_DO_CORPO,
  carregarGlb,
  type Forma,
  gradeDeAndar,
  TAMPO,
} from './ajuda-colisores'

/**
 * O balão contra a arte das Nuvens (fase4-09): o lugar dele (âncora `balao` do `nuvens.glb`), o
 * cesto parado e a saída ao descer perto dele. No arquivo a ilha está no tampo de sempre (y = 1);
 * no jogo ela fica num grupo a y = 7, o que não muda nenhuma distância.
 */
const ARQUIVO = arquivoDaIlha('nuvens.glb')
/** O cesto parado: meia largura e altura (`mundo/balao-das-nuvens.tsx`). */
const CESTO = { meio: 0.55, altura: 0.82 }
/** O envelope do `nuvens-balao.glb`: raio máximo 2,35 m, de 2,15 a 6,6 m acima da base. */
const ENVELOPE = { raio: 2.35, de: 2.15, ate: 6.6 }

let raiz: Object3D
let formas: Forma[]
let grade: ReturnType<typeof gradeDeAndar>
let casa: Vector3

beforeAll(async () => {
  raiz = await carregarGlb(ARQUIVO)
  raiz.updateMatrixWorld(true)
  formas = lerColisores(raiz).filter((c): c is Forma => c.forma !== 'malha')
  const terreno = raiz.getObjectByName('col-terreno') as Mesh | undefined
  if (!terreno?.isMesh) throw new Error('nuvens.glb sem col-terreno')
  grade = gradeDeAndar(terreno, formas, 19.2)
  const no = raiz.getObjectByName('balao')
  if (!no) throw new Error('nuvens.glb sem a âncora balao')
  casa = no.position.clone()
}, 120_000)

describe('o lugar do balão nas Nuvens', () => {
  test('a âncora fica no tampo, e nada da ilha entra no cesto nem no envelope parado', () => {
    expect(casa.y).toBeCloseTo(TAMPO, 3)
    const p = new Vector3()
    for (let x = -CESTO.meio; x <= CESTO.meio + 1e-9; x += 0.1)
      for (let z = -CESTO.meio; z <= CESTO.meio + 1e-9; z += 0.1)
        for (let y = 0.1; y <= CESTO.altura; y += 0.1) {
          p.set(casa.x + x, casa.y + y, casa.z + z)
          const batida = formas.find((c) => bate(c, p))
          expect(batida?.nome ?? null).toBeNull()
        }
    for (let a = 0; a < 360; a += 15)
      for (let y = ENVELOPE.de; y <= ENVELOPE.ate; y += 0.5) {
        const r = (a * Math.PI) / 180
        p.set(
          casa.x + Math.cos(r) * ENVELOPE.raio,
          casa.y + y,
          casa.z + Math.sin(r) * ENVELOPE.raio,
        )
        expect(formas.find((c) => bate(c, p))?.nome ?? null).toBeNull()
      }
  })

  test('da chegada, a pé, dá para encostar no cesto e subir', () => {
    const chegada = raiz.getObjectByName('chegada')?.position
    if (!chegada) throw new Error('sem a âncora chegada')
    const andou = grade.alcance(chegada.x, chegada.z)
    // Uma célula alcançada fora do cesto parado (que segura o corpo) e dentro do alcance de subir.
    const encostado = [...andou].some((i) => {
      const c = grade.centro(i)
      const dx = Math.abs(c.x - casa.x)
      const dz = Math.abs(c.z - casa.z)
      const foraDoCesto = Math.max(dx, dz) > CESTO.meio + CORPO.raio
      return foraDoCesto && Math.hypot(c.x - casa.x, c.z - casa.z) <= BALAO.alcance - 0.2
    })
    expect(encostado).toBe(true)
  })

  test('descendo perto do lugar do balão, a saída é chão livre que se alcança a pé', () => {
    // O centro da ilha no arquivo é (0, 0); o tampo, o y da âncora.
    const v = criarVoo({ x: casa.x, y: casa.y, z: casa.z }, { x: 0, z: 0 }, casa.y)
    v.fase = 'voo'
    v.pe.x += 0.4
    const saida = descerDoBalao(v)
    expect(saida).not.toBeNull()
    if (!saida) return
    const celula = grade.celulas[grade.indice(saida.x, saida.z)]
    expect(celula?.livre).toBe(true)
    expect(Math.abs((celula?.y ?? 0) - saida.y)).toBeLessThan(CORPO.degrau)
    const corpo = new Vector3(saida.x, saida.y + CENTRO_DO_CORPO + 0.05, saida.z)
    expect(formas.find((c) => bate(c, corpo))?.nome ?? null).toBeNull()
    const chegada = raiz.getObjectByName('chegada')?.position
    if (!chegada) throw new Error('sem a âncora chegada')
    expect(grade.alcance(chegada.x, chegada.z).has(grade.indice(saida.x, saida.z))).toBe(true)
  })
})
