/**
 * Torna INERTE tudo o que está fora de `element`, subindo a árvore até o `<html>` (o jogo
 * pronto ampliado faz isso: o iframe tem teclado próprio, e o Tab não pode sair dele para a aula
 * escondida embaixo). Devolve a função que desfaz, restaurando o `inert` que cada um tinha.
 *
 * ⚠️ O que casa com `keep` (o lugar do vídeo flutuante, 03/10/2026) e o CAMINHO até ele ficam de
 * fora: inerte, o flutuante aparecia por cima e não recebia clique nenhum. Os irmãos desse
 * caminho continuam inertes, então só o vídeo escapa.
 */
export function inertOutside(element: HTMLElement, keep: string): () => void {
  const changed = new Map<HTMLElement, boolean>()
  const mark = (target: HTMLElement) => {
    if (!changed.has(target)) changed.set(target, target.inert)
    target.inert = true
  }
  const markAllBut = (container: Element) => {
    for (const child of container.children) {
      if (!(child instanceof HTMLElement) || child.matches(keep)) continue
      if (child.querySelector(keep)) markAllBut(child)
      else mark(child)
    }
  }
  let node: HTMLElement | null = element
  while (node?.parentElement) {
    for (const sibling of node.parentElement.children) {
      if (!(sibling instanceof HTMLElement) || sibling === node || sibling.matches(keep)) continue
      if (sibling.querySelector(keep)) markAllBut(sibling)
      else mark(sibling)
    }
    node = node.parentElement
  }
  return () => {
    for (const [target, inert] of changed) target.inert = inert
  }
}
