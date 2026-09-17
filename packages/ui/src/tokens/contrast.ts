/**
 * A auditoria de contraste — medida, nunca estimada.
 *
 * ⚠️⚠️ Esta peça existe por causa de um estrago real: ao fazer o papel da cena seguir o tema
 * (14/09/2026), uma mistura inocente derrubou o âmbar de 4,91 para 4,42 e o verde de 4,64 para
 * 4,03 sobre a grama. Nada quebrou, nada ficou vermelho — só ficou mais difícil de ler, que é o
 * tipo de estrago que passa por revisão de olho. Com N paletas geradas isso deixa de ser risco
 * e vira certeza, a menos que alguém MEÇA.
 *
 * O gerador roda esta auditoria e SAI COM ERRO se uma dupla reprovar: a paleta não é publicada.
 */
import { PALETTES, type Palette as PaletteId } from '@sistemazero/core/palette'
import { contrast } from './color'
import { derive } from './derive'
import type { TokenName } from './recipe'

/**
 * Todo token MENOS o `menu-glass`, que é `rgb(… / .08)` e não um hexadecimal.
 * ⚠️ Sem esta restrição uma dupla que o nomeasse type-checava e o gerador morria com um erro de
 * parse de cor no meio, em vez do relatório de contraste que ele existe para dar.
 */
export type ColorToken = Exclude<TokenName, 'menu-glass'>

/**
 * Uma dívida MEDIDA: a dupla está abaixo do alvo HOJE, em TODAS as paletas — inclusive nas duas
 * aprovadas à mão que já estão em produção. Em vez de baixar a régua (que esconderia) ou de
 * travar a entrega numa correção de design que não é deste lote, ela fica com CATRACA: não pode
 * piorar, o alvo real continua escrito em `min`, e um teste exige que o piso seja JUSTO — assim
 * ninguém a afrouxa depois sem que alguém veja.
 */
export interface KnownGap {
  readonly floor: number
  readonly why: string
}

export interface ContrastPair {
  readonly fg: ColorToken
  readonly bg: ColorToken
  readonly min: number
  readonly role: string
  readonly knownGap?: KnownGap
}

/**
 * As duplas que a paleta precisa garantir, com os pisos da WCAG: 4,5 para texto pequeno, 3 para
 * ícone e borda de controle (1.4.11).
 *
 * Os dois últimos não são WCAG: o relevo 3D da casa é um degrau de cor sólido, e um degrau que
 * não se vê apaga o desenho inteiro dos botões e cartões. 1,4 é o piso medido nas paletas
 * aprovadas (1,53 e 1,73), então a régua é real e não decorativa.
 *
 * ⚠️ `green` e `red` aqui são cores de IDENTIDADE, não de estado: elas pintam a assinatura de
 * uma ferramenta, uma borda, um selo — objetos gráficos, cujo piso é 3. O vermelho de erro e o
 * verde de sucesso que viram TEXTO são outros tokens, moram na camada do app e entram por
 * `EXTERNAL_TEXT_PAIRS` logo abaixo. Confundir os dois é fácil e caro: no tema padrão dos
 * adultos o verde de sucesso é IGUAL à ação verde, o que faz a confusão parecer correta.
 */
export const CONTRAST_PAIRS: readonly ContrastPair[] = [
  { fg: 'ink', bg: 'ground', min: 4.5, role: 'texto no chão' },
  // ⚠️⚠️ O chão ALTERNATIVO é o fundo da PÁGINA DE AULA nos dois apps (`.kids-aula` e
  // `.sz-app:has(.sz-aula-adulto)`) e das faixas do kids — e não estava na matriz. Ele é mais
  // escuro que o chão, então toda dupla nele é mais apertada.
  { fg: 'ink', bg: 'ground-alt', min: 4.5, role: 'texto no chão alternativo' },
  { fg: 'ink-muted', bg: 'ground-alt', min: 4.5, role: 'texto suave no chão alternativo' },
  { fg: 'ink', bg: 'card', min: 4.5, role: 'texto no cartão' },
  { fg: 'ink-muted', bg: 'card', min: 4.5, role: 'texto suave no cartão' },
  { fg: 'ink-muted', bg: 'ground', min: 4.5, role: 'texto suave no chão' },
  { fg: 'on-action', bg: 'action', min: 4.5, role: 'texto do botão' },
  { fg: 'action', bg: 'card', min: 4.5, role: 'link no cartão' },
  { fg: 'action', bg: 'ground', min: 4.5, role: 'link no chão' },
  {
    fg: 'action',
    bg: 'ground-alt',
    min: 4.5,
    role: 'link no chão alternativo',
    knownGap: {
      floor: 4.05,
      why: 'O chão ALTERNATIVO é mais escuro que o chão, e a âncora da cor de ação foi calibrada contra o chão. Medido em TODAS as seis paletas, inclusive azul e rosa, que estão em produção: a dívida é do SURFACE, não das cores novas. Fechá-la é decisão de design (clarear o chão alternativo, ou parar de pôr texto na cor de ação sobre ele) e merece commit próprio.',
    },
  },
  { fg: 'over-action', bg: 'action', min: 4.5, role: 'texto claro sobre a ação' },
  { fg: 'menu-text', bg: 'menu', min: 4.5, role: 'texto do menu' },
  { fg: 'action-light', bg: 'menu', min: 4.5, role: 'aba ativa no menu' },
  { fg: 'menu-icon', bg: 'menu', min: 3, role: 'ícone do menu' },
  { fg: 'field', bg: 'card', min: 3, role: 'borda de campo no cartão' },
  { fg: 'field', bg: 'ground', min: 3, role: 'borda de campo no chão' },
  {
    fg: 'field',
    bg: 'ground-alt',
    min: 3,
    role: 'borda de campo no chão alternativo',
    knownGap: {
      floor: 2.9,
      why: 'O chão ALTERNATIVO é mais escuro que o chão, e a âncora da cor de ação foi calibrada contra o chão. Medido em TODAS as seis paletas, inclusive azul e rosa, que estão em produção: a dívida é do SURFACE, não das cores novas. Fechá-la é decisão de design (clarear o chão alternativo, ou parar de pôr texto na cor de ação sobre ele) e merece commit próprio.',
    },
  },
  { fg: 'green', bg: 'ground', min: 3, role: 'identidade verde (selo, borda) no chão variável' },
  { fg: 'red', bg: 'ground', min: 3, role: 'identidade vermelha (assinatura do Pinta) no chão' },
  { fg: 'purple', bg: 'ground', min: 3, role: 'identidade roxa no chão variável' },
  { fg: 'action-step', bg: 'action', min: 1.4, role: 'degrau 3D do botão' },
  { fg: 'card-step', bg: 'card', min: 1.4, role: 'degrau 3D do cartão' },
  {
    fg: 'card-step',
    bg: 'ground-alt',
    min: 1.4,
    role: 'degrau 3D sobre o chão alternativo',
    knownGap: {
      floor: 1.35,
      why: 'O chão ALTERNATIVO é mais escuro que o chão, e a âncora da cor de ação foi calibrada contra o chão. Medido em TODAS as seis paletas, inclusive azul e rosa, que estão em produção: a dívida é do SURFACE, não das cores novas. Fechá-la é decisão de design (clarear o chão alternativo, ou parar de pôr texto na cor de ação sobre ele) e merece commit próprio.',
    },
  },
]

/**
 * As cores que NÃO moram nesta folha mas são lidas COMO TEXTO sobre superfícies que a paleta
 * move. É o contrato com a camada dos apps, e a razão de ele ser medido aqui: o chão anda
 * embaixo de um token que ninguém pensou em conferir.
 *
 * ⚠️ Os valores são literais de propósito — são o espelho do que o app declara. Divergiu do
 * `globals.css`? O teste que lê o arquivo de lá avisa; este aqui garante que o valor ESPELHADO
 * continua legível em toda paleta.
 */
export interface ExternalTextPair {
  readonly hex: string
  readonly name: string
  readonly bg: ColorToken
  readonly min: number
  readonly knownGap?: KnownGap
}

export const EXTERNAL_TEXT_PAIRS: readonly ExternalTextPair[] = [
  { hex: '#096b4a', name: '--pen-ok-texto (o verde de sucesso EM TEXTO)', bg: 'ground', min: 4.5 },
  { hex: '#096b4a', name: '--pen-ok-texto (o verde de sucesso EM TEXTO)', bg: 'card', min: 4.5 },
  { hex: '#d92d34', name: '--pen-alerta (o vermelho de erro) EM TEXTO', bg: 'card', min: 4.5 },
  {
    hex: '#096b4a',
    name: '--pen-ok-texto (o verde de sucesso EM TEXTO)',
    bg: 'ground-alt',
    min: 4.5,
  },
  {
    hex: '#096b4a',
    name: '--pen-ok-texto (o verde de sucesso EM TEXTO)',
    bg: 'surface-2',
    min: 4.5,
  },
  {
    hex: '#d92d34',
    name: '--pen-alerta (o vermelho de erro) EM TEXTO',
    bg: 'surface-2',
    min: 4.5,
    knownGap: {
      floor: 4.3,
      why: 'A superfície 2 é o `--muted`/`--secondary`, e `text-destructive` sobre `bg-muted` é composição real. Medido em TODAS as seis paletas (4,31–4,34), inclusive as de produção: mesma família da dívida do vermelho sobre o chão. O conserto é escurecer o `--pen-alerta` na camada do app.',
    },
  },
  {
    hex: '#d92d34',
    name: '--pen-alerta (o vermelho de erro) EM TEXTO',
    bg: 'ground',
    min: 4.5,
    knownGap: {
      floor: 4.1,
      why: 'Medido 4,12 na paleta azul de HOJE, em produção — a dívida é anterior a este lote. No cartão, que é onde o `text-destructive` de fato aparece (36 usos, quase todos em diálogo ou cartão), ele dá 4,80 e passa. Consertar pede escurecer o `--pen-alerta` na camada do app, que é mudança visual própria e merece commit próprio.',
    },
  },
]

export interface ContrastFailure {
  readonly palette: PaletteId
  readonly fg: string
  readonly bg: TokenName
  readonly role: string
  readonly min: number
  readonly ratio: number
}

/** Quantas medidas uma paleta rende — a guarda anti-vácuo conta contra este número. */
export const PAIRS_PER_PALETTE = CONTRAST_PAIRS.length + EXTERNAL_TEXT_PAIRS.length

/** Mede TODA dupla de uma paleta do catálogo. Devolve só o que reprovou. */
export function auditPalette(id: PaletteId): ContrastFailure[] {
  return auditTokens(derive(id), id)
}

/**
 * A auditoria sobre um mapa de tokens QUALQUER.
 *
 * ⚠️ Existe separada de `auditPalette` para que o teste possa alimentá-la com uma paleta
 * deliberadamente ruim e exigir que ela REPROVE. Uma varredura que não sabe falhar não é guarda
 * nenhuma — e este repositório já aprendeu isso duas vezes.
 */
export function auditTokens(tokens: Record<TokenName, string>, label: string): ContrastFailure[] {
  return measureTokens(tokens, label).filter((m) => m.ratio < m.min)
}

/**
 * TODA medição, aprovada ou não.
 *
 * ⚠️ Existe separada porque a guarda anti-vácuo precisa contar o que foi REALMENTE medido. A
 * primeira versão dela somava `PAIRS_PER_PALETTE` num laço e comparava com o mesmo produto: uma
 * identidade aritmética que passava até com a auditoria devolvendo `[]` na primeira linha.
 */
export function measureTokens(tokens: Record<TokenName, string>, label: string): ContrastFailure[] {
  const palette = label as PaletteId
  const medidas: ContrastFailure[] = []
  for (const { fg, bg, min, role, knownGap } of CONTRAST_PAIRS) {
    // A catraca da dívida conhecida: cobra-se o piso de hoje, não o alvo — mas cobra-se.
    medidas.push({
      palette,
      fg,
      bg,
      role,
      min: knownGap?.floor ?? min,
      ratio: contrast(tokens[fg], tokens[bg]),
    })
  }
  for (const { hex, name, bg, min, knownGap } of EXTERNAL_TEXT_PAIRS) {
    medidas.push({
      palette,
      fg: hex,
      bg,
      role: name,
      min: knownGap?.floor ?? min,
      ratio: contrast(hex, tokens[bg]),
    })
  }
  return medidas
}

/** As dívidas de contraste que este módulo carrega de propósito, para quem for pagá-las. */
/** As dívidas de contraste que este módulo carrega de propósito, para quem for pagá-las. */
export function knownContrastGaps(): {
  label: string
  gap: KnownGap
  min: number
  ratios: Record<string, number>
}[] {
  const das = CONTRAST_PAIRS.filter((p) => p.knownGap).map((p) => ({
    label: `${p.fg}/${p.bg}`,
    gap: p.knownGap as KnownGap,
    min: p.min,
    ratios: Object.fromEntries(
      PALETTES.map((id) => [id, Number(contrast(derive(id)[p.fg], derive(id)[p.bg]).toFixed(4))]),
    ),
  }))
  const externas = EXTERNAL_TEXT_PAIRS.filter((p) => p.knownGap).map((p) => ({
    label: `${p.hex}/${p.bg}`,
    gap: p.knownGap as KnownGap,
    min: p.min,
    ratios: Object.fromEntries(
      PALETTES.map((id) => [id, Number(contrast(p.hex, derive(id)[p.bg]).toFixed(4))]),
    ),
  }))
  return [...das, ...externas]
}

export function describeFailure({ palette, fg, bg, role, min, ratio }: ContrastFailure): string {
  return `${palette}: ${fg} sobre ${bg} (${role}) = ${ratio.toFixed(2)}, mínimo ${min}`
}
