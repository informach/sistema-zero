/** As águas rasas das ilhas (o lago do Bosque): uma elipse no chão, onde se nada. */

/** A elipse de uma água rasa contém (x, z)? (`giro` é o da elipse no mundo.) */
export function dentroDaAgua(
  a: { x: number; z: number; raioX: number; raioZ: number; giro: number },
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
  return (lx / a.raioX) ** 2 + (lz / a.raioZ) ** 2 < 1
}
