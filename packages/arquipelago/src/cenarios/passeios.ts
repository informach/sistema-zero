import type { DocumentoDeCenario, ModeloDeCatalogo, Ponto } from '@sistemazero/molda-cenarios-core'
import { type BufferGeometry, Matrix4, type Mesh, ShapeUtils, Vector2, Vector3 } from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { ARTE_DA_FAISCA } from '../mundo/faisca/arte.generated'
import { contornoConvexo, recortarMalha } from '../mundo/faisca/recortar-malha'
import { type ModuloDePasseio, montarPasseio } from '../sistemas/passeios-da-faisca'
import { estadoHerdado } from './apoio'
import type { ArteDeCenario } from './arte'

export interface PisoPreparado {
  id: string
  geo: BufferGeometry
  material: Mesh['material']
  vertices: Float32Array
  indices: Uint32Array
}
export function prepararPasseios(
  doc: DocumentoDeCenario,
  catalogo: readonly ModeloDeCatalogo[],
  arte: ArteDeCenario,
  altura: (x: number, z: number) => number,
): PisoPreparado[] {
  const partes: { id: string; geo: BufferGeometry; material: Mesh['material'] }[] = [],
    ocupados: Ponto[][] = []
  const metaPorId = new Map(catalogo.map((m) => [m.id, m]))
  const modeloPorArquivo = new Map(catalogo.map((m) => [m.arquivo, m]))
  try {
    for (const caminho of [...doc.caminhos].sort(
      (a, b) => Number(b.tipo === 'praca') - Number(a.tipo === 'praca'),
    )) {
      if (estadoHerdado(doc, caminho).oculto) continue
      const acabamento = metaPorId.get(caminho.acabamento)!
      const tipo = acabamento.caminho.includes('lajes')
        ? 'templo'
        : acabamento.caminho.includes('trilha_terra')
          ? 'faroeste'
          : 'reino'
      const largura = acabamento.dimensoes[2],
        f = caminho.largura / largura
      let modulos: ModuloDePasseio[]
      let limites: Ponto[][] = []
      if (caminho.tipo === 'trilha')
        modulos = montarPasseio(
          caminho.pontos.map((p) => ({ x: p.x / f, z: p.z / f })),
          tipo,
        ).map((p) => ({ ...p, x: p.x * f, z: p.z * f }))
      else {
        const ps = caminho.pontos,
          v = ps.map((p) => new Vector2(p.x, p.z))
        limites = ShapeUtils.triangulateShape(v, []).map((face) => face.map((i) => ps[i]!))
        const minX = Math.min(...ps.map((p) => p.x)),
          maxX = Math.max(...ps.map((p) => p.x)),
          minZ = Math.min(...ps.map((p) => p.z)),
          maxZ = Math.max(...ps.map((p) => p.z))
        modulos = []
        for (let z = minZ; z < maxZ; z += largura * f)
          for (let x = minX; x < maxX; x += 7 * f)
            modulos.push({
              modelo:
                tipo === 'templo'
                  ? 'caminho_lajes_reto'
                  : tipo === 'faroeste'
                    ? 'trilha_terra_reta'
                    : 'caminho_terra_reto',
              x: x + 3.5 * f,
              z: z + (largura * f) / 2,
              giro: 0,
              planos: [],
            })
      }
      for (const modulo of modulos) {
        const referencia = ARTE_DA_FAISCA.pecas[modulo.modelo as keyof typeof ARTE_DA_FAISCA.pecas]
        const meta = modeloPorArquivo.get(referencia.arquivo)
        if (!meta) throw Error(`Peça complementar ausente no catálogo: ${modulo.modelo}`)
        const g = arte.modelos.get(meta.id)
        if (!g) throw Error(`Piso não carregado: ${meta.nome}`)
        g.scene.updateMatrixWorld(true)
        g.scene.traverse((o) => {
          const mesh = o as Mesh
          if (!mesh.isMesh) return
          const local = recortarMalha(mesh.geometry, modulo.planos),
            m = new Matrix4().makeRotationY(modulo.giro)
          m.scale(new Vector3(f, f, f))
          m.setPosition(modulo.x, 0, modulo.z)
          m.multiply(mesh.matrixWorld)
          local.applyMatrix4(m)
          const recortadas: BufferGeometry[] = []
          if (limites.length) {
            for (const t of limites) {
              const area = t.reduce((s, p, i) => {
                  const q = t[(i + 1) % t.length]!
                  return s + p.x * q.z - q.x * p.z
                }, 0),
                s = area > 0 ? 1 : -1
              const planos = t.map((a, i) => {
                const b = t[(i + 1) % t.length]!,
                  x = s * (b.z - a.z),
                  z = -s * (b.x - a.x)
                return { x, z, limite: x * a.x + z * a.z }
              })
              recortadas.push(recortarMalha(local, planos, ocupados))
            }
          } else recortadas.push(recortarMalha(local, [], ocupados))
          local.dispose()
          for (const geo of recortadas) {
            const pos = geo.getAttribute('position')
            if (!pos.count) {
              geo.dispose()
              continue
            }
            for (let i = 0; i < pos.count; i++)
              pos.setY(
                i,
                altura(pos.getX(i), pos.getZ(i)) + (pos.getY(i) - meta.min[1] * f) + 0.025,
              )
            geo.computeVertexNormals()
            geo.computeBoundingBox()
            geo.computeBoundingSphere()
            ocupados.push(
              contornoConvexo(
                Array.from({ length: pos.count }, (_, i) => ({ x: pos.getX(i), z: pos.getZ(i) })),
              ),
            )
            partes.push({ id: caminho.id, geo, material: mesh.material })
          }
        })
      }
    }
    const grupos = new Map<string, typeof partes>()
    for (const p of partes) {
      const chave = `${p.id}:${Array.isArray(p.material) ? p.material.map((m) => m.uuid).join(',') : p.material.uuid}`
      if (!grupos.has(chave)) grupos.set(chave, [])
      grupos.get(chave)!.push(p)
    }
    return [...grupos.values()].map((ps) => {
      const material = ps[0]!.material
      const geo = ps.length === 1 ? ps[0]!.geo : mergeGeometries(ps.map((p) => p.geo))
      if (!geo) throw Error('Pisos com atributos incompatíveis')
      if (ps.length > 1) for (const p of ps) p.geo.dispose()
      const pos = geo.getAttribute('position')
      return {
        id: ps[0]!.id,
        geo,
        material,
        vertices: new Float32Array(pos.array),
        indices: Uint32Array.from({ length: pos.count }, (_, i) => i),
      }
    })
  } catch (e) {
    for (const p of partes) p.geo.dispose()
    throw e
  }
}
