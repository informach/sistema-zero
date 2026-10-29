/**
 * Os perfis da câmera (controlador universal, parte 5): cada atividade pede um enquadramento, e a
 * câmera passa de um para o outro aos poucos (`TROCA_DE_PERFIL`), nunca de um quadro para o outro.
 * O perfil só ajusta o que a pessoa escolheu (o ângulo e a distância que ela deixou): a
 * exploração não mexe em nada; dentro de casa a câmera sobe e chega perto; na conversa ela desce e
 * chega perto das duas; no percurso ela abre e olha um pouco à frente de quem corre. O "lá no alto"
 * (deques e pontes, `CAMERA_NO_ALTO`) e a colisão continuam por cima de todos.
 *
 * O modo Construir, quando chegar, ganha o perfil dele aqui (alto e inclinado).
 */

export const NOMES_DOS_PERFIS = [
  'exploracao',
  'casa',
  'conversa',
  'percurso',
  'escorregar',
  'luneta',
  'barco',
  'balao',
  'mergulho',
] as const
export type NomeDoPerfil = (typeof NOMES_DOS_PERFIS)[number]

export interface PerfilDeCamera {
  /** Campo de visão da observação fixa, em graus. */
  campoDeVisao?: number
  inclinacao?: {
    /** O ângulo fica neste, seja qual for o que a pessoa deixou. */
    fixa?: number
    /** Abaixo disto, sobe até aqui. */
    minima?: number
  }
  distancia?: {
    /** Mais longe que isto, chega até aqui. */
    maxima?: number
    /** Mais perto que isto, se afasta até aqui. */
    minima?: number
  }
  /**
   * Segundos de antecipação: o ponto que a câmera olha vai à frente do corpo, na velocidade dele
   * (até `ANTECIPACAO_MAXIMA` metros). Com menos movimento pedido, não antecipa.
   */
  antecipar?: number
}

export const PERFIS_DE_CAMERA: Readonly<Record<NomeDoPerfil, PerfilDeCamera>> = {
  mergulho: { inclinacao: { fixa: 0.08 }, distancia: { maxima: 3 }, antecipar: 0 },
  barco: { inclinacao: { minima: 0.55 }, distancia: { minima: 13 } },
  // No balão (fase4-09): um pouco mais longe e mais alta, para ver em volta do cesto.
  balao: { inclinacao: { minima: 0.45 }, distancia: { minima: 11 } },
  exploracao: {},
  luneta: { inclinacao: { fixa: 0.32 }, distancia: { minima: 36, maxima: 36 }, campoDeVisao: 45 },
  // De cima, para ver o quarto todo (o telhado sai).
  casa: { inclinacao: { minima: 0.95 }, distancia: { maxima: 8 } },
  // Baixa, quase na altura dos olhos, e perto: as duas cabeças na tela.
  conversa: { inclinacao: { fixa: 0.2 }, distancia: { maxima: 5 } },
  // Mais aberta e um pouco mais alta, olhando para onde a criança vai.
  percurso: { inclinacao: { minima: 0.6 }, distancia: { minima: 11 }, antecipar: 0.4 },
  // Atrás de quem escorrega (a câmera vira para as costas, `personagem/camera.tsx`), olhando à frente.
  escorregar: { inclinacao: { minima: 0.45 }, distancia: { minima: 7 }, antecipar: 0.35 },
}

/** Segundos para a troca de perfil chegar a 95% do caminho. */
export const TROCA_DE_PERFIL = 0.5
export const ANTECIPACAO_MAXIMA = 2

export interface SituacaoDaCamera {
  mergulho?: boolean
  barco?: boolean
  balao?: boolean
  luneta?: boolean
  /** Uma conversa aberta (o painel e quem fala). */
  conversa: boolean
  dentroDeCasa: boolean
  /** Uma corrida do percurso em andamento. */
  correndoPercurso: boolean
  /** Descendo o escorregador. */
  escorregando?: boolean
}

/**
 * A luneta tem vista fixa própria. Fora dela: conversa, casa, escorregador, percurso e exploração.
 */
export function perfilDaVez(s: SituacaoDaCamera): NomeDoPerfil {
  if (s.mergulho) return 'mergulho'
  if (s.barco) return 'barco'
  if (s.balao) return 'balao'
  if (s.luneta) return 'luneta'
  if (s.conversa) return 'conversa'
  if (s.dentroDeCasa) return 'casa'
  if (s.escorregando) return 'escorregar'
  if (s.correndoPercurso) return 'percurso'
  return 'exploracao'
}

export type PesosDosPerfis = Record<NomeDoPerfil, number>

export function criarPesos(inicial: NomeDoPerfil = 'exploracao'): PesosDosPerfis {
  return {
    barco: 0,
    balao: 0,
    mergulho: 0,
    exploracao: 0,
    casa: 0,
    conversa: 0,
    percurso: 0,
    escorregar: 0,
    luneta: 0,
    [inicial]: 1,
  }
}

/**
 * Um quadro da troca: o peso do perfil da vez vai a 1 e os outros a 0, todos no mesmo ritmo
 * (a soma continua 1). Sem alocar: muda `pesos` no lugar.
 */
export function passoDosPesos(pesos: PesosDosPerfis, daVez: NomeDoPerfil, dt: number): void {
  // e^(−3) ≈ 5%: em `TROCA_DE_PERFIL` segundos falta só isso.
  const k = 1 - Math.exp((-dt * 3) / TROCA_DE_PERFIL)
  for (const nome of NOMES_DOS_PERFIS) {
    const alvo = nome === daVez ? 1 : 0
    pesos[nome] += (alvo - pesos[nome]) * k
  }
}

/** O ângulo e a distância que um perfil pede, a partir dos que a pessoa escolheu. */
export function aplicarPerfil(
  p: PerfilDeCamera,
  inclinacao: number,
  distancia: number,
): { inclinacao: number; distancia: number } {
  let i = p.inclinacao?.fixa ?? inclinacao
  if (p.inclinacao?.minima !== undefined) i = Math.max(i, p.inclinacao.minima)
  let d = distancia
  if (p.distancia?.maxima !== undefined) d = Math.min(d, p.distancia.maxima)
  if (p.distancia?.minima !== undefined) d = Math.max(d, p.distancia.minima)
  return { inclinacao: i, distancia: d }
}

export interface Enquadramento {
  inclinacao: number
  distancia: number
  /** Segundos de antecipação, já misturados. */
  antecipar: number
}

/** A mistura dos perfis pelos pesos (o que a câmera usa neste quadro). */
export function misturarPerfis(
  pesos: PesosDosPerfis,
  inclinacao: number,
  distancia: number,
  saida: Enquadramento = { inclinacao: 0, distancia: 0, antecipar: 0 },
): Enquadramento {
  let soma = 0
  saida.inclinacao = 0
  saida.distancia = 0
  saida.antecipar = 0
  for (const nome of NOMES_DOS_PERFIS) {
    const w = pesos[nome]
    if (w <= 0) continue
    const p = PERFIS_DE_CAMERA[nome]
    const a = aplicarPerfil(p, inclinacao, distancia)
    saida.inclinacao += a.inclinacao * w
    saida.distancia += a.distancia * w
    saida.antecipar += (p.antecipar ?? 0) * w
    soma += w
  }
  if (soma <= 0) {
    saida.inclinacao = inclinacao
    saida.distancia = distancia
    return saida
  }
  saida.inclinacao /= soma
  saida.distancia /= soma
  saida.antecipar /= soma
  return saida
}

/** Quantos metros à frente a câmera olha, na velocidade de agora (com o limite). */
export function metrosDeAntecipacao(antecipar: number, velocidade: number): number {
  return Math.min(ANTECIPACAO_MAXIMA, antecipar * velocidade)
}
