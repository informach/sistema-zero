import { buildTemplateModel } from '../builders'
import type { MoldaTemplate } from '../catalog'

// Paleta Arcade: 2 vermelho (telhado) · 9 ciano (vidro) · 11 lilás (chaminé) ·
// 13 bege (paredes) · 14 marrom (porta). A frente da casa é +z.
// Telhado de duas águas = duas rampas: a da frente é cheia em z = 0 e cai a
// zero em z = 3.5; a de trás é a mesma rampa girada 180° (cheia em z = 0, cai
// para z = -3.5). As duas se encontram na cumeeira, ao longo de x.
export const casaTemplate: MoldaTemplate = {
  id: 'casa',
  suggestedName: 'casa',
  build() {
    return buildTemplateModel({
      name: 'casa',
      snap: 0.5,
      parts: [
        { name: 'paredes', from: [-4, 0, -3], to: [4, 4, 3], color: 13 },
        { name: 'telhado-frente', shape: 'wedge', from: [-4.5, 4, 0], to: [4.5, 7, 3.5], color: 2 },
        {
          name: 'telhado-tras',
          shape: 'wedge',
          from: [-4.5, 4, -3.5],
          to: [4.5, 7, 0],
          color: 2,
          rotation: [0, 180, 0],
        },
        { name: 'porta', from: [-1, 0, 3], to: [1, 3, 3.5], color: 14 },
        { name: 'janela-esq', from: [-3.5, 1.5, 3], to: [-2, 3, 3.5], color: 9 },
        { name: 'janela-dir', from: [2, 1.5, 3], to: [3.5, 3, 3.5], color: 9 },
        { name: 'chamine', from: [2, 5, -2], to: [3, 8, -1], color: 11 },
      ],
    })
  },
}
