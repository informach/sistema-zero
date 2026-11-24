import type { Transformacao } from './documento'

export type VolumeDeComposicao = {
  min: { x: number; y: number; z: number }
  max: { x: number; y: number; z: number }
}

export function transformarPonto(ponto: { x: number; y: number; z: number }, t: Transformacao) {
  const { posicao: p, rotacao: r, escala: s } = t
  const x = ponto.x * s.x,
    y = ponto.y * s.y,
    z = ponto.z * s.z
  const zx = x * Math.cos(r.z) - y * Math.sin(r.z),
    zy = x * Math.sin(r.z) + y * Math.cos(r.z)
  const yx = zx * Math.cos(r.y) + z * Math.sin(r.y),
    yz = -zx * Math.sin(r.y) + z * Math.cos(r.y)
  return {
    x: yx + p.x,
    y: zy * Math.cos(r.x) - yz * Math.sin(r.x) + p.y,
    z: zy * Math.sin(r.x) + yz * Math.cos(r.x) + p.z,
  }
}

export function destransformarPonto(ponto: { x: number; y: number; z: number }, t: Transformacao) {
  const { posicao: p, rotacao: r, escala: s } = t
  const x = ponto.x - p.x,
    y = ponto.y - p.y,
    z = ponto.z - p.z
  const xy = y * Math.cos(r.x) + z * Math.sin(r.x),
    xz = -y * Math.sin(r.x) + z * Math.cos(r.x)
  const yx = x * Math.cos(r.y) - xz * Math.sin(r.y),
    yz = x * Math.sin(r.y) + xz * Math.cos(r.y)
  return {
    x: (yx * Math.cos(r.z) + xy * Math.sin(r.z)) / s.x,
    y: (-yx * Math.sin(r.z) + xy * Math.cos(r.z)) / s.y,
    z: yz / s.z,
  }
}

/** Transforma os oito cantos, com a mesma ordem Euler XYZ do motor. Sem dependência de Three. */
export function transformarVolume(
  volume: VolumeDeComposicao,
  transformacao: Transformacao,
): VolumeDeComposicao {
  const min = { x: Infinity, y: Infinity, z: Infinity },
    max = { x: -Infinity, y: -Infinity, z: -Infinity }
  for (const vx of [volume.min.x, volume.max.x])
    for (const vy of [volume.min.y, volume.max.y])
      for (const vz of [volume.min.z, volume.max.z]) {
        const q = transformarPonto({ x: vx, y: vy, z: vz }, transformacao)
        for (const e of ['x', 'y', 'z'] as const) {
          min[e] = Math.min(min[e], q[e])
          max[e] = Math.max(max[e], q[e])
        }
      }
  return { min, max }
}
