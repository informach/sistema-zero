import { buildTemplateModel } from '../builders'
import type { MoldaTemplate } from '../types'

// Paleta Arcade: 2 vermelho (frutas) · 7 verde (copa) · 14 marrom (tronco).
// Copa = três bolas encavaladas; as frutinhas são bolas de 1 bloco na borda.
export const arvoreTemplate: MoldaTemplate = {
  id: 'arvore',
  suggestedName: 'arvore',
  build() {
    return buildTemplateModel({
      name: 'arvore',
      parts: [
        { name: 'tronco', shape: 'cylinder', from: [-1, 0, -1], to: [1, 4, 1], color: 14 },
        { name: 'copa', shape: 'sphere', from: [-3, 3, -3], to: [3, 9, 3], color: 7 },
        { name: 'copa-lado', shape: 'sphere', from: [0, 5, -4], to: [4, 9, 0], color: 7 },
        { name: 'copa-frente', shape: 'sphere', from: [-4, 4, 0], to: [-1, 7, 3], color: 7 },
        { name: 'fruta-1', shape: 'sphere', from: [1, 5, 2], to: [2, 6, 3], color: 2 },
        { name: 'fruta-2', shape: 'sphere', from: [-2, 6, -3], to: [-1, 7, -2], color: 2 },
        { name: 'fruta-3', shape: 'sphere', from: [3, 6, -1], to: [4, 7, 0], color: 2 },
      ],
    })
  },
}
