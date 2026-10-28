import type { Ilha } from '@sistemazero/arquipelago-contracts'
import { PERFIS_DE_CAMERA } from '../sistemas/perfis-de-camera'
import { ALTURA_DO_PIER } from './colisao-da-ilha-central'
import type { ColisorDaIlha } from './colisores-da-ilha'
import { centroNoAnel, FAROL, PIER } from './medidas'

export const LUNETA = {
  x: PIER.x,
  y: ALTURA_DO_PIER + 0.06,
  z: PIER.z + PIER.comprimento - 1.2,
  alcance: 1.8,
} as const
export const COLISOR_DA_LUNETA: ColisorDaIlha[] = [
  {
    forma: 'cilindro',
    nome: 'col-cil-estaca-luneta',
    posicao: [0, 0.53, 0],
    rotacao: [0, 0, 0, 1],
    raio: 0.32,
    meiaAltura: 0.53,
  },
]

export function alvoDaLuneta(ilha: Ilha) {
  const centro = ilha.id === 'farol' ? FAROL : centroNoAnel(ilha)
  return { x: centro.x, y: ilha.id === 'farol' ? 5 : ilha.id === 'nuvens' ? 10 : 3, z: centro.z }
}

/** Vista do lado do píer; adapta a distância ao formato da tela sem cortar a ilha no celular. */
export function vistaDaLuneta(ilha: Ilha, aspecto: number) {
  const alvo = alvoDaLuneta(ilha)
  const perfil = PERFIS_DE_CAMERA.luneta
  const campo = perfil.campoDeVisao ?? 45
  const distancia = Math.max(
    perfil.distancia?.minima ?? 36,
    17 / (Math.tan((campo * Math.PI) / 360) * Math.min(1, Math.max(0.2, aspecto))),
  )
  const giro = Math.atan2(LUNETA.x - alvo.x, LUNETA.z - alvo.z)
  const inclinacao = perfil.inclinacao?.fixa ?? 0.32
  return {
    alvo,
    campo,
    posicao: {
      x: alvo.x + Math.sin(giro) * distancia,
      y: alvo.y + Math.tan(inclinacao) * distancia,
      z: alvo.z + Math.cos(giro) * distancia,
    },
  }
}
