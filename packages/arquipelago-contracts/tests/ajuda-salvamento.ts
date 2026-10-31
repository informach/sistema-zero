import {
  criarSalvamentoInicial,
  type SalvamentoV14,
  type SalvamentoV17,
  type SalvamentoV18,
  type SalvamentoV19,
  type SalvamentoV20,
  type SalvamentoV21,
} from '../src/salvamento'

/** O salvamento inicial na V21 (sem os fósseis do museu e a florada da V22). */
export function inicialV21(agora: Date): SalvamentoV21 {
  const { florada: _florada, ceu: _ceu, ...atual } = criarSalvamentoInicial(agora)
  const { fosseis: _fosseis, ...vale } = atual.vale
  return { ...atual, versao: 21, vale, percursos: {} }
}

/** O salvamento inicial na V20 (sem o Nico entre os moradores, da V21). */
export function inicialV20(agora: Date): SalvamentoV20 {
  const atual = inicialV21(agora)
  const { nico: _nico, ...moradores } = atual.moradores
  return { ...atual, versao: 20, moradores, companhia: 'quarto' }
}

/** O salvamento inicial na V19 (sem a galeria do Farol nem os móveis da V20). */
export function inicialV19(agora: Date): SalvamentoV19 {
  const atual = inicialV20(agora)
  const { galeria: _galeria, ...farol } = atual.farol
  return { ...atual, versao: 19, farol, construcao: { casa: null, cabanas: {} } }
}

/** O salvamento inicial na V18 (sem os campos da V19): base das versões antigas. */
export function inicialV18(agora: Date): SalvamentoV18 {
  const {
    chaves: _chaves,
    segredos: _segredos,
    mapa: _mapa,
    companhia: _companhia,
    ...atual
  } = inicialV19(agora)
  return { ...atual, versao: 18 }
}

export function inicialV17(agora: Date): SalvamentoV17 {
  const { ilhasVisitadas: _visitas, ...atual } = inicialV18(agora)
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
