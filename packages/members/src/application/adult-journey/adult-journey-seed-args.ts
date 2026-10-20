import type { AdultJourneySeedOptions } from './adult-journey-seed'

/** Argumentos do `journey:seed-adult` (`scripts/seed-adult-journey.ts`). */
export interface AdultJourneySeedArgs {
  once: boolean
  apply: boolean
  force: boolean
  allowPartial: boolean
  milestone: NonNullable<AdultJourneySeedOptions['milestone']>
}

/**
 * Lê os argumentos do script. Erros (mensagem para quem roda o comando):
 * - `--milestone` vazio ou com valor desconhecido;
 * - `--once` com `--milestone`: o modo automático usa SEMPRE o marco por curso (Mural quando o
 *   curso tem a atividade de publicar), igual ao boot; ignorar a escolha calado faria a pessoa
 *   achar que gravou outra regra.
 */
export function parseAdultJourneySeedArgs(args: readonly string[]): AdultJourneySeedArgs {
  const once = args.includes('--once')
  // `--milestone=showcase` ou `--milestone showcase`; valor vazio ou desconhecido é erro.
  const milestoneIndex = args.findIndex(
    (arg) => arg === '--milestone' || arg.startsWith('--milestone='),
  )
  if (once && milestoneIndex !== -1)
    throw new Error(
      '--once não aceita --milestone: o seed automático usa sempre o marco por curso (o mesmo do boot). Rode sem --once para escolher o marco.',
    )
  const milestoneArg =
    milestoneIndex === -1
      ? 'auto'
      : args[milestoneIndex]?.includes('=')
        ? args[milestoneIndex]?.split('=')[1]
        : args[milestoneIndex + 1]
  if (milestoneArg !== 'auto' && milestoneArg !== 'complete' && milestoneArg !== 'showcase')
    throw new Error('Use --milestone=auto, --milestone=complete ou --milestone=showcase')
  return {
    once,
    apply: args.includes('--apply'),
    force: args.includes('--force'),
    allowPartial: args.includes('--allow-partial'),
    milestone: milestoneArg,
  }
}
