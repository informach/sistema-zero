/** Conversão local, sem escrever na API antiga ou publicar na plataforma. */

import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { z } from 'zod'
import {
  converterFaiscaV1,
  GEOGRAFIA_DA_IMPORTACAO,
} from '../packages/arquipelago/src/molda/converter-v1'

const raiz = resolve(import.meta.dirname, '..')
for (const nome of [
  'geografia-do-arquipelago.ts',
  'faisca.ts',
  'colina-da-faisca.ts',
  'refino-da-faisca.ts',
]) {
  const caminho = `packages/arquipelago/src/sistemas/${nome}`
  const fixado = execFileSync('git', ['show', `${GEOGRAFIA_DA_IMPORTACAO}:${caminho}`], {
    cwd: raiz,
    encoding: 'utf8',
    maxBuffer: 4 * 1024 * 1024,
  })
  const atual = await readFile(resolve(raiz, caminho), 'utf8')
  if (fixado.replaceAll('\r\n', '\n') !== atual.replaceAll('\r\n', '\n'))
    throw new Error(`A fonte de geografia mudou desde ${GEOGRAFIA_DA_IMPORTACAO}: ${nome}`)
}

import { ModeloDeCatalogoSchema } from '../packages/molda-cenarios-core/src/catalogo'

const opcoes = new Map<string, string>()
for (let i = 2; i < process.argv.length; i += 2) {
  const chave = process.argv[i],
    valor = process.argv[i + 1]
  if (
    !chave ||
    !valor ||
    !['--fonte', '--catalogo', '--publicacao', '--saida'].includes(chave) ||
    opcoes.has(chave)
  )
    throw new Error('Use --fonte arquivo --catalogo arquivo --publicacao arquivo --saida pasta')
  opcoes.set(chave, valor)
}
for (const chave of ['--fonte', '--catalogo', '--publicacao', '--saida'])
  if (!opcoes.has(chave)) throw new Error(`Falta ${chave}`)
const ler = async (chave: string): Promise<unknown> =>
  JSON.parse(await readFile(resolve(opcoes.get(chave)!), 'utf8'))
const fonte = await ler('--fonte')
const valor = fonte && typeof fonte === 'object' && 'documento' in fonte ? fonte.documento : fonte
const Catalogo = z.object({
  id: z.string(),
  digest: z.string().regex(/^[a-f0-9]{64}$/),
  modelos: z.array(ModeloDeCatalogoSchema),
})
const catalogoBruto = await ler('--catalogo')
const catalogo = Catalogo.parse(catalogoBruto)
const modelosBrutos = (catalogoBruto as { modelos: unknown[] }).modelos
if (createHash('sha256').update(JSON.stringify(modelosBrutos)).digest('hex') !== catalogo.digest)
  throw new Error('O catálogo não corresponde ao hash declarado')
const publicacao = z
  .object({
    catalogo: z.string(),
    completo: z.literal(true),
    modelos: z.array(
      z.object({
        origem: z.string(),
        caminho: z.string(),
        modelo: z.uuid(),
        digest: z.string().regex(/^[a-f0-9]{64}$/),
      }),
    ),
    bibliotecas: z.record(z.string(), z.uuid()),
  })
  .parse(await ler('--publicacao'))
if (publicacao.catalogo !== catalogo.digest)
  throw new Error('A publicação pertence a outro catálogo')
const porCaminho = new Map<string, (typeof publicacao.modelos)[number]>()
for (const m of publicacao.modelos) {
  const chave = `${m.origem}:${m.caminho}:${m.digest}`
  if (porCaminho.has(chave)) throw new Error(`Publicação ambígua: ${chave}`)
  porCaminho.set(chave, m)
}
const porId = new Map(catalogo.modelos.map((m) => [m.id, m]))
const resultado = await converterFaiscaV1(valor, porId, (id) => {
  const fonte = porId.get(id)
  const p = fonte && porCaminho.get(`${fonte.origem}:${fonte.caminho}:${fonte.digest}`)
  const biblioteca = p && publicacao.bibliotecas[p.origem]
  if (!p || !biblioteca || !fonte) return undefined
  return {
    biblioteca,
    modelo: p.modelo,
    digest: p.digest,
    nome: fonte.nome,
    volume: {
      min: { x: fonte.min[0], y: fonte.min[1], z: fonte.min[2] },
      max: { x: fonte.max[0], y: fonte.max[1], z: fonte.max[2] },
    },
  }
})
const saida = resolve(opcoes.get('--saida')!)
await mkdir(resolve(saida, 'recursos'), { recursive: true })
async function gravarImutavel(destino: string, conteudo: Uint8Array | string) {
  const bytes = typeof conteudo === 'string' ? Buffer.from(conteudo, 'utf8') : Buffer.from(conteudo)
  try {
    await writeFile(destino, bytes, { flag: 'wx' })
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code !== 'EEXIST') throw e
    if (!(await readFile(destino)).equals(bytes))
      throw new Error(
        'A saída contém outra versão. Escolha uma pasta nova para preservar a conversão anterior.',
      )
  }
}
// Conteúdo por hash é imutável; reexecutar não substitui outra peça nem altera a fonte.
for (const r of resultado.recursos) {
  const destino = resolve(saida, 'recursos', `${r.digest}.szht`)
  await gravarImutavel(destino, r.conteudo)
}
const documento = `${JSON.stringify(resultado.documento, null, 2)}\n`
const manifesto = {
  formato: 'molda-importacao-faisca',
  versao: 1,
  origem: resultado.origem,
  recursos: resultado.recursos.map((r) => ({ digest: r.digest, bytes: r.conteudo.byteLength })),
  erroMaximoDeQuantizacao: resultado.erroMaximoDeQuantizacao,
}
await gravarImutavel(resolve(saida, 'documento.json'), documento)
await gravarImutavel(resolve(saida, 'manifesto.json'), `${JSON.stringify(manifesto, null, 2)}\n`)
console.log(
  JSON.stringify({
    instancias: resultado.documento.instancias.length,
    modelos: resultado.documento.modelos.length,
    pecas: resultado.recursos.length,
    carimbos: resultado.origem.carimbos,
    erroMaximoDeQuantizacao: resultado.erroMaximoDeQuantizacao,
  }),
)
