import { type Object3D, Vector3 } from 'three'
import type { ColisorDaIlha } from './colisores-da-ilha'
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

export function pontosDoAlto(modelo: Object3D) {
  modelo.updateMatrixWorld(true)
  const ponto = (nome: string) => {
    const no = modelo.getObjectByName(nome)
    if (!no) throw new Error(`O alto do Farol precisa de ${nome}`)
    const p = modelo.worldToLocal(no.getWorldPosition(new Vector3()))
    return { x: p.x + ALTO_DO_FAROL.x, y: p.y + ALTO_DO_FAROL.y, z: p.z + ALTO_DO_FAROL.z }
  }
  return { entrada: ponto('entrada'), mesa: ponto('mesa'), varanda: ponto('varanda') }
}

/** Medidas de alto-do-farol.glb: piso escuro raio 4,2; parede 4,55; mesa no setor -x/-z. */
export const COLISORES_DO_ALTO: readonly ColisorDaIlha[] = [
  {
    nome: 'col-piso-sala',
    forma: 'cilindro',
    posicao: [0, -0.1, 0],
    rotacao: [0, 0, 0, 1],
    raio: 4.2,
    meiaAltura: 0.1,
  },
  // Dezesseis faces fecham a sala. A varanda é usada pela câmera, sem permitir uma queda.
  ...Array.from({ length: 16 }, (_, i): ColisorDaIlha => {
    const a = (i * Math.PI) / 8
    return {
      nome: `col-parede-sala-${i}`,
      forma: 'caixa',
      posicao: [Math.sin(a) * 4.35, 1.75, Math.cos(a) * 4.35],
      rotacao: [0, Math.sin(a / 2), 0, Math.cos(a / 2)],
      meio: [0.9, 1.75, 0.15],
    }
  }),
  {
    nome: 'col-mesa-iris',
    forma: 'caixa',
    posicao: [-0.88, 0.47, -3.1],
    rotacao: [0, 0, 0, 1],
    meio: [1.47, 0.47, 1.07],
  },
  {
    nome: 'col-base-lente',
    forma: 'cilindro',
    posicao: [0, 0.55, 0],
    rotacao: [0, 0, 0, 1],
    raio: 0.65,
    meiaAltura: 0.55,
  },
]

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
