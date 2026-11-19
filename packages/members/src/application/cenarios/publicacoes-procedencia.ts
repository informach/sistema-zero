import { canonicalJson } from '@sistemazero/core/creations'
import {
  type CenaCompilada,
  type PreparoDeExportacao,
  referenciasDaCenaParaCompilacao,
} from '@sistemazero/molda-cenarios-core/compilar'
import { CenarioInvalidoError } from '../../domain/cenarios/cenarios.errors'

/** A compilação troca aliases ao resolver conjuntos, mas não pode trocar a origem do acervo. */
export function conferirProcedenciaPublicada(
  cena: CenaCompilada,
  preparo: PreparoDeExportacao,
): void {
  const refs = referenciasDaCenaParaCompilacao(preparo.documento)
  const chaves = <T>(itens: readonly T[], chave: (item: T) => unknown) =>
    [...new Set(itens.map((item) => canonicalJson(chave(item))))].sort()
  const modelo = (m: { biblioteca: string; modelo: string; digest: string }) => [
    m.biblioteca,
    m.modelo,
    m.digest,
  ]
  const textura = (t: { biblioteca: string; textura: string; digest: string }) => [
    t.biblioteca,
    t.textura,
    t.digest,
  ]
  const conjunto = (c: { id: string; biblioteca: string; conjunto: string; revisao: number }) => [
    c.id,
    c.biblioteca,
    c.conjunto,
    c.revisao,
  ]
  const pares = [
    [chaves(cena.fontes.modelos, modelo), chaves(refs.modelos, modelo)],
    [chaves(cena.fontes.texturas, textura), chaves(refs.texturas, textura)],
    [chaves(cena.fontes.conjuntos, conjunto), chaves(refs.conjuntos, conjunto)],
    [chaves(cena.licencas, (c) => c), chaves(preparo.contexto.bibliotecas, (c) => c)],
  ]
  if (pares.some(([a, b]) => canonicalJson(a) !== canonicalJson(b)))
    throw new CenarioInvalidoError([
      'A procedência e as licenças do pacote não correspondem à fonte autorizada',
    ])
}
