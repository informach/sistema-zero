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
  /** Só materiais combustíveis. Números do jogo, em segundos e unidades de calor. */
  fogo?: { ignicao: number; calor: number; duracao: number; secagem: number }
}

export const MATERIAIS = {
  agua: { densidade: 1000, atrito: 0, quique: 0 },
  /** Tronco, tora, tábua: boia com metade de fora. */
  madeira: {
    densidade: 500,
    atrito: 0.7,
    quique: 0.1,
    fogo: { ignicao: 5, calor: 4, duracao: 45, secagem: 30 },
  },
  /** Pedra: afunda. */
  pedra: { densidade: 2500, atrito: 0.8, quique: 0.05 },
  /** Fardo de palha: leve, boia alto. */
  palha: {
    densidade: 150,
    atrito: 0.9,
    quique: 0.05,
    fogo: { ignicao: 1, calor: 6, duracao: 18, secagem: 12 },
  },
  /** A pista do escorregador: lisa (quem escorrega desce sozinho) e boia. */
  plastico: { densidade: 950, atrito: 0.3, quique: 0.2 },
  /** O gelo da trilha do Pico, debaixo do trenó: quase sem atrito (o trenó desce sozinho). */
  gelo: { densidade: 917, atrito: 0.05, quique: 0.1 },
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
