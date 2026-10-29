/**
 * O clima da sua ilha (fase4-08, regras puras): a Iriê ensina a escolher o tempo da ilha central
 * entre sol, nublado e chuva (proposta: "controlar o clima da sua ilha"; na horta, "chuva rega
 * sozinha, sol forte pede água"). Vale com a Ilha das Nuvens aberta. A escolha fica na sessão: o
 * salvamento ainda não tem lugar para ela (o plano da fase4-08 pede o campo).
 *
 * Nada aqui estraga planta nem castiga: a planta que pede água e não ganha cresce como sempre;
 * regar quando ela pede adianta o crescimento (o bônus mexe no `regadoEm` que já existe).
 */
import {
  type Canteiro,
  CRESCIMENTO_MS,
  ilhaAberta,
  progresso,
  regar,
} from '@sistemazero/arquipelago-contracts'

export const CLIMAS = ['sol', 'nublado', 'chuva'] as const
export type Clima = (typeof CLIMAS)[number]

export const NOMES_DOS_CLIMAS: Readonly<Record<Clima, string>> = {
  sol: 'Sol',
  nublado: 'Nublado',
  chuva: 'Chuva',
}
export const SIMBOLOS_DOS_CLIMAS: Readonly<Record<Clima, string>> = {
  sol: '☀️',
  nublado: '☁️',
  chuva: '🌧️',
}

/** Os números do clima (o plano da fase4-08 explica cada um). */
export const CLIMA = {
  /**
   * Plantada e regada, a planta pede água de novo quando o crescimento chega a esta fração: com o
   * sol forte, mais cedo. Na chuva ela não pede: a chuva rega.
   */
  pedeAgua: { sol: 0.3, nublado: 0.6 },
  /** Ela pede durante esta fração do crescimento; depois para de pedir (sem perder nada). */
  janela: 0.15,
  /** Regar quando ela pede adianta isto do crescimento (sai da janela: pede uma vez só). */
  bonus: 0.15,
  /** A chuva confere a horta a cada tantos segundos de jogo. */
  chuvaACada: 1,
  /** A luz do sol na sua ilha, em cada clima (multiplica a do relógio). */
  luz: { sol: 1, nublado: 0.65, chuva: 0.5 },
  /** O céu vai para o cinza do tempo fechado nesta fração. */
  cinza: { sol: 0, nublado: 0.45, chuva: 0.6 },
  /** O tempo da sua ilha vale até esta distância do meio dela (perto da ilha central). */
  alcance: 34,
  /**
   * As gotas: quantas em cada qualidade, num cilindro em volta da criança (onde ela olha), na sua
   * ilha. Dentro de casa não chove.
   */
  gotas: { completo: 700, medio: 450, leve: 250 },
  raioDaChuva: 12,
  alturaDaChuva: 12,
  /** Metros por segundo e o comprimento do risco de cada gota. */
  queda: 9,
  risco: 0.6,
} as const

export const FALA_DO_CLIMA: Readonly<Record<Clima, string>> = {
  sol: 'Sol na sua ilha. Com o sol forte, a horta pede água mais cedo.',
  nublado: 'O céu da sua ilha ficou nublado.',
  chuva: 'Chuva na sua ilha. Ela rega a horta sozinha.',
}
export const FALA_DA_SEDE = 'A planta pediu água. Regando agora, ela cresce mais depressa.'
export const FALA_DO_BONUS = 'Regado. A planta deu uma espichada.'

/** O clima da sua ilha vale com as Nuvens abertas (a Iriê ensina lá). */
export function climaLiberado(posicaoNaJornada: number): boolean {
  return ilhaAberta('nuvens', posicaoNaJornada)
}

/** A janela em que a planta pede água neste clima (de, até), ou `null` na chuva. */
function janelaDaSede(clima: Clima): { de: number; ate: number } | null {
  if (clima === 'chuva') return null
  const de = CLIMA.pedeAgua[clima]
  return { de, ate: de + CLIMA.janela }
}

/** A planta está pedindo água agora (plantada, regada, ainda crescendo, na janela do clima). */
export function pedeAgua(c: Canteiro, agoraMs: number, clima: Clima): boolean {
  const j = janelaDaSede(clima)
  if (!j || !c.semente || !c.regadoEm) return false
  const p = progresso(c, agoraMs)
  return p >= j.de && p < j.ate
}

/** Adianta o crescimento pelo bônus (o `regadoEm` vai para trás). */
function adiantar(c: Canteiro): Canteiro | null {
  if (!c.semente || !c.regadoEm) return null
  const antes = Date.parse(c.regadoEm) - CLIMA.bonus * CRESCIMENTO_MS[c.semente]
  return { ...c, regadoEm: new Date(antes).toISOString() }
}

/** Regar a planta que pede água: o bônus. `null` se ela não está pedindo. */
export function regarComSede(c: Canteiro, agora: Date, clima: Clima): Canteiro | null {
  return pedeAgua(c, agora.getTime(), clima) ? adiantar(c) : null
}

/**
 * Um passo da chuva na horta: rega o que foi plantado e espera água, e dá o bônus a quem está na
 * janela do sol forte (a chuva chega antes de a planta pedir). Devolve a horta nova, ou `null` se
 * nada mudou.
 */
export function chuvaNaHorta(horta: readonly Canteiro[], agora: Date): Canteiro[] | null {
  let mudou = false
  const nova = horta.map((c) => {
    const regado = regar(c, agora)
    if (regado) {
      mudou = true
      return regado
    }
    if (pedeAgua(c, agora.getTime(), 'sol')) {
      const adiantado = adiantar(c)
      if (adiantado) {
        mudou = true
        return adiantado
      }
    }
    return c
  })
  return mudou ? nova : null
}
