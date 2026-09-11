import { COPY } from './copy'
import { SCENE_PAINT_COPY } from './scenePaintCopy'

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
  // ⚠️ Os rótulos NÃO repetem o nome das abas (Modelar, Pintar, Animar): dois botões com o
  // mesmo nome na mesma tela confundem a criança e o leitor de tela igual.
  tracks: {
    model: {
      label: 'Como montar',
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
      label: 'Como pintar',
      steps: [
        {
          title: 'Escolha a peça',
          text: `Toque em “${SCENE_PAINT_COPY.tab}” no alto e depois toque na peça que você quer pintar. Ela fica pronta para receber tinta sem mudar de cor.`,
        },
        {
          title: 'Escolha a cor',
          text: `Toque numa das cores embaixo do palco. Do lado ficam “${scene.paintPencil}”, “${scene.paintEraser}”, “${scene.paintFill}” e “${scene.paintPicker}”.`,
        },
        {
          title: 'Faça o primeiro traço',
          text: `Arraste na peça para pintar. Para girar a câmera, arraste fora dela. “${COPY.editor.undo}” volta o traço inteiro de uma vez.`,
        },
      ],
    },
    skin: {
      label: 'Como articular',
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
      label: 'Como animar',
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
