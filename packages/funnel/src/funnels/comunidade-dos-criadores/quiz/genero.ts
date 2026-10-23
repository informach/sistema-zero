// Filho ou filha (decisão da dona, 16/10/2026; na v6, a carta da entrada): o quiz pergunta os dois, e todo texto depois dela
// fala "ela" quando é uma menina. A copy do quiz e do resultado é escrita no masculino e evita
// adjetivos que mudam com o gênero; esta troca cobre só as palavras que a copy usa.
// `comunidade-quiz.test.ts` passa todos os textos por aqui e reprova o masculino que sobrar.

export type Genero = 'm' | 'f'

const L = '[\\p{L}\\p{N}]'
const palavra = (texto: string) => new RegExp(`(?<!${L})${texto}(?!${L})`, 'gu')

// A ordem importa: as expressões mais longas antes das palavras soltas.
const TROCAS: ReadonlyArray<readonly [RegExp, string]> = [
  [palavra('esse menino'), 'essa menina'],
  [palavra('do seu filho'), 'da sua filha'],
  [palavra('Do seu filho'), 'Da sua filha'],
  [palavra('ao seu filho'), 'à sua filha'],
  [palavra('pelo seu filho'), 'pela sua filha'],
  [palavra('no seu filho'), 'na sua filha'],
  [palavra('seu filho'), 'sua filha'],
  [palavra('Seu filho'), 'Sua filha'],
  [palavra('ele mesmo'), 'ela mesma'],
  [palavra('Ele mesmo'), 'Ela mesma'],
  [palavra('dele'), 'dela'],
  [palavra('Dele'), 'Dela'],
  [palavra('nele'), 'nela'],
  [palavra('ele'), 'ela'],
  [palavra('Ele'), 'Ela'],
  [palavra('sozinho'), 'sozinha'],
]

export function paraFeminino(texto: string): string {
  return TROCAS.reduce((t, [de, para]) => t.replace(de, para), texto)
}

export const flexionar = (texto: string, genero: Genero): string =>
  genero === 'f' ? paraFeminino(texto) : texto
