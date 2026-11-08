import { en } from './en'
import { ptBR } from './pt-BR'
import { createDictionaryTranslator, type Locale, type Translator } from './translator'

export type { Locale, Translator } from './translator'

const DICT: Record<Locale, Record<string, string>> = {
  'pt-BR': ptBR,
  en,
}

/**
 * Tradução pura e segura para hosts JS sem tipagem. Um locale desconhecido cai
 * em pt-BR sem alterar estado global.
 */
export function translate(
  locale: Locale,
  key: string,
  vars: Record<string, string | number> = {},
): string {
  return createTranslator(locale)(key, vars)
}

export function createTranslator(locale: Locale = 'pt-BR'): Translator {
  return createDictionaryTranslator(DICT, locale)
}

/** Tradução padrão para telas avulsas que não pertencem a uma instância Studio. */
export const t = createTranslator('pt-BR')

export { en, ptBR }
