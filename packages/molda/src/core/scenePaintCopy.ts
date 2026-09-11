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
    'Pinta também o outro lado da mesma peça. Duas peças soltas não se espelham: para isso, use a Simetria.',
  choosePiece: 'Toque numa peça para pintar.',
  modelHint: `Arraste na peça para pintar. Para girar a câmera, arraste fora dela ou escolha “${COPY.scene.paintLook}”.`,
  more: 'Mais jeitos de pintar',
  crooked: (count: number) =>
    count === 1
      ? 'Uma face desta peça está torta, e a tinta ficaria em cima de outra.'
      : `${count} faces desta peça estão tortas, e a tinta ficaria em cima de outras.`,
  split: 'Dividir essas faces em triângulos e pintar',
  pieceColor: 'Cor da peça',
  finish: 'Acabamento',
} as const
