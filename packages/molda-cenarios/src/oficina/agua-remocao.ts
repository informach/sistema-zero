import {
  type ComandoDeCenario,
  type DocumentoDeCenario,
  indiceDaOrganizacao,
  transformacaoResolvida,
} from '@sistemazero/molda-cenarios-core/v2'

/** Remove a água conservando a pose mundial dos objetos que ela apoiava. */
export function comandosParaRemoverAgua(doc: DocumentoDeCenario, id: string): ComandoDeCenario[] {
  if (!doc.aguas.some((a) => a.id === id)) throw Error('Esta água não está mais no cenário.')
  const flags = indiceDaOrganizacao(doc).flags,
    objetos = doc.instancias.filter((o) => o.apoio.tipo === 'agua' && o.apoio.agua === id)
  if (flags.get(id)?.bloqueado || objetos.some((o) => flags.get(o.id)?.bloqueado))
    throw Error('Destranque a água e os objetos apoiados antes de removê-la.')
  return [
    ...objetos.map(
      (o): ComandoDeCenario => ({
        tipo: 'instancia.atualizar',
        id: o.id,
        alteracoes: { transformacao: transformacaoResolvida(doc, o), apoio: { tipo: 'absoluto' } },
      }),
    ),
    { tipo: 'agua.remover', id },
  ]
}
