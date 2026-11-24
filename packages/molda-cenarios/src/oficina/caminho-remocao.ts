import {
  type ComandoDeCenario,
  type DocumentoDeCenario,
  type FonteDeAlturas,
  indiceDaOrganizacao,
  transformacaoResolvida,
} from '@sistemazero/molda-cenarios-core/v2'

/** Libera somente dependentes que sobrevivem à remoção, conservando a pose realmente visível. */
export function comandosParaRemoverCaminho(
  doc: DocumentoDeCenario,
  id: string,
  fonte?: FonteDeAlturas,
  tambemRemovidos: ReadonlySet<string> = new Set(),
): ComandoDeCenario[] {
  const caminho = doc.caminhos.find((c) => c.id === id)
  if (!caminho) throw Error('Este caminho não está mais no cenário.')
  const flags = indiceDaOrganizacao(doc).flags,
    objetos = doc.instancias.filter(
      (o) => !tambemRemovidos.has(o.id) && o.apoio.tipo === 'objeto' && o.apoio.objeto === id,
    )
  if (flags.get(id)?.bloqueado || objetos.some((o) => flags.get(o.id)?.bloqueado))
    throw Error('Destranque o caminho e os objetos apoiados antes de removê-lo.')
  if (objetos.length && doc.base.tipo === 'terreno' && !fonte)
    throw Error('Aguarde o terreno carregar antes de liberar os objetos apoiados.')
  if (
    caminho.acabamento &&
    !fonte?.parteDoCaminho &&
    objetos.some((o) => o.apoio.tipo === 'objeto' && o.apoio.parte?.startsWith('pilar/'))
  )
    throw Error('Aguarde a ponte carregar antes de liberar os objetos apoiados.')
  return [
    ...objetos.map(
      (o): ComandoDeCenario => ({
        tipo: 'instancia.atualizar',
        id: o.id,
        alteracoes: {
          transformacao: transformacaoResolvida(doc, o, fonte),
          apoio: { tipo: 'absoluto' },
        },
      }),
    ),
    { tipo: 'caminho.remover', id },
  ]
}
