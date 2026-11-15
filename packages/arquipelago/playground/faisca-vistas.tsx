import { useFrame } from '@react-three/fiber'
import { Vector3 } from 'three'

/** Fotografia de revisão. FOV/posições são iguais no antes/depois; não é a câmera de jogo. */
export const VISTAS_DA_FAISCA = {
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
