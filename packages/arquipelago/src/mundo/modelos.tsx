import { useGLTF } from '@react-three/drei'
import { Component, type ReactNode, Suspense } from 'react'
import { Color, type Material, type Mesh, MeshStandardMaterial, type Object3D } from 'three'
import arvoresGlb from '../assets/mundo/arvores.glb'
import bancadaGlb from '../assets/mundo/bancada.glb'
import boiasGlb from '../assets/mundo/boias.glb'
import casaGlb from '../assets/mundo/casa.glb'
import farolGlb from '../assets/mundo/farol.glb'
import hortaGlb from '../assets/mundo/horta.glb'
import ilhasGlb from '../assets/mundo/ilhas-do-anel.glb'
import pierGlb from '../assets/mundo/pier.glb'
import ponteGlb from '../assets/mundo/ponte.glb'
import terrenoGlb from '../assets/mundo/terreno.glb'

/**
 * Os modelos do mundo feitos no Blender (`arte/mundo/`, um script por peça). Os nomes dos nós e
 * dos materiais são o contrato com o código (veja `arte/mundo/README.md`). Cada caminho é
 * resolvido contra o próprio módulo, como o do Zappy (o jogo pode vir de outra pasta).
 */
export const MODELOS = {
  arvores: new URL(arvoresGlb, import.meta.url).href,
  bancada: new URL(bancadaGlb, import.meta.url).href,
  boias: new URL(boiasGlb, import.meta.url).href,
  casa: new URL(casaGlb, import.meta.url).href,
  farol: new URL(farolGlb, import.meta.url).href,
  horta: new URL(hortaGlb, import.meta.url).href,
  ilhas: new URL(ilhasGlb, import.meta.url).href,
  pier: new URL(pierGlb, import.meta.url).href,
  ponte: new URL(ponteGlb, import.meta.url).href,
  terreno: new URL(terrenoGlb, import.meta.url).href,
} as const

/** Começa a baixar tudo assim que a cena carrega (o mundo aparece de uma vez). */
export function carregarModelos() {
  for (const url of Object.values(MODELOS)) useGLTF.preload(url, false, false)
}

export function useModelo(url: string): Object3D {
  return useGLTF(url, false, false).scene
}

/**
 * Cópia de um nó do arquivo. Com `materiaisProprios`, cada material vira um só desta cópia (para
 * mudar cor, brilho ou transparência sem mexer nas outras cópias).
 */
export function copiarNo(raiz: Object3D, nome: string, materiaisProprios = false): Object3D {
  const no = raiz.getObjectByName(nome)
  if (!no) throw new Error(`Modelo sem o nó ${nome}`)
  const copia = no.clone(true)
  if (materiaisProprios) {
    const feitos = new Map<Material, Material>()
    copia.traverse((o) => {
      const m = o as Mesh
      if (!m.isMesh) return
      const trocar = (mat: Material) => {
        let novo = feitos.get(mat)
        if (!novo) {
          novo = mat.clone()
          feitos.set(mat, novo)
        }
        return novo
      }
      m.material = Array.isArray(m.material) ? m.material.map(trocar) : trocar(m.material)
    })
  }
  return copia
}

/** Os materiais de um objeto (e dos filhos), sem repetir; com `nome`, só os que têm esse nome. */
export function materiaisDe(obj: Object3D, nome?: string): MeshStandardMaterial[] {
  const lista = new Set<MeshStandardMaterial>()
  obj.traverse((o) => {
    const m = o as Mesh
    if (!m.isMesh) return
    for (const mat of Array.isArray(m.material) ? m.material : [m.material]) {
      if (mat instanceof MeshStandardMaterial && (!nome || mat.name === nome)) lista.add(mat)
    }
  })
  return [...lista]
}

/** Lembra a cor e o brilho de fábrica de cada material (para voltar do cinza para a cor). */
export interface CorOriginal {
  material: MeshStandardMaterial
  cor: Color
  brilho: number
}

export function coresOriginais(obj: Object3D): CorOriginal[] {
  return materiaisDe(obj).map((material) => ({
    material,
    cor: material.color.clone(),
    brilho: material.emissiveIntensity,
  }))
}

/** O cinza das ilhas antes do posto (o mesmo das silhuetas de antes). */
export const CINZA = new Color('#b3b8c1')

/** Pinta tudo entre o cinza (`cor` 0) e a cor de verdade (`cor` 1); o brilho acompanha. */
export function tingir(originais: CorOriginal[], cor: number) {
  for (const o of originais) {
    o.material.color.copy(CINZA).lerp(o.cor, cor)
    o.material.emissiveIntensity = o.brilho * cor
  }
}

/** Puxa as cores para um cinza com a mesma claridade (o farol apagado). */
export function desbotar(originais: CorOriginal[], quanto: number) {
  const hsl = { h: 0, s: 0, l: 0 }
  for (const o of originais) {
    o.cor.getHSL(hsl)
    const cinza = new Color().setHSL(0.6, 0.06, hsl.l * 0.85)
    o.material.color.copy(o.cor).lerp(cinza, quanto)
  }
}

/**
 * Mostra o modelo quando ele chega e, enquanto baixa ou se o arquivo falhar, o desenho de antes
 * (as formas simples do código). Um modelo que falha nunca derruba a cena.
 */
export function ComReserva({ reserva, children }: { reserva: ReactNode; children: ReactNode }) {
  return (
    <Barreira reserva={reserva}>
      <Suspense fallback={reserva}>{children}</Suspense>
    </Barreira>
  )
}

class Barreira extends Component<{ reserva: ReactNode; children: ReactNode }, { erro: boolean }> {
  state = { erro: false }
  static getDerivedStateFromError() {
    return { erro: true }
  }
  render() {
    return this.state.erro ? this.props.reserva : this.props.children
  }
}
