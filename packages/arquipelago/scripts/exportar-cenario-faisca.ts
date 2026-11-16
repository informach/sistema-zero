import { createHash } from 'node:crypto'
import { mkdir } from 'node:fs/promises'
import { resolve } from 'node:path'
import { catalogoInicialDaFaisca, cenarioInicialDaFaisca } from '../src/sistemas/cenario-inicial'

const pasta = resolve(import.meta.dir, '../../../output/molda-cenarios')
const catalogo = catalogoInicialDaFaisca(),
  json = JSON.stringify(catalogo),
  digest = createHash('sha256').update(json).digest('hex')
await mkdir(pasta, { recursive: true })
await Bun.write(resolve(pasta, 'catalogo.json'), json)
const documento = cenarioInicialDaFaisca(digest)
await Bun.write(resolve(pasta, 'faisca-base.json'), JSON.stringify(documento, null, 2))
console.log(
  JSON.stringify({
    pasta,
    modelos: catalogo.length,
    instancias: documento.instancias.length,
    caminhos: documento.caminhos.length,
    aguas: documento.aguas.length,
    digest,
  }),
)
