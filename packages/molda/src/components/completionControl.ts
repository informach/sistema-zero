/** Snapshot exato já salvo, ou null quando a galeria está aberta. */
export interface MoldaCompletionControl {
  flush(): Promise<{ id: string; json: string } | null>
}
