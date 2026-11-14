import {
  Bone,
  type Material,
  Mesh,
  MeshStandardMaterial,
  type Object3D,
  Skeleton,
  SkinnedMesh,
  type Texture,
} from 'three'
import { clone } from 'three/examples/jsm/utils/SkeletonUtils.js'

/**
 * As peças do avatar do pack (Cute Characters) presas ao esqueleto de UMA montagem.
 *
 * O esqueleto do pack vem num GLB só de ossos, com as poses, sem malha nenhuma. Cada peça traz uma
 * cópia do esqueleto com a mesma pose de descanso. Aqui:
 * - `copiarEsqueletoDoPack` clona os ossos por montagem (dois avatares na tela nunca dividem osso);
 * - `prepararPecaDoPack` prende cada malha da peça aos ossos DA MONTAGEM pelo NOME, na ordem das
 *   juntas DA PEÇA. Assim a ordem das juntas no arquivo deixa de importar (no avatar antigo a peça
 *   ficava parada no ar se o Blender exportasse em outra ordem).
 *
 * A cor vem da textura compartilhada do pack: a migração tira a imagem de dentro de cada peça e
 * anota no material qual textura ele usava (`userData.avatar.map`, o `extras` do glTF).
 */

export interface MontagemDoPack {
  /** A cena clonada do esqueleto (o que vai para a tela). */
  cena: Object3D
  /** Os ossos da montagem, pelo nome. */
  ossos: Map<string, Bone>
}

function ehOsso(o: Object3D): o is Bone {
  return (o as Bone).isBone === true
}

export function copiarEsqueletoDoPack(original: Object3D): MontagemDoPack {
  const cena = clone(original)
  const ossos = new Map<string, Bone>()
  cena.traverse((o) => {
    if (ehOsso(o) && !ossos.has(o.name)) ossos.set(o.name, o)
  })
  return { cena, ossos }
}

/** As texturas do avatar por impressão digital (a migração grava a digital no material). */
export type TexturasDoPack = ReadonlyMap<string, Texture>

interface AnotacaoDoMaterial {
  map?: string
  emissiveMap?: string
}

function anotacao(material: Material): AnotacaoDoMaterial {
  const avatar = (material.userData as { avatar?: AnotacaoDoMaterial } | undefined)?.avatar
  return avatar && typeof avatar === 'object' ? avatar : {}
}

/**
 * Os ossos da montagem mais os que só um OBJETO DE MÃO tem (a `Luz` da lanterna, filha do osso da
 * mão): cada osso que falta entra como filho do mesmo pai, na pose de descanso do arquivo. Osso sem
 * pai na montagem fica de fora (a peça é recusada adiante, como qualquer peça de outro esqueleto).
 * `soltar` tira da montagem os ossos acrescentados.
 */
export function ossosComOsDoObjeto(original: Object3D, ossos: ReadonlyMap<string, Bone>) {
  const todos = new Map(ossos)
  const novos: Bone[] = []
  const entrar = (osso: Bone): Bone | undefined => {
    const tem = todos.get(osso.name)
    if (tem) return tem
    const pai = osso.parent instanceof Bone ? entrar(osso.parent) : undefined
    if (!pai) return undefined
    const novo = new Bone()
    novo.name = osso.name
    novo.position.copy(osso.position)
    novo.quaternion.copy(osso.quaternion)
    novo.scale.copy(osso.scale)
    pai.add(novo)
    todos.set(osso.name, novo)
    novos.push(novo)
    return novo
  }
  original.traverse((o) => {
    if (o instanceof SkinnedMesh) for (const osso of o.skeleton.bones) entrar(osso)
  })
  return {
    ossos: todos as ReadonlyMap<string, Bone>,
    soltar() {
      for (const osso of novos) osso.removeFromParent()
    },
  }
}

export interface PecaPresa {
  geometry: Mesh['geometry']
  material: Material | Material[]
  skeleton: Skeleton
  morphTargetDictionary?: Mesh['morphTargetDictionary']
  morphTargetInfluences?: number[]
}

/**
 * Prende as malhas de uma peça aos ossos da montagem. Geometria fica a do cache; materiais e
 * esqueletos são da montagem (descartados em `soltar`). Osso que a montagem não tem é recusado:
 * peça de outro esqueleto não pode entrar torta.
 *
 * `camada` (0 = o corpo) diz o que fica por cima quando duas peças ocupam quase o mesmo lugar: a
 * luva sem dedos sobre a mão, a meia dentro do tênis, a barra da camiseta sobre a calça. Sem isso a
 * placa de vídeo decide a cada quadro qual das duas desenhar, e a peça pisca (pior com o corpo se
 * mexendo). Cada camada acima avança a profundidade um tantinho (`polygonOffset`), que só decide
 * entre superfícies quase coincidentes: o que está mesmo na frente continua na frente.
 */
export function prepararPecaDoPack(
  original: Object3D,
  ossos: ReadonlyMap<string, Bone>,
  texturas: TexturasDoPack,
  override?: Material,
  camada = 0,
) {
  const proprios = new Map<Material, Material>()
  const esqueletos: Skeleton[] = []
  const pecas: PecaPresa[] = []
  const faltando = new Set<string>()

  const copiar = (mat: Material): Material => {
    if (override) return override
    let copia = proprios.get(mat)
    if (!copia) {
      copia = mat.clone()
      const { map, emissiveMap } = anotacao(mat)
      if (copia instanceof MeshStandardMaterial) {
        const textura = map ? texturas.get(map) : undefined
        if (textura) copia.map = textura
        const brilho = emissiveMap ? texturas.get(emissiveMap) : undefined
        if (brilho) copia.emissiveMap = brilho
        copia.needsUpdate = true
      }
      if (camada > 0) {
        copia.polygonOffset = true
        copia.polygonOffsetFactor = -camada
        copia.polygonOffsetUnits = -camada
      }
      proprios.set(mat, copia)
    }
    return copia
  }

  original.traverse((o) => {
    if (!(o instanceof SkinnedMesh)) return
    const presos = o.skeleton.bones.map((osso) => {
      const meu = ossos.get(osso.name)
      if (!meu) faltando.add(osso.name)
      return meu
    })
    if (presos.some((b) => !b)) return
    const skeleton = new Skeleton(
      presos as Bone[],
      o.skeleton.boneInverses.map((m) => m.clone()),
    )
    esqueletos.push(skeleton)
    pecas.push({
      geometry: o.geometry,
      material: Array.isArray(o.material) ? o.material.map(copiar) : copiar(o.material),
      skeleton,
      morphTargetDictionary: o.morphTargetDictionary ? { ...o.morphTargetDictionary } : undefined,
      morphTargetInfluences: o.morphTargetInfluences ? [...o.morphTargetInfluences] : undefined,
    })
  })
  // Malha sem pele (o pack não tem, mas um arquivo torto teria): não entra, para não flutuar.
  original.traverse((o) => {
    if (o instanceof Mesh && !(o instanceof SkinnedMesh))
      faltando.add(`(malha sem pele: ${o.name})`)
  })

  return {
    pecas,
    /** Ossos que a peça pede e a montagem não tem. Vazio quando a peça é deste esqueleto. */
    faltando: [...faltando],
    soltar() {
      for (const m of proprios.values()) m.dispose()
      for (const s of esqueletos) s.dispose()
    },
  }
}
