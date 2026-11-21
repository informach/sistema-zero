import type { Transformacao } from './documento'
import type { VolumeDeComposicao } from './volume'

/**
 * Inclinar com a encosta: o objeto apoiado no relevo toma a inclinação do chão debaixo dele.
 * O documento guarda o giro do próprio objeto (sem a encosta); a encosta é somada na hora de
 * resolver a transformação (palco, compilação, conferência), então mover o objeto ou mudar o
 * relevo leva a inclinação junto. Euler XYZ, como o resto do documento.
 */
type Giro = Transformacao['rotacao']
type Quaternion = readonly [number, number, number, number]

/** Encosta mais íngreme que isso vira um objeto deitado: o giro para aqui. */
export const INCLINACAO_MAXIMA = (35 * Math.PI) / 180

export function quaternionDoGiro(r: Giro): Quaternion {
  const c1 = Math.cos(r.x / 2),
    c2 = Math.cos(r.y / 2),
    c3 = Math.cos(r.z / 2)
  const s1 = Math.sin(r.x / 2),
    s2 = Math.sin(r.y / 2),
    s3 = Math.sin(r.z / 2)
  return [
    s1 * c2 * c3 + c1 * s2 * s3,
    c1 * s2 * c3 - s1 * c2 * s3,
    c1 * c2 * s3 + s1 * s2 * c3,
    c1 * c2 * c3 - s1 * s2 * s3,
  ]
}

export function giroDoQuaternion([x, y, z, w]: Quaternion): Giro {
  const m13 = 2 * (x * z + y * w)
  const ry = Math.asin(Math.max(-1, Math.min(1, m13)))
  return Math.abs(m13) < 0.9999999
    ? {
        x: Math.atan2(-2 * (y * z - x * w), 1 - 2 * (x * x + y * y)),
        y: ry,
        z: Math.atan2(-2 * (x * y - z * w), 1 - 2 * (y * y + z * z)),
      }
    : { x: Math.atan2(2 * (y * z + x * w), 1 - 2 * (x * x + z * z)), y: ry, z: 0 }
}

function multiplicar([ax, ay, az, aw]: Quaternion, [bx, by, bz, bw]: Quaternion): Quaternion {
  return [
    ax * bw + aw * bx + ay * bz - az * by,
    ay * bw + aw * by + az * bx - ax * bz,
    az * bw + aw * bz + ax * by - ay * bx,
    aw * bw - ax * bx - ay * by - az * bz,
  ]
}

/** A normal do chão num ponto, pelas alturas a `raio` metros para os quatro lados. */
export function normalDaEncosta(
  altura: (x: number, z: number) => number,
  x: number,
  z: number,
  raio: number,
): { x: number; y: number; z: number } {
  const dx = (altura(x + raio, z) - altura(x - raio, z)) / (2 * raio)
  const dz = (altura(x, z + raio) - altura(x, z - raio)) / (2 * raio)
  if (![dx, dz].every(Number.isFinite)) return { x: 0, y: 1, z: 0 }
  const tamanho = Math.hypot(dx, 1, dz)
  return { x: -dx / tamanho, y: 1 / tamanho, z: -dz / tamanho }
}

/** O giro que leva o "para cima" do objeto até a normal, limitado a `maximo`. */
export function giroDaNormal(
  n: { x: number; y: number; z: number },
  maximo = INCLINACAO_MAXIMA,
): Giro {
  // Eixo = (0,1,0) × n; ângulo = entre os dois.
  const eixoX = n.z,
    eixoZ = -n.x,
    seno = Math.hypot(eixoX, eixoZ)
  if (seno < 1e-9) return { x: 0, y: 0, z: 0 }
  const angulo = Math.min(Math.atan2(seno, n.y), maximo)
  const s = Math.sin(angulo / 2)
  return giroDoQuaternion([(eixoX / seno) * s, 0, (eixoZ / seno) * s, Math.cos(angulo / 2)])
}

/** O giro do objeto já inclinado pela encosta (a encosta por fora, no mundo). */
export function comEncosta(giro: Giro, encosta: Giro): Giro {
  return giroDoQuaternion(multiplicar(quaternionDoGiro(encosta), quaternionDoGiro(giro)))
}

/** O contrário: do giro visto no mundo (inclinado) ao giro guardado no documento. */
export function semEncosta(giroNoMundo: Giro, encosta: Giro): Giro {
  const [x, y, z, w] = quaternionDoGiro(encosta)
  return giroDoQuaternion(multiplicar([-x, -y, -z, w], quaternionDoGiro(giroNoMundo)))
}

/** Até onde medir o chão: metade do lado menor da base, entre 25 cm e 4 m. */
export function raioDaEncosta(
  volume: VolumeDeComposicao | null | undefined,
  escala: Transformacao['escala'],
): number {
  if (!volume) return 0.5
  const meioX = ((volume.max.x - volume.min.x) / 2) * Math.abs(escala.x),
    meioZ = ((volume.max.z - volume.min.z) / 2) * Math.abs(escala.z)
  const lado = Math.min(meioX, meioZ)
  return Number.isFinite(lado) ? Math.min(4, Math.max(0.25, lado)) : 0.5
}
