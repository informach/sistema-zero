import { ARTE_DA_FAISCA } from '../mundo/faisca/arte.generated'
import { BASE_DA_OFICINA, BASE_DO_FAROL, LUGAR_DA_FAISCA as L } from './faisca'

export interface PecaNaFaisca {
  id: string
  peca: string
  x: number
  z: number
  giro: number
  escala: number
  solida?: 'caixa' | 'tronco' | 'ponte'
  altura?: number
  deslocamentoY?: number
}
export const COMPOSICAO_DA_FAISCA: PecaNaFaisca[] = []
function por(id: string, peca: string, x: number, z: number, op: Partial<PecaNaFaisca> = {}) {
  COMPOSICAO_DA_FAISCA.push({ id, peca, x, z, giro: 0, escala: 1, ...op })
}
// O lote da Morada fica reservado; estas são casas de vizinhos, nunca a casa do aluno.
por('vizinho-oeste', 'casa_01_pacote', -16, 144, { escala: 0.45, solida: 'caixa' })
por('vizinho-leste', 'casa_01_pacote', 13, 124, { escala: 0.45, giro: Math.PI, solida: 'caixa' })
por('correio', 'casa_01_pacote', -17, 123, { escala: 0.4, solida: 'caixa' })
por('oficina', 'casa_01_pacote', BASE_DA_OFICINA.x, BASE_DA_OFICINA.z, {
  escala: 0.7,
  solida: 'caixa',
})
por('poco', 'poco_manivela_baixa', -6, 143, { solida: 'caixa' })
por('farol', 'farol_01_pacote', BASE_DO_FAROL.x, BASE_DO_FAROL.z, { solida: 'caixa' })
por('moinho', 'moinho_01_pacote', -24, 92, { escala: 0.6, solida: 'caixa' })
por('moinho-pas', 'moinho_pas_01_pacote', -24, 87.9, { escala: 0.6, deslocamentoY: 5.3 })
// Piso medido no GLB: aproximadamente 0,53–0,69 m acima da origem; entrada alinhada ao chão de 4 m.
por('ponte-lago', 'ponte_04_pacote', L.lago.x, L.lago.z, { solida: 'ponte', altura: 3.45 })
for (let i = 0; i < 6; i++)
  por(`canteiro-${i}`, 'canteiro_horta', 24 + (i % 2) * 5.5, 133 + Math.floor(i / 2) * 4.8, {
    solida: 'caixa',
  })
for (const [i, x, z] of [
  [0, -30, 128],
  [1, -35, 125],
  [2, -36, 119],
  [3, -53, 127],
] as const)
  por(`caixa-${i}`, 'caixote_medio', x, z, { solida: 'caixa' })
por('barril', 'barril_em_pe', -30, 126, { solida: 'caixa' })
por('bancada-caixa', 'caixote_pequeno', -38, 115, { solida: 'caixa' })
for (const [i, x, z] of [
  [0, -9, 142],
  [1, 16, 142],
  [2, -22, 129],
  [3, 20, 128],
] as const)
  por(`lampiao-${i}`, 'lampiao_01_pacote', x, z, { escala: 0.55 })
for (const [i, x, z] of [
  [0, 5, 140],
  [1, 16, 139],
  [2, -20, 135],
  [3, -7, 120],
  [4, 35, 143],
  [5, 22, 166],
] as const)
  por(`placa-${i}`, 'placa_seta', x, z, { giro: i % 2 ? Math.PI / 2 : -Math.PI / 2 })
const arvores = [
  [-29, 150],
  [-24, 110],
  [32, 121],
  [43, 155],
  [48, 146],
  [55, 156],
  [63, 148],
  [68, 138],
  [72, 116],
  [-54, 139],
  [-63, 124],
  [-58, 101],
  [-14, 112],
  [18, 105],
  [33, 100],
  [-37, 142],
  [-12, 178],
  [25, 178],
]
arvores.forEach(([x, z], i) => {
  por(
    `arvore-${i}`,
    i % 3 === 0 ? 'arvore_duas_copas' : i % 2 ? 'arvore_redonda_02' : 'arvore_redonda_01',
    x!,
    z!,
    { giro: i * 1.23, solida: 'tronco' },
  )
})
for (let i = 0; i < 36; i++) {
  const lado = i % 2 ? 1 : -1,
    x = lado * (29 + (i % 6) * 5.4),
    z = 114 + Math.floor(i / 6) * 9
  por(`arbusto-${i}`, 'arbusto_redondo_02', x, z, { escala: 0.65, giro: i })
  if (i % 2 === 0) por(`flor-${i}`, 'flor_margarida_branca', x + 1.5, z + 1.3, { escala: 0.7 })
}
for (let i = 0; i < 12; i++) por(`cerca-${i}`, 'cerca_tabuas_3_5m', 20 + i * 3.5, 158, { giro: 0 })
for (let i = 0; i < 8; i++) {
  if (Math.abs(Math.cos(i * 0.8) * 11) < 3.2) continue
  por(`pedra-${i}`, 'rocha_pequena', 58 + Math.cos(i * 0.8) * 11, 127 + Math.sin(i * 0.8) * 7, {
    escala: 0.7,
    giro: i,
    solida: 'caixa',
  })
}
// Coelha-base: o estudo da Íris recebe depois acessórios e gestos do capítulo.
export const IRIS_DE_ESTUDO = {
  peca: 'coelho',
  x: 19,
  z: 133,
  alturaDosOlhos: 0.65,
  raio: 1.7,
} as const

/** Retomar no terreno sob uma caixa ou ponte colocaria o avatar dentro do objeto. */
export function pontoLivreParaRetomar(p: { x: number; z: number }, raio: number): boolean {
  for (const o of COMPOSICAO_DA_FAISCA) {
    if (!o.solida) continue
    const dx = p.x - o.x,
      dz = p.z - o.z
    if (o.solida === 'tronco') {
      if (Math.hypot(dx, dz) < 0.23 * o.escala + raio) return false
      continue
    }
    const box = ARTE_DA_FAISCA.pecas[o.peca as keyof typeof ARTE_DA_FAISCA.pecas].colisao[0]
    const x = Math.cos(o.giro) * dx - Math.sin(o.giro) * dz,
      z = Math.sin(o.giro) * dx + Math.cos(o.giro) * dz,
      s = o.escala
    if (
      x > box.min[0] * s - raio &&
      x < box.max[0] * s + raio &&
      z > box.min[2] * s - raio &&
      z < box.max[2] * s + raio
    )
      return false
  }
  return true
}
