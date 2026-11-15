/**
 * Prepara a pista de conferência com as peças reais da arte (a `jogo2_pista` do artes-3d: as 14
 * peças que a arte escolheu, com os `pontos_de_jogo` de cada uma). Copia do git da arte
 * (`origin/main`, nunca a pasta de trabalho de lá) o GLB e a folha de cada peça para
 * `.cache/pista-da-arte/` (fora do git: as peças são de uso interno, não distribuir) e grava o
 * `pista.json` que a página `/pista-da-arte` lê.
 *
 *   bun playground/preparar-pista-da-arte.ts     (ARTES_3D_DIR escolhe o repositório da arte)
 */
import { execFileSync } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join, posix, resolve } from 'node:path'

const ARTE = resolve(process.env.ARTES_3D_DIR ?? resolve(import.meta.dir, '../../../../artes-3d'))
const SAIDA = resolve(import.meta.dir, '../.cache/pista-da-arte')
const REF = 'origin/main'
const PISTA = 'em_producao/avatar/jogo2_pista'

const git = (...args: string[]) =>
  execFileSync('git', ['-C', ARTE, ...args], { maxBuffer: 256 * 1024 * 1024 })
const ler = (caminho: string) => git('show', `${REF}:${caminho}`)
const json = <T>(caminho: string) => JSON.parse(ler(caminho).toString('utf8')) as T

/** O item da peça dentro do catálogo (os catálogos têm formatos diferentes: procura pelo id). */
function acharItem(no: unknown, id: string): Record<string, unknown> | null {
  if (Array.isArray(no)) {
    for (const v of no) {
      const achado = acharItem(v, id)
      if (achado) return achado
    }
    return null
  }
  if (!no || typeof no !== 'object') return null
  const o = no as Record<string, unknown>
  if (o.id === id && typeof o.arquivo === 'string') return o
  for (const v of Object.values(o)) {
    const achado = acharItem(v, id)
    if (achado) return achado
  }
  return null
}

interface PecaDaPista {
  id: string
  catalogo: string
  pontos_de_jogo: Record<string, unknown>[]
}

git('fetch', '--quiet', 'origin')
const pista = json<{ pecas: PecaDaPista[] | Record<string, PecaDaPista> }>(
  `${PISTA}/pontos_de_jogo.json`,
)
const pecas = Array.isArray(pista.pecas) ? pista.pecas : Object.values(pista.pecas)
mkdirSync(SAIDA, { recursive: true })
const saida: {
  id: string
  rotulo: string
  glb: string
  folha: string | null
  pontos: unknown[]
}[] = []
for (const p of pecas) {
  const item = acharItem(json(p.catalogo), p.id)
  if (!item) throw new Error(`A arte não tem ${p.id} em ${p.catalogo}.`)
  const glb = posix.join(posix.dirname(p.catalogo), String(item.arquivo))
  writeFileSync(join(SAIDA, `${p.id}.glb`), ler(glb))
  let folha: string | null = `${p.id}.folha.jpg`
  try {
    writeFileSync(join(SAIDA, folha), ler(`${PISTA}/folhas/pista_${p.id}.jpg`))
  } catch {
    folha = null
  }
  saida.push({
    id: p.id,
    rotulo: String(item.rotulo ?? p.id),
    glb: `${p.id}.glb`,
    folha,
    pontos: p.pontos_de_jogo,
  })
  console.log(`${p.id}: ${glb}`)
}
mkdirSync(dirname(join(SAIDA, 'pista.json')), { recursive: true })
writeFileSync(join(SAIDA, 'pista.json'), JSON.stringify({ ref: REF, pecas: saida }, null, 1))
console.log(`${saida.length} peças em ${SAIDA}`)
