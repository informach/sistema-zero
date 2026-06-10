import { ptBR } from './pt-BR'

export type Locale = 'pt-BR' | 'en'

let currentLocale: Locale = 'pt-BR'

const DICT: Record<Locale, Record<string, string>> = {
  'pt-BR': ptBR,
  en: ptBR, // EN fallback to PT-BR no MVP; substituir quando houver dicionário EN
}

export function setLocale(locale: Locale): void {
  currentLocale = locale
}

export function getLocale(): Locale {
  return currentLocale
}

/**
 * Helper de tradução. `key` é a chave no dicionário; `vars` substitui
 * placeholders no formato {nome}.
 */
export function t(key: string, vars: Record<string, string | number> = {}): string {
  const raw = DICT[currentLocale][key] ?? key
  return raw.replace(/\{(\w+)\}/g, (_, k: string) =>
    vars[k] !== undefined ? String(vars[k]) : `{${k}}`,
  )
}

export { ptBR }
