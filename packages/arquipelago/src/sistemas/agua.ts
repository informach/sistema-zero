/** As águas rasas das ilhas (o lago do Bosque): uma elipse no chão, onde se nada. */
export type ConsultaNivelDaAgua = (x: number, z: number, raio?: number) => number | null

/** A elipse de uma água rasa contém (x, z)? (`giro` é o da elipse no mundo.) */
export function dentroDaAgua(
  a: {
    x: number
    z: number
    raioX: number
    raioZ: number
    giro: number
    contorno?: readonly { x: number; z: number }[]
    /** Cobertura compilada: rios, ilhas secas e fundos próprios usam a consulta canônica. */
    consultaNivel?: ConsultaNivelDaAgua
  },
  x: number,
  z: number,
): boolean {
  if (a.consultaNivel) return a.consultaNivel(x, z) !== null
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

/** Uma sonda circular toca a água? Não altera o teste pontual usado pelo movimento. */
export function discoTocaAgua(
  a: Parameters<typeof dentroDaAgua>[0],
  x: number,
  z: number,
  raio: number,
): boolean {
  if (a.consultaNivel) return a.consultaNivel(x, z, raio) !== null
  if (dentroDaAgua(a, x, z)) return true
  const dx = x - a.x,
    dz = z - a.z,
    c = Math.cos(a.giro),
    s = Math.sin(a.giro),
    lx = dx * c - dz * s,
    lz = dx * s + dz * c
  if (a.contorno) {
    const pts = a.contorno
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      const p = pts[j]!,
        q = pts[i]!,
        vx = q.x - p.x,
        vz = q.z - p.z,
        l2 = vx * vx + vz * vz
      const t = l2 === 0 ? 0 : Math.max(0, Math.min(1, ((lx - p.x) * vx + (lz - p.z) * vz) / l2))
      if (Math.hypot(lx - p.x - t * vx, lz - p.z - t * vz) <= raio) return true
    }
    return false
  }
  if (Math.abs(lx) > a.raioX + raio || Math.abs(lz) > a.raioZ + raio) return false
  // Ponto mais próximo da elipse por multiplicador de Lagrange; expandir seus raios
  // produziria outra curva e daria resposta incorreta junto às pontas alongadas.
  const rx2 = a.raioX * a.raioX,
    rz2 = a.raioZ * a.raioZ
  let baixo = 0,
    alto = a.raioX * Math.abs(lx) + a.raioZ * Math.abs(lz)
  for (let i = 0; i < 40; i++) {
    const t = (baixo + alto) / 2,
      f = ((a.raioX * lx) / (t + rx2)) ** 2 + ((a.raioZ * lz) / (t + rz2)) ** 2
    if (f > 1) baixo = t
    else alto = t
  }
  return Math.hypot(lx - (rx2 * lx) / (alto + rx2), lz - (rz2 * lz) / (alto + rz2)) <= raio + 1e-9
}
