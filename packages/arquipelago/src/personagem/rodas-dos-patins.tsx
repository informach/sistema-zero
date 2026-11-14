import { useFrame } from '@react-three/fiber'
import { type RefObject, useRef } from 'react'
import type { Bone, Object3D } from 'three'
import { CORPO } from '../sistemas/corpo'
import type { EntradaDaLocomocao } from '../sistemas/locomocao'

/**
 * As rodas dos patins do pack giram pela distância andada. Cada roda é um osso só dela
 * (`Roda_<E|D>_<frente|tras>_<dentro|fora>`, filho do osso do pé ou da ponta do pé), que nenhuma
 * animação mexe; ela gira em volta do eixo Y do próprio osso (o eixo da roda). O raio é o que a
 * arte mediu (4,4 cm de diâmetro, escala nativa; `rodas` no catálogo dos sapatos da arte).
 */
export const RAIO_DA_RODA = 0.022

/**
 * O sentido de cada roda: as que têm a tampa para -X giram ao contrário das que têm para +X (a
 * arte). No pé esquerdo a de fora olha para +X; no direito, a de dentro.
 */
export function sentidoDaRoda(nome: string): 1 | -1 {
  const esquerdo = /_E_/.test(nome)
  const fora = /_fora$/.test(nome)
  return esquerdo === fora ? 1 : -1
}

/** Quanto a roda gira (radianos) ao andar `distancia` metros no mundo. */
export function giroDaRoda(distancia: number, escala = CORPO.medidas.scale): number {
  return distancia / (RAIO_DA_RODA * escala)
}

export function RodasDosPatins({
  corpo,
  movimento,
  pausado,
}: {
  corpo: RefObject<Object3D | null>
  movimento: RefObject<EntradaDaLocomocao>
  pausado: boolean
}) {
  const rodas = useRef<{ osso: Bone; sentido: 1 | -1 }[]>([])
  useFrame((_, dtBruto) => {
    const raiz = corpo.current
    const m = movimento.current
    if (pausado || !raiz || !m) return
    // As rodas entram com a peça dos patins: procura de novo se saíram da cena.
    if (rodas.current.length === 0 || !rodas.current[0]?.osso.parent) {
      rodas.current = []
      raiz.traverse((o) => {
        if ((o as Bone).isBone && o.name.startsWith('Roda_'))
          rodas.current.push({ osso: o as Bone, sentido: sentidoDaRoda(o.name) })
      })
    }
    if (!m.patinando || !m.noChao || rodas.current.length === 0) return
    const angulo = giroDaRoda(m.velocidade * Math.min(dtBruto, 0.1))
    for (const { osso, sentido } of rodas.current) osso.rotateY(angulo * sentido)
  })
  return null
}
