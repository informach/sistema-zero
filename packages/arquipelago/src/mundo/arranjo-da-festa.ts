import type { Festa } from '../sistemas/festas'
import type { ColisorDaIlha } from './colisores-da-ilha'

export interface PecaDaFesta {
  id: string
  nos: readonly string[]
  posicao: [number, number, number]
  giro?: number
  clipe?: string
  varal?: number
  caixa?: [number, number, number]
}
/** O catálogo da Vila não traz âncoras de festa. O gramado sul deixa lojas e chegada livres. */
export const FOGUEIRA_DA_FESTA = { x: 6.8, y: 1, z: 7 }
export const PECAS_DAS_FESTAS: Record<Festa, readonly PecaDaFesta[]> = {
  junina: [
    {
      id: 'fogueira',
      nos: ['fogueira', 'fogo'],
      posicao: [6.8, 1, 7],
      clipe: 'crepitar',
      caixa: [0.7, 0.33, 0.68],
    },
    {
      id: 'pescaria',
      nos: ['barraca-pescaria'],
      posicao: [-1, 1, 9.5],
      giro: Math.PI,
      caixa: [0.91, 1.12, 0.57],
    },
    {
      id: 'milho',
      nos: ['barraca-milho'],
      posicao: [1.5, 1, 9.5],
      giro: Math.PI,
      caixa: [0.91, 1.12, 0.55],
    },
    {
      id: 'suco',
      nos: ['barraca-suco'],
      posicao: [4, 1, 9.5],
      giro: Math.PI,
      caixa: [0.91, 1.12, 0.55],
    },
    { id: 'bandeiras', nos: ['bandeirinhas'], posicao: [-1, 4.5, 9.5], varal: 3 },
    { id: 'balao', nos: ['balao'], posicao: [6.8, 5.5, 7] },
  ],
  carnaval: [
    {
      id: 'carro',
      nos: ['carro-alegorico', 'sol-do-carro'],
      posicao: [1.5, 1, 9.5],
      clipe: 'girar',
      caixa: [0.91, 1.17, 0.55],
    },
    { id: 'confetes', nos: ['confetes'], posicao: [6.8, 1.01, 7] },
    { id: 'serpentinas', nos: ['serpentinas'], posicao: [4, 1.01, 9.5] },
    { id: 'mascaras', nos: ['mascaras'], posicao: [-1, 3.5, 9.5] },
    { id: 'faixas', nos: ['faixas'], posicao: [1.5, 4, 9.5] },
  ],
  lanternas: [
    { id: 'vermelha', nos: ['lanterna-vermelha'], posicao: [-1, 3.5, 9.5] },
    { id: 'amarela', nos: ['lanterna-amarela'], posicao: [1.5, 3.5, 9.5] },
    { id: 'azul', nos: ['lanterna-azul'], posicao: [4, 3.5, 9.5] },
    { id: 'flutuante', nos: ['lanterna-flutuante'], posicao: [6.8, 2.5, 7], clipe: 'flutuar' },
    { id: 'varal', nos: ['varal-de-luzes'], posicao: [-1, 4.3, 9.5], varal: 3 },
  ],
  'fim-de-ano': [
    {
      id: 'palmeira',
      nos: ['palmeira-enfeitada'],
      posicao: [1.5, 1, 9.5],
      caixa: [0.3, 0.85, 0.3],
    },
    { id: 'ceia', nos: ['mesa-da-ceia'], posicao: [4, 1, 9.5], caixa: [0.76, 0.55, 0.48] },
    {
      id: 'fogos',
      nos: ['fogos', 'foguete', 'estouro'],
      posicao: [6.8, 1, 7],
      clipe: 'estourar',
      caixa: [0.13, 0.16, 0.13],
    },
  ],
}

export function colisoresDaFesta(festa: Festa): ColisorDaIlha[] {
  return PECAS_DAS_FESTAS[festa].flatMap((p) =>
    p.caixa
      ? [
          {
            forma: 'caixa' as const,
            nome: `col-festa-${p.id}`,
            meio: p.caixa,
            posicao: [p.posicao[0], p.posicao[1] + p.caixa[1], p.posicao[2]] as [
              number,
              number,
              number,
            ],
            rotacao: [0, Math.sin((p.giro ?? 0) / 2), 0, Math.cos((p.giro ?? 0) / 2)] as [
              number,
              number,
              number,
              number,
            ],
          },
        ]
      : [],
  )
}
