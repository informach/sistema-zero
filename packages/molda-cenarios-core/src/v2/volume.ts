import type { Transformacao } from './documento'

export type VolumeDeComposicao = {
  min: { x: number; y: number; z: number }
  max: { x: number; y: number; z: number }
}

/** Transforma os oito cantos, com a mesma ordem Euler XYZ do motor. Sem dependência de Three. */
export function transformarVolume(
  volume: VolumeDeComposicao,
  transformacao: Transformacao,
): VolumeDeComposicao {
  const { posicao: p, rotacao: r, escala: s } = transformacao
  const min = { x: Infinity, y: Infinity, z: Infinity },
    max = { x: -Infinity, y: -Infinity, z: -Infinity }
  for (const vx of [volume.min.x, volume.max.x])
    for (const vy of [volume.min.y, volume.max.y])
      for (const vz of [volume.min.z, volume.max.z]) {
        const x = vx * s.x,
          y = vy * s.y,
          z = vz * s.z
        const zx = x * Math.cos(r.z) - y * Math.sin(r.z),
          zy = x * Math.sin(r.z) + y * Math.cos(r.z)
        const yx = zx * Math.cos(r.y) + z * Math.sin(r.y),
          yz = -zx * Math.sin(r.y) + z * Math.cos(r.y)
        const q = {
          x: yx + p.x,
          y: zy * Math.cos(r.x) - yz * Math.sin(r.x) + p.y,
          z: zy * Math.sin(r.x) + yz * Math.cos(r.x) + p.z,
        }
        for (const e of ['x', 'y', 'z'] as const) {
          min[e] = Math.min(min[e], q[e])
          max[e] = Math.max(max[e], q[e])
        }
      }
  return { min, max }
}
