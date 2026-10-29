import type { BufferGeometry, Material, Mesh, Object3D, Texture } from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

/**
 * Baixa e lê as ilhas completas fora do React (sem o cache do `useGLTF`, que não solta a memória
 * sozinho e suspenderia a cena). Regra de memória: a ilha central fica sempre, e no máximo UMA
 * ilha completa por vez; pedir outra solta a anterior.
 */
export const MAXIMO_DE_ILHAS_COMPLETAS = 1

interface Pedido {
  promessa: Promise<Object3D>
  cena?: Object3D
  /** Soltaram antes de o arquivo chegar: ele é solto assim que chegar. */
  solto: boolean
  usos: number
  limparExtras?: () => void
}

const pedidos = new Map<string, Pedido>()
let carregador: GLTFLoader | undefined

/** Busca a ilha (um pedido só por endereço; pedidos repetidos esperam o mesmo arquivo). */
export function buscarIlha(
  url: string,
  ler?: (url: string) => Promise<Object3D>,
): Promise<Object3D> {
  const existente = pedidos.get(url)
  if (existente) return existente.promessa
  for (const outra of [...pedidos.keys()]) {
    if (pedidos.size < MAXIMO_DE_ILHAS_COMPLETAS) break
    soltarIlha(outra)
  }
  const leitura =
    ler ??
    ((u: string) => {
      carregador ??= new GLTFLoader()
      return carregador.loadAsync(u).then((g) => g.scene)
    })
  const pedido = { solto: false, usos: 0 } as Pedido
  pedido.promessa = leitura(url).then(
    (cena) => {
      if (pedido.solto) {
        liberarObjeto(cena)
        throw new Error('ilha solta antes de chegar')
      }
      pedido.cena = cena
      return cena
    },
    (erro: unknown) => {
      if (pedidos.get(url) === pedido) pedidos.delete(url)
      throw erro
    },
  )
  pedidos.set(url, pedido)
  return pedido.promessa
}

/** Quantas ilhas completas estão na memória ou a caminho. */
export function ilhasNaMemoria(): number {
  return pedidos.size
}

/** Solta geometrias, materiais e texturas da ilha (ou marca para soltar quando chegar). */
export function soltarIlha(url: string) {
  const pedido = pedidos.get(url)
  if (!pedido) return
  pedidos.delete(url)
  pedido.solto = true
  liberarPedido(pedido)
}

function liberarPedido(pedido: Pedido) {
  if (!pedido.solto || pedido.usos !== 0 || !pedido.cena) return
  pedido.limparExtras?.()
  liberarObjeto(pedido.cena)
  pedido.cena = undefined
  pedido.limparExtras = undefined
}

/** Mantém a cena viva durante compileAsync, mesmo se ela sair do cache nesse intervalo. */
export function reterIlha(url: string, cena: Object3D, limparExtras: () => void) {
  const pedido = pedidos.get(url)
  if (!pedido || pedido.solto || pedido.cena !== cena) return null
  pedido.usos++
  pedido.limparExtras = limparExtras
  let liberada = false
  return {
    ativa: () => !pedido.solto,
    liberar() {
      if (liberada) return
      liberada = true
      pedido.usos--
      liberarPedido(pedido)
    },
  }
}

/** Solta da placa de vídeo tudo o que o objeto usa (geometria, material e textura). */
/** Quanto a última ilha solta liberou (para conferir que nada fica para trás). */
export const ultimaLiberacao = { geometrias: 0, materiais: 0, texturas: 0 }

export function liberarObjeto(raiz: Object3D) {
  const geometrias = new Set<BufferGeometry>()
  const materiais = new Set<Material>()
  raiz.traverse((o) => {
    const m = o as Mesh
    if (!m.isMesh) return
    geometrias.add(m.geometry)
    for (const mat of Array.isArray(m.material) ? m.material : [m.material]) materiais.add(mat)
  })
  const texturas = new Set<Texture>()
  for (const g of geometrias) g.dispose()
  for (const material of materiais) {
    for (const valor of Object.values(material)) {
      if (valor && typeof valor === 'object' && (valor as Texture).isTexture) {
        texturas.add(valor as Texture)
      }
    }
    material.dispose()
  }
  for (const t of texturas) t.dispose()
  ultimaLiberacao.geometrias = geometrias.size
  ultimaLiberacao.materiais = materiais.size
  ultimaLiberacao.texturas = texturas.size
}
