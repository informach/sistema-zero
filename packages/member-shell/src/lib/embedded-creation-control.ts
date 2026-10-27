/** Controle do host para confirmar uma criação antes de devolvê-la ao jogo. */
export interface EmbeddedCreationControl {
  concluir(): Promise<string | null>
}
