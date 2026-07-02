// Log mínimo e consistente para o CLI do pipeline. Sem cor/deps: legível em
// qualquer terminal e no CI.

export function etapa(nome: string): void {
  console.log(`\n▶ ${nome}`)
}

export function passo(msg: string): void {
  console.log(`  • ${msg}`)
}

export function ok(msg: string): void {
  console.log(`  ✓ ${msg}`)
}

export function aviso(msg: string): void {
  console.warn(`  ! ${msg}`)
}

export function erro(msg: string): void {
  console.error(`  ✗ ${msg}`)
}
