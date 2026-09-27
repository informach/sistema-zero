/**
 * Os rótulos do chevron que abre e recolhe um `Panel`.
 *
 * Vive num arquivo próprio, e não no `copy.ts`, seguindo o que o pacote já faz com
 * `sceneFirstStepsCopy`, `gltfImportCopy`, `objImportCopy` e as outras satélites: o
 * `copy.ts` tem 1.866 linhas e é editado por mais de uma frente ao mesmo tempo, então
 * acrescentar chave lá é conflito garantido. Aqui é um arquivo novo, de ninguém.
 *
 * São FUNÇÕES do título porque o rótulo do chevron precisa dizer DE QUE painel ele é: numa
 * coluna com seis painéis, seis botões chamados "Mostrar" não distinguem nada para quem usa
 * leitor de tela, e é justamente aí que o redesenho recolhe mais coisa.
 */
export const PANEL_COPY = {
  expand: (title: string): string => `Mostrar ${title}`,
  collapse: (title: string): string => `Recolher ${title}`,
} as const
