/**
 * O enquadramento do retrato do avatar na HUD, o mesmo da foto de rosto da plataforma
 * (`member-shell/.../avatar3d/photo-framing.ts`, "Salvar"): a cabeça e o começo dos ombros (os
 * 45% de cima do corpo) ocupam 80% do quadrado, de frente, com a câmera de 45 graus medida do
 * plano da frente do personagem (nariz, cabelo e aba ficam à frente do centro). Tudo no
 * referencial do avatar, que olha para +z.
 */
export const RETRATO = { campo: 45, ocupa: 0.8, parteDeCima: 0.45, lado: 128 } as const

export interface CaixaDoAvatar {
  min: { x: number; y: number; z: number }
  max: { x: number; y: number; z: number }
}

export function enquadrarRetrato(caixa: CaixaDoAvatar) {
  const altura = Math.max(0.001, caixa.max.y - caixa.min.y)
  const regiao = altura * RETRATO.parteDeCima
  const meioY = caixa.max.y - regiao / 2
  const x = (caixa.min.x + caixa.max.x) / 2
  const z = (caixa.min.z + caixa.max.z) / 2
  const distancia = regiao / (2 * Math.tan((RETRATO.campo * Math.PI) / 360) * RETRATO.ocupa)
  return {
    posicao: { x, y: meioY, z: caixa.max.z + distancia },
    alvo: { x, y: meioY, z },
  }
}
