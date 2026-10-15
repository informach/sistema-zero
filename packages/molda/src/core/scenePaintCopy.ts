/**
 * A aba Pintar e a cor da peça no Modelar. Os nomes das ferramentas (Lápis, Borracha, Balde,
 * Conta-gotas) continuam os de `COPY.scene`: são os mesmos da pintura de sempre.
 */

export const SCENE_PAINT_COPY = {
  tab: 'Pintar',
  tools: 'Ferramentas',
  widths: 'Pincel',
  width: { 1: 'Fino', 2: 'Médio', 3: 'Grosso' } as Record<1 | 2 | 3, string>,
  colors: 'Cores',
  rotate: 'Girar a pintura da face',
  rotateHint: 'Toque numa face para girar a pintura dela.',
  closeUp: 'Pintar de perto',
  closeUpHint: 'Toque numa face para pintar ela de perto.',
  closeUpBack: 'Voltar ao modelo',
  closeUpSheet: 'A face, de perto',
  mirror: 'Espelho de pintura',
  /** O nome curto no ladrilho do trilho (o nome acessível segue o `mirror`). */
  mirrorShort: 'Espelhar',
  moreBrushes: 'Mais pincéis',
  mirrorHint:
    'Reflete no eixo X local, pelo meio de cada peça, independentemente do pivô. Duas peças soltas não se espelham: para isso, use o “Criar espelho” do Modelar.',
  /** A linha que aparece com o espelho ligado (a dica do botão só aparece com o mouse). */
  mirrorOn: 'Espelho em X, pelo meio de cada peça.',
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
  pickerHint: 'Clique na cor que quer usar. Depois, continue com o Pincel.',
  choosePiece: 'Toque numa peça para pintar.',
  modelHint: 'Clique e arraste para pintar. Shift: linha reta. Alt: pegar cor.',
  more: 'Camadas e ferramentas de pintura',
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
