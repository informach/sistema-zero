/**
 * Gestos que o Na tela do vídeo de uma experiência não pode ter (decisão de 09/11/2026): o vídeo
 * só amplia a experiência e mostra a cena parada. Só a indicação exata do mascote é apresentação;
 * outros alvos continuam sendo controles. Usado por `convite-da-experiencia.test.ts` e
 * `video-experiencia.test.ts`.
 */
export const GESTO_NA_TELA =
  /\[(?:apontar(?! zappy\])|tocar|clicar|arrastar|encaixar|escolher|trocar)\b/
