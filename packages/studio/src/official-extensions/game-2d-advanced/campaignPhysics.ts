/**
 * As constantes de física da campanha, num lugar só.
 *
 * ⭐ Elas estavam espalhadas como literais dentro do `runtime/campaign.ts`, e
 * isso não é só desarrumação: um teste que precise saber a altura do pulo COPIA
 * o número, e um teste que copia a premissa que deveria checar mede a si mesmo.
 * O irmão g2d pagou exatamente esse preço em 12/08 (`reinoZeroGeometry` copiava
 * a física e parou de copiar).
 *
 * ⚠️ Precedente da forma: `campaignEntityCatalog.ts`. O dado nasce em TS, vira
 * JSON e é interpolado no template literal do runtime — por isso o arquivo NÃO
 * mora em `runtime/`, onde a guarda de crase espera que todo export exportado
 * seja um template literal.
 */
export const CAMPAIGN_PHYSICS = {
  /** Queda do herói e dos inimigos de chão, em px/s². */
  gravidade: 520,
  gravidadeNaAgua: 180,
  /** Impulso do pulo (para CIMA, então entra negado). */
  pulo: 205,
  puloNaAgua: 120,
  /** Soltar o botão no meio da subida corta a velocidade até aqui. */
  corteDoPulo: 85,
  andar: 82,
  correr: 118,
  fatorDaAgua: 0.6,
  /** Velocidade vertical sustentada ao nadar com cima/baixo. */
  nadar: 62,
  escada: 62,
  /** Ainda dá para pular por este tempo depois de sair da beirada. */
  coiote: 0.1,
  /** Apertar pular um pouco antes de tocar o chão ainda conta. */
  buffer: 0.1,
  /** O saltinho que a pisada devolve. */
  quiqueDaPisada: 180,
  /** Quanto o pé pode ter afundado no inimigo e ainda contar como pisada, em px. */
  janelaDaPisada: 9,
  piscaAoLevarDano: 1.5,
  duracaoDaEstrela: 10,
  /** Velocidade de fábrica de quem anda no chão, e o piso do que a fase pede. */
  inimigoVelocidade: 30,
  inimigoVelocidadeMinima: 18,
  cascoChutado: 130,
  /**
   * ⚠️ A graça existe porque o casco corre a 130 e o herói a 118: a sobreposição
   * do PRÓPRIO chute dura vários quadros, e sem ela o gesto vira castigo. É a
   * mesma lição que o irmão g2d catalogou em 13/08.
   */
  gracaDoChute: 0.35,
} as const

export type CampaignPhysics = typeof CAMPAIGN_PHYSICS

export const CAMPAIGN_PHYSICS_JSON = JSON.stringify(CAMPAIGN_PHYSICS)
