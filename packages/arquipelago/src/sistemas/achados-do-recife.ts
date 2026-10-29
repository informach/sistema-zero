import type { Salvamento } from '@sistemazero/arquipelago-contracts'

export const ACHADOS_DO_RECIFE = {
  bau: {
    nome: 'Baú do navio',
    acao: 'Guardar o baú do navio',
    noAlbum: 'O baú do navio entrou no álbum.',
    dica: 'No porão do navio afundado.',
    diversao: 15,
  },
  pagina: {
    nome: 'Página do Recife',
    acao: 'Guardar a página do Recife',
    noAlbum: null,
    dica: 'No cesto sob a vela caída do navio.',
    diversao: 0,
  },
  tesouro: {
    nome: 'Pérolas do labirinto',
    acao: 'Guardar as pérolas do labirinto',
    noAlbum: 'As pérolas do labirinto entraram no álbum.',
    dica: 'Na gruta do labirinto de corais.',
    diversao: 15,
  },
} as const
export type AchadoDoRecife = keyof typeof ACHADOS_DO_RECIFE

export function guardarAchadoDoRecife(s: Salvamento, achado: AchadoDoRecife): Salvamento {
  if (s.recife[achado]) return s
  return {
    ...s,
    recife: { ...s.recife, [achado]: true },
    necessidades: {
      ...s.necessidades,
      diversao: Math.min(100, s.necessidades.diversao + ACHADOS_DO_RECIFE[achado].diversao),
    },
  }
}
