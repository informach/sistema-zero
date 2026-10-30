import type { Salvamento } from '@sistemazero/arquipelago-contracts'

/** Arte existente. Lembranças não são comida ou ingredientes. A estrela fica na praia. */
export const CONCHAS_DA_PRAIA = [
  { id: 'concha-caracol', nome: 'Concha caracol', emoji: '🐚', x: 8, z: 25, observar: false },
  { id: 'concha-vieira', nome: 'Concha vieira', emoji: '🐚', x: 16, z: 20, observar: false },
  { id: 'concha-tigre', nome: 'Concha tigre', emoji: '🐚', x: 24, z: 9, observar: false },
  { id: 'concha-mexilhao', nome: 'Concha mexilhão', emoji: '🐚', x: -14, z: 22, observar: false },
  { id: 'concha-listrada', nome: 'Concha listrada', emoji: '🐚', x: -24, z: 8, observar: false },
  { id: 'estrela-do-mar', nome: 'Estrela-do-mar', emoji: '⭐', x: 11, z: 24, observar: true },
] as const

export const PEIXES_DA_PRAIA = [
  { id: 'peixe-sardinha', nome: 'Sardinha', emoji: '🐟' },
  { id: 'peixe-robalo', nome: 'Robalo', emoji: '🐟' },
  { id: 'peixe-garoupa', nome: 'Garoupa', emoji: '🐟' },
  { id: 'peixe-linguado', nome: 'Linguado', emoji: '🐟' },
  { id: 'peixe-voador', nome: 'Peixe-voador', emoji: '🐟' },
] as const

export const LEMBRANCAS_DA_PRAIA = [...CONCHAS_DA_PRAIA, ...PEIXES_DA_PRAIA]
export type LembrancaDaPraia = (typeof LEMBRANCAS_DA_PRAIA)[number]['id']

export function descobriuNaPraia(s: Salvamento, id: LembrancaDaPraia): boolean {
  return (s.inventario[id] ?? 0) > 0
}

/** Mesmo registro para mochila e álbum, sem duplicar progresso ou quantidade. */
export function registrarNaPraia(s: Salvamento, id: LembrancaDaPraia): Salvamento {
  if (descobriuNaPraia(s, id)) return s
  return { ...s, inventario: { ...s.inventario, [id]: 1 } }
}

/** O que falta pode ser conhecido em qualquer dia, sem sorte ou compra de isca. */
export function proximoPeixe(s: Salvamento): (typeof PEIXES_DA_PRAIA)[number] {
  return PEIXES_DA_PRAIA.find((p) => !descobriuNaPraia(s, p.id)) ?? PEIXES_DA_PRAIA[0]
}

export function colecaoDaPraia(s: Salvamento, grupo: 'conchas' | 'peixes') {
  return (grupo === 'conchas' ? CONCHAS_DA_PRAIA : PEIXES_DA_PRAIA).map((p) => ({
    id: p.id,
    nome: p.nome,
    encontrado: descobriuNaPraia(s, p.id),
    dica:
      grupo === 'conchas' ? 'Explore a areia da ilha central.' : 'Pesque no píer da ilha central.',
  }))
}

/** Alcance em três dimensões, para não recolher da água ou de outra altura. */
export function alcancaNaPraia(
  alvo: { x: number; y: number; z: number },
  pes: { x: number; y: number; z: number },
  doCentroAoPe = 0,
): boolean {
  return (
    Math.hypot(alvo.x - pes.x, alvo.z - pes.z) <= 1.4 &&
    Math.abs(alvo.y - (pes.y - doCentroAoPe)) <= 0.6
  )
}
