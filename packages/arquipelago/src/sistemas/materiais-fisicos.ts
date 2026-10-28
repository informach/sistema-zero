/**
 * O catálogo de materiais físicos do jogo (física viva, etapa 1): o que cada coisa pesa, quanto
 * escorrega, quanto quica e se boia. Os números são do jogo, não de tabela: o levantamento de física
 * avisa que um tronco oco não é um bloco maciço, e o que importa é a criança perceber a diferença
 * (a madeira boia com metade de fora, a pedra afunda). As etapas seguintes (vento, fogo) acrescentam
 * o que precisarem aqui.
 */

export interface MaterialFisico {
  /** kg por m³ (a água é 1000: abaixo disso boia). */
  densidade: number
  /** Atrito com o chão (o `friction` do colisor do Rapier). */
  atrito: number
  /** Quanto quica (o `restitution` do colisor do Rapier, de 0 a 1). */
  quique: number
}

export const MATERIAIS = {
  agua: { densidade: 1000, atrito: 0, quique: 0 },
  /** Tronco, tora, tábua: boia com metade de fora. */
  madeira: { densidade: 500, atrito: 0.7, quique: 0.1 },
  /** Pedra: afunda. */
  pedra: { densidade: 2500, atrito: 0.8, quique: 0.05 },
  /** Fardo de palha: leve, boia alto. */
  palha: { densidade: 150, atrito: 0.9, quique: 0.05 },
} as const satisfies Record<string, MaterialFisico>

export type NomeDoMaterial = keyof typeof MATERIAIS

/** A massa (kg) de um objeto de `volume` m³ do material. */
export function massaDe(material: NomeDoMaterial, volume: number): number {
  return MATERIAIS[material].densidade * volume
}

/** Boia na água? (densidade abaixo da dela). */
export function boia(material: NomeDoMaterial): boolean {
  return MATERIAIS[material].densidade < MATERIAIS.agua.densidade
}
