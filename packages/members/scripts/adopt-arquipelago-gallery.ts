import { createHash } from 'node:crypto'
import { readFile, stat, writeFile } from 'node:fs/promises'
import { TransferenciaDaGaleriaSchema } from '@sistemazero/arquipelago-contracts'
import { ArquipelagoInventoryRepository } from '../src/infrastructure/persistence/drizzle/arquipelago-inventory.repository'
import { createDbConnection } from '../src/infrastructure/persistence/drizzle/db'

/** Sem rota pública e sem acesso ao banco do jogo. Arquivo vem do exportador daquele serviço. */
export async function adotarGaleria(options: {
  databaseUrl: string
  arquivo: string
  sha256: string
  aplicar: boolean
}) {
  if ((await stat(options.arquivo)).size > 50 * 1024 * 1024)
    throw new Error('Arquivo acima de 50 MB')
  const bytes = await readFile(options.arquivo)
  const sha256 = createHash('sha256').update(bytes).digest('hex')
  if (sha256 !== options.sha256) throw new Error('O arquivo não corresponde ao SHA conferido')
  const arquivo = TransferenciaDaGaleriaSchema.parse(JSON.parse(bytes.toString('utf8')))
  const connection = createDbConnection(options.databaseUrl, { max: 1, connectTimeoutSeconds: 5 })
  try {
    const repo = new ArquipelagoInventoryRepository(connection.db)
    // Conferir tudo antes de conceder a primeira posse. Uma falha posterior preserva as já
    // adotadas, e a mesma entrada pode ser repetida idempotentemente depois de corrigir a causa.
    const conferencia = []
    for (const [indice, compra] of arquivo.compras.entries())
      conferencia.push({ linha: indice + 1, ...(await repo.adotar(compra, false)) })
    const impedimentos = conferencia.filter((r) => r.situacao === 'impedida')
    if (!options.aplicar || impedimentos.length)
      return { sha256, aplicado: false, impedimentos: impedimentos.length, resultados: conferencia }
    const resultados = []
    for (const [indice, compra] of arquivo.compras.entries()) {
      const resultado = await repo.adotar(compra, true)
      resultados.push({ linha: indice + 1, ...resultado })
      if (resultado.situacao === 'impedida')
        return { sha256, aplicado: false, impedimentos: 1, resultados }
    }
    return { sha256, aplicado: true, impedimentos: 0, resultados }
  } finally {
    await connection.close()
  }
}

if (import.meta.main) {
  const [arquivo, sha256, recibo, ...flags] = process.argv.slice(2)
  const databaseUrl = process.env.GALERIA_ADOPT_DATABASE_URL
  if (
    !arquivo ||
    !sha256 ||
    !recibo ||
    !databaseUrl ||
    flags.some((f) => f !== '--apply' && f !== '--compras-antigas-paradas')
  )
    throw new Error('Informe arquivo, SHA, recibo novo e GALERIA_ADOPT_DATABASE_URL')
  const aplicar = flags.includes('--apply')
  if (aplicar && !flags.includes('--compras-antigas-paradas'))
    throw new Error('Pare as compras da versão antiga e exporte novamente antes da adoção')
  // Reserva o recibo antes de qualquer escrita de posse, sem sobrescrever evidência anterior.
  await writeFile(recibo, JSON.stringify({ sha256, situacao: 'iniciada' }), {
    flag: 'wx',
    mode: 0o600,
  })
  try {
    const resultado = await adotarGaleria({ arquivo, sha256, databaseUrl, aplicar })
    await writeFile(recibo, `${JSON.stringify(resultado, null, 2)}\n`, { mode: 0o600 })
    console.info(
      JSON.stringify({
        aplicado: resultado.aplicado,
        impedimentos: resultado.impedimentos,
        linhas: resultado.resultados.length,
      }),
    )
    if (resultado.impedimentos) process.exitCode = 1
  } catch (error) {
    await writeFile(
      recibo,
      JSON.stringify({
        sha256,
        situacao: 'interrompida',
        detalhe: 'Consulte a causa e repita com recibo novo. A adoção é idempotente.',
      }),
      { mode: 0o600 },
    )
    throw error
  }
}
