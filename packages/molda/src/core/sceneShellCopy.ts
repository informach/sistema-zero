/**
 * Os rótulos da CASCA da oficina: o que abre e recolhe os agrupamentos que flutuam sobre o
 * palco.
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
} as const
