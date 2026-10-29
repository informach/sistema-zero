import type { IdDaGaleria, ObjetoDaCasa } from '@sistemazero/arquipelago-contracts'
import { and, eq } from 'drizzle-orm'
import type { CompraDaGaleria, RepositorioDaGaleria } from '../../../domain/galeria.port'
import type { Database } from './db'
import { comprasDaGaleria } from './schema'

const colunas = {
  aparencia: comprasDaGaleria.aparenciaId,
  objeto: comprasDaGaleria.objeto,
  moedas: comprasDaGaleria.moedas,
  chave: comprasDaGaleria.chave,
  situacao: comprasDaGaleria.situacao,
}

function compra(l: {
  aparencia: string
  objeto: string
  moedas: number
  chave: string
  situacao: string
}): CompraDaGaleria {
  return {
    aparencia: l.aparencia as IdDaGaleria,
    objeto: l.objeto as ObjetoDaCasa,
    moedas: l.moedas,
    chave: l.chave,
    situacao: l.situacao === 'paga' ? 'paga' : 'pendente',
  }
}

export class DrizzleRepositorioDaGaleria implements RepositorioDaGaleria {
  constructor(private readonly db: Database) {}

  async compras(jogadorId: string): Promise<CompraDaGaleria[]> {
    const linhas = await this.db
      .select(colunas)
      .from(comprasDaGaleria)
      .where(eq(comprasDaGaleria.jogadorId, jogadorId))
    return linhas.map(compra)
  }

  async reservar(p: Parameters<RepositorioDaGaleria['reservar']>[0]): Promise<CompraDaGaleria> {
    // Insere ou fica com a que já existe (dois pedidos ao mesmo tempo dividem a mesma chave).
    await this.db
      .insert(comprasDaGaleria)
      .values({
        jogadorId: p.jogadorId,
        aparenciaId: p.aparencia,
        objeto: p.objeto,
        moedas: p.moedas,
        chave: p.chave,
        situacao: 'pendente',
        criadaEm: p.agora,
      })
      .onConflictDoNothing({ target: [comprasDaGaleria.jogadorId, comprasDaGaleria.aparenciaId] })
    const [linha] = await this.db
      .select(colunas)
      .from(comprasDaGaleria)
      .where(
        and(
          eq(comprasDaGaleria.jogadorId, p.jogadorId),
          eq(comprasDaGaleria.aparenciaId, p.aparencia),
        ),
      )
    if (!linha) throw new Error('A compra da galeria não ficou guardada')
    return compra(linha)
  }

  async marcarPaga(jogadorId: string, aparencia: IdDaGaleria, agora: Date): Promise<void> {
    await this.db
      .update(comprasDaGaleria)
      .set({ situacao: 'paga', pagaEm: agora })
      .where(
        and(
          eq(comprasDaGaleria.jogadorId, jogadorId),
          eq(comprasDaGaleria.aparenciaId, aparencia),
          eq(comprasDaGaleria.situacao, 'pendente'),
        ),
      )
  }

  async desistir(jogadorId: string, aparencia: IdDaGaleria, chave: string): Promise<void> {
    await this.db
      .delete(comprasDaGaleria)
      .where(
        and(
          eq(comprasDaGaleria.jogadorId, jogadorId),
          eq(comprasDaGaleria.aparenciaId, aparencia),
          eq(comprasDaGaleria.chave, chave),
          eq(comprasDaGaleria.situacao, 'pendente'),
        ),
      )
  }
}
