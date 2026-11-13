/**
 * Compara a biblioteca do avatar na arte com o que a plataforma já migrou. Não altera nada.
 *
 *   bun run avatar:conferir                 (lê origin/main do repositório da arte)
 *   bun run avatar:conferir --ref <ref>     (outra referência do git de lá)
 *   bun run avatar:conferir --sem-buscar    (não traz do remoto antes; usa o que já está aqui)
 *
 * Sai com código 1 quando há algo a migrar, para servir de aviso em rotina.
 */
import { Arte, buscarDaArte, REF_PADRAO } from './arte'
import { comparar, lerCatalogo } from './catalogo'

function lista(titulo: string, linhas: string[]) {
  console.log(`\n${titulo} (${linhas.length})`)
  for (const linha of linhas) console.log(`  ${linha}`)
}

export function conferir(args: readonly string[]): number {
  const iRef = args.indexOf('--ref')
  const ref = (iRef >= 0 && args[iRef + 1]) || REF_PADRAO
  // A cópia local da arte pode estar atrasada: traz do remoto antes de comparar.
  if (!args.includes('--sem-buscar')) buscarDaArte()
  const arte = new Arte(ref)
  const catalogo = lerCatalogo()
  const c = comparar(arte, catalogo)
  const migradas = Object.keys(catalogo.parts).length

  console.log(`Arte: ${ref} em ${arte.commit.slice(0, 9)} (${arte.data()})`)
  console.log(
    catalogo.source.commit
      ? `Plataforma: ${migradas} peças, última migração em ${catalogo.source.syncedAt} (arte ${catalogo.source.commit.slice(0, 9)})`
      : 'Plataforma: nada migrado ainda',
  )
  console.log(`Iguais: ${c.iguais}`)
  lista(
    'Novas na arte, ainda não migradas',
    c.novas.map((p) => `${p.id}  (${p.pasta}: ${p.rotulo})`),
  )
  lista(
    'Mudaram na arte desde a migração',
    c.mudaram.map((p) => `${p.id}  (${p.pasta}: ${p.rotulo})`),
  )
  lista('Saíram da arte', c.sairam)
  if (c.esqueletoMudou) console.log('\nO esqueleto da arte mudou.')
  if (c.regrasMudaram) console.log('\nAs regras da arte mudaram.')

  const aConferir = Object.entries(catalogo.parts).filter(([, p]) => p.review && !p.retired)
  if (aConferir.length > 0)
    console.log(`\nCom preço e marca ainda a conferir: ${aConferir.length} peças.`)

  const pendente =
    c.novas.length + c.mudaram.length + c.sairam.length > 0 || c.esqueletoMudou || c.regrasMudaram
  console.log(
    pendente ? '\nHá o que migrar: bun run avatar:migrar --tudo --destino r2' : '\nTudo migrado.',
  )
  return pendente ? 1 : 0
}

if (import.meta.main) process.exit(conferir(process.argv.slice(2)))
