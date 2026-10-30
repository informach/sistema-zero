import {
  type ContextoDaColheita,
  ilhaAberta,
  type Salvamento,
} from '@sistemazero/arquipelago-contracts'

/** Só as Nuvens habilitam o clima. A escolha guardada antes disso não concede bônus. */
export function contextoDaColheita(s: Salvamento, jornada: number): ContextoDaColheita {
  return {
    clima: ilhaAberta('nuvens', jornada) ? s.clima : null,
    necessidades: s.necessidades,
  }
}
