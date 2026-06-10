/** Utility minimalista para concatenar classes condicionais sem dependências. */
export function cn(...args: Array<string | false | null | undefined>): string {
  return args.filter(Boolean).join(' ')
}
