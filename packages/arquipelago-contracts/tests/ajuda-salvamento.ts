import { criarSalvamentoInicial, type SalvamentoV14 } from '../src/salvamento'

/**
 * O salvamento inicial na V14 (sem o filhote do Vale, que é da V15): a base dos testes das
 * versões antigas, que montam a versão delas a partir dele.
 */
export function inicialV14(agora: Date): SalvamentoV14 {
  const { nuvens: _nuvens, farol: _farol, clima: _clima, ...atual } = criarSalvamentoInicial(agora)
  const { filhote: _filhote, ...vale } = atual.vale
  return { ...atual, percursos: {}, versao: 14, vale }
}
