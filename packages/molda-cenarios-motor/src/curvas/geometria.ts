import {
  alturaDoCampo,
  type BaseDeCenario,
  type CampoDeAlturas,
  type EstadoDoTerreno,
  type RegiaoDoCampo,
  recortarMalhaNoChao,
} from '@sistemazero/molda-cenarios-core/v2'
import { BufferAttribute, BufferGeometry, Matrix4 } from 'three'
import type { ParteDoModelo } from '../modelos'
import { lerParteEstatica } from './parte-estatica'

export interface ParteConformada {
  geometria: BufferGeometry
  /** Altera só alturas/normais. Retorno positivo exige invalidar o picking dessa geometria. */
  atualizarAlturas(campo: CampoDeAlturas, regiao?: RegiaoDoCampo): number
  descartar(): void
}

function gradiente(c: CampoDeAlturas, x: number, z: number) {
  const gx = Math.min(c.colunas, Math.max(0, (x - c.origem.x) / c.passo)),
    gz = Math.min(c.linhas, Math.max(0, (z - c.origem.z) / c.passo)),
    ix = Math.min(c.colunas - 1, Math.floor(gx)),
    iz = Math.min(c.linhas - 1, Math.floor(gz)),
    i = iz * (c.colunas + 1) + ix,
    a = c.alturas[i]!,
    b = c.alturas[i + 1]!,
    v = c.alturas[i + c.colunas + 1]!,
    d = c.alturas[i + c.colunas + 2]!
  return gx - ix + gz - iz <= 1
    ? { x: (b - a) / c.passo, z: (v - a) / c.passo }
    : { x: (d - v) / c.passo, z: (d - b) / c.passo }
}

/** Recorta/conforma uma cópia; mantém materiais e buffers do GLB sob o dono original. */
export function conformarParteAoChao(
  parte: Pick<ParteDoModelo, 'geometria' | 'matriz'>,
  mundo: Matrix4,
  base: BaseDeCenario,
  estado: EstadoDoTerreno | null,
  origem: { x: number; z: number },
): ParteConformada {
  const matriz = new Matrix4().makeTranslation(-origem.x, 0, -origem.z).multiply(mundo),
    fonte = lerParteEstatica(parte, matriz),
    geometria = new BufferGeometry()
  let descartada = false
  try {
    const recorte = recortarMalhaNoChao(fonte.malha, base, estado, origem)
    for (const [nome, a] of Object.entries(recorte))
      geometria.setAttribute(nome, new BufferAttribute(a.valores, a.itemSize))
    if (!geometria.hasAttribute('normal')) geometria.computeVertexNormals()
    if (geometria.getAttribute('normal').itemSize !== 3)
      throw Error('As normais do modelo são inválidas.')
    const p = geometria.getAttribute('position') as BufferAttribute,
      n = geometria.getAttribute('normal') as BufferAttribute,
      t = geometria.getAttribute('tangent') as BufferAttribute | undefined,
      originais = Float32Array.from(p.array),
      normais = Float32Array.from(n.array),
      tangentes = t ? Float32Array.from(t.array) : null
    if (t && t.itemSize !== 4) throw Error('As tangentes do modelo são inválidas.')

    const atualizarAlturas = (campo: CampoDeAlturas, regiao?: RegiaoDoCampo) => {
      if (descartada) throw Error('Esta geometria já foi descartada.')
      if (
        base.tipo !== 'terreno' ||
        campo.colunas !== base.colunas ||
        campo.linhas !== base.linhas ||
        campo.passo !== base.passo ||
        campo.origem.x !== base.origem.x ||
        campo.origem.z !== base.origem.z ||
        campo.alturas.length !== (base.colunas + 1) * (base.linhas + 1)
      )
        throw Error('Recrie o caminho para a nova forma do terreno.')
      const tocados: number[] = []
      for (let i = 0; i < p.count; i++) {
        const x = originais[i * 3]! + origem.x,
          z = originais[i * 3 + 2]! + origem.z
        if (
          regiao &&
          (x < campo.origem.x + (regiao.x0 - 1) * campo.passo ||
            x > campo.origem.x + (regiao.x1 + 1) * campo.passo ||
            z < campo.origem.z + (regiao.z0 - 1) * campo.passo ||
            z > campo.origem.z + (regiao.z1 + 1) * campo.passo)
        )
          continue
        tocados.push(i)
      }
      if (!tocados.length) return 0
      // Prepara e confere antes de escrever: uma fonte inválida não deixa metade do
      // buffer novo e metade antigo, nem um BVH cujo dono desconhece a alteração.
      const ys = new Float32Array(tocados.length),
        ns = new Float32Array(tocados.length * 3),
        ts = tangentes ? new Float32Array(tocados.length * 3) : null
      for (const [j, i] of tocados.entries()) {
        const x = originais[i * 3]! + origem.x,
          z = originais[i * 3 + 2]! + origem.z,
          g = gradiente(campo, x, z),
          nx = normais[i * 3]! - g.x * normais[i * 3 + 1]!,
          ny = normais[i * 3 + 1]!,
          nz = normais[i * 3 + 2]! - g.z * normais[i * 3 + 1]!,
          comprimento = Math.hypot(nx, ny, nz)
        ys[j] = originais[i * 3 + 1]! + alturaDoCampo(campo, x, z)
        if (!Number.isFinite(ys[j]) || !Number.isFinite(comprimento) || comprimento < 1e-12)
          throw Error('O terreno ou a normal do modelo contém uma altura inválida.')
        ns.set([nx / comprimento, ny / comprimento, nz / comprimento], j * 3)
        if (ts && tangentes) {
          const tx = tangentes[i * 4]!,
            ty = tangentes[i * 4 + 1]! + g.x * tx + g.z * tangentes[i * 4 + 2]!,
            tz = tangentes[i * 4 + 2]!,
            tamanho = Math.hypot(tx, ty, tz)
          if (!Number.isFinite(tamanho) || tamanho < 1e-12)
            throw Error('A tangente do modelo é inválida.')
          ts.set([tx / tamanho, ty / tamanho, tz / tamanho], j * 3)
        }
      }
      for (const [j, i] of tocados.entries()) {
        p.setY(i, ys[j]!)
        n.setXYZ(i, ns[j * 3]!, ns[j * 3 + 1]!, ns[j * 3 + 2]!)
        if (t && ts) t.setXYZ(i, ts[j * 3]!, ts[j * 3 + 1]!, ts[j * 3 + 2]!)
      }
      const de = tocados[0]!,
        ate = tocados.at(-1)! + 1
      for (const a of [p, n, ...(t ? [t] : [])]) {
        a.addUpdateRange(de * a.itemSize, (ate - de) * a.itemSize)
        a.needsUpdate = true
      }
      geometria.computeBoundingBox()
      geometria.computeBoundingSphere()
      return tocados.length
    }
    if (base.tipo === 'terreno') atualizarAlturas(estado!.campo)
    else {
      geometria.computeBoundingBox()
      geometria.computeBoundingSphere()
    }
    if (!geometria.boundingBox) geometria.computeBoundingBox()
    if (!geometria.boundingSphere) geometria.computeBoundingSphere()
    return {
      geometria,
      atualizarAlturas,
      descartar() {
        if (!descartada) {
          descartada = true
          geometria.dispose()
        }
      },
    }
  } catch (erro) {
    geometria.dispose()
    throw erro
  } finally {
    fonte.descartar()
  }
}
