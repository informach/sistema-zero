import type { Porto, PortoId } from '../sistemas/barco'
import dados from './portos-da-arte.json'

/** Apenas âncoras, extraídas dos GLBs pelo gerador e conferidas antes de cada build. */
export const PORTOS_DA_ARTE: Record<PortoId, Porto> = dados
