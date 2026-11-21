import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { basename, posix, resolve } from 'node:path'
import { medirVolumeGlb } from '../packages/arquipelago/scripts/medir-volume-glb'
import { catalogoInicialDaFaisca } from '../packages/arquipelago/src/sistemas/cenario-inicial'
import { type ModeloDeCatalogo, ModeloDeCatalogoSchema } from '../packages/molda-cenarios-core/src'
import { validarArteCenario } from './molda-cenarios-arte'

const repo = resolve(process.env.ARQUIPELAGO_ARTE_REPO ?? '../artes-3d'),
  commit = process.argv[2] ?? '67b72d4a1a90c0e95c6217341dccfc723ebe8c49',
  destino = resolve('output/molda-cenarios/acervo')
const git = (...args: string[]) => {
  const r = spawnSync('git', ['-C', repo, ...args], { maxBuffer: 80 * 1024 * 1024 })
  if (r.status !== 0) throw Error(r.stderr.toString())
  return r.stdout
}
const versao = git('rev-parse', `${commit}^{commit}`).toString().trim(),
  ler = (p: string) => git('show', `${versao}:${p}`)
const caminhos = git(
  'ls-tree',
  '-r',
  '--name-only',
  versao,
  'biblioteca_aventura',
  'biblioteca/cidade',
)
  .toString()
  .split('\n')
  .filter((p) => p.endsWith('/catalogo.json') && !/\/(avatar|pagina)\//.test(p))
const modelos: ModeloDeCatalogo[] = catalogoInicialDaFaisca(),
  conhecidos = new Set(modelos.map((m) => m.digest)),
  dependencias: { caminho: string; motivo: string }[] = []
const cacheArquivo = Bun.file(resolve(destino, 'catalogo.json'))
const cache = new Map<string, ModeloDeCatalogo>(
  ((await cacheArquivo.exists()) ? (await cacheArquivo.json()).modelos : []).map(
    (m: ModeloDeCatalogo) => [m.caminho, m],
  ),
)
for (const caminho of caminhos) {
  const c = JSON.parse(ler(caminho).toString())
  for (const p of c.itens ?? []) {
    if (typeof p.arquivo !== 'string' || !p.arquivo.endsWith('.glb')) continue
    const fonte = posix.normalize(posix.join(posix.dirname(caminho), p.arquivo))
    if (!fonte.startsWith('biblioteca_aventura/') && !fonte.startsWith('biblioteca/cidade/')) {
      dependencias.push({ caminho: fonte, motivo: 'Referência fora da biblioteca de cenários' })
      continue
    }
    try {
      const anterior = cache.get(fonte)
      if (
        anterior &&
        anterior.commit === versao &&
        (await Bun.file(resolve(destino, anterior.arquivo)).exists())
      ) {
        if (!conhecidos.has(anterior.digest)) {
          modelos.push(anterior)
          conhecidos.add(anterior.digest)
        }
        continue
      }
      const bytes = ler(fonte),
        digest = createHash('sha256').update(bytes).digest('hex')
      if (conhecidos.has(digest)) continue
      validarArteCenario(`${digest}.glb`, bytes)
      const v = new DataView(bytes.buffer, bytes.byteOffset, bytes.length),
        json = JSON.parse(bytes.subarray(20, 20 + v.getUint32(12, true)).toString())
      if (
        (json.extensionsRequired ?? []).some((e: string) =>
          ['KHR_draco_mesh_compression', 'EXT_meshopt_compression'].includes(e),
        )
      )
        throw Error('Requer decodificador ainda não fornecido pelo runtime')
      const caixas = (p.colisao ?? []).map(
        (b: { min?: number[]; max?: number[]; centro?: number[]; tamanho?: number[] }) => {
          if (b.min && b.max) return { min: b.min, max: b.max }
          if (b.centro && b.tamanho)
            return {
              min: b.centro.map((v, i) => v - b.tamanho![i]! / 2),
              max: b.centro.map((v, i) => v + b.tamanho![i]! / 2),
            }
          throw Error('Formato de colisor não reconhecido')
        },
      )
      const real = medirVolumeGlb(json)
      const min = caixas.length
          ? [0, 1, 2].map((i) => Math.min(...caixas.map((b: { min: number[] }) => b.min[i]!)))
          : real.min,
        max = caixas.length
          ? [0, 1, 2].map((i) => Math.max(...caixas.map((b: { max: number[] }) => b.max[i]!)))
          : real.max
      const imagens = (json.images ?? []).map((i: { bufferView?: number }) => {
        if (i.bufferView === undefined) return null
        const b = json.bufferViews[i.bufferView],
          jsonLen = v.getUint32(12, true),
          bin = 20 + jsonLen + 8
        return createHash('sha256')
          .update(
            bytes.subarray(bin + (b.byteOffset ?? 0), bin + (b.byteOffset ?? 0) + b.byteLength),
          )
          .digest('hex')
      })
      const modelo = ModeloDeCatalogoSchema.parse({
        id: `artes-3d/${fonte.replace(/\.glb$/, '')}:${digest.slice(0, 12)}`,
        nome: String(p.rotulo ?? p.id).slice(0, 120),
        origem: String(p.origem ?? c.origem ?? c.pacote ?? fonte.split('/')[1]),
        caminho: fonte,
        commit: versao,
        digest,
        dimensoes:
          Array.isArray(p.dims) && p.dims.length === 3
            ? [p.dims[0], p.dims[2], p.dims[1]]
            : real.dimensoes,
        min,
        max,
        bytes: bytes.length,
        triangulos: p.tris ?? 0,
        arquivo: `${basename(fonte, '.glb')}.${digest.slice(0, 12)}.glb`,
        categoria: String(p.categoria ?? c.categoria ?? 'objetos'),
        colisao: caixas,
        ...(imagens.every(Boolean) ? { imagens } : {}),
      })
      await Bun.write(resolve(destino, modelo.arquivo), bytes)
      modelos.push(modelo)
      conhecidos.add(digest)
      if (modelos.length % 200 === 0) console.log(`${modelos.length} modelos preparados`)
    } catch (e) {
      dependencias.push({ caminho: fonte, motivo: e instanceof Error ? e.message : String(e) })
    }
  }
}
const normalizados = modelos.map((m) => ModeloDeCatalogoSchema.parse(m)),
  digest = createHash('sha256').update(JSON.stringify(normalizados)).digest('hex')
await Bun.write(
  resolve(destino, 'catalogo.json'),
  JSON.stringify({ id: 'faisca-acervo', digest, modelos: normalizados }),
)
await Bun.write(
  resolve(destino, 'dependencias.json'),
  JSON.stringify({ commit: versao, dependencias }, null, 2),
)
console.log(
  JSON.stringify({
    modelos: normalizados.length,
    colecoes: [...new Set(normalizados.map((m) => m.origem))],
    dependencias: dependencias.length,
    manifesto: resolve(destino, 'catalogo.json'),
  }),
)
