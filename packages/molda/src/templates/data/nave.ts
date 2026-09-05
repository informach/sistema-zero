import { buildTemplateModel } from '../builders'
import type { MoldaTemplate } from '../catalog'

// Paleta Arcade: 1 branco (casco) · 2 vermelho (asas, bico, nadadeira) ·
// 6 azul-petróleo (motores) · 9 ciano (cabine). O bico aponta para +z.
// O bico e a nadadeira são rampas: cheias num lado e caindo a zero no outro.
// Os motores são cilindros deitados (giro de 90° em x: o eixo y vira z).
export const naveTemplate: MoldaTemplate = {
  id: 'nave',
  suggestedName: 'nave',
  build() {
    return buildTemplateModel({
      name: 'nave',
      snap: 0.5,
      parts: [
        { name: 'casco', from: [-1, 1, -3], to: [1, 3, 3], color: 1 },
        { name: 'bico', shape: 'wedge', from: [-1, 1, 3], to: [1, 3, 5], color: 2 },
        { name: 'asa-esq', from: [-4, 1.5, -3], to: [-1, 2, 0], color: 2 },
        { name: 'asa-dir', from: [1, 1.5, -3], to: [4, 2, 0], color: 2 },
        {
          name: 'motor-esq',
          shape: 'cylinder',
          from: [-1, 1.5, -4],
          to: [0, 2.5, -3],
          color: 6,
          rotation: [90, 0, 0],
        },
        {
          name: 'motor-dir',
          shape: 'cylinder',
          from: [0, 1.5, -4],
          to: [1, 2.5, -3],
          color: 6,
          rotation: [90, 0, 0],
        },
        { name: 'cabine', shape: 'sphere', from: [-0.5, 2.5, 0], to: [0.5, 3.5, 1], color: 9 },
        { name: 'nadadeira', shape: 'wedge', from: [-0.5, 3, -3], to: [0.5, 4.5, -1], color: 2 },
      ],
    })
  },
}
