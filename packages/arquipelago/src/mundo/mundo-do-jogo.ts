/**
 * O que cada mundo do jogo declara sobre o herói e a física (decisão D1 do levantamento de
 * 14/11/2026, `docs/plans/2026-11-14-arquipelago-personagem-levantamento.md`).
 *
 * O personagem é o avatar do pack (1,15 m de verdade). O mundo de hoje (as ilhas do anel, o Farol e
 * a ilha central) foi desenhado para um boneco de 2,13 m, então ele declara a ponte de escala 1,85:
 * o herói fica do tamanho de antes e nenhuma ilha muda. Os mundos novos (a biblioteca de aventura,
 * em escala real) declaram 1.
 *
 * O CORPO (a cápsula, a linha d'água, as alturas da câmera e do Zappy) sai do esqueleto vezes esta
 * escala (`sistemas/corpo.ts`). O que fica aqui são as REGRAS do mundo: velocidades, pulo, rampas e
 * até onde as mãos agarram. Elas não saem do corpo porque o desenho dos níveis depende delas (os
 * vãos, as beiradas e as escadas de cada ilha foram medidos com estes números).
 *
 * Sem imports: `mundo/medidas.ts`, `sistemas/cipo.ts` e `sistemas/corpo.ts` leem daqui sem ciclo.
 */
export interface MundoDoJogo {
  id: string
  /** Quantas vezes o herói é maior que o avatar de verdade (1,15 m). */
  escalaDoHeroi: number
  /** m/s², para baixo: mais forte que a de verdade, para o pulo ser ágil. */
  gravidade: number
  /** Velocidades no chão e na água (m/s). */
  andar: number
  correr: number
  nadar: number
  /** Velocidade para cima ao pular (m/s). */
  pulo: number
  /** O degrau mais alto que o corpo sobe sozinho, andando (m). */
  degrau: number
  /** A rampa mais inclinada que ele sobe andando (graus). */
  sobeAte: number
  /** Acima desta inclinação ele escorrega (graus). */
  escorregaAcimaDe: number
  /** Andando, o corpo desce grudado no chão até esta distância (m): degraus e rampas para baixo. */
  grudaAte: number
  /** A folga que o controlador do Rapier mantém entre a cápsula e o chão (m). */
  folga: number
  /**
   * Até onde as mãos agarram, do meio do corpo (m): pendurado numa quina e subindo um tronco.
   * São regras de alcance (as beiradas do mundo foram medidas com elas); os braços do desenho
   * vão até onde alcançam (IK).
   */
  maosNaBorda: number
  maosNaEscalada: number
}

/** O mundo de hoje: as ilhas feitas para o boneco de 2,13 m, com o herói na ponte de 1,85. */
export const MUNDO_ATUAL = {
  id: 'arquipelago-1',
  escalaDoHeroi: 1.85,
  gravidade: 24,
  andar: 2.2,
  correr: 4.6,
  nadar: 2.6,
  pulo: 8.5,
  degrau: 0.45,
  sobeAte: 52,
  escorregaAcimaDe: 60,
  grudaAte: 0.35,
  folga: 0.06,
  maosNaBorda: 0.9,
  maosNaEscalada: 1,
} as const satisfies MundoDoJogo
