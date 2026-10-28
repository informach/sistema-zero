import type {
  AguaRasa,
  BordaViva,
  CipoVivo,
  EixoDeEquilibrio,
  EscadaViva,
  Escorregador,
  ModoDoCorpo,
  TroncoVivo,
} from '../../estado/contexto'
import type { Ponto } from '../cipo'
import type { RodaDeNado } from '../correnteza'
import { criarAgarrado, type FimDaEscalada } from '../escalada'
import { criarPulo, type EstadoDoPulo } from '../movimento'

/**
 * O contrato dos modos de movimento (controlador universal, parte 6;
 * `docs/specs/2026-10-28-arquipelago-modos-de-movimento.md`). Cada modo é uma regra pura: lê o
 * corpo e o que a pessoa pede, diz o deslocamento e quem leva o corpo (o controlador do Rapier do
 * chão, o do cipó ou direto para um lugar) e, depois que o Rapier respondeu, troca de modo quando
 * for a hora. O `personagem.tsx` só liga o modo ativo ao Rapier e ao desenho. Nada de React nem de
 * three aqui; o corpo é o mesmo em todos os modos, e roupa e cabelo nunca entram.
 */

/** O corpo como os modos o veem e mexem (objetos fixos: o laço da física não aloca). */
export interface EstadoDoCorpo {
  modo: ModoDoCorpo
  cipo: CipoVivo | null
  tronco: TroncoVivo | null
  /** O tronco caído em que o corpo se equilibra, onde está nele (metros desde `a`) e a velocidade. */
  eixo: EixoDeEquilibrio | null
  noEixo: number
  velNoEixo: number
  /** A inclinação de lado no equilíbrio (radianos; volta sozinha) e há quanto tempo se pede o lado. */
  balanco: number
  deLado: number
  /** A escada reta, a altura do pé nela (desde a base), saindo em cima (0 a 1) e há quanto tempo
   *  se anda contra ela embaixo. */
  escada: EscadaViva | null
  naEscada: number
  saindoDaEscada: number
  contraAEscada: number
  /** O escorregador, onde o corpo está na pista (metros desde o alto), a velocidade e o lado. */
  escorregador: Escorregador | null
  naPista: number
  velNaPista: number
  ladoNaPista: number
  /** A borda em que o corpo está pendurado, onde nela (metros desde `a`) e subindo (0 a 1). */
  borda: BordaViva | null
  naBorda: number
  subindoNaBorda: number
  /** `performance.now()` de quando soltou uma borda (não pega a mesma na hora). */
  soltouDaBorda: number
  /** A força da correnteza no último passo (0 a 1), nadando no mar fora das boias. */
  correnteza: number
  /** Segundos no modo atual (o encaixe suave depois de pegar ou grudar). */
  noModo: number
  /** A velocidade que vem do cipó ou do pulo do tronco, até pisar de novo. */
  embalo: Ponto
  /** A velocidade no chão agora (vai até a pedida com peso, `aproximarVelocidade`). */
  vel: { x: number; z: number }
  /** A velocidade no plano deste passo (com o embalo), para a direção e o pegar no ar. */
  velDoPasso: { x: number; z: number }
  velY: number
  /** Pisando em algo (o controlador do chão disse), do último passo. */
  noChao: boolean
  /** Para onde o corpo olha (giro `d` olha para `(sin d, cos d)`). */
  direcao: number
  /** O pulo com coyote time e jump buffer (`passoDoPulo`). */
  pulo: EstadoDoPulo
  alvo: Ponto
  inicio: Ponto
  maos: Ponto
  /** Onde o corpo vai ficar depois do passo. */
  prox: Ponto
  /** O deslocamento pedido ao controlador neste passo. */
  desloc: Ponto
  agarrado: ReturnType<typeof criarAgarrado>
  /** O que a escalada disse neste passo (desceu até o pé do tronco ou nada). */
  fimDaEscalada: FimDaEscalada
  contraOTronco: number
  soltouDoTronco: number
  /** 0 no chão, 1 pendurado no cipó (o desenho passa de um para o outro suave). */
  noCipo: number
  nadando: boolean
  /** A velocidade pedida no chão (o Zappy lê); 1 no cipó e no tronco, que estão sempre "andando". */
  velPedida: number
}

export function criarEstadoDoCorpo(): EstadoDoCorpo {
  return {
    modo: 'chao',
    cipo: null,
    tronco: null,
    eixo: null,
    noEixo: 0,
    velNoEixo: 0,
    balanco: 0,
    deLado: 0,
    escada: null,
    naEscada: 0,
    saindoDaEscada: 0,
    contraAEscada: 0,
    escorregador: null,
    naPista: 0,
    velNaPista: 0,
    ladoNaPista: 0,
    borda: null,
    naBorda: 0,
    subindoNaBorda: 0,
    soltouDaBorda: Number.NEGATIVE_INFINITY,
    correnteza: 0,
    noModo: 0,
    embalo: { x: 0, y: 0, z: 0 },
    vel: { x: 0, z: 0 },
    velDoPasso: { x: 0, z: 0 },
    velY: 0,
    noChao: false,
    direcao: 0,
    pulo: criarPulo(),
    alvo: { x: 0, y: 0, z: 0 },
    inicio: { x: 0, y: 0, z: 0 },
    maos: { x: 0, y: 0, z: 0 },
    prox: { x: 0, y: 0, z: 0 },
    desloc: { x: 0, y: 0, z: 0 },
    agarrado: criarAgarrado(),
    fimDaEscalada: null,
    contraOTronco: 0,
    soltouDoTronco: Number.NEGATIVE_INFINITY,
    noCipo: 0,
    nadando: false,
    velPedida: 0,
  }
}

/** O que chega a cada passo: a hora, o corpo antes do passo e o que a pessoa pede (já na tela). */
export interface EntradaDoPasso {
  dt: number
  /** `performance.now()` (as esperas de pegar de novo são em milissegundos). */
  agora: number
  /** Menu, painel ou ferramenta aberta: o corpo para de obedecer. */
  parado: boolean
  /** O centro do corpo antes do passo. */
  p: Ponto
  /** Os eixos crus (frente e lado do controle). */
  ix: number
  iz: number
  /** A direção pedida no mundo, relativa à câmera. */
  pedidoX: number
  pedidoZ: number
  /** O lado da câmera no mundo (a direita da tela). */
  ladoX: number
  ladoZ: number
  pulou: boolean
  usou: boolean
  correr: boolean
  /** O ritmo do humor (`ritmo`, 0,8 a 1,1). */
  ritmo: number
  /** Com quem a criança conversa (parada, vira para lá). */
  conversa: { x: number; z: number } | null
  gravidade: number
  nivelDoMar: number
}

/** O que as ilhas registraram por perto (`movimento` do contexto). */
export interface MundoDoMovimento {
  cipos: CipoVivo[]
  troncos: TroncoVivo[]
  aguas: AguaRasa[]
  equilibrios: EixoDeEquilibrio[]
  escadas: EscadaViva[]
  escorregadores: Escorregador[]
  bordas: BordaViva[]
  rodasDeNado: RodaDeNado[]
  /** Para onde a câmera olha no balanço. */
  foco: Ponto
}

/** Quem leva o corpo neste passo: o controlador do chão, o do cipó (sem grudar) ou direto. */
export type Controlador = 'chao' | 'cipo' | 'direto'

/** Avisa quem desenha e quem mostra (a loja, os braços) que o modo mudou. */
export type AvisoDeModo = (modo: ModoDoCorpo) => void

export interface ModoDeMovimento {
  id: ModoDoCorpo
  /** O modo ainda tem onde se segurar? (o cipó e o tronco somem com a ilha) */
  valendo(c: EstadoDoCorpo, mundo: MundoDoMovimento): boolean
  /**
   * Um passo da física (sempre `PASSO_DA_FISICA`): escreve o deslocamento pedido em `c.desloc`
   * (ou, no `direto`, o lugar em `c.prox`) e diz quem leva o corpo.
   */
  passo(c: EstadoDoCorpo, e: EntradaDoPasso, mundo: MundoDoMovimento): Controlador
  /**
   * Depois do controlador: `mov` é o deslocamento de verdade (nulo no `direto`) e `pisou`, se o do
   * chão achou chão. Acerta `c.prox` e troca de modo quando for a hora, deixando a velocidade para
   * o próximo (`embalo`). Devolve `true` se gastou o "usar" (soltar não abre a placa ao lado).
   */
  depois(
    c: EstadoDoCorpo,
    e: EntradaDoPasso,
    mundo: MundoDoMovimento,
    mov: Ponto | null,
    pisou: boolean,
    aviso: AvisoDeModo,
  ): boolean
}
