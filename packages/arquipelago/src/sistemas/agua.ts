/** As águas rasas das ilhas (o lago do Bosque): uma elipse no chão, onde se nada. */

/** A elipse de uma água rasa contém (x, z)? (`giro` é o da elipse no mundo.) */
export function dentroDaAgua(
  a: {
    x: number
    z: number
    raioX: number
    raioZ: number
    giro: number
    contorno?: readonly { x: number; z: number }[]
  },
  x: number,
  z: number,
): boolean {
  const dx = x - a.x
  const dz = z - a.z
  const c = Math.cos(a.giro)
  const s = Math.sin(a.giro)
  // De volta ao referencial da elipse (o inverso do giro de `paraOMundo`).
  const lx = dx * c - dz * s
  const lz = dx * s + dz * c
  if (a.contorno) {
    let dentro = false
    const pts = a.contorno
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      const p = pts[i]!,
        q = pts[j]!
      if (p.z > lz !== q.z > lz && lx < ((q.x - p.x) * (lz - p.z)) / (q.z - p.z) + p.x)
        dentro = !dentro
    }
    return dentro
  }
  return (lx / a.raioX) ** 2 + (lz / a.raioZ) ** 2 < 1
}
