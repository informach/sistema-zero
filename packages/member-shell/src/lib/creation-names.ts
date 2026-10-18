/**
 * Nomes únicos para o que DESCE da nuvem ou vira cópia de conflito (Pinta e Molda): as duas
 * galerias exigem nome ÚNICO e kebab dentro de um teto (48 nos dois pacotes), e um nome acima
 * do teto seria descartado pelo sanitize na próxima leitura — a cópia sumiria da galeria.
 * O teto é parâmetro: cada wrapper passa o `maxNameChars` do SEU pacote.
 */

/** Nome único por sufixo numérico, SEMPRE dentro do teto. */
export function uniqueCreationName(base: string, taken: Set<string>, maxChars: number): string {
  // Cortar no teto pode deixar um hífen na borda, que o `normalizeAssetName` da galeria
  // apararia na próxima leitura (e a cópia voltaria a ter o nome do original): apara aqui.
  const trimHyphen = (s: string) => s.replace(/-+$/, '')
  const root = trimHyphen(base.slice(0, maxChars))
  if (!taken.has(root)) return root
  for (let n = 2; n < 1000; n += 1) {
    const suffix = `-${n}`
    const candidate = `${trimHyphen(root.slice(0, maxChars - suffix.length))}${suffix}`
    if (!taken.has(candidate)) return candidate
  }
  const stamp = `-${Date.now().toString(36)}`
  return `${trimHyphen(root.slice(0, maxChars - stamp.length))}${stamp}`
}

/** Nome da CÓPIA de conflito: `nave` → `nave-copia`, `nave-copia-2`… (kebab, como os pacotes exigem). */
export function conflictCopyName(name: string, taken: Set<string>, maxChars: number): string {
  return uniqueCreationName(`${name}-copia`, taken, maxChars)
}
