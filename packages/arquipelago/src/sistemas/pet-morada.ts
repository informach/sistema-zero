import type { QuartoDoJogo } from '@sistemazero/arquipelago-contracts'
import { MORADA_CATALOG } from '@sistemazero/avatar-quarto/morada/catalog'
import {
  comecarPassinho,
  criarEmpurrao,
  distanciaMinima,
  empurrando,
  ladoDoPassinho,
  passoDoEmpurrao,
  passoDoPassinho,
  respeitarFolga,
} from './espaco-dos-bichos'
import { atrasDela, criarSeguir, passoDoSeguir } from './seguir'

/** A projeção canônica é compartilhada por seguidores, cuidado e escolha de companhia. */
export function petDaMorada(quarto: Pick<QuartoDoJogo, 'house' | 'pet'>): string | null {
  // `null` é uma remoção. O campo legado só é lido pela migração da plataforma.
  const pet = quarto.house?.pet
  return pet && MORADA_CATALOG.pieces[pet]?.kind === 'pet' ? pet : null
}

export function criarPetMorada(position: { x: number; y: number; z: number }) {
  return { position: { ...position }, follow: criarSeguir(), push: criarEmpurrao(), vx: 0, vz: 0 }
}
export type PetMorada = ReturnType<typeof criarPetMorada>
export interface PassoDoPetMorada {
  child: { x: number; z: number; pe: number; direcao: number }
  pedido: { x: number; z: number }
  radius: number
  dt: number
  paused: boolean
  waiting: boolean
  grounded: boolean
  livre?: (x: number, z: number) => boolean
}

/** O pé do seguidor e sua velocidade efetiva, no mesmo passo fixo do corpo da criança. */
export function passoDoPetMorada(state: PetMorada, input: PassoDoPetMorada): void {
  if (input.paused) return
  const { child, dt } = input
  const step = passoDoSeguir(state.follow, state.position, child, input.waiting, dt)
  const before = { ...state.position }
  if (step.reaparecer) {
    state.position = { ...atrasDela(child), y: child.pe }
    state.push = criarEmpurrao()
  } else {
    const delta = { x: state.follow.vx * dt, z: state.follow.vz * dt }
    const pet = { ...state.position, pe: state.position.y }
    if (passoDoEmpurrao(state.push, empurrando(pet, input.radius, child, input.pedido), dt)) {
      const direction = ladoDoPassinho(pet, child, input.pedido, input.livre)
      if (direction) comecarPassinho(state.push, direction)
    }
    passoDoPassinho(state.push, dt, delta)
    respeitarFolga(
      { ...state.position, pe: state.position.y },
      delta,
      child,
      distanciaMinima(input.radius),
      dt,
    )
    state.position.x += delta.x
    state.position.z += delta.z
    if (input.grounded) state.position.y += (child.pe - state.position.y) * (1 - Math.exp(-8 * dt))
  }
  state.vx = step.reaparecer ? 0 : (state.position.x - before.x) / dt
  state.vz = step.reaparecer ? 0 : (state.position.z - before.z) / dt
}

export function animacaoDoPetPausada(
  paused: boolean,
  speed: number,
  device: boolean,
  game: boolean,
) {
  // Locomoção e passagem são essenciais; só a animação ociosa é decorativa.
  return paused || (speed < 0.15 && (device || game))
}
