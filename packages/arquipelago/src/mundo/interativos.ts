import { useEffect, useRef } from 'react'
import { useJogo } from '../estado/contexto'

/**
 * Coisas com que dá para interagir (canteiro, bancada, porta, cama). Cada uma diz onde está, de
 * que distância funciona e o que fazer; o personagem procura a mais perto a cada quadro.
 */
export interface Interativo {
  x: number
  z: number
  raio: number
  /** O texto do botão agora (`null` = nada a fazer aqui por enquanto). */
  rotulo(): string | null
  agir(): void
  /** Pode ser usado no modo mergulho. */
  submerso?: boolean
  /**
   * Só vale quando nenhum outro está ao alcance: o bicho adotado anda sempre perto da criança e
   * não pode tomar o E da Capi, do "Achar" ou da porta.
   */
  deFundo?: boolean
}

export type RegistroDeInterativos = Map<string, Interativo>

export function criarRegistro(): RegistroDeInterativos {
  return new Map()
}

/** O interativo mais perto de (x, z) que tem algo a fazer, ou `null`. */
export function maisPerto(
  r: RegistroDeInterativos,
  x: number,
  z: number,
  submerso = false,
): { id: string; rotulo: string } | null {
  let melhor: { id: string; rotulo: string; d: number } | null = null
  let fundo: { id: string; rotulo: string; d: number } | null = null
  for (const [id, it] of r) {
    if (submerso && !it.submerso) continue
    const d = (it.x - x) ** 2 + (it.z - z) ** 2
    if (d > it.raio ** 2) continue
    const rotulo = it.rotulo()
    if (!rotulo) continue
    if (it.deFundo) {
      if (!fundo || d < fundo.d) fundo = { id, rotulo, d }
    } else if (!melhor || d < melhor.d) melhor = { id, rotulo, d }
  }
  const escolhido = melhor ?? fundo
  return escolhido ? { id: escolhido.id, rotulo: escolhido.rotulo } : null
}

export function useInterativo(id: string, it: Interativo): void {
  const { interativos } = useJogo()
  const ultimo = useRef(it)
  ultimo.current = it
  useEffect(() => {
    interativos.set(id, {
      get x() {
        return ultimo.current.x
      },
      get z() {
        return ultimo.current.z
      },
      get raio() {
        return ultimo.current.raio
      },
      get submerso() {
        return ultimo.current.submerso
      },
      get deFundo() {
        return ultimo.current.deFundo
      },
      rotulo: () => ultimo.current.rotulo(),
      agir: () => ultimo.current.agir(),
    })
    return () => {
      interativos.delete(id)
    }
  }, [id, interativos])
}
