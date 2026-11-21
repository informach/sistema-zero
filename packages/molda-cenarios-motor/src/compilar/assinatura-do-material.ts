import { Material, type Texture } from 'three'

/** Valor que a assinatura não sabe comparar: o material segue sozinho (pela identidade). */
const INCOMPARAVEL = Symbol('incomparavel')

/** Propriedades que mudam entre cópias iguais sem mudar o desenho. */
const FORA_DA_ASSINATURA = new Set(['uuid', 'id', 'version', '_listeners'])

function daTextura(t: Texture): unknown {
  const extras = doValor(t.userData)
  if (extras === INCOMPARAVEL) return INCOMPARAVEL
  return [
    // As cópias do cache de imagens dividem a mesma fonte: é ela que diz "mesma imagem".
    t.source.uuid,
    t.mapping,
    t.channel,
    t.wrapS,
    t.wrapT,
    t.magFilter,
    t.minFilter,
    t.anisotropy,
    t.format,
    t.internalFormat,
    t.type,
    t.offset.toArray(),
    t.repeat.toArray(),
    t.center.toArray(),
    t.rotation,
    t.matrixAutoUpdate,
    t.matrix.toArray(),
    t.generateMipmaps,
    t.premultiplyAlpha,
    t.flipY,
    t.unpackAlignment,
    t.colorSpace,
    extras,
  ]
}

function doValor(v: unknown): unknown {
  if (v === null || v === undefined) return v ?? null
  if (typeof v === 'number' || typeof v === 'string' || typeof v === 'boolean') return v
  if (typeof v !== 'object') return INCOMPARAVEL
  const o = v as Record<string, unknown> & {
    isColor?: boolean
    isVector2?: boolean
    isVector3?: boolean
    isVector4?: boolean
    isEuler?: boolean
    isMatrix3?: boolean
    isTexture?: boolean
    toArray?: () => unknown[]
  }
  if (o.isTexture) return daTextura(v as Texture)
  if (o.isColor || o.isVector2 || o.isVector3 || o.isVector4 || o.isEuler || o.isMatrix3)
    return o.toArray!()
  if (Array.isArray(v)) {
    const itens = v.map(doValor)
    return itens.includes(INCOMPARAVEL) ? INCOMPARAVEL : itens
  }
  // Só objetos simples (extras do glTF, defines): qualquer outra classe fica incomparável.
  const proto = Object.getPrototypeOf(v)
  if (proto !== Object.prototype && proto !== null) return INCOMPARAVEL
  const saida: unknown[] = []
  for (const chave of Object.keys(o).sort()) {
    const item = doValor(o[chave])
    if (item === INCOMPARAVEL) return INCOMPARAVEL
    saida.push(chave, item)
  }
  return saida
}

/**
 * Uma chave que dois materiais só dividem quando desenham igual: o mesmo tipo, os mesmos números
 * e as mesmas imagens. As peças de um kit (o atlas do Reino em dezenas de modelos) passam a
 * dividir um lote por região, em vez de um lote (e uma cópia da imagem) por modelo. Gancho de
 * shader próprio, ou valor que não dá para comparar, devolve `null`: o material segue sozinho.
 */
export function assinaturaDoMaterial(m: Material): string | null {
  if (
    m.onBeforeCompile !== Material.prototype.onBeforeCompile ||
    m.customProgramCacheKey !== Material.prototype.customProgramCacheKey ||
    m.onBeforeRender !== Material.prototype.onBeforeRender
  )
    return null
  const partes: unknown[] = [m.type]
  for (const chave of Object.keys(m).sort()) {
    if (FORA_DA_ASSINATURA.has(chave)) continue
    const valor = doValor((m as unknown as Record<string, unknown>)[chave])
    if (valor === INCOMPARAVEL) return null
    partes.push(chave, valor)
  }
  return JSON.stringify(partes)
}
