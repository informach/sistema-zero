/** Contrato interno do ciclo de vida compartilhado pelo gerador, runtime e testes. */
export interface GameTwoDLifecycleApi {
  gameLoop(fn: () => void, id?: string): () => void
  onStart(fn: () => void, id?: string): void
  onPointer(fn: (x: number, y: number) => void, id?: string): void
  onKey(key: string, fn: () => void, id?: string): void
  pointer: { x: number; y: number; down: boolean }
  restart(): void
  setupStage(width: number, height: number, background: string): void
  sceneIs(name: string): boolean
}
