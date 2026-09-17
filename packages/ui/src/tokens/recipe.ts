/**
 * A RECEITA: como uma matiz vira uma paleta inteira.
 *
 * Os números NÃO foram inventados — saíram de um ajuste às duas paletas que a dona aprovou à
 * mão (o Padrão azul e o Pink), e o teste prova que a fórmula as reproduz com ΔE_oklab ≤ 0,015,
 * que ninguém enxerga. É isso que torna uma cor nova parente das antigas, em vez de vizinha.
 */
import type { Lab, Lch } from './color'
import {
  fitChroma,
  hexToOklab,
  inSrgb,
  oklabToHex,
  oklabToOklch,
  oklchToHex,
  solveActionLightness,
} from './color'

/** Os 19 tokens que SEGUEM a cor escolhida. */
export const PALETTE_TOKENS = [
  'ground',
  'ground-alt',
  'surface-2',
  'line',
  'ink',
  'ink-muted',
  'field',
  'card-step',
  'action',
  'action-step',
  'action-hover',
  'action-light',
  'over-action',
  'white-step',
  'menu',
  'menu-2',
  'menu-text',
  'menu-icon',
  'logo-zero',
] as const
export type PaletteToken = (typeof PALETTE_TOKENS)[number]

/**
 * Os 18 tokens que NÃO seguem a cor. Três famílias, cada uma por um motivo diferente:
 *
 * - **Constantes**: o cartão é branco e o texto sobre a ação é branco. Ponto.
 * - **Identidade**: as cores das ferramentas e os pontos de alegria. O Estúdio é azul em toda
 *   paleta; se ele virasse rosa junto com o tema, a criança perderia a única pista de cor que
 *   diz qual ferramenta ela está abrindo.
 * - **Estado**: sucesso, erro e aviso. ⚠️⚠️ No tema padrão dos adultos o verde de sucesso é
 *   IGUAL à ação verde, o que faz um `--success: var(--sz-action)` parecer certo e ser errado:
 *   sob a paleta rosa, o certinho da aula concluída e a resposta certa do quiz virariam rosa.
 *   Estado é estado.
 */
export const FIXED_TOKENS = {
  card: '#ffffff',
  'on-action': '#ffffff',
  'menu-glass': 'rgb(255 255 255 / 0.08)',

  blue: '#1b5cf3',
  'blue-light': '#6e9bff',
  'blue-deep': '#0a2a7a',
  yellow: '#ffc02e',
  red: '#cf3f36',
  pink: '#c8246f',
  'pink-light': '#f368a6',
  purple: '#6d3bf5',
  green: '#0b7a54',
  orange: '#b55a00',
  amber: '#e8a317',

  mint: '#dcf0e4',
  lilac: '#e5e0f7',
  'pink-surface': '#f8e4ee',
  'yellow-surface': '#fff3c4',
} as const satisfies Record<string, string>
export type FixedToken = keyof typeof FIXED_TOKENS

export type TokenName = PaletteToken | FixedToken

/**
 * ⭐ O ÂNCORA: a cor de ação de toda paleta tem o MESMO contraste com o branco.
 *
 * Medido nas três cores escolhidas à mão — azul 5,42 · rosa 5,33 · verde 5,35 — em três
 * luminosidades bem distintas (0,538 · 0,554 · 0,514). Quem as escolheu estava igualando
 * CONTRASTE, não luminosidade. Seguir isso dá de graça, para qualquer matiz: AA no texto branco
 * do botão, AA no link sobre o cartão e sobre o chão gerado, e nenhum CTA amarelo ilegível.
 */
export const ACTION_ANCHOR = { whiteContrast: 5.35, chromaCap: 0.22 } as const

/**
 * Os NEUTROS: luminosidade fixa, croma tingida com a ação.
 *
 * `t` é literalmente "quanto da marca sangra nesta superfície": 3% na superfície colada ao
 * cartão, 17% na borda de campo, 100% na ação. As bases são cinzas frios — é o que faz os
 * neutros do rosa girarem só ~70% do caminho até a matiz da ação, como na paleta feita à mão.
 */
export const NEUTRAL_RECIPE = {
  ground: { l: 0.9493, t: 0.0418, base: [0.00053, -0.00371] },
  'ground-alt': { l: 0.9159, t: 0.0679, base: [0.00205, -0.00542] },
  'surface-2': { l: 0.9639, t: 0.0339, base: [0.00065, -0.00263] },
  line: { l: 0.8946, t: 0.0775, base: [0.00335, -0.00519] },
  ink: { l: 0.214, t: 0.1192, base: [0.004, -0.03227] },
  'ink-muted': { l: 0.4348, t: 0.1196, base: [0.00534, -0.02887] },
  field: { l: 0.6099, t: 0.1686, base: [0.01001, -0.01883] },
  'card-step': { l: 0.8141, t: 0.1282, base: [0.00491, -0.00782] },
  'over-action': { l: 0.954, t: 0.0982, base: [-0.00075, -0.00465] },
  menu: { l: 0.2232, t: 0.1068, base: [0.00954, -0.03045] },
  'menu-2': { l: 0.2715, t: 0.1266, base: [0.01107, -0.03584] },
  'menu-text': { l: 0.8778, t: 0.0964, base: [0.00364, -0.01023] },
  'menu-icon': { l: 0.6896, t: 0.1563, base: [0.01117, -0.02248] },
} as const satisfies Record<string, { l: number; t: number; base: readonly [number, number] }>
export type NeutralToken = keyof typeof NEUTRAL_RECIPE

/**
 * A FAMÍLIA DA AÇÃO, em OKLCH para que uma matiz de croma baixa (o verde, o turquesa) não saia
 * lavada: os degraus do relevo 3D e o brilho do logo são deslocamentos da própria ação.
 *
 * Média dos deslocamentos medidos nas duas paletas aprovadas. É a parte mais retocada à mão das
 * duas, por isso azul e rosa carregam `overrides` — a fórmula sozinha erraria mais aqui.
 */
export const ACTION_FAMILY = {
  /**
   * O hover da ação. ⭐ Medido, o deslocamento é ΔL −0,067 nas DUAS paletas aprovadas (verde e
   * rosa), com a matiz parada — consistência alta demais para ser acaso. Hoje só o adulto usa
   * este token (`--pen-acao-hover`); o kids escurece pelo degrau do relevo.
   */
  'action-hover': { dl: -0.067, cx: 0.865, dh: 0 },
  'action-step': { dl: -0.113, cx: 0.8, dh: 0 },
  'white-step': { dl: -0.139, cx: 0.76, dh: 0 },
  'action-light': { dl: 0.18, cx: 0.76, dh: -2 },
  'logo-zero': { dl: 0.069, cx: 0.97, dh: -6 },
} as const satisfies Record<string, { dl: number; cx: number; dh: number }>
export type ActionFamilyToken = keyof typeof ACTION_FAMILY

/** A cor de ação de uma matiz — o ponto de partida de tudo o mais. */
export function actionFor(hue: number, chromaCap: number = ACTION_ANCHOR.chromaCap): Lch {
  return solveActionLightness(hue, ACTION_ANCHOR.whiteContrast, chromaCap)
}

/**
 * Um neutro tingido pela ação.
 *
 * ⚠️ Passa pelo MESMO ajuste de gamute que a família da ação: sem ele a cor saía presa na borda
 * do sRGB, com a matiz torta — medido no `over-action` das matizes 257°–300,5°, que inclui a
 * paleta roxa em produção. O erro visível era ΔE ≈ 0,003, mas o invariante "uma receita, segura
 * em qualquer matiz" não valia, e nada notaria se ele crescesse.
 */
export function neutralFor(token: NeutralToken, action: Lab): string {
  const { l, t, base } = NEUTRAL_RECIPE[token]
  const lab: Lab = [l, t * action[1] + (1 - t) * base[0], t * action[2] + (1 - t) * base[1]]
  if (inSrgb(lab)) return oklabToHex(lab)
  const [, croma, matiz] = oklabToOklch(lab)
  return oklchToHex([l, fitChroma(l, croma, matiz), matiz])
}

/** Um parente da ação (degrau do relevo, clara, logo). */
export function actionRelativeFor(token: ActionFamilyToken, action: Lch): string {
  const { dl, cx, dh } = ACTION_FAMILY[token]
  const l = Math.min(0.995, Math.max(0.005, action[0] + dl))
  const h = (action[2] + dh + 360) % 360
  return oklchToHex([l, fitChroma(l, action[1] * cx, h), h])
}

/** A matiz de um hexadecimal, que é tudo o que uma paleta nova precisa declarar. */
export const hueOf = (hex: string): number => {
  const [, a, b] = hexToOklab(hex)
  const h = (Math.atan2(b, a) * 180) / Math.PI
  return h < 0 ? h + 360 : h
}
