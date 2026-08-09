import { en } from './en'
import { ptBR } from './pt-BR'

export type Locale = 'pt-BR' | 'en'
export type Translator = (key: string, vars?: Record<string, string | number>) => string

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
  const raw = (DICT[locale] ?? DICT['pt-BR'])[key] ?? key
  return raw.replace(/\{(\w+)\}/g, (_, k: string) =>
    vars[k] !== undefined ? String(vars[k]) : `{${k}}`,
  )
}

export function createTranslator(locale: Locale = 'pt-BR'): Translator {
  return (key, vars) => translate(locale, key, vars)
}

/** Tradução padrão para telas avulsas que não pertencem a uma instância Studio. */
export const t = createTranslator('pt-BR')

export { en, ptBR }
