import type { CaminhoDeCenario } from '@sistemazero/molda-cenarios-core/v2'
import {
  BufferAttribute,
  type BufferGeometry,
  type Material,
  Matrix4,
  MeshStandardMaterial,
  type Texture,
  Vector3,
} from 'three'
import { transformarGeometriaEstatica } from '../geometria-instanciada'
import { uvDaSuperficie } from '../projecao-textura'
import type { PartePreparadaDeCaminho } from './estruturas'

/** Overrides privados; o material e a textura originais continuam pertencendo ao catálogo. */
export function prepararAcabamentos(
  c: CaminhoDeCenario,
  pecas: PartePreparadaDeCaminho[],
  textura: Texture | null,
  decal: boolean,
) {
  const materiais = new Map<Material | undefined, Material>(),
    proprios = new Set<Material>(),
    geometrias: BufferGeometry[] = [],
    atualizacoes: (() => void)[] = []
  const descartar = () => {
    for (const g of geometrias) g.dispose()
    for (const m of proprios) m.dispose()
  }
  try {
    const prontas = pecas
      .filter(
        (p) => p.geometria.getAttribute('position').count && p.geometria.drawRange.count !== 0,
      )
      .map((original) => {
        let p = original,
          material = materiais.get(p.material)
        if (!material) {
          if (textura || !p.material) {
            material = new MeshStandardMaterial({
              color: c.aparencia?.cor ?? (textura ? '#ffffff' : '#ba9869'),
              roughness: 1,
              map: textura,
            })
            proprios.add(material)
          } else if (c.aparencia?.cor || decal) {
            material = p.material.clone()
            proprios.add(material)
            if (c.aparencia?.cor && 'color' in material)
              (material as MeshStandardMaterial).color.set(c.aparencia.cor)
          } else material = p.material
          if (decal) {
            material.polygonOffset = true
            material.polygonOffsetFactor = -1
            material.polygonOffsetUnits = -1
            material.depthWrite = false
          }
          materiais.set(p.material, material)
        }
        if (textura) {
          if (!p.conformada) {
            // Respeita drawRange, desindexa e separa faces antes de materializar UVs métricos.
            const copia = transformarGeometriaEstatica(p.geometria, new Matrix4())
            let g: BufferGeometry
            try {
              g = copia.index ? copia.toNonIndexed() : copia.clone()
            } finally {
              copia.dispose()
            }
            geometrias.push(g)
            p = { ...p, geometria: g }
          }
          const atualizar = () =>
            projetarTextura(p.geometria, p.matriz, c.aparencia!.textura!.repeticaoMetros)
          atualizar()
          if (p.conformada) atualizacoes.push(atualizar)
        }
        return { ...p, material }
      })
    return {
      pecas: prontas,
      atualizar: () => {
        for (const f of atualizacoes) f()
      },
      descartar,
    }
  } catch (erro) {
    descartar()
    throw erro
  }
}

function projetarTextura(g: BufferGeometry, mundo: Matrix4, metros: number) {
  const p = g.getAttribute('position'),
    uv = new Float32Array(p.count * 2),
    a = new Vector3(),
    b = new Vector3(),
    c = new Vector3(),
    n = new Vector3(),
    escala = new Vector3(1, 1, 1),
    inicio = g.drawRange.start,
    fim = Math.min(p.count, inicio + g.drawRange.count)
  if (g.index) throw Error('A projeção de textura requer faces independentes.')
  for (let i = inicio; i < fim; i += 3) {
    a.fromBufferAttribute(p, i).applyMatrix4(mundo)
    b.fromBufferAttribute(p, i + 1).applyMatrix4(mundo)
    c.fromBufferAttribute(p, i + 2).applyMatrix4(mundo)
    n.crossVectors(b.clone().sub(a), c.clone().sub(a))
    if (n.lengthSq() < 1e-20) continue
    for (const [j, ponto] of [a, b, c].entries())
      uv.set(uvDaSuperficie(ponto, n, escala, metros), (i + j) * 2)
  }
  g.setAttribute('uv', new BufferAttribute(uv, 2))
  g.deleteAttribute('tangent')
  g.deleteAttribute('color')
}
