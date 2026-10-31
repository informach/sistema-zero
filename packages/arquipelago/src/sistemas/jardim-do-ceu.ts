import {
  CRESCIMENTO_DO_CEU_MS,
  colherNoCeu,
  FLORADA_MAXIMA,
  FLORES_DA_FLORADA,
  nivelDaFlorada,
  plantaNoCanteiro,
  plantarNoCeu,
  type Salvamento,
  type SementeDoCeu,
} from '@sistemazero/arquipelago-contracts'

/**
 * O jardim do céu no jogo (B6, 31/10/2026): os seis canteiros do terraço das Nuvens. As sementes
 * do céu não saem da mochila: o jardim dá a semente que ela escolher (o terraço é da Iriê). A flor
 * aberta colhida vai para a sua ilha, que floresce em três níveis (`florada.glb`).
 */
export const NOME_DA_PLANTA_DO_CEU: Readonly<Record<SementeDoCeu, string>> = {
  'flor-de-nuvem': 'Flor de nuvem',
  'estrela-trepadeira': 'Estrela trepadeira',
  'arco-iris-de-petala': 'Arco-íris de pétala',
}

const horas = (s: SementeDoCeu) => Math.round(CRESCIMENTO_DO_CEU_MS[s] / 3_600_000)

export const TEXTOS_DO_JARDIM_DO_CEU = {
  titulo: 'Jardim do céu',
  plantar: 'Plantar no canteiro do céu',
  escolher: 'Escolha o que plantar. Aqui em cima a chuva das nuvens rega sozinha.',
  quanto: (s: SementeDoCeu) => `Floresce em ${horas(s)} horas.`,
  plantado: (s: SementeDoCeu) =>
    `Plantado: ${NOME_DA_PLANTA_DO_CEU[s].toLowerCase()}. A chuva das nuvens rega, e ela floresce em ${horas(s)} horas.`,
  verQuando: 'Ver quando floresce',
  colher: (s: SementeDoCeu) => `Colher ${NOME_DA_PLANTA_DO_CEU[s].toLowerCase()}`,
  colheu: (flores: number) => {
    const nivel = nivelDaFlorada(flores)
    const proxima = FLORES_DA_FLORADA[nivel]
    return proxima === undefined
      ? `A flor foi para a sua ilha. A florada já tem ${flores} flores do céu, e a ilha está toda florida.`
      : `A flor foi para a sua ilha. A florada tem ${flores} de ${proxima} flores para florescer mais.`
  },
  voltar: 'Voltar',
} as const

/** O valor de `painelAberto` do canteiro `k` (1 a 6) do jardim do céu. */
export const painelDoCanteiroDoCeu = (k: number) => `jardim-do-ceu:${k}`

export function canteiroDoPainel(painel: string | null): number | null {
  const m = painel?.match(/^jardim-do-ceu:([1-6])$/)
  return m ? Number(m[1]) : null
}

/** Quanto falta para a flor abrir, em palavras ("Floresce em 3 horas."), ou `null`. */
export function quandoFloresce(s: Salvamento, k: number, agoraMs: number): string | null {
  const p = plantaNoCanteiro(s.ceu, k)
  if (!p) return null
  const falta = p.plantadaMs + CRESCIMENTO_DO_CEU_MS[p.semente] - agoraMs
  if (falta <= 0) return null
  const h = Math.floor(falta / 3_600_000)
  const min = Math.max(1, Math.ceil((falta % 3_600_000) / 60_000))
  if (h === 0) return `Floresce em ${min} ${min === 1 ? 'minuto' : 'minutos'}.`
  return `Floresce em ${h} ${h === 1 ? 'hora' : 'horas'} e ${min} ${min === 1 ? 'minuto' : 'minutos'}.`
}

export function plantarNoJardim(
  s: Salvamento,
  k: number,
  semente: SementeDoCeu,
  agoraMs: number,
): Salvamento | null {
  const ceu = plantarNoCeu(s.ceu, k, semente, agoraMs)
  return ceu ? { ...s, ceu } : null
}

/** Colher a flor aberta: o canteiro esvazia e a florada da sua ilha ganha uma flor. */
export function colherNoJardim(s: Salvamento, k: number, agoraMs: number): Salvamento | null {
  const r = colherNoCeu(s.ceu, k, agoraMs)
  return r ? { ...s, ceu: r.ceu, florada: Math.min(FLORADA_MAXIMA, s.florada + 1) } : null
}
