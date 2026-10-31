import { createHash } from 'node:crypto'
import {
  mesmaAparencia,
  migrarSalvamento,
  type OrigemDaAparencia,
  type Salvamento,
} from '@sistemazero/arquipelago-contracts'

export interface MudancaDeAparencia {
  objeto: keyof Salvamento['projetos']
  origem: OrigemDaAparencia
  /** O id da aparência aplicada (A33): o cartão dos pais conta as criações distintas. */
  criacao: string
}

/**
 * A marca de uma aparência para contar criações distintas (A33, 31/10/2026): um resumo do id com
 * o jogador, nunca o id. A mesma criação do mesmo jogador dá sempre a mesma marca; a tabela de
 * mudanças continua sem a identidade da criação (a medição segue sem IDs).
 */
export function marcaDaCriacao(jogadorId: string, criacao: string): string {
  return createHash('sha256').update(`${jogadorId}:${criacao}`).digest('hex').slice(0, 32)
}

/** Aplicações observadas entre saves, nunca prova de criação ou compra. */
export function mudancasDeAparencia(anterior: unknown, proximo: Salvamento): MudancaDeAparencia[] {
  // Importação inicial e base ilegível não provam quando a aparência foi aplicada.
  const base = migrarSalvamento(anterior)
  if (!base) return []
  const mudancas: MudancaDeAparencia[] = []
  for (const objeto of Object.keys(proximo.projetos) as (keyof Salvamento['projetos'])[]) {
    const atual = proximo.projetos[objeto]?.aparencia
    const antes = base.projetos[objeto]?.aparencia
    if (atual && (!antes || !mesmaAparencia(antes, atual))) {
      mudancas.push({ objeto, origem: atual.origem, criacao: atual.id })
    }
  }
  return mudancas
}
