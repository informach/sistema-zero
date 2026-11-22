/**
 * As posições das pilhas do topo de um projeto do Estúdio são do organizar-projetos.ts (o "Organizar
 * blocos" do Estúdio, num navegador), não do gerador: o gerador põe cada área num lugar fixo. Um teste que
 * compara o projeto do manifesto com o que o código monta compara sem elas.
 */
type ComTopo = { blocksState?: { blocks?: { blocks?: Record<string, unknown>[] } } }

export function semPosicoesDoTopo<T>(projeto: T): T {
  const copia = structuredClone(projeto) as T & ComTopo
  for (const bloco of copia.blocksState?.blocks?.blocks ?? []) {
    delete bloco.x
    delete bloco.y
  }
  return copia
}
