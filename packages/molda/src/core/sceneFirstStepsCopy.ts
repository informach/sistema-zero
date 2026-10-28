import { COPY } from './copy'
import { SCENE_PAINT_COPY } from './scenePaintCopy'
import { SCENE_TOOL_ACCESS_COPY } from './sceneToolAccessCopy'

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
          // “Adicionar” é o título da seção das formas nos dois portões: a criança acha os
          // botões pelo que lê aqui.
          text: `Sua criação nova começa com uma caixa. Em “${SCENE_TOOL_ACCESS_COPY.addShape}”, à esquerda, você pode acrescentar outras formas.`,
        },
        {
          title: 'Dê forma à sua ideia',
          text: `Clique na peça para escolher. Use “${scene.move}”, “${scene.rotate}” ou “${scene.scale}”. Você pode usar as alças coloridas ou os botões do painel direito.`,
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
          text: `Escolha uma cor na barra embaixo do modelo. À esquerda ficam “${scene.paintPencil}”, “${scene.paintFill}”, “${scene.paintEraser}” e “${scene.paintPicker}”.`,
        },
        {
          title: 'Faça o primeiro traço',
          text: `Arraste na peça escolhida para pintar. Use “Olhar” para girar a câmera e depois volte ao Pincel. “${COPY.editor.undo}” volta o traço inteiro de uma vez.`,
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
          title: 'Escolha o que vai se mexer',
          text: `Abra “${scene.animationMode}” e escolha “Esta peça” ou “Modelo inteiro”. Use “${scene.animationCreate}” ou experimente um movimento pronto.`,
        },
        {
          title: 'Crie a próxima pose',
          text: `Use “Próxima pose”, mova as peças e toque em “${scene.animationPoseRecord}”. O começo é guardado automaticamente quando necessário.`,
        },
        {
          title: 'Experimente o próximo momento',
          text: `Você pode ajustar várias peças antes de marcar. “Desfazer” volta só o último ajuste. “${scene.animationPlay}” mostra o movimento; “Mais tempo” acrescenta dois segundos para continuar.`,
        },
      ],
    },
  },
} as const

export type SceneFirstStepsTopic = keyof typeof SCENE_FIRST_STEPS_COPY.tracks
