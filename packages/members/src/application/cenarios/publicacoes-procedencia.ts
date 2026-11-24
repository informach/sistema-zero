import type { CenaCompilada, PreparoDeExportacao } from '@sistemazero/molda-cenarios-core/compilar'
import { conferirProcedenciaDaPublicacao } from '@sistemazero/molda-cenarios-core/publicacao'
import { CenarioInvalidoError } from '../../domain/cenarios/cenarios.errors'

/** A compilação troca aliases ao resolver conjuntos, mas não pode trocar a origem do acervo. */
export function conferirProcedenciaPublicada(
  cena: Pick<CenaCompilada, 'fontes' | 'licencas'>,
  preparo: PreparoDeExportacao,
): void {
  try {
    conferirProcedenciaDaPublicacao(cena, preparo)
  } catch (erro) {
    throw new CenarioInvalidoError([
      erro instanceof Error ? erro.message : 'A procedência do pacote é inválida',
    ])
  }
}
