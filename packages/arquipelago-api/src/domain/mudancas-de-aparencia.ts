import {
  mesmaAparencia,
  migrarSalvamento,
  type OrigemDaAparencia,
  type Salvamento,
} from '@sistemazero/arquipelago-contracts'

export interface MudancaDeAparencia {
  objeto: keyof Salvamento['projetos']
  origem: OrigemDaAparencia
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
      mudancas.push({ objeto, origem: atual.origem })
    }
  }
  return mudancas
}
