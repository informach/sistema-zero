import { ARTE_DA_FAISCA } from '../mundo/faisca/arte.generated'
import {
  BASE_DA_OFICINA,
  BASE_DO_FAROL,
  LUGAR_DA_FAISCA as L,
  ligarCabeceiras,
  PATAMARES_DA_FAISCA,
  ROTAS_DA_FAISCA,
} from './faisca'
import { ARQUIPELAGO, conexaoDaIlha } from './geografia-do-arquipelago'
import { distanciaAosCaminhos, sobreVolumeDaVila } from './implantacao-da-faisca'

export interface PecaNaFaisca {
  id: string
  peca: string
  x: number
  z: number
  giro: number
  escala: number
  solida?: 'caixa' | 'tronco' | 'ponte' | 'malha'
  altura?: number
  deslocamentoY?: number
  apoio?: string
  raioDoTronco?: number
}
export const COMPOSICAO_DA_FAISCA: PecaNaFaisca[] = []
function por(id: string, peca: string, x: number, z: number, op: Partial<PecaNaFaisca> = {}) {
  COMPOSICAO_DA_FAISCA.push({ id, peca, x, z, giro: 0, escala: 1, ...op })
}
// O lote da Morada fica reservado; estas são casas de vizinhos, nunca a casa do aluno.
por('vizinho-oeste', 'casa_01_pacote', -16, 144, { escala: 0.45, solida: 'caixa' })
por(
  'vizinho-leste',
  'casa_01_pacote',
  PATAMARES_DA_FAISCA.vizinhoLeste.x,
  PATAMARES_DA_FAISCA.vizinhoLeste.z,
  { escala: 0.45, giro: Math.PI, solida: 'caixa' },
)
por('correio', 'casa_01_pacote', PATAMARES_DA_FAISCA.correio.x, PATAMARES_DA_FAISCA.correio.z, {
  escala: 0.4,
  solida: 'caixa',
})
por('oficina', 'casa_01_pacote', BASE_DA_OFICINA.x, BASE_DA_OFICINA.z, {
  escala: 0.7,
  solida: 'caixa',
})
por('poco', 'poco_manivela_baixa', -6, 143, { solida: 'caixa' })
por('farol', 'farol_01_pacote', BASE_DO_FAROL.x, BASE_DO_FAROL.z, { solida: 'caixa' })
por('moinho', 'moinho_01_pacote', PATAMARES_DA_FAISCA.moinho.x, PATAMARES_DA_FAISCA.moinho.z, {
  escala: 0.6,
  solida: 'caixa',
})
por('moinho-pas', 'moinho_pas_01_pacote', -24, 87.9, {
  escala: 0.6,
  deslocamentoY: 5.3,
  apoio: 'moinho',
})
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
por('bancada-caixa', 'caixote_pequeno', -44, 112, { solida: 'caixa' })
por('encomenda-1', 'caixote_pequeno', -22.5, 123.5, { solida: 'caixa', escala: 0.7 })
por('encomenda-2', 'caixote_pequeno', -22.5, 122.3, { solida: 'caixa', escala: 0.6 })
por('pecas-recolhidas', 'caixote_medio', -51.5, 126, { solida: 'caixa' })
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
  [-26, 151],
  [-29, 146],
  [-19, 154],
  [-22, 155],
  [-26, 111],
  [-29, 110],
  [-24, 108],
  [-10, 130],
  [-8, 128],
  [-12, 127],
  [34, 123],
  [38, 124],
  [35, 119],
  [45, 154],
  [49, 156],
  [50, 151],
  [55, 156],
  [70, 138],
  [72, 134],
  [69, 143],
  [72, 118],
  [74, 113],
  [70, 111],
  [-56, 139],
  [-60, 138],
  [-58, 142],
  [-64, 123],
  [-67, 126],
  [-65, 120],
  [-58, 100],
  [-62, 104],
  [-15, 112],
  [18, 104],
  [24, 102],
  [21, 109],
  [32, 99],
  [36, 103],
  [-37, 143],
  [-23, 180],
  [26, 181],
].filter(([x, z]) => distanciaAosCaminhos({ x: x!, z: z! }, ROTAS_DA_FAISCA) > 3.3)
arvores.forEach(([x, z], i) => {
  por(
    `arvore-${i}`,
    i % 3 === 0 ? 'arvore_duas_copas' : i % 2 ? 'arvore_redonda_02' : 'arvore_redonda_01',
    x!,
    z!,
    { giro: i * 1.23, solida: 'tronco' },
  )
})
const grupos = [
  [-21, 149, 4],
  [-9, 131, 3],
  [9, 130, 3],
  [-27, 118, 4],
  [-33, 109, 4],
  [-39, 90, 4],
  [13, 92, 5],
  [40, 141, 3],
  [47, 134, 3],
  [68, 134, 3],
  [67, 120, 3],
  [48, 119, 3],
  [15, 166, 2.4],
  [29, 174, 3],
  [-14, 151, 2.5],
] as const
grupos.forEach(([cx, cz, raio], g) => {
  for (let i = 0; i < 14; i++) {
    const a = i * 2.399 + g * 0.73,
      r = raio * Math.sqrt((i + 0.7) / 14),
      x = cx + Math.cos(a) * r,
      z = cz + Math.sin(a) * r
    if (distanciaAosCaminhos({ x, z }, ROTAS_DA_FAISCA) < 2.2 || sobreVolumeDaVila({ x, z }, 1.1))
      continue
    if (x > -14 && x < 14 && z > 152 && z < 180) continue
    const tipo =
      i % 4 === 0 ? 'arbusto_redondo_02' : i % 3 === 0 ? 'flor_margarida_branca' : 'tufo_grama'
    por(`borda-${g}-${i}`, tipo, x, z, {
      escala: tipo === 'arbusto_redondo_02' ? 0.5 : 0.65,
      giro: a,
    })
  }
})
// Abertura da Costa: a cerca começa além da passagem, sem convidar a atravessar tábuas.
const circulacao = [
  ...ROTAS_DA_FAISCA,
  ...ligarCabeceiras(ARQUIPELAGO.slice(1).map((i) => conexaoDaIlha(i.id))),
]
for (let i = 0; i < 10; i++) {
  const x = 29 + i * 3.5,
    z = 158
  if (distanciaAosCaminhos({ x, z }, circulacao) > 4.2)
    por(`cerca-${i}`, 'cerca_tabuas_3_5m', x, z, { giro: 0, solida: 'caixa' })
}
for (let i = 0; i < 8; i++) {
  if (Math.abs(Math.cos(i * 0.8) * 11) < 3.2) continue
  por(`pedra-${i}`, 'rocha_pequena', 58 + Math.cos(i * 0.8) * 11, 127 + Math.sin(i * 0.8) * 7, {
    escala: 0.7,
    giro: i,
    solida: 'caixa',
  })
}
// Apoios laterais das cabeceiras. Nunca ocupam o piso já validado da ponte.
for (const z of [120.4, 133.6])
  for (const lado of [-1, 1])
    por(`apoio-${z}-${lado}`, 'rocha_pequena', 58 + lado * 3.1, z, {
      escala: 0.65,
      giro: lado,
      solida: 'caixa',
    })
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
  if (sobreVolumeDaVila(p, raio)) return false
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
