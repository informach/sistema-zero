/**
 * O mundo em que o jogo roda. Hoje é sempre o `MUNDO_ATUAL` (as ilhas da ponte de 1,85). Só o
 * playground troca: a página dele põe `globalThis.__arquipelagoMundo` antes de carregar o jogo, a
 * partir de `?mundo=aventura`, para a equipe sentir as regras do mundo novo (`MUNDO_DA_AVENTURA`,
 * tiradas das animações). A plataforma nunca escreve essa chave.
 *
 * É lido UMA vez, ao carregar: `CORPO`, `GRAVIDADE` e o cipó são constantes de módulo. A troca de
 * mundo com o jogo aberto chega com os mundos novos.
 */
import { MUNDO_DA_AVENTURA } from '../sistemas/mundo-pela-animacao'
import { MUNDO_ATUAL, type MundoDoJogo } from './mundo-do-jogo'

/** Os mundos que o playground pode pedir, pelo nome em `?mundo=`. */
export const MUNDOS_DO_PLAYGROUND: Readonly<Record<string, MundoDoJogo>> = {
  aventura: MUNDO_DA_AVENTURA,
}

export function mundoPedido(pedido: unknown): MundoDoJogo {
  if (typeof pedido !== 'string' || !Object.hasOwn(MUNDOS_DO_PLAYGROUND, pedido)) return MUNDO_ATUAL
  return MUNDOS_DO_PLAYGROUND[pedido] ?? MUNDO_ATUAL
}

export const MUNDO: MundoDoJogo = mundoPedido(
  (globalThis as { __arquipelagoMundo?: unknown }).__arquipelagoMundo,
)
