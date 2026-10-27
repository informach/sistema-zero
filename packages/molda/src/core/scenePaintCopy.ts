/**
 * A aba Pintar e a cor da peça no Modelar. Os nomes das ferramentas (Lápis, Borracha, Balde,
 * Conta-gotas) continuam os de `COPY.scene`: são os mesmos da pintura de sempre.
 */

export const SCENE_PAINT_COPY = {
  tab: 'Pintar',
  tools: 'Ferramentas',
  widths: 'Tamanho',
  helps: 'Ajudas',
  onlyThisPiece: 'Só nesta peça',
  onlyThisPieceHint: 'Ligado, o pincel só pinta a peça escolhida. Desligado, pinta qualquer peça.',
  eraseHow: 'Como apagar',
  eraseModes: { paint: 'Apagar tinta', cutout: 'Deixar vazado' },
  useImage: 'Usar imagem',
  pieceCard: 'Pintura da peça',
  choosePieceAll: 'Pinte direto no modelo. Toque numa peça para ver as opções dela.',
  fillHow: 'O que encher',
  fillScopes: { area: 'Só esta área', base: 'Fundo da peça' },
  width: { 1: '1 px', 2: '2 px', 3: '3 px' } as Record<1 | 2 | 3, string>,
  colors: 'Cores',
  chooseColor: 'Escolha uma cor',
  currentColor: 'Cor escolhida',
  customColor: 'Criar outra cor',
  customColorName: 'Cor personalizada',
  recentColors: 'Usadas agora',
  saveColor: 'Guardar cor favorita',
  moreWorkspaces: 'Mais ferramentas',
  directPaint: 'Pinte direto no modelo',
  instructions: {
    pencil: 'Escolha uma cor e arraste sobre a peça.',
    eraser: 'Arraste para apagar a tinta. A cor de baixo aparece.',
    cutout: 'Arraste para deixar os quadradinhos vazados. Pinte por cima para preencher de novo.',
    fill: 'Escolha uma cor e clique na área que quer preencher.',
    base: 'Clique na peça para trocar a cor de baixo do desenho.',
    picker: 'Clique em uma cor do modelo. Depois, continue com o Pincel.',
    closeup: 'Clique em uma face para pintar de perto.',
    rotate: 'Clique em uma face para girar a pintura dela.',
  },
  rotate: 'Girar a pintura da face',
  rotateHint: 'Toque numa face para girar a pintura dela.',
  closeUp: 'Pintar de perto',
  closeUpHint: 'Toque numa face para pintar ela de perto.',
  closeUpBack: 'Voltar ao modelo',
  closeUpSheet: 'A face, de perto',
  pixelHint: 'Pinte os quadradinhos. A pintura aparece no modelo 3D.',
  pixelGrid: 'Grade de pixels',
  zoomIn: 'Aumentar zoom dos pixels',
  zoomOut: 'Diminuir zoom dos pixels',
  fitPixels: 'Ajustar',
  pixelKeyboard: 'Setas movem o cursor. Espaço pinta.',
  simpleUv: 'Organizar quadradinhos',
  simpleUvHint:
    'Reorganiza os quadradinhos da peça e transfere a pintura. Pode mudar detalhes pequenos. Você pode desfazer.',
  mirror: 'Espelho de pintura',
  /** O nome curto no ladrilho do trilho (o nome acessível segue o `mirror`). */
  mirrorShort: 'Espelhar',
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
  modelHint: 'Arraste na peça para pintar. Para girar, arraste no fundo.',
  more: 'Mais jeitos de pintar',
  /** "Mais jeitos de pintar" sem peça escolhida: o painel não fica vazio e mudo. */
  moreChoose: 'Toque numa peça para ver os outros jeitos de pintar nela.',
  crooked: (count: number) =>
    count === 1
      ? 'Para desenhar nesta peça, precisamos dividir 1 face em triângulos. O formato continua igual. Você pode desfazer.'
      : `Para desenhar nesta peça, precisamos dividir ${count} faces em triângulos. O formato continua igual. Você pode desfazer.`,
  split: 'Preparar para pintar',
  pieceColor: 'Cor da peça',
  finish: 'Acabamento',
} as const
