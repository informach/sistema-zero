import type { CenaNoThree, TrianguloDaConsulta } from '@sistemazero/molda-cenarios-motor/runtime'
import { Box3, Vector3 } from 'three'
import { LADO_DO_SETOR, RAIO_DE_SETORES } from './setores-do-arquipelago'

/** O teto agregado não amplia o limite canônico de 20 mil visitas por consulta regional. */
const MAX_TRIANGULOS_ATIVOS = 100_000

/** Prepara somente os setores próximos, com as mesmas superfícies do runtime compilado.
 * Triângulos que atravessam limites entram uma vez, sem cortar tabuleiros ou preencher recortes. */
export function prepararColisaoDoCenario(
  fonte: Pick<CenaNoThree['colisoes'], 'triangulosNaCaixa'>,
  foco: { x: number; z: number },
  selecionar?: (triangulo: TrianguloDaConsulta) => boolean,
) {
  if (
    !Number.isFinite(foco.x) ||
    !Number.isFinite(foco.z) ||
    Math.abs(foco.x) > 1e9 ||
    Math.abs(foco.z) > 1e9
  )
    throw Error('O foco da colisão do cenário é inválido.')
  const x = Math.floor(foco.x / LADO_DO_SETOR),
    z = Math.floor(foco.z / LADO_DO_SETOR)
  const vistos = new Map<number, Set<number>>()
  let triangulos = 0,
    coordenadas = 0
  const incluir = (instancia: number, triangulo: number, contexto: TrianguloDaConsulta) => {
    if (selecionar && !selecionar(contexto)) return false
    let indices = vistos.get(instancia)
    if (indices?.has(triangulo)) return false
    if (++triangulos > MAX_TRIANGULOS_ATIVOS)
      throw Error('A colisão próxima excede o orçamento do cenário.')
    if (!indices) {
      indices = new Set()
      vistos.set(instancia, indices)
    }
    indices.add(triangulo)
    return true
  }
  const partes: Float64Array[] = []
  const caixa = new Box3(new Vector3(), new Vector3())
  for (let sz = z - RAIO_DE_SETORES; sz <= z + RAIO_DE_SETORES; sz++)
    for (let sx = x - RAIO_DE_SETORES; sx <= x + RAIO_DE_SETORES; sx++) {
      caixa.min.set(sx * LADO_DO_SETOR, -1e9, sz * LADO_DO_SETOR)
      caixa.max.set((sx + 1) * LADO_DO_SETOR, 1e9, (sz + 1) * LADO_DO_SETOR)
      const parte = fonte.triangulosNaCaixa(caixa, 20_000, incluir)
      partes.push(parte)
      coordenadas += parte.length
    }
  const vertices = new Float32Array(coordenadas)
  let deslocamento = 0
  for (const parte of partes) {
    vertices.set(parte, deslocamento)
    deslocamento += parte.length
  }
  const indices = new Uint32Array(coordenadas / 3)
  for (let i = 0; i < indices.length; i++) indices[i] = i
  return { celula: { x, z }, vertices, indices, triangulos }
}
export type ColisaoDoCenario = ReturnType<typeof prepararColisaoDoCenario>
