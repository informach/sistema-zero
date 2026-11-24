import { ARTE_DA_FAISCA } from '../mundo/faisca/arte.generated'
import { ESCADAS_DA_COLINA } from './colina-da-faisca'
import { BASE_DO_FAROL, LUGAR_DA_FAISCA as L, PATAMARES_DA_FAISCA, ROTAS_DA_FAISCA } from './faisca'
import { distanciaAosCaminhos, sobreVolumeDaVila } from './implantacao-da-faisca'
import { LAGO_DA_FAISCA, pontoNoContorno } from './lago-da-faisca'
import { SOLOS_DE_CATALOGO } from './solo-da-praca'
import { casasDaVila } from './vila-catalogo-faisca'

export interface PecaNaFaisca {
  id: string
  peca: string
  x: number
  z: number
  giro: number
  escala: number
  solida?: 'caixa' | 'tronco' | 'ponte' | 'escada' | 'malha' | 'solo'
  altura?: number
  deslocamentoY?: number
  apoio?: string
  raioDoTronco?: number
  /** Fração da altura enterrada, para rochas assentadas como afloramentos. */
  enterrada?: number
  sinal?: { texto: string; destino: keyof typeof L; via: { x: number; z: number } }
}
export const COMPOSICAO_DA_FAISCA: PecaNaFaisca[] = [...casasDaVila(), ...ESCADAS_DA_COLINA]
function por(id: string, peca: string, x: number, z: number, op: Partial<PecaNaFaisca> = {}) {
  COMPOSICAO_DA_FAISCA.push({ id, peca, x, z, giro: 0, escala: 1, ...op })
}
for (const solo of SOLOS_DE_CATALOGO)
  por(solo.id, 'praca_terra_14x14', solo.x, solo.z, {
    altura: solo.y,
    giro: solo.giro,
    solida: 'solo',
  })

// O poço articula o espaço comum; a circulação principal passa a leste dele.
por('poco', 'poco_manivela_baixa', -3.7, 141, { solida: 'caixa' })
por('correio-caixa', 'morada_caixa_correio', -9.2, 126.4, { escala: 0.8, solida: 'caixa' })
por('correio-aberto', 'caixote_aberto', -6.2, 126.6, { escala: 0.55, solida: 'caixa' })
for (const [i, x, z, giro] of [
  [0, -10, 145, 0],
  [1, 7.3, 145, 0.3],
  [2, 32, 151, -0.6],
  [3, -29, 105, 0.4],
] as const)
  por(`banco-catalogo-${i}`, 'morada_banco', x, z, { giro, solida: 'caixa' })
por('mesa-convivio', 'mesa_01_pacote', -9, 141.5, { escala: 0.32, solida: 'caixa' })
por('quadro-suporte', 'andaime_bambu_01_pacote', -10.8, 137, {
  escala: 0.4,
  giro: 0,
  solida: 'malha',
})
por('quadro-painel', 'morada_quadro', -10.8, 137.675, {
  apoio: 'quadro-suporte',
  deslocamentoY: 0.6,
  giro: 0,
  solida: 'caixa',
})

// Oficina de trabalho aberta: carpintaria real, cobertura e projetos recolhidos, ainda lacrada.
for (const [i, x] of [-31.2, -28.8].entries())
  por(`oficina-estrutura-${i}`, 'andaime_bambu_01_pacote', x, 126, { escala: 0.9, solida: 'malha' })
for (let i = 0; i < 6; i++)
  por(`oficina-cobertura-${i}`, 'morada_telhado', -33 + i, 128, { altura: 7.6 })
por('oficina-mesa', 'mesa_01_pacote', -30, 126.7, { escala: 0.35, solida: 'caixa' })
por('oficina-guindaste', 'guindaste_pacote', -30, 124.5, { escala: 0.65, solida: 'malha' })
por('oficina-toras', 'toras_empilhadas_pacote', -33.7, 125, { escala: 0.6, solida: 'caixa' })
por('oficina-lacre', 'cerca_tabuas_7m', -30, 129, { escala: 0.8, solida: 'caixa' })
for (const [i, x, z] of [
  [0, -34, 130],
  [1, -35.3, 128.3],
  [2, -33.6, 122.5],
  [3, -34, 130],
] as const)
  por(`caixa-${i}`, 'caixote_medio', x, z, {
    solida: 'caixa',
    escala: i === 3 ? 0.7 : 1,
    ...(i === 3
      ? { apoio: 'caixa-0', deslocamentoY: ARTE_DA_FAISCA.pecas.caixote_medio.colisao[0].max[1] }
      : {}),
  })
por('barril', 'barril_em_pe', -34, 126, { solida: 'caixa' })
por('pecas-recolhidas', 'caixote_aberto', -27, 126.5, { solida: 'caixa' })

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
// Escala uniforme 0,75: os degraus nominais de 0,32 m passam a 0,24 m para o corpo nativo.
por('ponte-lago', 'ponte_arco_madeira', L.lago.x, L.lago.z, {
  solida: 'ponte',
  altura: 3.82,
  giro: Math.PI / 2,
  escala: 0.75,
})
for (const z of [L.lago.z - 3.35, L.lago.z + 3.35])
  for (const [i, x] of [-0.5, 0.5].entries())
    por(`apoio-ponte-${z}-${i}`, 'rocha_larga', L.lago.x + x, z, {
      altura: 2.42,
      escala: 0.65,
      giro: Math.PI / 2,
      solida: 'malha',
    })

for (let i = 0; i < 6; i++)
  por(`canteiro-${i}`, 'canteiro_horta', 24 + (i % 2) * 5.1, 133 + Math.floor(i / 2) * 4.3, {
    solida: 'caixa',
    escala: 0.85,
  })
// Pergolado leve com os encaixes de carpintaria existentes. Não fecha a entrada da horta.
for (const x of [18.4, 22.4])
  for (const z of [144.5, 148.5])
    por(`horta-poste-${x}-${z}`, 'morada_pilar', x, z, { escala: 0.8, solida: 'caixa' })
for (const [i, z] of [144.5, 148.5].entries())
  por(`horta-viga-${i}`, 'morada_viga', 18.4, z, {
    solida: 'caixa',
    altura: 6.4 - ARTE_DA_FAISCA.pecas.morada_viga.colisao[0].min[1],
  })
for (let i = 0; i < 5; i++)
  por(`horta-pergola-${i}`, 'morada_viga', 18.4 + i, 148.5, {
    solida: 'caixa',
    giro: Math.PI / 2,
    altura: 6.6 - ARTE_DA_FAISCA.pecas.morada_viga.colisao[0].min[1],
  })
for (let i = 0; i < 3; i++) {
  por(`horta-lateral-${i}`, 'cerca_02_pacote', 34, 132 + i * 4, {
    giro: Math.PI / 2,
    solida: 'caixa',
    escala: 0.85,
  })
}

// Postes baixos e lampiões do acervo Faroeste; a mesma linguagem acompanha o passeio.
for (const [i, x, z] of [
  [0, -9, 147],
  [1, 9, 147],
  [2, 17.3, 136.5],
  [3, -22, 129.5],
  [4, 34.5, 134],
  [5, 42, 121.5],
  [6, -8, 115],
  [7, 3, 111.5],
] as const) {
  por(`poste-luz-${i}`, 'morada_pilar', x, z, { escala: 0.62, solida: 'caixa' })
  por(`luz-${i}`, 'lampiao', x, z, { apoio: `poste-luz-${i}`, deslocamentoY: 1.84, escala: 0.7 })
}
for (const [i, x, z, texto, destino, via] of [
  [0, 5, 149, 'Costa', 'costa', L.costa],
  [1, 17.2, 140.5, 'Horta', 'horta', L.horta],
  [2, -20, 135, 'Pátio', 'patio', L.patio],
  [3, -5.8, 118, 'Farol', 'farol', L.farol],
  [4, 32.5, 145, 'Lago', 'lago', { x: L.lago.x, z: 133 }],
  [5, 22, 166, 'Píer', 'pier', L.descida],
] as const)
  por(`placa-${i}`, 'placa_seta', x, z, {
    solida: 'malha',
    giro: -Math.atan2(via.z - z, via.x - x),
    sinal: { texto, destino, via },
  })

// Copas enquadram o conjunto; a frente da Morada e os eixos de leitura continuam abertos.
const copas: readonly (readonly [number, number, number])[] = [
  [-21, 146, 1.3],
  [-23, 141, 1.1],
  [-20, 151, 1],
  [-21, 154, 0.85],
  [-18, 119, 1.1],
  [-15, 116, 1.4],
  [-8, 113, 1.2],
  [6, 114, 1.3],
  [13, 118, 1.1],
  [20, 123, 1.2],
  [23, 119, 1.4],
  [28, 118, 1.1],
  [34, 119, 1.1],
  [43, 119, 1.25],
  [46, 122, 1.3],
  [46, 130, 1.2],
  [45, 136, 1.2],
  [41, 140, 0.9],
  [36, 149, 1.1],
  [33, 154, 1],
  [29, 158, 0.85],
  [26, 164, 0.8],
  [-40, 135, 1.2],
  [-39, 128, 1.1],
  [-38, 119, 1.2],
  [-38, 110, 1.3],
  [-34, 107, 1.25],
  [-15, 99, 1.1],
  [9, 98, 1.1],
  [13, 102, 1.3],
  [20, 96, 1.2],
  [27, 104, 1.2],
  [-33, 151, 1.1],
  [-26, 157, 1.15],
  [-19, 180, 1],
  [23, 180, 1],
  [-30, 113, 1.2],
  [-32, 108, 1.1],
  [-33, 98, 1.5],
  [-39, 101, 1.3],
  [-18, 90, 1.1],
  [-12, 82, 1.3],
  [9, 83, 1.2],
  [16, 86, 1.5],
  [25, 89, 1.3],
  [31, 95, 1.2],
  [35, 104, 1.4],
  [42, 105, 1.25],
  [47, 110, 1.2],
  [51, 118, 1.5],
  [50, 127, 1.2],
  [53, 137, 1.1],
  [45, 146, 1.3],
  [38, 157, 1.2],
]
copas.forEach(([x, z, escala], i) => {
  if (distanciaAosCaminhos({ x, z }, ROTAS_DA_FAISCA) < 2.2) return
  por(
    `arvore-${i}`,
    i % 3 === 0 ? 'arvore_pacote' : i % 2 ? 'arvore_redonda_01' : 'arvore_redonda_02',
    x,
    z,
    {
      escala: escala * (i % 3 === 0 ? 0.75 : 1),
      giro: i * 1.23,
      solida: 'tronco',
      ...(i % 3 === 0 ? { raioDoTronco: 0.4 } : {}),
    },
  )
})
// Rochas afloram da colina; a subida central e o retorno lateral ficam livres.
for (const [i, x, z, s] of [
  [0, -12, 109, 1.3],
  [1, -9, 111, 1.1],
  [2, 4, 109, 1.2],
  [3, 8, 107, 1.35],
  [4, -12, 104, 1.4],
  [5, 6, 102, 1.5],
  [6, -10, 96, 1.4],
  [7, 3, 93, 1.4],
  [8, -14, 100, 1.1],
  [9, 11, 101, 1.2],
  [10, -9, 111.8, 0.8],
  [11, 5, 113, 0.7],
] as const)
  por(`colina-rocha-${i}`, i % 3 === 0 ? 'paredao_rocha_reto' : 'rochedo_grande_b', x, z, {
    escala: s * 0.85,
    giro: i * 0.71,
    enterrada: 0.28,
    solida: 'malha',
  })

// Margem de nascente: rochas grandes, não pedras soltas enfileiradas em volta da água.
for (const [i, x, z, s] of [
  [0, 33.7, 122.2, 1.25],
  [1, 35, 120, 1.5],
  [2, 36, 119.5, 1.15],
  [3, 34.3, 124.6, 0.85],
  [4, 44.2, 127.5, 0.7],
  [5, 43.3, 130.5, 0.6],
  [6, 36.1, 130, 0.45],
] as const)
  por(`margem-rocha-${i}`, 'rocha_larga', x, z, {
    escala: s,
    giro: i * 1.14,
    enterrada: 0.18,
    solida: 'malha',
  })

const jardins = [
  [-14, 143, 2.4],
  [-13, 149, 1.2],
  [-8, 148, 1.3],
  [8, 149, 1.3],
  [10, 143, 1.2],
  [-19, 134, 2],
  [-19, 124, 1.8],
  [-12, 119, 1.3],
  [4, 120, 1.1],
  [16, 126, 1.5],
  [18, 132, 1.2],
  [17, 136, 1],
  [19, 146, 1.8],
  [21, 148, 1.3],
  [30, 148, 2],
  [34, 140, 1.3],
  [36, 135, 1.2],
  [43, 136, 1.8],
  [45, 125, 1.5],
  [42, 119, 1.4],
  [31, 122, 1.4],
  [-33, 134, 1.6],
  [-39, 123, 2],
  [-14, 108, 1.4],
  [8, 109, 1.4],
  [12, 113, 2],
  [25, 166, 1.2],
] as const
jardins.forEach(([cx, cz, raio], g) => {
  for (let i = 0; i < 19; i++) {
    const a = i * 2.399 + g * 0.53,
      r = raio * Math.sqrt((i + 0.5) / 19),
      x = cx + Math.cos(a) * r,
      z = cz + Math.sin(a) * r
    if (distanciaAosCaminhos({ x, z }, ROTAS_DA_FAISCA) < 1.6 || sobreVolumeDaVila({ x, z }, 0.45))
      continue
    if (x > -12.5 && x < 12.5 && z > 153.5 && z < 178.5) continue
    const peca =
      i % 9 === 0
        ? 'arbusto_selva_02'
        : i % 5 === 0
          ? 'flor_campanula_azul'
          : i % 4 === 0
            ? 'flor_margarida_azul'
            : i % 3 === 0
              ? 'flor_margarida_branca'
              : 'tufo_selva_03'
    por(`jardim-${g}-${i}`, peca, x, z, {
      giro: a,
      escala: peca === 'arbusto_selva_02' ? 0.8 : peca.startsWith('flor_') ? 0.55 : 1,
    })
  }
})
// A cerca demarca o lado da reserva sem fechar a porta ou o acesso à praça.
for (const lado of [-1, 1])
  for (let i = 0; i < 9; i++)
    por(`morada-limite-${lado}-${i}`, 'cerca_tabuas_3_5m', lado * 13.2, 155.4 + i * 3.5 * 0.8, {
      giro: Math.PI / 2,
      escala: 0.8,
      solida: 'caixa',
    })

export const IRIS_DE_ESTUDO = {
  peca: 'coelho',
  x: 19,
  z: 133,
  alturaDosOlhos: 0.65,
  raio: 1.7,
} as const

/** Retomar no terreno sob uma caixa ou ponte colocaria o avatar dentro do objeto. */
export function pontoLivreParaRetomar(p: { x: number; z: number }, raio: number): boolean {
  if (pontoNoContorno(LAGO_DA_FAISCA.furo, p.x, p.z)) return false
  for (let i = 0; i < LAGO_DA_FAISCA.furo.length; i++) {
    const a = LAGO_DA_FAISCA.furo[i]!,
      b = LAGO_DA_FAISCA.furo[(i + 1) % LAGO_DA_FAISCA.furo.length]!,
      dx = b.x - a.x,
      dz = b.z - a.z
    const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.z - a.z) * dz) / (dx * dx + dz * dz)))
    if (Math.hypot(p.x - a.x - t * dx, p.z - a.z - t * dz) < raio) return false
  }
  if (sobreVolumeDaVila(p, raio)) return false
  for (const o of COMPOSICAO_DA_FAISCA) {
    if (!o.solida || o.solida === 'solo') continue
    const dx = p.x - o.x,
      dz = p.z - o.z
    if (o.solida === 'tronco') {
      if (Math.hypot(dx, dz) < (o.raioDoTronco ?? 0.23) * o.escala + raio) return false
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
