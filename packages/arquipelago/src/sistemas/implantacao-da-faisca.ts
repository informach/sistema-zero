/** Volumes de estudo do Gate 2. Não são itens do inventário nem atividades prontas. */
export const VOLUMES_DA_VILA = [
  { id: 'quadro', x: -10, z: 137, largura: 1.9, profundidade: 0.9, altura: 1.8 },
  { id: 'descanso', x: -10, z: 147, largura: 2.5, profundidade: 0.8, altura: 1 },
  { id: 'correio', x: -21, z: 125.6, largura: 2.6, profundidade: 0.8, altura: 1 },
  { id: 'lacre', x: -46, z: 125, largura: 6, profundidade: 0.35, altura: 1.6 },
  { id: 'bancada', x: -42.5, z: 114, largura: 2.4, profundidade: 1, altura: 0.9 },
  { id: 'pausa-lago', x: 43, z: 145, largura: 2.5, profundidade: 0.8, altura: 1 },
  { id: 'pausa-encosta', x: -31, z: 103, largura: 2.5, profundidade: 0.8, altura: 1 },
] as const

export function sobreVolumeDaVila(p: { x: number; z: number }, raio: number): boolean {
  return VOLUMES_DA_VILA.some(
    (v) =>
      Math.abs(p.x - v.x) < v.largura / 2 + raio && Math.abs(p.z - v.z) < v.profundidade / 2 + raio,
  )
}

export const SOLOS_DA_FAISCA = [
  { id: 'convivio', x: -4, z: 140, rx: 12, rz: 8, cor: '#c4ab7b' },
  { id: 'correio', x: -17, z: 126, rx: 6, rz: 4, cor: '#b9a27a' },
  { id: 'patio', x: -42, z: 124, rx: 13, rz: 9, cor: '#ab9470' },
  { id: 'horta', x: 29, z: 138, rx: 11, rz: 11, cor: '#aa996d' },
  { id: 'costa', x: 22, z: 164, rx: 9, rz: 16, cor: '#dac693' },
  { id: 'farol', x: -3, z: 104, rx: 12, rz: 10, cor: '#c2b087' },
  { id: 'encosta', x: -31, z: 103, rx: 5, rz: 4, cor: '#c2ad80' },
  { id: 'margem-sul', x: 58, z: 134, rx: 4.6, rz: 3.8, cor: '#bbac85' },
  { id: 'margem-norte', x: 58, z: 120, rx: 4.6, rz: 3.8, cor: '#bbac85' },
] as const

/** Distância ao eixo das rotas, para deixar passagens e vistas livres ao compor grupos. */
export function distanciaAosCaminhos(
  p: { x: number; z: number },
  rotas: readonly { pontos: readonly { x: number; z: number }[] }[],
): number {
  let menor = Infinity
  for (const r of rotas)
    for (let i = 1; i < r.pontos.length; i++) {
      const a = r.pontos[i - 1]!,
        b = r.pontos[i]!
      const dx = b.x - a.x,
        dz = b.z - a.z
      const t = Math.max(
        0,
        Math.min(1, ((p.x - a.x) * dx + (p.z - a.z) * dz) / (dx * dx + dz * dz || 1)),
      )
      menor = Math.min(menor, Math.hypot(p.x - a.x - t * dx, p.z - a.z - t * dz))
    }
  return menor
}
