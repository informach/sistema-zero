import { ptBR } from './pt-BR'

export type Locale = 'pt-BR' | 'en'

// `currentLocale`/`setLocale` são um SINGLETON de módulo INTENCIONAL (como o
// settingsStore): o último <Studio> a montar com prop `locale` vence para todas
// as instâncias da página. Hoje isso é latente/inofensivo porque DICT.en ===
// ptBR (não há dicionário EN real), então toda instância renderiza o MESMO
// texto independente do locale "ativo".
//
// ⚠️ ANTES de embarcar um dicionário EN de verdade: o locale PRECISA ser
// roteado POR INSTÂNCIA (via React context lido em cada t()), senão duas
// instâncias com locales diferentes na mesma página exibirão o idioma da última
// a montar (last-mount-wins). Isso exige threadar o locale até os ~call sites de
// t() — mudança ampla, deliberadamente adiada. NÃO refatore os call sites de
// t() só por causa disto enquanto EN === pt-BR (impacto zero hoje, risco alto).
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
  // Um host sem tipagem pode setar um locale fora do enum (ex.: 'fr'); cair em
  // pt-BR é melhor que estourar TypeError ao indexar DICT[locale-desconhecido].
  const raw = (DICT[currentLocale] ?? DICT['pt-BR'])[key] ?? key
  return raw.replace(/\{(\w+)\}/g, (_, k: string) =>
    vars[k] !== undefined ? String(vars[k]) : `{${k}}`,
  )
}

export { ptBR }
