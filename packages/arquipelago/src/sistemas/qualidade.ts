/** Só desenho. Nenhum destes números participa do passo ou do movimento da física. */
export type NivelDeQualidade = 'completo' | 'medio' | 'leve'
export type PreferenciaDeQualidade = 'automatica' | 'leve' | 'completa'
export const PREFERENCIAS_DE_QUALIDADE = ['automatica', 'leve', 'completa'] as const

export const PERFIS_DE_QUALIDADE = {
  completo: { dpr: 1.75, vento: 1, ondinhas: true, nevoaInicio: 70, nevoaFim: 210 },
  medio: { dpr: 1.25, vento: 0.5, ondinhas: true, nevoaInicio: 70, nevoaFim: 190 },
  leve: { dpr: 0.75, vento: 0, ondinhas: false, nevoaInicio: 70, nevoaFim: 170 },
} as const

export interface Aparelho {
  toque: boolean
  userAgent: string
  nucleos?: number
}
export interface PerfilDoAparelho {
  meta: 30 | 60
  inicial: NivelDeQualidade
}

export function perfilDoAparelho(a: Aparelho): PerfilDoAparelho {
  const nucleos = Number.isFinite(a.nucleos) && (a.nucleos ?? 0) > 0 ? a.nucleos : undefined
  const fraco = nucleos !== undefined && nucleos <= 4
  const conservador = a.toque || /\bCrOS\b/i.test(a.userAgent) || fraco
  return {
    meta: conservador ? 30 : 60,
    inicial: nucleos !== undefined && nucleos <= 2 ? 'leve' : conservador ? 'medio' : 'completo',
  }
}

export function nivelForcado(
  preferencia: PreferenciaDeQualidade,
  parametro: string | null,
): NivelDeQualidade | null {
  if (parametro === 'leve' || parametro === 'completa')
    return parametro === 'completa' ? 'completo' : 'leve'
  return preferencia === 'automatica' ? null : preferencia === 'completa' ? 'completo' : 'leve'
}

export interface AmostraDeQualidade {
  nivel: NivelDeQualidade
  meta: 30 | 60
  tempo: number
  quadros: number
  desdeTroca: number
  ruins: number
  boas: number
}

export function criarAmostra(meta: 30 | 60, nivel: NivelDeQualidade): AmostraDeQualidade {
  return { nivel, meta, tempo: 0, quadros: 0, desdeTroca: 0, ruins: 0, boas: 0 }
}

const NIVEIS: readonly NivelDeQualidade[] = ['leve', 'medio', 'completo']

/** Recebe milissegundos entre quadros ativos. Não lê relógio, navegador nem estado global. */
export function observarQuadro(e: AmostraDeQualidade, ms: number): AmostraDeQualidade {
  if (!Number.isFinite(ms) || ms <= 0 || ms > 1000) return criarAmostra(e.meta, e.nivel)
  const novo = { ...e, tempo: e.tempo + ms, quadros: e.quadros + 1, desdeTroca: e.desdeTroca + ms }
  if (novo.tempo < 2000) return novo
  const media = novo.tempo / novo.quadros
  const orcamento = 1000 / e.meta
  novo.ruins = media > orcamento * 1.2 ? e.ruins + 1 : 0
  novo.boas = media <= orcamento * 1.05 ? e.boas + 1 : 0
  novo.tempo = 0
  novo.quadros = 0
  const indice = NIVEIS.indexOf(e.nivel)
  const destino =
    novo.ruins >= 2 && novo.desdeTroca >= 8000
      ? Math.max(0, indice - 1)
      : novo.boas >= 5 && novo.desdeTroca >= 20000
        ? Math.min(2, indice + 1)
        : indice
  const nivel = NIVEIS[destino]!
  return nivel === e.nivel ? novo : criarAmostra(e.meta, nivel)
}
