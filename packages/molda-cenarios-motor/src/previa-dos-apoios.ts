import type { DocumentoDeCenario, FonteDeAlturas } from '@sistemazero/molda-cenarios-core/v2'
import type { Matrix4 } from 'three'
import type { LocalDoObjeto } from './alvos-de-edicao'
import { matrizDoObjeto, transformacaoDaMatriz } from './matematica'

/** Dependentes externos serão atualizados usando os mesmos contatos do núcleo. */
export function prepararPreviaDosApoios(
  doc: DocumentoDeCenario,
  locais: ReadonlyMap<string, LocalDoObjeto>,
  selecionados: readonly string[],
  fonte?: FonteDeAlturas,
  aoAtualizar?: (id: string, matriz: Matrix4) => void,
) {
  const escolhidos = new Set(selecionados),
    filhos = new Map<string, string[]>()
  for (const o of doc.instancias)
    if (o.apoio.tipo === 'objeto' && o.apoio.contato) {
      const lista = filhos.get(o.apoio.objeto) ?? []
      lista.push(o.id)
      filhos.set(o.apoio.objeto, lista)
    }
  const fila = [...selecionados],
    vistos = new Set(fila),
    dependentes: string[] = []
  for (let n = 0; n < fila.length; n++)
    for (const id of filhos.get(fila[n]!) ?? []) {
      if (vistos.has(id)) continue
      vistos.add(id)
      fila.push(id)
      if (!escolhidos.has(id) && locais.has(id)) dependentes.push(id)
    }
  if (!dependentes.length) return () => {}
  // Uma cópia rasa por gesto: a prévia não altera o documento nem clona binários/definições.
  const previa: DocumentoDeCenario = {
    ...doc,
    instancias: doc.instancias.map((o) => ({ ...o })),
    montagens: doc.montagens?.map((m) => ({ ...m })),
  }
  const objetos = new Map(previa.instancias.map((o) => [o.id, o])),
    montagens = new Map(previa.montagens?.map((m) => [m.id, m]))
  return (matrizes: ReadonlyMap<string, Matrix4>) => {
    for (const id of selecionados) {
      const matriz = matrizes.get(id),
        objeto = objetos.get(id),
        montagem = montagens.get(id)
      if (!matriz) continue
      const t = transformacaoDaMatriz(matriz)
      if (objeto) {
        objeto.transformacao = t
        objeto.apoio = { tipo: 'absoluto' }
      } else if (montagem) montagem.transformacao = t
    }
    for (const id of dependentes) {
      const local = locais.get(id)!,
        objeto = objetos.get(id)!
      matrizDoObjeto(previa, objeto, local.matriz, fonte)
      local.lote.atualizar(local.indice, local.matriz)
      aoAtualizar?.(id, local.matriz)
    }
  }
}
