/**
 * A aba Pintar e a cor da peça no Modelar. Os nomes das ferramentas (Lápis, Borracha, Balde,
 * Conta-gotas) continuam os de `COPY.scene`: são os mesmos da pintura de sempre.
 */
import { COPY } from './copy'

export const SCENE_PAINT_COPY = {
  tab: 'Pintar',
  tools: 'Ferramentas de pintura',
  widths: 'Largura do traço',
  width: { 1: 'Fino', 2: 'Médio', 3: 'Grosso' } as Record<1 | 2 | 3, string>,
  colors: 'Cores',
  rotate: 'Girar a pintura da face',
  rotateHint: 'Toque numa face para girar a pintura dela.',
  closeUp: 'Pintar de perto',
  closeUpHint: 'Toque numa face para pintar ela de perto.',
  closeUpBack: 'Voltar ao modelo',
  closeUpSheet: 'A face, de perto',
  mirror: 'Espelho de pintura',
  mirrorHint:
    'Pinta também o outro lado da mesma peça. Duas peças soltas não se espelham: para isso, use o “Criar espelho” do Modelar.',
  /** A linha que aparece com o espelho ligado (a dica do botão só aparece com o mouse). */
  mirrorOn: 'Espelho ligado: pinta também o outro lado desta peça.',
  mirrorCloseUp: 'De perto, o espelho não vale: ele pinta o outro lado no palco.',
  faceOnly: 'Toque numa face da peça, no palco.',
  rotateOnlyRect: 'Só dá para girar a pintura de faces de quatro cantos.',
  /** Quando o caminho que o erro aponta ainda não abriu para a criança. */
  lockedMaps:
    'Esta peça tem uma pintura especial (relevo ou brilho) que abre num nível mais para frente. Escolha outra peça para pintar.',
  lockedLayers:
    'A pintura desta peça está escondida, e mostrar ela abre num nível mais para frente. Escolha outra peça para pintar.',
  /** As dicas do caminho da criança: uma face por vez, sem camada nem pixel. */
  fillHint: 'Toque numa face para encher a parte dela que tem a mesma cor.',
  pickerHint: 'Toque na peça para pegar a cor de lá e voltar ao lápis.',
  choosePiece: 'Toque numa peça para pintar.',
  modelHint: `Arraste na peça para pintar. Para girar a câmera, arraste fora dela ou escolha “${COPY.scene.paintLook}”.`,
  more: 'Mais jeitos de pintar',
  /** "Mais jeitos de pintar" sem peça escolhida: o painel não fica vazio e mudo. */
  moreChoose: 'Toque numa peça para ver os outros jeitos de pintar nela.',
  crooked: (count: number) =>
    count === 1
      ? 'Uma face desta peça está torta, e a tinta ficaria em cima de outra.'
      : `${count} faces desta peça estão tortas, e a tinta ficaria em cima de outras.`,
  split: 'Dividir essas faces em triângulos e pintar',
  pieceColor: 'Cor da peça',
  finish: 'Acabamento',
} as const
