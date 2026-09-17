/**
 * O espelho da cor escolhida num COOKIE — helpers puros.
 *
 * ⭐ Por que um cookie, e não o `localStorage` que o `next-themes` usava: a preferência é do
 * PERFIL, mas o `localStorage` é do APARELHO, e o servidor não o enxerga. Era daí que vinham as
 * duas cicatrizes do código antigo — o flash `padrão → pink` no F5 (o servidor pintava uma cor e
 * o script do cliente trocava depois) e a chave `sz:kids:tema-dono`, que existia só para
 * reconciliar "de quem é este valor" no cliente. Com o dono DENTRO do valor do cookie, quem
 * reconcilia é o servidor, antes do primeiro byte de HTML.
 */
import { type PalettePreference, readPalette } from '@sistemazero/core/palette'
import { prefixedCookieName } from './cookies'

/**
 * Seis horas. ⚠️ Não é chute: o cookie é ESPELHO, e a fonte da verdade é o banco. Trocar a cor
 * no celular precisa alcançar o computador, e a única coisa que faz o espelho se reconciliar
 * sozinho é ele VENCER — o proxy então pergunta ao servidor de novo. Seis horas dá convergência
 * no mesmo dia ao custo de, no pior caso, quatro idas ao gateway por aparelho por dia. Trocar de
 * perfil ou logar de novo reconcilia na hora, sem esperar.
 */
export const PALETTE_COOKIE_MAX_AGE = 6 * 60 * 60

/**
 * Quando o gateway não respondeu. Curto o bastante para se auto-curar, longo o bastante para uma
 * indisponibilidade não virar uma tentativa por navegação — cada uma segura o render.
 */
export const PALETTE_COOKIE_UNAVAILABLE_MAX_AGE = 5 * 60

/** `<base>_palette`, com `__Host-` em produção (mesma régua dos cookies de sessão). */
export function paletteCookieName(base: string, prod: boolean): string {
  return prefixedCookieName(`${base}_palette`, prod)
}

/**
 * O valor é `"<dono>.<cor>"` — o dono faz parte do valor DE PROPÓSITO.
 *
 * Irmãos dividem o mesmo aparelho e o mesmo jar de cookies. Sem o dono, o perfil que entrasse
 * depois herdaria a cor do anterior até a primeira ida ao servidor — e essa janela é exatamente
 * o flash que este desenho existe para apagar. Cor nula vira string vazia: "já perguntei, esta
 * pessoa não escolheu" é diferente de "nunca perguntei" (o cookie ausente).
 */
export function encodePaletteCookie(owner: string, palette: PalettePreference): string {
  return `${owner}.${palette ?? ''}`
}

export interface DecodedPaletteCookie {
  /** O cookie fala sobre ESTE dono? Falso = precisa perguntar ao servidor. */
  readonly known: boolean
  readonly palette: PalettePreference
}

/**
 * Só a COR do cookie, sem conferir o dono — é o que o layout raiz usa.
 *
 * ⚠️ Confiar aqui é correto porque quem reconcilia é o PROXY: ele roda antes do render e, quando
 * o dono não bate, reescreve o cookie da própria request. Fora da área logada (o `/login`) não
 * há sessão, e mostrar a última cor do aparelho é inofensivo — é a mesma pessoa, o mesmo
 * aparelho.
 */
export function paletteValueOf(raw: string | undefined): PalettePreference {
  if (!raw) return null
  const dot = raw.indexOf('.')
  return readPalette(dot < 0 ? raw : raw.slice(dot + 1))
}

export function decodePaletteCookie(raw: string | undefined, owner: string): DecodedPaletteCookie {
  if (!raw || !owner) return { known: false, palette: null }
  const dot = raw.indexOf('.')
  if (dot < 0 || raw.slice(0, dot) !== owner) return { known: false, palette: null }
  // ⚠️ Leitura tolerante: cor que saiu do catálogo (ou que veio de um deploy à frente, depois de
  // um rollback) vira a cor da casa em vez de derrubar a página com uma string.
  return { known: true, palette: readPalette(raw.slice(dot + 1)) }
}
