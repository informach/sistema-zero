/**
 * O ponto de partida do Python (D5 do redesenho do clássico, 11/2026): "Desenho com a tartaruga"
 * e "Jogo com Pygame Zero" só INSTALAM a extensão no projeto novo, nunca criam código nem áreas.
 * A criação acontece na lista de projetos, onde ainda não há o ambiente Python que confere a
 * extensão; então a lista deixa o pedido aqui e o editor do Python instala ao abrir o projeto,
 * pelo mesmo caminho da janela de extensões. Um pedido vale uma vez; sem ambiente (ou com a
 * extensão não liberada), ele cai e a criança instala por "Mais blocos".
 */
const pending = new Map<string, string>()

export function requestPythonStartingExtension(projectId: string, extensionId: string): void {
  pending.set(projectId, extensionId)
}

export function hasPythonStartingExtension(projectId: string): boolean {
  return pending.has(projectId)
}

export function takePythonStartingExtension(projectId: string): string | undefined {
  const id = pending.get(projectId)
  pending.delete(projectId)
  return id
}
