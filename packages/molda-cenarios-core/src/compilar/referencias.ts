import { documentoDaDefinicao } from '../v2/conjuntos'
import type { DefinicaoDeConjunto } from '../v2/conjuntos-schema'
import type { DocumentoDeCenario, ModeloDoCenario, TexturaDoCenario } from '../v2/documento'
import type { FormaDeCenario } from '../v2/formas'
import { indiceDaOrganizacao } from '../v2/organizacao'
import { referenciasDoTerreno } from '../v2/recursos-de-terreno'

/** Seleção de referências de um documento já validado, sem resolver posições.
 * Usada pela autorização no servidor e pela preparação do compilador. Nenhuma
 * altura fictícia é necessária para descobrir quais arquivos serão distribuídos. */
export function referenciasDaCenaParaCompilacao(documento: DocumentoDeCenario) {
  const modelos: ModeloDoCenario[] = [],
    texturas: TexturaDoCenario[] = [],
    formas: FormaDeCenario[] = [],
    conjuntos: DefinicaoDeConjunto[] = [],
    bibliotecas = new Set<string>()
  const incluir = (doc: DocumentoDeCenario) => {
    const indice = indiceDaOrganizacao(doc),
      visivel = (e: { id: string }) => !indice.flags.get(e.id)?.oculto,
      idsModelos = new Set<string>(),
      idsTexturas = new Set<string>()
    for (const o of doc.instancias.filter(visivel)) {
      idsModelos.add(o.modelo)
      if (o.aparencia?.textura) idsTexturas.add(o.aparencia.textura.id)
    }
    for (const a of doc.aguas.filter(visivel))
      if ((a.tipo === 'lago' || a.tipo === 'represa') && a.modelo) idsModelos.add(a.modelo)
    for (const c of doc.caminhos.filter(visivel)) {
      if (c.acabamento) idsModelos.add(c.acabamento)
      if (c.aparencia?.textura) idsTexturas.add(c.aparencia.textura.id)
    }
    if (doc.base.tipo === 'terreno')
      for (const c of doc.base.solo?.camadas ?? []) if (c.textura) idsTexturas.add(c.textura.id)
    if (doc.iluminacao.ceu?.tipo === 'panorama') idsTexturas.add(doc.iluminacao.ceu.textura)
    modelos.push(...doc.modelos.filter((m) => idsModelos.has(m.id)))
    formas.push(...(doc.formas ?? []).filter((f) => idsModelos.has(f.id)))
    texturas.push(...(doc.texturas ?? []).filter((t) => idsTexturas.has(t.id)))
    return indice
  }
  const indice = incluir(documento),
    definicoes = new Map(documento.definicoesConjuntos?.map((d) => [d.id, d])),
    usadas = new Set(
      documento.montagens?.filter((m) => !indice.flags.get(m.id)?.oculto).map((m) => m.definicao),
    )
  for (const id of usadas) {
    const d = definicoes.get(id)
    if (!d) throw Error('A definição do conjunto não está disponível para a compilação.')
    conjuntos.push(d)
    bibliotecas.add(d.biblioteca)
    incluir(documentoDaDefinicao(d.conteudo))
  }
  for (const r of [...modelos, ...texturas]) bibliotecas.add(r.biblioteca)
  return {
    modelos,
    texturas,
    formas,
    conjuntos,
    bibliotecas: [...bibliotecas].sort(),
    terreno: documento.base.tipo === 'terreno' ? referenciasDoTerreno(documento.base) : [],
  }
}
