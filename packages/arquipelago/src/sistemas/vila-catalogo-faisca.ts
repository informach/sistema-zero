import type { PecaNaFaisca } from './composicao-faisca'

/** Casas reais do acervo Fantasy/Cidade. São cenários estáticos; nunca a Morada do aluno. */
export const CASAS_DA_VILA = [
  {
    id: 'vizinho-oeste',
    x: -14,
    z: 128,
    giro: 0.8,
    peca: 'casa_vila_fantasia_pacote',
    escala: 0.75,
  },
  { id: 'correio', x: -7, z: 123, giro: 0.22, peca: 'casa_estreita_enxaimel', escala: 0.45 },
  {
    id: 'casa-dos-jardins',
    x: 2.5,
    z: 123,
    giro: -0.15,
    peca: 'casinha_telhado_vermelho',
    escala: 0.55,
  },
  {
    id: 'vizinho-leste',
    x: 10,
    z: 130,
    giro: -0.62,
    peca: 'casa_vila_fantasia_pacote',
    escala: 0.7,
  },
] as const

export function casasDaVila(): PecaNaFaisca[] {
  return CASAS_DA_VILA.map((c) => ({
    id: `${c.id}-piso`,
    peca: c.peca,
    x: c.x,
    z: c.z,
    giro: c.giro,
    escala: c.escala,
    solida: 'caixa',
  }))
}
