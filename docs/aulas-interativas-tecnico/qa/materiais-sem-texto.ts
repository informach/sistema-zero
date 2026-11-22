/**
 * Criança assiste ao vídeo, não lê (decisão da responsável, 22/11/2026). O material de um curso
 * infantil é o livro do Passo a passo do projeto (o PDF, com imagens, `bookPreview`) e os links de
 * ajuda da plataforma; o que a criança precisa saber está no vídeo de cada parte. Nada de bloco de
 * texto para ler: até 22/11 a Ilha, o Jardim, os quatro Poderes e o Meu primeiro desenho levavam o
 * Passo a passo inteiro copiado em texto (de 3,5 mil a 16 mil caracteres) no bloco de materiais.
 *
 * A única linha de texto é o rótulo dos links, a mesma da Chave do Farol. O guarda é
 * `materiais-sem-texto.test.ts`.
 */
export const ROTULO_DOS_LINKS = {
  id: 'texto-ajuda',
  kind: 'text',
  markdown: 'Precisa de ajuda com a plataforma? Abra um destes passo a passo do Como fazer.',
} as const

/** O maior texto que um material de curso infantil pode ter: o tamanho de um rótulo. */
export const TEXTO_MAXIMO_DO_MATERIAL = 120
