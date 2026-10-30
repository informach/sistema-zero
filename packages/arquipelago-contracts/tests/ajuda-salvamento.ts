import { criarSalvamentoInicial, type SalvamentoV14, type SalvamentoV17 } from '../src/salvamento'

export function inicialV17(agora: Date): SalvamentoV17 {
  const { ilhasVisitadas: _visitas, ...atual } = criarSalvamentoInicial(agora)
  return { ...atual, versao: 17 }
}

/**
 * O salvamento inicial na V14 (sem o filhote do Vale, que é da V15): a base dos testes das
 * versões antigas, que montam a versão delas a partir dele.
 */
export function inicialV14(agora: Date): SalvamentoV14 {
  const { nuvens: _nuvens, farol: _farol, clima: _clima, ...atual } = inicialV17(agora)
  const { filhote: _filhote, ...vale } = atual.vale
  return {
    ...atual,
    percursos: {},
    versao: 14,
    vale,
    moradores: { capi: atual.moradores.capi, bento: atual.moradores.bento },
  }
}
