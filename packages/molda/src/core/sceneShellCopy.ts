/**
 * Os rótulos da CASCA da oficina: o que abre e recolhe os agrupamentos que flutuam sobre o
 * palco, e os títulos das regiões do desenho das telas-modelo (11/09/2026).
 *
 * Vive num arquivo próprio, e não no `copy.ts`, pelo mesmo motivo do `panelCopy.ts`: o
 * `copy.ts` passa de 1.800 linhas e é editado por mais de uma frente ao mesmo tempo, então
 * chave nova lá é conflito garantido. Aqui é arquivo novo, de ninguém.
 *
 * `camera` é FUNÇÃO da vista atual porque o botão precisa dizer de onde a criança está
 * olhando sem que ela abra nada: "Vista: Frente" é o estado, não só o convite. E o prefixo
 * impede que o botão que ABRE a lista tenha o mesmo nome acessível de um dos itens DENTRO
 * dela, que é o que tornaria "Livre" ambíguo para quem usa leitor de tela.
 */
export const SCENE_SHELL_COPY = {
  camera: (view: string): string => `Vista: ${view}`,
  stageSettings: 'Mais ajustes do palco',
  /** A coluna da esquerda do Modelar, como na tela-modelo. */
  tools: 'Ferramentas',
  /** O que a criança usa menos: a caixa e o laço, os grupos e a malha. */
  moreTools: 'Mais ferramentas',
  /** A faixa de baixo do Modelar sem peça escolhida: ela nunca some, para o palco não pular. */
  surfaceHint: 'Escolha uma peça para mudar a cor e o acabamento dela.',
  /** O rótulo da faixa de baixo para quem usa leitor de tela. */
  surface: 'Cor e acabamento da peça',
  /** A faixa das ferramentas do Animar, à esquerda do palco. */
  animationTools: 'Ferramentas do movimento',
  /** O nome curto do botão vermelho do cartão da peça (o acessível é "Apagar seleção"). */
  removeShort: 'Apagar',
  duplicateHint: 'Duplicar (Ctrl+D)',
  /** Os eixos como a criança os chama, na legenda do palco e nas linhas do painel. */
  axes: ['lado', 'altura', 'frente e fundo'] as const,
  /** O selo do salvamento no cabeçalho (o texto inteiro fica no `title` e no menu). */
  saveShort: {
    saved: 'Salvo',
    saving: 'Salvando',
    error: 'Não salvou',
    pose: 'Pose por marcar',
  },
  posePendingSave: 'Esta pose ainda não foi marcada. Marque a pose para guardá-la no projeto.',
  /** O `title` do "Olhar" ligado: como voltar a criar. */
  looking: 'Olhando o modelo. Clique numa ferramenta para voltar.',
  placeOnGround: 'Colocar no chão',
  placeOnTop: 'Colocar em cima',
} as const
