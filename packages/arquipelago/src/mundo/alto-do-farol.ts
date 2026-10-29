import { type Object3D, Vector3 } from 'three'
import type { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { type ColisorDaIlha, lerColisores, tirarNosDeColisao } from './colisores-da-ilha'
import { ALTURA_DA_TERRA, alturaDaIlha, FAROL, ilhasEmVolta } from './medidas'

/** Sala própria, afastada da torre exterior. Não representa uma altura da história. */
export const ALTO_DO_FAROL = { x: FAROL.x, y: 40, z: FAROL.z } as const
/** Porta em +x/+z no GLB; ponto além das pedras e degraus. */
export const PORTA_DO_FINAL = { x: FAROL.x + 2.8, z: FAROL.z + 2.1 }
export const VOLTA_DO_FAROL = {
  ...PORTA_DO_FINAL,
  y: alturaDaIlha(PORTA_DO_FINAL.x, PORTA_DO_FINAL.z) + 1.2,
}
/** Lugar proposto entre a casa e o Farol, fora da obra e das pedras. */
export const LUGAR_DA_IRIS = { x: -8, y: alturaDaIlha(-8, -9), z: -9, descanso: Math.PI / 2 }
export const ALVOS_DO_FACHO = ilhasEmVolta()
export const ORIGEM_DO_FACHO = { x: FAROL.x, y: ALTURA_DA_TERRA + 9.4, z: FAROL.z }

/** A sala carregada: o arquivo e os colisores lidos dos nós `col-*` dele. */
export type SalaCarregada = { gltf: GLTF; colisores: ColisorDaIlha[] }

/**
 * As âncoras do alto (`arte/ilhas-b/alto_do_farol.py`), no mundo: `chegada` (onde a criança
 * aparece, fora da grade da escada e da lente), `leitura` (de frente para a mesa da Íris) e
 * `camera-varanda` (de onde a câmera parte para a vista do anel).
 */
export function pontosDoAlto(modelo: Object3D) {
  modelo.updateMatrixWorld(true)
  const ponto = (nome: string) => {
    const no = modelo.getObjectByName(nome)
    if (!no) throw new Error(`O alto do Farol precisa de ${nome}`)
    const p = modelo.worldToLocal(no.getWorldPosition(new Vector3()))
    return { x: p.x + ALTO_DO_FAROL.x, y: p.y + ALTO_DO_FAROL.y, z: p.z + ALTO_DO_FAROL.z }
  }
  return { chegada: ponto('chegada'), leitura: ponto('leitura'), varanda: ponto('camera-varanda') }
}

/**
 * Lê os colisores da sala (piso, anel da parede, grade da escada, mesa e lente: só formas simples)
 * e tira os nós `col-*` da cena, que não desenham. Chamar uma vez, logo depois de carregar.
 */
export function prepararSala(cena: Object3D): ColisorDaIlha[] {
  const lista = lerColisores(cena)
  tirarNosDeColisao(cena)
  return lista
}

/** Enquadramento panorâmico com margem para o anel de raio 82, inclusive em retrato. */
export function vistaFinal(aspecto: number) {
  const distancia = Math.max(180, 120 / Math.max(0.3, aspecto))
  return { x: distancia * 0.25, y: distancia, z: distancia * 0.72 }
}

/** No retrato, ao menos 46 graus na horizontal mantêm corpo e mesa no quadro da sala. */
export function campoDaSala(aspecto: number): number {
  return Math.max(
    65,
    Math.min(
      110,
      (2 * Math.atan(Math.tan((23 * Math.PI) / 180) / Math.max(0.3, aspecto)) * 180) / Math.PI,
    ),
  )
}
