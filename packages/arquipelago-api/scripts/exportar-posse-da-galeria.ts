import { createHash } from 'node:crypto'
import { writeFile } from 'node:fs/promises'
import { GALERIA, TransferenciaDaGaleriaSchema } from '@sistemazero/arquipelago-contracts'
import postgres from 'postgres'

/** Exportação de operação, sempre somente leitura. Não lê o JSON dos salvamentos. */
export async function exportarPosseDaGaleria(databaseUrl: string) {
  const sql = postgres(databaseUrl, {
    max: 1,
    connect_timeout: 5,
    connection: { statement_timeout: 30_000, default_transaction_read_only: true },
  })
  try {
    return await sql.begin('isolation level repeatable read read only', async (tx) => {
      const rows = await tx`select c.jogador_id, s.publico, p.conta_id, c.aparencia_id,
        c.objeto, c.moedas, c.chave, c.situacao, c.criada_em, c.paga_em
        from arquipelago.compras_da_galeria c
        left join arquipelago.salvamentos s on s.jogador_id = c.jogador_id
        left join arquipelago.perfis_da_conta p on p.jogador_id = c.jogador_id
        order by c.jogador_id, c.aparencia_id limit 100001`
      const arquivo = TransferenciaDaGaleriaSchema.parse({
        formato: 'arquipelago-posse',
        versao: 1,
        exportadoEm: new Date().toISOString(),
        compras: rows.map((row) => ({
          jogadorId: row.jogador_id,
          publico: row.publico,
          contaId: row.conta_id,
          aparencia: row.aparencia_id,
          moedas: row.moedas,
          chave: row.chave,
          situacao: row.situacao,
          criadaEm: new Date(row.criada_em).toISOString(),
          pagaEm: row.paga_em ? new Date(row.paga_em).toISOString() : null,
        })),
      })
      for (const [i, compra] of arquivo.compras.entries())
        if (GALERIA[compra.aparencia].objeto !== rows[i]?.objeto)
          throw new Error(`Objeto histórico divergente na linha ${i + 1}`)
      return arquivo
    })
  } finally {
    await sql.end({ timeout: 5 })
  }
}

if (import.meta.main) {
  const output = process.argv[2],
    url = process.env.GALERIA_EXPORT_DATABASE_URL
  if (!output || !url) throw new Error('Informe o arquivo novo e GALERIA_EXPORT_DATABASE_URL')
  const arquivo = await exportarPosseDaGaleria(url)
  const texto = `${JSON.stringify(arquivo, null, 2)}\n`
  if (Buffer.byteLength(texto, 'utf8') > 50 * 1024 * 1024)
    throw new Error('Exportação acima de 50 MB')
  await writeFile(output, texto, { flag: 'wx', mode: 0o600 })
  console.info(
    JSON.stringify({
      compras: arquivo.compras.length,
      sha256: createHash('sha256').update(texto).digest('hex'),
    }),
  )
}
