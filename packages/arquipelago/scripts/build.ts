import { rm } from 'node:fs/promises'
import { basename, resolve } from 'node:path'
import {
  ManifestoDoClienteSchema,
  VERSAO_CONTRATO_PLATAFORMA,
} from '@sistemazero/arquipelago-contracts'

/**
 * Compila o jogo para publicação: arquivos com hash em `dist/cliente/` e um `manifesto.json`
 * dizendo qual é a entrada desta versão. O serviço do jogo serve a pasta; a página da
 * plataforma lê o manifesto e importa a entrada. Voltar uma versão = servir o manifesto antigo.
 */
const SAIDA = resolve(import.meta.dir, '../dist/cliente')
await rm(SAIDA, { recursive: true, force: true })

const r = await Bun.build({
  entrypoints: [resolve(import.meta.dir, '../src/entrada.tsx')],
  outdir: SAIDA,
  target: 'browser',
  format: 'esm',
  splitting: true,
  minify: true,
  sourcemap: 'linked',
  naming: {
    entry: 'entrada-[hash].[ext]',
    chunk: 'parte-[hash].[ext]',
    asset: 'arquivo-[hash].[ext]',
  },
  define: { 'process.env.NODE_ENV': '"production"' },
})
if (!r.success) {
  console.error(r.logs.join('\n'))
  process.exit(1)
}
const entrada = r.outputs.find((o) => o.kind === 'entry-point')
if (!entrada) throw new Error('Sem arquivo de entrada')

const manifesto = ManifestoDoClienteSchema.parse({
  versao:
    process.env.ARQUIPELAGO_VERSAO ??
    new Date()
      .toISOString()
      .replace(/[-:.TZ]/g, '')
      .slice(0, 14),
  entrada: basename(entrada.path),
  versaoContrato: VERSAO_CONTRATO_PLATAFORMA,
  geradoEm: new Date().toISOString(),
})
await Bun.write(resolve(SAIDA, 'manifesto.json'), `${JSON.stringify(manifesto, null, 2)}\n`)
const total = r.outputs.reduce((s, o) => s + o.size, 0)
console.log(
  `Arquipélago ${manifesto.versao}: ${r.outputs.length} arquivos, ${(total / 1024 / 1024).toFixed(2)} MB`,
)
