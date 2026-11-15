import { useFrame } from '@react-three/fiber'
import { Vector3 } from 'three'

/** Fotografia de revisão. FOV/posições são iguais no antes/depois; não é a câmera de jogo. */
export const VISTAS_DA_FAISCA = {
  horta: { avatar: [20, 139], camera: [12, 7.5, 150], alvo: [28, 4.8, 136] },
  'placa-horta-verso': { avatar: [14.5, 137], camera: [16, 6.1, 134.7], alvo: [16, 5.38, 139] },
  'placa-costa': { avatar: [3, 141], camera: [2.8, 6.1, 142.5], alvo: [5, 5.38, 140] },
  'placa-horta': { avatar: [14.5, 141], camera: [16, 6.1, 143.3], alvo: [16, 5.38, 139] },
  'placa-patio': { avatar: [-18, 133], camera: [-17.6, 6.3, 131.8], alvo: [-20, 5.5, 135] },
  piso: { avatar: [10, 138], camera: [1, 6, 147], alvo: [12, 4.1, 138] },
  'piso-baixo': { avatar: [10, 138], camera: [5, 4.8, 143], alvo: [12, 4.1, 138] },
  'lago-lateral': { avatar: [64, 127], camera: [70, 5.4, 127], alvo: [58, 3.6, 127] },
  curadoria: { avatar: [36, 171], camera: [43, 15, 195], alvo: [47, 4, 175] },
  porta: { avatar: [0, 150], camera: [0, 12, 170], alvo: [0, 9, 125] },
  praca: { avatar: [0, 137], camera: [-24, 21, 160], alvo: [0, 5, 138] },
  costa: { avatar: [20, 153], camera: [-1, 9, 150], alvo: [25, 4, 174] },
  oficina: { avatar: [-24, 132], camera: [-25, 11, 145], alvo: [-46, 7, 120] },
  farol: { avatar: [-3, 109], camera: [38, 30, 145], alvo: [-3, 20, 100] },
  subida: { avatar: [-20, 115], camera: [-42, 24, 122], alvo: [-3, 15, 109] },
  'ponte-sul': { avatar: [58, 135], camera: [65, 9, 143], alvo: [58, 3.8, 125] },
  'ponte-norte': { avatar: [58, 119], camera: [50, 9, 112], alvo: [58, 4, 129] },
} as const
export function vistaDaFaisca(pedido: string | null) {
  return pedido && Object.hasOwn(VISTAS_DA_FAISCA, pedido)
    ? VISTAS_DA_FAISCA[pedido as keyof typeof VISTAS_DA_FAISCA]
    : null
}
const olhar = new Vector3()
export function CameraDaCaptura({
  vista,
}: {
  vista: NonNullable<ReturnType<typeof vistaDaFaisca>>
}) {
  // Prioridade negativa: a câmera normal não é montada neste modo. O render automático permanece.
  useFrame(({ camera }) => {
    camera.position.set(vista.camera[0], vista.camera[1], vista.camera[2])
    camera.lookAt(olhar.set(vista.alvo[0], vista.alvo[1], vista.alvo[2]))
  }, -1)
  return null
}
