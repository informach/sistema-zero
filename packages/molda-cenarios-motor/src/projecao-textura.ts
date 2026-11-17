import {
  type BufferGeometry,
  Float32BufferAttribute,
  type Matrix4,
  MeshStandardMaterial,
  type Texture,
  Vector3,
} from 'three'
import { transformarGeometriaEstatica } from './geometria-instanciada'

/** O mesmo referencial usado pelo shader e pela materialização de UVs para exportação. */
export function uvDaSuperficie(
  ponto: Vector3,
  normalDaFace: Vector3,
  escala: Vector3,
  repeticaoMetros: number,
): [number, number] {
  if (
    ![escala.x, escala.y, escala.z, repeticaoMetros].every((v) => Number.isFinite(v) && v > 0) ||
    ![ponto.x, ponto.y, ponto.z, normalDaFace.x, normalDaFace.y, normalDaFace.z].every(
      Number.isFinite,
    ) ||
    normalDaFace.lengthSq() === 0
  )
    throw Error('A projeção da textura tem medidas inválidas')
  const n = normalDaFace.clone().divide(escala).normalize()
  const guia = Math.abs(normalDaFace.y) > 0.9 ? new Vector3(0, 0, 1) : new Vector3(0, 1, 0)
  const u = guia.cross(n).normalize(),
    v = n.clone().cross(u)
  const p = ponto.clone().multiply(escala)
  return [p.dot(u) / repeticaoMetros, p.dot(v) / repeticaoMetros]
}

/** Independência por triângulo apenas para a normal geométrica; mantém as normais de iluminação. */
export function geometriaParaTextura(original: BufferGeometry, matriz: Matrix4): BufferGeometry {
  const transformada = transformarGeometriaEstatica(original, matriz)
  let g: BufferGeometry | undefined
  try {
    g = transformada.index ? transformada.toNonIndexed() : transformada.clone()
    const pos = g.getAttribute('position')
    const inicio = Math.max(0, transformada.drawRange.start),
      fim = Math.min(pos.count, inicio + transformada.drawRange.count)
    if (inicio % 3 || (fim - inicio) % 3)
      throw Error('A superfície não contém triângulos completos')
    const validos: number[] = [],
      normais: number[] = []
    const a = new Vector3(),
      b = new Vector3(),
      c = new Vector3(),
      n = new Vector3()
    for (let i = inicio; i < fim; i += 3) {
      a.fromBufferAttribute(pos, i)
      b.fromBufferAttribute(pos, i + 1)
      c.fromBufferAttribute(pos, i + 2)
      n.crossVectors(b.sub(a), c.sub(a))
      if (n.lengthSq() === 0) continue
      n.normalize()
      validos.push(i, i + 1, i + 2)
      for (let j = 0; j < 3; j++) normais.push(n.x, n.y, n.z)
    }
    for (const [nome, atributo] of Object.entries(g.attributes)) {
      const valores = new Float32Array(validos.length * atributo.itemSize)
      for (let i = 0; i < validos.length; i++)
        for (let j = 0; j < atributo.itemSize; j++)
          valores[i * atributo.itemSize + j] = atributo.getComponent(validos[i]!, j)
      g.setAttribute(nome, new Float32BufferAttribute(valores, atributo.itemSize))
    }
    g.deleteAttribute('color')
    g.deleteAttribute('tangent')
    g.setAttribute('normalDaFace', new Float32BufferAttribute(normais, 3))
    if (!g.getAttribute('normal'))
      g.setAttribute('normal', new Float32BufferAttribute(normais.slice(), 3))
    // Cada ParteDoModelo já contém um único material e seu drawRange próprio.
    g.clearGroups()
    g.setDrawRange(0, validos.length)
    g.computeBoundingBox()
    g.computeBoundingSphere()
    return g
  } catch (erro) {
    g?.dispose()
    throw erro
  } finally {
    transformada.dispose()
  }
}

/** Exportadores podem gravar os UVs comuns sem depender da extensão de shader do editor. */
export function materializarUvDaTextura(g: BufferGeometry, escala: Vector3, metros: number): void {
  const pos = g.getAttribute('position'),
    normal = g.getAttribute('normalDaFace')
  if (!normal || normal.count !== pos.count)
    throw Error('A superfície não foi preparada para textura')
  const uvs = new Float32Array(pos.count * 2),
    p = new Vector3(),
    n = new Vector3()
  for (let i = 0; i < pos.count; i++) {
    const uv = uvDaSuperficie(
      p.fromBufferAttribute(pos, i),
      n.fromBufferAttribute(normal, i),
      escala,
      metros,
    )
    uvs.set(uv, i * 2)
  }
  g.setAttribute('uv', new Float32BufferAttribute(uvs, 2))
}

export const PROJECAO_TEXTURA_GLSL = /* glsl */ `
  vec3 szEscala = vec3(1.0);
  #ifdef USE_INSTANCING
    szEscala = vec3(length(instanceMatrix[0].xyz), length(instanceMatrix[1].xyz), length(instanceMatrix[2].xyz));
  #endif
  vec3 szNormal = normalize(normalDaFace / szEscala);
  vec3 szGuia = abs(normalDaFace.y) > 0.9 ? vec3(0.0, 0.0, 1.0) : vec3(0.0, 1.0, 0.0);
  vec3 szU = normalize(cross(szGuia, szNormal));
  vec3 szV = cross(szNormal, szU);
  vec3 szPonto = position * szEscala;
  vMapUv = vec2(dot(szPonto, szU), dot(szPonto, szV)) / szRepeticaoMetros;
`

/** Novo acabamento próprio: não modifica o material nem o atlas original do acervo. */
export function materialDaTextura(
  textura: Texture,
  metros: number,
  lado: MeshStandardMaterial['side'],
): MeshStandardMaterial {
  if (!Number.isFinite(metros) || metros <= 0) throw Error('A repetição da textura é inválida')
  const material = new MeshStandardMaterial({
    map: textura,
    roughness: 0.85,
    metalness: 0,
    side: lado,
  })
  material.onBeforeCompile = (shader) => {
    shader.uniforms.szRepeticaoMetros = { value: metros }
    shader.vertexShader =
      `attribute vec3 normalDaFace;\nuniform float szRepeticaoMetros;\n${shader.vertexShader}`.replace(
        '#include <uv_vertex>',
        `#include <uv_vertex>\n#ifdef USE_MAP\n${PROJECAO_TEXTURA_GLSL}\n#endif`,
      )
  }
  material.customProgramCacheKey = () => 'sz-acabamento-fisico-v1'
  return material
}
