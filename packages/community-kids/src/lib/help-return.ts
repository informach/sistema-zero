import {
  type HelpReturnTarget,
  resolveHelpReturn as resolveShared,
} from '@sistemazero/member-shell/lib/help-return'

export type { HelpReturnTarget }

/** A volta do tutorial para a fase de onde a criança veio (régua em `member-shell/lib/help-return`). */
export function resolveHelpReturn(value: string | undefined | null): HelpReturnTarget | null {
  return resolveShared(value, 'Voltar para a fase')
}
