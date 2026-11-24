import { CenarioInvalido } from '../validacao'
import { criarDocumentoVazio, type DocumentoDeCenario } from './documento'
import { capturarConteudoDeConjunto, colarFragmento, validarConteudoDeConjunto } from './fragmento'
import type { FragmentoBasico } from './fragmento-base-schema'
import { entidadesDoCenario } from './organizacao'
import { volumeNoMundo } from './organizar'

/** Mesma oficina e histórico; a definição trabalha no seu espaço local, com pivô estável. */
export function documentoParaEditarConjunto(
  conteudo: FragmentoBasico,
  id: string,
  nome: string,
  espaco: string,
): DocumentoDeCenario {
  const f = validarConteudoDeConjunto(conteudo, espaco)
  const d = colarFragmento(criarDocumentoVazio(id, nome), f, 'conteudo', { x: 0, y: 0, z: 0 })
  const volumes = d.instancias.map((o) => volumeNoMundo(d, o))
  const dimensao = (eixo: 'x' | 'z') => {
    const extensao =
      2 * Math.max(...volumes.flatMap((v) => [Math.abs(v.min[eixo]), Math.abs(v.max[eixo])]))
    if (extensao > 8192)
      throw new CenarioInvalido(['O conjunto é maior que a área máxima de edição'])
    return Math.min(8192, Math.max(32, Math.ceil(extensao + 16)))
  }
  d.base = { tipo: 'plano', largura: dimensao('x'), comprimento: dimensao('z') }
  return d
}

export function conferirFormatoDoCenarioDeConjunto(d: DocumentoDeCenario): void {
  if (d.base.tipo !== 'plano' || d.caminhos.length || d.aguas.length || d.marcadores.length)
    throw new CenarioInvalido([
      'O conjunto reúne objetos e pastas. Edite terreno, água e caminhos no cenário.',
    ])
}

export function conteudoDoCenarioDeConjunto(
  d: DocumentoDeCenario,
  espaco: string,
): FragmentoBasico {
  conferirFormatoDoCenarioDeConjunto(d)
  const raizes = entidadesDoCenario(d)
    .filter((e) => !e.grupo)
    .map((e) => e.id)
  const f = capturarConteudoDeConjunto(d, raizes, espaco)
  // Não recentralizar pelo bounding box depois de acrescentar/remover uma peça de borda.
  return validarConteudoDeConjunto({ ...f, ancora: { x: 0, y: 0, z: 0 } }, espaco)
}
