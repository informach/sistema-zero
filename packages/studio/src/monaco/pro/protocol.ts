import type { ProLanguageService } from './languageService'

export interface ProLanguageQueries {
  symbols: { args: [path: string]; result: ReturnType<ProLanguageService['symbols']> }
  references: {
    args: [path: string, offset: number]
    result: ReturnType<ProLanguageService['references']>
  }
  renameFile: {
    args: [from: string, to: string]
    result: ReturnType<ProLanguageService['renameFile']>
  }
  renameSymbol: {
    args: [path: string, offset: number, name: string]
    result: ReturnType<ProLanguageService['renameSymbol']>
  }
  diagnostics: { args: [path: string]; result: ReturnType<ProLanguageService['diagnostics']> }
  completions: {
    args: [path: string, offset: number]
    result: ReturnType<ProLanguageService['completions']>
  }
  hover: { args: [path: string, offset: number]; result: ReturnType<ProLanguageService['hover']> }
  definitions: {
    args: [path: string, offset: number]
    result: ReturnType<ProLanguageService['definitions']>
  }
  format: { args: [path: string]; result: ReturnType<ProLanguageService['format']> }
}
export type ProLanguageRequest =
  | {
      [K in keyof ProLanguageQueries]: {
        id: number
        method: K
        args: ProLanguageQueries[K]['args']
      }
    }[keyof ProLanguageQueries]
  | {
      id: number
      method: 'update'
      patch: Record<string, string | null>
      availableFiles?: readonly string[]
    }
export type ProLanguageResponse = { id: number; result: unknown } | { id: number; error: string }
