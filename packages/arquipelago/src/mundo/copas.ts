import {
  Box3,
  type Material,
  type Mesh,
  type MeshStandardMaterial,
  type Object3D,
  Raycaster,
  type Vector3,
} from 'three'

/**
 * O que esmaece quando fica entre a câmera e o personagem: as copas das árvores (nós `copa-*` do
 * GLB, uma por árvore, com os galhos lá de cima), os troncos das árvores grandes (`tronco-*`) e os
 * telhados que o percurso passa por baixo (`telhado-*`). O resto da cena não é testado.
 *
 * O esmaecer é transparência de verdade, suave (sem pontilhado): enquanto tapa, a peça troca para
 * cópias transparentes dos materiais, sem escrever profundidade; quando sai da frente, volta para os
 * materiais opacos de sempre (sem custo nenhum parada).
 */
const PREFIXOS_QUE_ESMAECEM = ['copa-', 'telhado-', 'tronco-']
const PREFIXO_DE_COPA = 'copa-'

function esmaece(nome: string): boolean {
  return PREFIXOS_QUE_ESMAECEM.some((p) => nome.startsWith(p))
}

type Materiais = Material | Material[]

interface MalhaQueEsmaece {
  malha: Mesh
  opaco: Materiais
  suave: Materiais
}

export interface Copa {
  no: Object3D
  /** Copa: com a câmera dentro dela, some de vez (ela não esconde nada dali de dentro). */
  ehCopa: boolean
  malhas: MalhaQueEsmaece[]
  /** Os materiais opacos SÓ desta peça (o arquivo divide o mesmo verde entre todas). */
  materiais: Material[]
  /** As cópias transparentes, usadas só enquanto a peça tapa a câmera. */
  suaves: Material[]
  /** De cada cópia transparente, o material opaco de onde ela copia a cor (a ilha sai do cinza). */
  origem: Map<Material, Material>
  /** A caixa no mundo, medida uma vez quando a ilha já está no lugar. */
  caixa: Box3 | null
  /** 1 = inteira; esmaece até a opacidade da peça na frente. */
  visivel: number
  suaveLigado: boolean
}

function copiarMateriais(m: Materiais, trocar: (mat: Material) => Material): Materiais {
  return Array.isArray(m) ? m.map(trocar) : trocar(m)
}

/** Separa as peças que esmaecem, cada uma com os próprios materiais e as cópias transparentes. */
export function separarCopas(raiz: Object3D): Copa[] {
  const copas: Copa[] = []
  raiz.traverse((o) => {
    // Peça com várias cores vira um grupo com uma malha por cor, de nomes parecidos: só o grupo conta.
    if (!esmaece(o.name) || (o.parent && esmaece(o.parent.name))) return
    const opacos = new Map<Material, Material>()
    const suaves = new Map<Material, Material>()
    const origem = new Map<Material, Material>()
    const malhas: MalhaQueEsmaece[] = []
    o.traverse((filho) => {
      const m = filho as Mesh
      if (!m.isMesh) return
      const opaco = copiarMateriais(m.material, (mat) => {
        let novo = opacos.get(mat)
        if (!novo) {
          novo = mat.clone()
          opacos.set(mat, novo)
        }
        return novo
      })
      const suave = copiarMateriais(opaco, (mat) => {
        let novo = suaves.get(mat)
        if (!novo) {
          novo = mat.clone()
          novo.transparent = true
          // Sem escrever profundidade: o que está atrás (o avatar) aparece inteiro pela peça.
          novo.depthWrite = false
          suaves.set(mat, novo)
          origem.set(novo, mat)
        }
        return novo
      })
      m.material = opaco
      malhas.push({ malha: m, opaco, suave })
    })
    copas.push({
      no: o,
      ehCopa: o.name.startsWith(PREFIXO_DE_COPA),
      malhas,
      materiais: [...opacos.values()],
      suaves: [...suaves.values()],
      origem,
      caixa: null,
      visivel: 1,
      suaveLigado: false,
    })
  })
  return copas
}

/** Liga ou desliga as cópias transparentes da peça (só troca o material das malhas). */
export function usarSuave(copa: Copa, ligar: boolean) {
  if (copa.suaveLigado === ligar) return
  copa.suaveLigado = ligar
  for (const { malha, opaco, suave } of copa.malhas) malha.material = ligar ? suave : opaco
}

/** A opacidade das cópias transparentes, com a cor e o brilho do opaco de agora. */
export function aplicarSuave(copa: Copa, opacidade: number) {
  for (const s of copa.suaves) {
    const o = copa.origem.get(s) as MeshStandardMaterial | undefined
    const suave = s as MeshStandardMaterial
    if (o?.color && suave.color) suave.color.copy(o.color)
    if (o && typeof o.emissiveIntensity === 'number') suave.emissiveIntensity = o.emissiveIntensity
    suave.opacity = (o?.opacity ?? 1) * opacidade
  }
}

/** A caixa da peça no mundo (o nó já com a posição e o giro da ilha). */
export function caixaNoMundo(copa: Copa): Box3 {
  if (!copa.caixa) {
    copa.no.updateWorldMatrix(true, true)
    copa.caixa = new Box3().setFromObject(copa.no)
  }
  return copa.caixa
}

/** As peças esmaecidas agora (o medidor do playground mostra; o jogo não usa). */
export const esmaecidasAgora = new Set<string>()

const raio = new Raycaster()

/**
 * A peça tapa o caminho de algum dos pontos do avatar até a câmera? Testa a malha de verdade (a
 * caixa de um tronco torto é bem maior que ele), depois de a caixa dizer que pode tapar.
 */
export function tapa(copa: Copa, pontos: Vector3[], camera: Vector3): boolean {
  const caixa = caixaNoMundo(copa)
  for (const p of pontos) {
    const distancia = p.distanceTo(camera)
    if (distancia === 0) continue
    raio.set(p, camera.clone().sub(p).divideScalar(distancia))
    raio.far = distancia
    if (!raio.ray.intersectsBox(caixa) && !caixa.containsPoint(p)) continue
    if (raio.intersectObject(copa.no, true).length > 0) return true
  }
  return false
}
