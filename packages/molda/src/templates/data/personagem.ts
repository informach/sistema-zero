import { buildTemplateModel } from '../builders'
import type { MoldaTemplate } from '../types'

// Paleta Arcade: 2 vermelho · 8 azul · 12 roxo escuro · 13 pele · 15 preto.
// A frente do boneco é +z (a vista "Frente" do palco); o rosto vai na face `pz`
// da cabeça, uma pele 8×8 (2 blocos × 4 texels).
const ROSTO = [
  '........',
  '........',
  '.ff..ff.',
  '.ff..ff.',
  '........',
  '.f....f.',
  '..ffff..',
  '........',
]

export const personagemTemplate: MoldaTemplate = {
  id: 'personagem',
  suggestedName: 'personagem',
  build() {
    return buildTemplateModel({
      name: 'personagem',
      snap: 0.5,
      parts: [
        { name: 'cabeca', from: [-1, 4, -1], to: [1, 6, 1], color: 13, faces: { pz: ROSTO } },
        { name: 'bone', from: [-1, 6, -1], to: [1, 6.5, 1.5], color: 2 },
        { name: 'corpo', from: [-1, 2, -0.5], to: [1, 4, 0.5], color: 8 },
        { name: 'braco-esq', from: [-1.5, 2, -0.5], to: [-1, 4, 0.5], color: 13 },
        { name: 'braco-dir', from: [1, 2, -0.5], to: [1.5, 4, 0.5], color: 13 },
        { name: 'perna-esq', from: [-1, 0, -0.5], to: [0, 2, 0.5], color: 12 },
        { name: 'perna-dir', from: [0, 0, -0.5], to: [1, 2, 0.5], color: 12 },
      ],
    })
  },
}
