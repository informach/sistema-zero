/**
 * O vocabulário das paletas — a régua ÚNICA de quais cores existem. Lêem daqui o banco (via
 * `members`), as bordas HTTP (gateway e BFF derivam seus validadores desta lista), o seletor do
 * perfil e o gerador de CSS do `@sistemazero/ui`, que produz os VALORES a partir destes ids.
 *
 * Aqui NÃO mora hexadecimal: cor é assunto do `ui`. Aqui mora só o que é contrato de dados — o
 * que pode estar gravado numa linha do banco, num cookie e no `data-sz-palette` do `<html>`.
 *
 * Identificador em inglês, rótulo em português: a camada semântica que o `ui` consome
 * (`--primary`, `--background`, `--ring`) vem do Tailwind/shadcn e não se traduz sem reescrever
 * todo componente, então a régua é "máquina fala inglês, gente lê português".
 */

/**
 * Os swatches curados, NA ORDEM em que a fileira de caixinhas do perfil os mostra.
 *
 * ⚠️ O id é ESTÁVEL: ele viaja no banco, no cookie e na marcação. Trocar um id é migrar dados —
 * `pink` continua `pink` justamente por isso, ainda que a pessoa leia "Rosa". Acrescentar um
 * swatch é só uma linha aqui e uma no registro de cores do `ui`.
 */
export const PALETTES = ['blue', 'teal', 'green', 'orange', 'pink', 'purple'] as const
export type Palette = (typeof PALETTES)[number]

/**
 * `null` = a pessoa NUNCA escolheu, e a superfície pinta a cor da casa dela.
 *
 * ⚠️ É DIFERENTE de "escolheu a cor da casa": a aula que pede para escolher uma cor lê
 * exatamente essa distinção, e o seletor só grava id concreto.
 */
export type PalettePreference = Palette | null

export function isPalette(value: unknown): value is Palette {
  return PALETTES.some((palette) => palette === value)
}

/**
 * Leitura TOLERANTE do que veio do banco, de um cookie ou de um cliente de outra versão: o
 * desconhecido vira `null` (a cor da casa) e nunca lança.
 *
 * Sem isso, tirar um swatch do catálogo — ou voltar um deploy atrás com alguém já gravado na cor
 * nova — derrubaria a página inteira em vez de pintá-la no padrão.
 */
export function readPalette(value: unknown): PalettePreference {
  return isPalette(value) ? value : null
}

/** O que a pessoa lê na caixinha. Português, sempre. */
export const PALETTE_LABELS: Record<Palette, string> = {
  blue: 'Azul',
  teal: 'Turquesa',
  green: 'Verde',
  orange: 'Laranja',
  pink: 'Rosa',
  purple: 'Roxo',
}

/**
 * ⭐ A cor da casa, UMA só, em todo o ecossistema (decisão da dona, 17/09/2026): o azul.
 *
 * Antes cada app tinha a sua por herança — o kids nasceu azul, o adulto virou verde quando o
 * tema foi copiado para lá, o admin ficou num turquesa próprio. Uniformizar é o ponto do
 * trabalho: quem preferir outra cor escolhe no perfil, e o verde e o turquesa continuam no
 * catálogo como swatch.
 *
 * Isso também endireita o CSS: a rede de segurança `:root:not([data-sz-palette])` passa a estar
 * certa para todo app, em vez de não poder estar certa para dois ao mesmo tempo.
 */
export const DEFAULT_PALETTE: Palette = 'blue'

/**
 * A paleta que a tela RENDERIZA — sempre concreta, mesmo sem escolha nenhuma.
 *
 * É a porta única da distinção que sustenta o desenho todo: a PREFERÊNCIA é anulável (o banco
 * guarda "nunca escolheu"), a paleta RENDERIZADA nunca é.
 */
export function renderedPalette(preference: unknown): Palette {
  return readPalette(preference) ?? DEFAULT_PALETTE
}
