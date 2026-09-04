import { buildTemplateModel } from '../builders'
import type { MoldaTemplate } from '../catalog'

// Paleta Arcade: 2 vermelho · 5 amarelo · 9 ciano (vidro) · 15 preto (rodas).
// O carro anda no eixo z (a frente é +z). As rodas são cilindros deitados:
// nascem em pé (eixo y) e giram 90° em z; o pivô é o centro, então a caixa
// autorada é a caixa ANTES do giro (largura no y, diâmetro em x e z).
const RODA_LARGURA = 0.5
const RODA_RAIO = 1

function roda(name: string, x: number, z: number) {
  return {
    name,
    shape: 'cylinder' as const,
    from: [x - RODA_RAIO, 1 - RODA_LARGURA, z - RODA_RAIO] as [number, number, number],
    to: [x + RODA_RAIO, 1 + RODA_LARGURA, z + RODA_RAIO] as [number, number, number],
    color: 15,
    rotation: [0, 0, 90] as [number, number, number],
  }
}

export const carroTemplate: MoldaTemplate = {
  id: 'carro',
  suggestedName: 'carro',
  build() {
    return buildTemplateModel({
      name: 'carro',
      snap: 0.5,
      parts: [
        { name: 'chassi', from: [-2, 1, -4], to: [2, 2, 4], color: 2 },
        { name: 'cabine', from: [-1.5, 2, -2], to: [1.5, 3.5, 1], color: 2 },
        // Para-brisa: a rampa é cheia em z = 1 (a cabine) e cai a zero em z = 2.5 (o capô).
        { name: 'para-brisa', shape: 'wedge', from: [-1.5, 2, 1], to: [1.5, 3.5, 2.5], color: 9 },
        // Vidro de trás: a mesma rampa girada 180°, cheia junto da cabine.
        {
          name: 'vidro-tras',
          shape: 'wedge',
          from: [-1.5, 2, -3],
          to: [1.5, 3.5, -2],
          color: 9,
          rotation: [0, 180, 0],
        },
        roda('roda-frente-esq', -2.5, 2.5),
        roda('roda-frente-dir', 2.5, 2.5),
        roda('roda-tras-esq', -2.5, -2.5),
        roda('roda-tras-dir', 2.5, -2.5),
        { name: 'farol-esq', from: [-1.5, 1, 4], to: [-1, 1.5, 4.5], color: 5 },
        { name: 'farol-dir', from: [1, 1, 4], to: [1.5, 1.5, 4.5], color: 5 },
      ],
    })
  },
}
