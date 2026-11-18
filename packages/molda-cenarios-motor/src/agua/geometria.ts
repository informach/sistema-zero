import {
  type AguaDeCenario,
  type BaseDeCenario,
  prepararConsultaDaAgua,
} from '@sistemazero/molda-cenarios-core/v2'
import { BufferAttribute, BufferGeometry, ShapeUtils, Vector2, Vector3 } from 'three'

export interface SuperficieDeAgua {
  geometria: BufferGeometry
  origem: Vector3
}

/** A água usa geometrias próprias, nunca altera os buffers usados pela consulta física. */
export function geometriaDaAgua(a: AguaDeCenario, base: BaseDeCenario): SuperficieDeAgua {
  const geometria = new BufferGeometry(),
    origem = new Vector3()
  let vertices: Float32Array, indices: Uint32Array
  if (a.tipo === 'rio') {
    const superficie = prepararConsultaDaAgua(a).superficie!
    origem.set(a.pontos[0]!.x, a.pontos[0]!.y, a.pontos[0]!.z)
    vertices = superficie.posicoes.slice()
    for (let i = 0; i < vertices.length; i += 3) {
      vertices[i] = vertices[i]! - origem.x
      vertices[i + 1] = vertices[i + 1]! - origem.y
      vertices[i + 2] = vertices[i + 2]! - origem.z
    }
    indices = superficie.indices.slice()
    geometria.setAttribute('uv', new BufferAttribute(superficie.uvs.slice(), 2))
  } else if (a.tipo === 'cachoeira') {
    origem.copy(a.topo)
    const x = (Math.cos(a.giro) * a.largura) / 2,
      z = (-Math.sin(a.giro) * a.largura) / 2,
      dx = a.base.x - a.topo.x,
      dy = a.base.y - a.topo.y,
      dz = a.base.z - a.topo.z
    vertices = new Float32Array([-x, 0, -z, x, 0, z, dx - x, dy, dz - z, dx + x, dy, dz + z])
    indices = new Uint32Array([0, 2, 1, 1, 2, 3])
    geometria.setAttribute(
      'uv',
      new BufferAttribute(
        new Float32Array([0, 0, 1, 0, 0, -dy / a.largura, 1, -dy / a.largura]),
        2,
      ),
    )
  } else if (a.tipo === 'mar') {
    const largura =
        base.tipo === 'terreno'
          ? base.colunas * base.passo
          : base.tipo === 'plano'
            ? base.largura
            : 512,
      comprimento =
        base.tipo === 'terreno'
          ? base.linhas * base.passo
          : base.tipo === 'plano'
            ? base.comprimento
            : 512,
      x = Math.max(1024, largura),
      z = Math.max(1024, comprimento)
    origem.set(
      base.tipo === 'terreno' ? base.origem.x + largura / 2 : 0,
      a.nivel,
      base.tipo === 'terreno' ? base.origem.z + comprimento / 2 : 0,
    )
    vertices = new Float32Array([-x, 0, -z, x, 0, -z, -x, 0, z, x, 0, z])
    indices = new Uint32Array([0, 2, 1, 1, 2, 3])
  } else {
    // Triangulação plana com ilhas. Toda profundidade interior vem do mesmo campo do solo,
    // não da interpolação de vértices rasos existentes somente nas margens.
    origem.set(a.centro.x, a.nivel, a.centro.z)
    const anel = a.contorno.map((p) => new Vector2(p.x, p.z)),
      ilhas = (a.ilhas ?? []).map((ilha) => ilha.map((p) => new Vector2(p.x, p.z))),
      faces = ShapeUtils.triangulateShape(anel, ilhas),
      pontos = [anel, ...ilhas].flat(),
      c = Math.cos(a.giro),
      s = Math.sin(a.giro)
    vertices = new Float32Array(pontos.length * 3)
    for (const [i, p] of pontos.entries())
      vertices.set([(p.x * c + p.y * s) * a.escala, 0, (-p.x * s + p.y * c) * a.escala], i * 3)
    indices = new Uint32Array(faces.length * 3)
    for (const [i, f] of faces.entries()) {
      const [x, y, z] = f as [number, number, number],
        normalY =
          (vertices[y * 3 + 2]! - vertices[x * 3 + 2]!) * (vertices[z * 3]! - vertices[x * 3]!) -
          (vertices[y * 3]! - vertices[x * 3]!) * (vertices[z * 3 + 2]! - vertices[x * 3 + 2]!)
      indices.set(normalY > 0 ? [x, y, z] : [x, z, y], i * 3)
    }
  }
  geometria
    .setAttribute('position', new BufferAttribute(vertices, 3))
    .setIndex(new BufferAttribute(indices, 1))
  if (!geometria.hasAttribute('uv')) {
    const uv = new Float32Array((vertices.length / 3) * 2)
    for (let i = 0; i < vertices.length / 3; i++) {
      uv[i * 2] = vertices[i * 3]!
      uv[i * 2 + 1] = vertices[i * 3 + 2]!
    }
    geometria.setAttribute('uv', new BufferAttribute(uv, 2))
  }
  geometria.computeVertexNormals()
  geometria.computeBoundingBox()
  geometria.computeBoundingSphere()
  return { geometria, origem }
}
