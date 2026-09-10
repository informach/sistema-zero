import { COPY } from './copy'

const scene = COPY.scene

export const SCENE_FIRST_STEPS_COPY = {
  open: 'Primeiros passos',
  close: 'Fechar dicas',
  title: 'Uma dica de cada vez',
  topics: 'Sobre o que você quer uma dica?',
  previous: 'Dica anterior',
  next: 'Próxima dica',
  position: (index: number, count: number) => `Dica ${index + 1} de ${count}`,
  hint: 'Leia no seu ritmo. As dicas não mudam sua criação.',
  tracks: {
    model: {
      label: 'Montar',
      steps: [
        {
          title: 'Comece com uma peça',
          text: `Em “${scene.add}”, escolha “${COPY.shapes.box}”. Você pode começar só com ela e acrescentar outras formas depois.`,
        },
        {
          title: 'Dê forma à sua ideia',
          text: `Toque na peça para escolher. Use “${scene.move}”, “${scene.rotate}” ou “${scene.scale}” e arraste as alças coloridas.`,
        },
        {
          title: 'Experimente outra versão',
          text: `Com uma peça escolhida, use “${scene.duplicate}”. Mova a cópia para outro lugar. “${COPY.editor.undo}” volta uma mudança; “${COPY.editor.redo}” a traz de volta.`,
        },
      ],
    },
    paint: {
      label: 'Pintar',
      steps: [
        {
          title: 'Escolha onde pintar',
          text: `Escolha uma peça e abra “${scene.appearanceTitle}” no painel de propriedades. Se o painel estiver fechado, use “${COPY.editor.model.inspector.open}”.`,
        },
        {
          title: 'Prepare sua imagem',
          text: `Se ainda não houver imagem, abra “${scene.imageCreate}” e use “${scene.imageCreateApply}”. Em “${scene.imageLayers}”, escolha uma camada e use “${scene.paintLayer}”.`,
        },
        {
          title: 'Faça o primeiro traço',
          text: `Escolha uma cor e “${scene.paintPencil}”. Arraste na imagem ou escolha “${scene.paintOnModel}” para pintar na peça. Para girar a câmera, use “${scene.paintLook}”. Um traço pode ser desfeito de uma vez.`,
        },
      ],
    },
    skin: {
      label: 'Articular',
      steps: [
        {
          title: 'Prepare os apoios',
          text: `Em “${scene.add}”, acrescente pontos de apoio onde a peça deve dobrar. Posicione os apoios antes de criar o vínculo.`,
        },
        {
          title: 'Ligue a forma aos ossos',
          text: `Escolha uma peça de malha e abra “${scene.skinBinding.open}”. Marque os apoios, prepare a sugestão e confira antes de aplicar. Cada ponto da forma passa a acompanhar os ossos escolhidos.`,
        },
        {
          title: 'Ajuste como a peça dobra',
          text: `Abra a forma-base e “${scene.weightMap.title}”. Escolha um osso e use “${scene.skinPaint.add}” ou “${scene.skinPaint.subtract}”. Um traço pode ser desfeito inteiro. Em Animar, mova os apoios para experimentar a dobra.`,
        },
      ],
    },
    animation: {
      label: 'Animar',
      steps: [
        {
          title: 'Dê um nome ao movimento',
          text: `Abra “${scene.animationMode}”, escreva o nome e use “${scene.animationCreate}”. Escolha uma peça. A forma original fica guardada enquanto você prepara o movimento.`,
        },
        {
          title: 'Guarde o começo',
          text: `No começo da linha do tempo, use “${scene.animationRecord}” no painel da peça para guardar a posição inicial. Uma chave guarda um valor naquele momento.`,
        },
        {
          title: 'Experimente o próximo momento',
          text: `Escolha outro tempo, use “${scene.move}” e arraste uma alça. Use “${scene.animationPoseRecord}” para guardar a prévia. Depois, “${scene.animationPlay}” mostra o caminho entre os momentos.`,
        },
      ],
    },
  },
} as const

export type SceneFirstStepsTopic = keyof typeof SCENE_FIRST_STEPS_COPY.tracks
