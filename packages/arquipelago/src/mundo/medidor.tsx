import { useFrame, useThree } from '@react-three/fiber'
import { useAfterPhysicsStep, useBeforePhysicsStep, useRapier } from '@react-three/rapier'
import { useEffect, useMemo, useRef } from 'react'
import { Box3, type Mesh, type Object3D } from 'three'
import { type Movimento, useJogo } from '../estado/contexto'
import type { NivelDeQualidade } from '../sistemas/qualidade'
import { ilhasNaMemoria, ultimaLiberacao } from './carregar-ilha'
import { esmaecidasAgora } from './copas'
import { fogoAgora } from './fogueira-viva'
import { folhasAgora } from './folhas-ao-vento'
import { mecanismosAgora } from './mecanismos'
import { materiaisDe } from './modelos'
import { reativosAgora } from './objetos-reativos'
import { ondasAgora } from './ondinhas'
import { pontesAgora } from './pontes-vivas'
import { useQualidade } from './qualidade-da-cena'
import { troncoAgora } from './tronco-no-lago'
import { qualidadeDaVegetacao, ventoAgora } from './vegetacao-ao-vento'

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
  luzesDosLumis: Record<string, number[]>
  qualidade: NivelDeQualidade
  metaDeQuadros: 30 | 60
  dpr: number
  amplitudeDoVento: number
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
  /** O modo do corpo (`sistemas/modos`) e se ele pisa em algo. */
  modo: Movimento['modo']
  noChao: boolean
  ondas: typeof ondasAgora
  reativos: typeof reativosAgora
  /** A folha e a pena soltas do Bosque. */
  folhas: typeof folhasAgora
  fogo: typeof fogoAgora
  vento: typeof ventoAgora
  mecanismos: typeof mecanismosAgora
  pontes: typeof pontesAgora
  fisica: { corposAtivos: number; passoMs: number }
  /** Cada patim calçado: o osso que o leva e a altura mais baixa das rodinhas (vazio: descalço). */
  patins: { peca: string; osso: string; rodas: number }[]
}

function medirLigado(): boolean {
  try {
    return localStorage.getItem(CHAVE_DE_MEDIR) === '1'
  } catch {
    return false
  }
}

const caixaDoPatim = new Box3()
function medirPatins(raiz: Object3D): MedidaDoDesenho['patins'] {
  const r: MedidaDoDesenho['patins'] = []
  for (const peca of ['patim-esq', 'patim-dir']) {
    const o = raiz.getObjectByName(peca)
    if (!o?.parent) continue
    caixaDoPatim.setFromObject(o)
    r.push({ peca, osso: o.parent.name, rodas: caixaDoPatim.min.y })
  }
  return r
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
  const qualidade = useQualidade()
  const ligado = useMemo(medirLigado, [])
  const gl = useThree((s) => s.gl)
  const camera = useThree((s) => s.camera)
  const cena = useThree((s) => s.scene)
  const { rastro, pedidos, movimento } = useJogo()
  const conta = useRef({ tempo: 0, quadros: 0 })
  const { world } = useRapier()
  const fisica = useRef({ inicio: 0, ms: 0, passos: 0 })
  useBeforePhysicsStep(() => {
    if (ligado) fisica.current.inicio = performance.now()
  })
  useAfterPhysicsStep(() => {
    if (ligado) {
      fisica.current.ms += performance.now() - fisica.current.inicio
      fisica.current.passos++
    }
  })
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
    let corposAtivos = 0
    world.bodies.forEach((b) => {
      if (!b.isFixed() && !b.isSleeping()) corposAtivos++
    })
    const medida: MedidaDoDesenho = {
      luzesDosLumis: Object.fromEntries(
        ['estrelinha', 'buzio'].map((id) => {
          const objeto = cena.getObjectByName(`habitante-${id}`)
          return [id, objeto ? materiaisDe(objeto, 'luz').map((m) => m.emissiveIntensity) : []]
        }),
      ),
      qualidade: qualidade.nivel,
      metaDeQuadros: qualidade.meta,
      dpr: gl.getPixelRatio(),
      amplitudeDoVento: (qualidadeDaVegetacao.get(cena) ?? 1) * ventoAgora.escalaVisual,
      ondas: { ...ondasAgora },
      reativos: { ...reativosAgora, pecas: reativosAgora.pecas.map((p) => ({ ...p })) },
      folhas: { pecas: folhasAgora.pecas.map((p) => ({ ...p })) },
      fogo: { ...fogoAgora },
      vento: { ...ventoAgora },
      mecanismos: { ...mecanismosAgora },
      pontes: { ...pontesAgora },
      fisica: { corposAtivos, passoMs: fisica.current.ms / Math.max(1, fisica.current.passos) },
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
      modo: movimento.modo,
      noChao: movimento.noChao,
      patins: medirPatins(cena),
    }
    ;(globalThis as { __arquipelagoDesenho?: MedidaDoDesenho }).__arquipelagoDesenho = medida
    fisica.current.ms = 0
    fisica.current.passos = 0
    c.tempo = 0
    c.quadros = 0
  })
  return null
}
