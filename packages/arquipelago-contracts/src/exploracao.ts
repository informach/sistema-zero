import { z } from 'zod'
import type { IlhaId } from './ilhas'

/** Bits duráveis da V18. Nunca reordenar ou reutilizar um bit de ilha removida. */
export const BIT_DA_ILHA: Readonly<Record<IlhaId, number>> = {
  'sua-ilha': 1,
  bosque: 2,
  'vila-doce': 4,
  recife: 8,
  pico: 16,
  'vale-dos-dinos': 32,
  nuvens: 64,
  farol: 128,
}

export function ilhaVisitada(visitas: number, ilha: IlhaId): boolean {
  return (visitas & BIT_DA_ILHA[ilha]) !== 0
}

/**
 * V19: os cômodos da casa da Íris que começam cinzas. Cada um tem uma chave escondida na sua
 * ilha; achar a chave dá cor ao cômodo. Nunca reordenar nem reutilizar um bit.
 */
export const COMODOS_DA_IRIS = ['cozinha', 'sala', 'banheiro', 'quintal'] as const
export type ComodoDaIris = (typeof COMODOS_DA_IRIS)[number]
export const BIT_DO_COMODO: Readonly<Record<ComodoDaIris, number>> = {
  cozinha: 1,
  sala: 2,
  banheiro: 4,
  quintal: 8,
}

export function chaveAchada(chaves: number, comodo: ComodoDaIris): boolean {
  return (chaves & BIT_DO_COMODO[comodo]) !== 0
}

/**
 * V19: cada segredo das ilhas tem um bit fixo, dado na lista de segredos do jogo. Cabem até 24
 * (o bit mais alto é `BIT_DA_SEGREDO_MAXIMO`).
 */
export const BIT_DA_SEGREDO_MAXIMO = 2 ** 23

/** As ilhas com mapa que se revela andando (o Farol fica na sua ilha). */
export const MAPAS_DAS_ILHAS = [
  'sua-ilha',
  'bosque',
  'vila-doce',
  'recife',
  'pico',
  'vale-dos-dinos',
  'nuvens',
] as const satisfies readonly IlhaId[]
export type IlhaComMapa = (typeof MAPAS_DAS_ILHAS)[number]

/** Lado da grade do mapa de cada ilha: 8 × 8 células, 64 bits em 16 dígitos hexadecimais. */
export const LADO_DO_MAPA = 8
export const MAPA_VAZIO = '0000000000000000'
export const MapaDaIlhaSchema = z.string().regex(/^[0-9a-f]{16}$/)

/** Junta dois mapas da mesma ilha (uma célula vista continua vista). */
export function juntarMapas(a: string | undefined, b: string | undefined): string {
  const x = BigInt(`0x${a ?? MAPA_VAZIO}`) | BigInt(`0x${b ?? MAPA_VAZIO}`)
  return x.toString(16).padStart(16, '0')
}

/** Quem acompanha a criança pela ilha até a V20: os bichinhos do quarto ou o bicho adotado. */
export const COMPANHIAS_ATE_V20 = ['quarto', 'adotado'] as const
/** Desde a V21 (§6.28, A7), também o filhote do Vale, o dino de estimação. */
export const COMPANHIAS = [...COMPANHIAS_ATE_V20, 'filhote'] as const
export type Companhia = (typeof COMPANHIAS)[number]
