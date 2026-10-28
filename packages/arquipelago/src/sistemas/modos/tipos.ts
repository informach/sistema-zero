import type { AguaRasa, CipoVivo, ModoDoCorpo, TroncoVivo } from '../../estado/contexto'
import type { Ponto } from '../cipo'
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
