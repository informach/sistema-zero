/**
 * Normalização de texto para BUSCA em pt-BR: remove acentos (NFD + strip de
 * combinantes) e baixa a caixa. "Herói" e "heroi" caem na mesma forma — é o
 * que faz o campo de pesquisa perdoar a digitação da criança. Usada pelo
 * KitGallery e pela modal "Trazer do Pinta".
 */
export function normalizeSearchText(value: string): string {
  return value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLocaleLowerCase('pt-BR')
}
