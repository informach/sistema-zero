import type { ModeloDoCenario } from '@sistemazero/molda-cenarios-core/v2'

export type ModoDoTeste = 'terceira' | 'primeira' | 'voo'
export interface PontoDoTeste {
  x: number
  y: number
  z: number
}
export interface ConfiguracaoDoTeste {
  modo: ModoDoTeste
  /** Ponto de partida da sessão fornecido pelo host, em metros; não edita o cenário. */
  inicio?: PontoDoTeste
  /** Giro Y inicial em radianos; zero olha para -Z, como a seta do início. */
  giroInicial?: number
  /** Início secundário escolhido explicitamente; ausente usa o principal visível. */
  marcadorDeInicio?: string
  /** Metros; modelo escolhido mantém sua escala nativa quando omitida. */
  altura?: number
  modelo?: ModeloDoCenario
  clipes?: {
    parado?: string
    andando?: string
    correndo?: string
    saltando?: string
    nadando?: string
  }
  /** Frente local do modelo, em radianos. Não modifica o GLB. */
  giroDoModelo?: number
}
export interface EntradaDoTeste {
  frente: number
  lado: number
  vertical: number
  correr: boolean
  saltar: boolean
}
export interface MedidaDoPercurso {
  estado: 'parado' | 'medindo' | 'concluido'
  inicio: PontoDoTeste | null
  fim: PontoDoTeste | null
  direta: number
  caminhada: number
  segundos: number
}
export interface EstadoDoTeste {
  modo: ModoDoTeste
  pausado: boolean
  caiu: boolean
  noChao: boolean
  nadando: boolean
  posicao: PontoDoTeste
  altura: number
  velocidade: number
  clipes: readonly string[]
  percurso: MedidaDoPercurso
}
export interface ComandoDoTeste {
  modo?: ModoDoTeste
  pausado?: boolean
  retomarInicio?: boolean
  percurso?: 'iniciar' | 'finalizar' | 'zerar'
  clipes?: ConfiguracaoDoTeste['clipes']
}
