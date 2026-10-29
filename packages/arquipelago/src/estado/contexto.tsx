import type { Plataforma } from '@sistemazero/arquipelago-contracts'
import { createContext, useContext } from 'react'
import { useStore } from 'zustand'
import type { Controle } from '../controles/controle'
import type { RegistroDeInterativos } from '../mundo/interativos'
import type { Travessia } from '../sistemas/barco'
import type { Ponto } from '../sistemas/cipo'
import type { Corda, CorpoQueEmpurra } from '../sistemas/cordas'
import { RODA_DA_ILHA_CENTRAL, type RodaDeNado } from '../sistemas/correnteza'
import type { Tronco } from '../sistemas/escalada'
import type { criarGerenteTempo } from '../sistemas/gerente-tempo'
import type { Corrida } from '../sistemas/percurso'
import type { EstadoDoJogo, LojaDoJogo } from './loja'

/** Posição do personagem, lida a cada quadro pela câmera e pelo Zappy (fora do React). */
export interface Rastro {
  x: number
  y: number
  z: number
  /** Para onde a câmera olha (giro em torno do personagem). */
  giro: number
  inclinacao: number
  /** Para onde o avatar está virado (giro `d` olha para `(sin d, cos d)`), escrito pelo personagem. */
  direcao: number
  /** Velocidade pedida no chão (m/s): zero parado, mesmo encostado numa parede andando. */
  velocidade: number
  /** Onde o Zappy está agora (lido pelas copas que esmaecem na frente dele). */
  zappy: { x: number; y: number; z: number }
}

/** Luz do dia, escrita pelo céu a cada quadro e lida por janelas, Zappy e Farol. */
export interface Ambiente {
  luz: number
  noite: boolean
}

/** Pedidos de fora para o personagem (o cochilo leva de volta para casa). */
export interface Pedidos {
  teleporte: { x: number; y: number; z: number } | null
  /**
   * Ilhas cujo chão de verdade ainda está chegando com o personagem em cima delas (o jogo abriu
   * com ele num deque da ilha completa): enquanto houver alguma, ele fica parado no ar em vez de
   * cair até a versão leve.
   */
  chaoChegando: Set<string>
  /** Para onde olhar depois do teleporte (o giro do avatar); `null` mantém. */
  olharPara: number | null
  /**
   * Com quem a criança está conversando (a cabeça de quem fala). Com o painel da conversa aberto,
   * ela vira para lá e a câmera vai para o lado e enquadra as duas, de preferência o lado longe de
   * `miolo` (o meio da ilha, onde ficam árvores e escadas). Quem abriu a conversa limpa.
   */
  conversa: { x: number; y: number; z: number; miolo: { x: number; z: number } } | null
}

/**
 * Um cipó que dá para pegar (a ilha completa registra os dela enquanto está ativa). Solto, ele é da
 * física das cordas (`sistemas/cordas.ts`); seguro, do balanço que o personagem controla.
 */
export interface CipoVivo extends Corda {
  id: string
  /** Do pivô até onde as mãos seguram (os pés passam livres do chão). */
  pegada: number
  /** `performance.now()` da última vez que alguém soltou (para não pegar de novo na hora). */
  soltoEm: number
}

/** Uma água rasa de ilha completa (o lago do Bosque): uma elipse no chão, onde se nada. */
export interface AguaRasa {
  id: string
  x: number
  z: number
  raioX: number
  raioZ: number
  /** O giro da elipse no mundo (o da ilha). */
  giro: number
  /** A altura da superfície. */
  y: number
}

export interface TroncoVivo {
  id: string
  tronco: Tronco
}

/**
 * O eixo de um tronco caído estreito (`equilibrio-*` do GLB): as duas pontas no tampo, no meio do
 * tronco, no mundo. Andando ao longo dele, o corpo entra no modo de equilíbrio.
 */
export interface EixoDeEquilibrio {
  id: string
  a: Ponto
  b: Ponto
}

/**
 * Uma escada reta (`escada-N-base`, `-topo` e `-saida` do GLB), no mundo: o eixo do pé ao alto, na
 * frente dos degraus, e o ponto do deque onde quem chega em cima sai. Quem sobe fica do lado oposto
 * ao da saída, de frente para a escada.
 */
export interface EscadaViva {
  id: string
  base: Ponto
  topo: Ponto
  saida: Ponto
  /** A largura dos degraus (para pegar de lado). */
  largura: number
}

/**
 * Um escorregador (`escorregador-curva-N` do GLB): a linha do meio da pista, em pontos amostrados do
 * alto ao fim, no mundo e na superfície.
 */
export interface Escorregador {
  id: string
  pontos: Ponto[]
  largura: number
}

/**
 * Uma borda que se agarra (`borda-N-a`, `-b` e `-fora` do GLB), no mundo: a quina de `a` a `b`, na
 * altura do tampo, e um ponto do lado de fora (onde o corpo fica pendurado).
 */
export interface BordaViva {
  id: string
  a: Ponto
  b: Ponto
  fora: Ponto
}

export type ModoDoCorpo =
  | 'chao'
  | 'cipo'
  | 'escalada'
  | 'equilibrio'
  | 'escada'
  | 'escorregar'
  | 'borda'
  | 'descanso'
  | 'barco'

/**
 * Onde descansar (fase2-13, `sistemas/descanso.ts`): sentado num banco ou deitado na cama. O corpo
 * do Rapier fica de pé em `corpo`, fora do móvel; só o desenho vai para o assento ou o colchão.
 */
export interface LugarDeDescanso {
  id: string
  jeito: 'sentar' | 'deitar'
  /** Onde fica a origem do desenho (os pés, no clipe), no mundo. */
  desenho: Ponto
  /** Para onde o desenho olha (giro `d` olha para `(sin d, cos d)`). */
  giro: number
  /** Onde o corpo do Rapier fica de pé enquanto descansa. */
  corpo: { x: number; z: number }
}

/**
 * Cipós, troncos de escalar e águas rasas das ilhas completas, e o que o personagem faz com eles
 * (mutável, lido a cada quadro fora do React). Listas simples: o laço da física percorre sem
 * alocar.
 */
export interface Movimento {
  barco: Travessia | null
  cipos: CipoVivo[]
  troncos: TroncoVivo[]
  aguas: AguaRasa[]
  equilibrios: EixoDeEquilibrio[]
  escadas: EscadaViva[]
  escorregadores: Escorregador[]
  bordas: BordaViva[]
  /**
   * As rodas de boias onde se nada (`sistemas/correnteza.ts`): a da sua ilha sempre, e a de cada ilha
   * do anel aberta, registrada pelo `Anel`. Fora delas, a correnteza leva de volta.
   */
  rodasDeNado: RodaDeNado[]
  /** Pedido de um interativo ("Pegar o cipó", "Escalar"): o personagem atende no quadro seguinte. */
  pedido:
    | { tipo: 'cipo' | 'tronco'; id: string }
    | { tipo: 'descanso'; lugar: LugarDeDescanso }
    | { tipo: 'levantar' }
    | { tipo: 'barco'; viagem: Travessia }
    | null
  /** Escritos pelo personagem. */
  modo: ModoDoCorpo
  /** Pisando em algo (chão, deque, ponte); falso no ar, no cipó e no tronco. */
  noChao: boolean
  /** Para onde a câmera olha no balanço (perto do meio do cipó). */
  foco: Ponto
  /**
   * O corpo como está desenhado (inclinado no cipó, atrás da corda), no mundo: é nele que as cordas
   * encostam. `null` até o personagem desenhar o primeiro quadro.
   */
  corpoDesenhado: CorpoQueEmpurra | null
  /** A corrida do percurso em andamento (o cronômetro lê o tempo daqui). */
  corrida: Corrida | null
  /** Pedido da tela para o percurso: correr de novo ou parar. */
  pedidoDoPercurso: 'recomecar' | 'parar' | null
}

export function criarMovimento(): Movimento {
  return {
    barco: null,
    cipos: [],
    troncos: [],
    aguas: [],
    equilibrios: [],
    escadas: [],
    escorregadores: [],
    bordas: [],
    rodasDeNado: [RODA_DA_ILHA_CENTRAL],
    pedido: null,
    modo: 'chao',
    noChao: false,
    foco: { x: 0, y: 0, z: 0 },
    corpoDesenhado: null,
    corrida: null,
    pedidoDoPercurso: null,
  }
}

export interface ContextoDoJogo {
  loja: LojaDoJogo
  plataforma: Plataforma
  gerenteTempo: ReturnType<typeof criarGerenteTempo> | null
  controle: Controle
  interativos: RegistroDeInterativos
  rastro: Rastro
  ambiente: Ambiente
  pedidos: Pedidos
  movimento: Movimento
}

export const Contexto = createContext<ContextoDoJogo | null>(null)

export function useJogo(): ContextoDoJogo {
  const c = useContext(Contexto)
  if (!c) throw new Error('Fora do Arquipélago')
  return c
}

export function useEstado<T>(seletor: (s: EstadoDoJogo) => T): T {
  return useStore(useJogo().loja, seletor)
}
