import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import type { Mesh, Object3D } from 'three'
import { useJogo } from '../estado/contexto'
import { ilhasNaMemoria, ultimaLiberacao } from './carregar-ilha'
import { esmaecidasAgora } from './copas'
import { troncoAgora } from './tronco-no-lago'

/**
 * Só para medir o desenho (playground e conferência de desempenho): com
 * `localStorage['arquipelago:medir'] = '1'`, deixa os números do `renderer.info` em
 * `globalThis.__arquipelagoDesenho` (com a posição do personagem) a cada quarto de segundo, e
 * `globalThis.__arquipelagoLevar(x, y, z, giro)` leva o personagem a um ponto (para medir a memória
 * na mesma pose antes e depois de uma visita). Desligado, não faz nada.
 */
export const CHAVE_DE_MEDIR = 'arquipelago:medir'
const INTERVALO_DE_MEDIDA = 0.25

export interface MedidaDoDesenho {
  chamadas: number
  triangulos: number
  geometrias: number
  texturas: number
  programas: number
  quadrosPorSegundo: number
  ilhasCompletas: number
  posicao: { x: number; y: number; z: number }
  /** Para onde a câmera olha (o mesmo `giro` do rastro). */
  giro: number
  camera: { x: number; y: number; z: number }
  /**
   * Geometrias diferentes penduradas na cena agora (desenhadas ou não). `geometrias` (as que estão
   * na placa de vídeo) nunca passa disto se nada ficou para trás de uma ilha solta.
   */
  geometriasNaCena: number
  /** As copas, troncos e telhados esmaecidos agora (na frente da câmera). */
  esmaecidas: string[]
  /** Quanto a última ilha completa solta liberou. */
  liberadas: { geometrias: number; materiais: number; texturas: number }
  /** O tronco que boia no lago do Bosque (posição e parte na água). */
  tronco: typeof troncoAgora
}

function medirLigado(): boolean {
  try {
    return localStorage.getItem(CHAVE_DE_MEDIR) === '1'
  } catch {
    return false
  }
}

function contarGeometrias(raiz: Object3D): number {
  const vistas = new Set<unknown>()
  raiz.traverse((o) => {
    const g = (o as Mesh).geometry
    if (g) vistas.add(g)
  })
  return vistas.size
}

export function Medidor() {
  const ligado = useMemo(medirLigado, [])
  const gl = useThree((s) => s.gl)
  const camera = useThree((s) => s.camera)
  const cena = useThree((s) => s.scene)
  const { rastro, pedidos } = useJogo()
  const conta = useRef({ tempo: 0, quadros: 0 })
  useEffect(() => {
    if (!ligado) return
    const g = globalThis as { __arquipelagoLevar?: (...a: number[]) => void }
    g.__arquipelagoLevar = (x = 0, y = 0, z = 0, giro?: number) => {
      pedidos.teleporte = { x, y, z }
      if (giro !== undefined) rastro.giro = giro
    }
    return () => {
      g.__arquipelagoLevar = undefined
    }
  }, [ligado, pedidos, rastro])
  useFrame((_, dt) => {
    if (!ligado) return
    const c = conta.current
    c.tempo += dt
    c.quadros++
    if (c.tempo < INTERVALO_DE_MEDIDA) return
    const medida: MedidaDoDesenho = {
      chamadas: gl.info.render.calls,
      triangulos: gl.info.render.triangles,
      geometrias: gl.info.memory.geometries,
      texturas: gl.info.memory.textures,
      programas: gl.info.programs?.length ?? 0,
      quadrosPorSegundo: Math.round(c.quadros / c.tempo),
      ilhasCompletas: ilhasNaMemoria(),
      posicao: { x: rastro.x, y: rastro.y, z: rastro.z },
      giro: rastro.giro,
      camera: { x: camera.position.x, y: camera.position.y, z: camera.position.z },
      liberadas: { ...ultimaLiberacao },
      esmaecidas: [...esmaecidasAgora],
      geometriasNaCena: contarGeometrias(cena),
      tronco: { ...troncoAgora },
    }
    ;(globalThis as { __arquipelagoDesenho?: MedidaDoDesenho }).__arquipelagoDesenho = medida
    c.tempo = 0
    c.quadros = 0
  })
  return null
}
