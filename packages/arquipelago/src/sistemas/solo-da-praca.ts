import { ARTE_DA_FAISCA } from '../mundo/faisca/arte.generated'

const solo = ARTE_DA_FAISCA.pecas.praca_terra_14x14.solo
export const SOLOS_DE_CATALOGO = [
  { id: 'solo-da-praca', x: -6, z: 140, giro: 0, y: 4 - solo.minimo + 0.025 },
  { id: 'solo-da-horta', x: 28, z: 138, giro: Math.PI / 2, y: 4 - solo.minimo + 0.025 },
] as const
/** Os mesmos triângulos do chão artístico orientam os apoios de poço, móveis e vegetação. */
export function alturaDoSoloDaPraca(x: number, z: number): number | null {
  let alto = -Infinity
  for (const terreno of SOLOS_DE_CATALOGO) {
    const dx = x - terreno.x,
      dz = z - terreno.z,
      c = Math.cos(terreno.giro),
      sn = Math.sin(terreno.giro),
      lx = c * dx - sn * dz,
      lz = sn * dx + c * dz
    if (Math.abs(lx) > 7 || Math.abs(lz) > 7) continue
    for (const t of solo.triangulos) {
      const ax = t[0],
        az = t[2],
        bx = t[3],
        bz = t[5],
        cx = t[6],
        cz = t[8]
      const det = (bx - ax) * (cz - az) - (cx - ax) * (bz - az)
      if (Math.abs(det) < 1e-8) continue
      const u = ((lx - ax) * (cz - az) - (cx - ax) * (lz - az)) / det,
        v = ((bx - ax) * (lz - az) - (lx - ax) * (bz - az)) / det
      if (u >= -1e-7 && v >= -1e-7 && u + v <= 1 + 1e-7)
        alto = Math.max(alto, terreno.y + t[1] + u * (t[4] - t[1]) + v * (t[7] - t[1]))
    }
  }
  return Number.isFinite(alto) ? alto : null
}
export const TRIANGULOS_DA_PRACA = SOLOS_DE_CATALOGO.flatMap((terreno) =>
  solo.triangulos.map((t) => {
    const c = Math.cos(terreno.giro),
      s = Math.sin(terreno.giro)
    return [0, 3, 6].map((i) => ({
      x: terreno.x + c * t[i]! + s * t[i + 2]!,
      z: terreno.z - s * t[i]! + c * t[i + 2]!,
    }))
  }),
)
